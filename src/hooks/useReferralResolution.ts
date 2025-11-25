'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReferralState,
  UseReferralResolutionResult,
  ReferralRegistry,
} from '@/types/referral';
import { fetchReferralRegistry, resolveReferralInput } from '@/utils/referral';
import { DEBOUNCE_DELAY_MS } from '@/config/referral';

/**
 * Hook for resolving referral codes with debounced input
 * @param input - The referral code or public key input
 * @param debounceMs - Optional custom debounce delay (defaults to DEBOUNCE_DELAY_MS)
 * @returns Resolution result with status, referrerPubkey, error, and expiresInSeconds
 */
export function useReferralResolution(
  input: string,
  debounceMs: number = DEBOUNCE_DELAY_MS
): UseReferralResolutionResult {
  const [status, setStatus] = useState<ReferralState>(ReferralState.IDLE);
  const [referrerPubkey, setReferrerPubkey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);
  const [registry, setRegistry] = useState<ReferralRegistry | null>(null);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the registry on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadRegistry() {
      try {
        const data = await fetchReferralRegistry();
        if (mounted) {
          setRegistry(data);
        }
      } catch (err) {
        console.error('Failed to fetch referral registry:', err);
      }
    }
    
    loadRegistry();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve the input with debouncing
  const resolveInput = useCallback((inputValue: string, reg: ReferralRegistry) => {
    const result = resolveReferralInput(inputValue, reg);
    
    setStatus(result.state);
    setReferrerPubkey(result.referrerPubkey ?? null);
    setError(result.error ?? null);
    setExpiresInSeconds(result.expiresInSeconds ?? null);
  }, []);

  // Handle input changes with debouncing
  useEffect(() => {
    // Clear previous countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedInput = input.trim();

    // Handle empty input immediately
    if (!trimmedInput) {
      setStatus(ReferralState.IDLE);
      setReferrerPubkey(null);
      setError(null);
      setExpiresInSeconds(null);
      return;
    }

    // Set loading state
    setStatus(ReferralState.LOADING);

    // Debounce the resolution
    debounceRef.current = setTimeout(() => {
      if (registry) {
        resolveInput(trimmedInput, registry);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input, registry, debounceMs, resolveInput]);

  // Countdown timer for valid codes
  useEffect(() => {
    if (status === ReferralState.VALID && expiresInSeconds !== null && expiresInSeconds > 0) {
      countdownRef.current = setInterval(() => {
        setExpiresInSeconds((prev) => {
          if (prev === null || prev <= 1) {
            // Code has expired
            setStatus(ReferralState.EXPIRED);
            setError('This referral code has expired');
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [status, expiresInSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    status,
    referrerPubkey,
    error,
    expiresInSeconds,
    isLoading: status === ReferralState.LOADING,
    isValid: status === ReferralState.VALID || status === ReferralState.PUBLIC_KEY,
  };
}
