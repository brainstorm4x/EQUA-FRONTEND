'use client';

import { useEffect, useRef } from 'react';
import { useRegistrationStatus, RegistrationStatus } from '@/contexts/RegistrationContext';

/**
 * Configuration for post-registration polling
 */
interface PollingConfig {
  /** Maximum number of polling attempts */
  maxAttempts?: number;
  /** Interval between polling attempts in milliseconds */
  intervalMs?: number;
  /** Callback when registration is confirmed */
  onConfirmed?: () => void;
  /** Callback when polling times out */
  onTimeout?: () => void;
}

/**
 * Hook to poll for registration confirmation after transaction submission
 * 
 * Use this after submitting a registration transaction to automatically
 * verify when the transaction is confirmed on-chain.
 * 
 * @example
 * ```tsx
 * const { startPolling, stopPolling, isPolling } = useRegistrationPolling({
 *   onConfirmed: () => {
 *     console.log('Registration confirmed!');
 *     navigate('/dashboard');
 *   },
 *   onTimeout: () => {
 *     setError('Registration confirmation timed out');
 *   }
 * });
 * 
 * // After successful transaction submission
 * await sendTransaction(tx);
 * startPolling();
 * ```
 */
export function useRegistrationPolling(config: PollingConfig = {}) {
  const {
    maxAttempts = 30,
    intervalMs = 2000,
    onConfirmed,
    onTimeout,
  } = config;

  const { status, refetchStatus } = useRegistrationStatus();
  
  const isPollingRef = useRef(false);
  const attemptCountRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start polling for registration confirmation
   */
  const startPolling = () => {
    if (isPollingRef.current) {
      console.warn('⚠️ [RegistrationPolling] Already polling, ignoring start request');
      return;
    }

    console.log('🔄 [RegistrationPolling] Starting polling', {
      maxAttempts,
      intervalMs,
    });

    isPollingRef.current = true;
    attemptCountRef.current = 0;

    intervalIdRef.current = setInterval(async () => {
      attemptCountRef.current += 1;
      
      console.log(`🔍 [RegistrationPolling] Attempt ${attemptCountRef.current}/${maxAttempts}`);
      
      await refetchStatus();

      // Check if we've exceeded max attempts
      if (attemptCountRef.current >= maxAttempts) {
        console.warn('⏱️ [RegistrationPolling] Max attempts reached, stopping');
        stopPolling();
        onTimeout?.();
      }
    }, intervalMs);
  };

  /**
   * Stop polling
   */
  const stopPolling = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    isPollingRef.current = false;
    attemptCountRef.current = 0;
    console.log('✅ [RegistrationPolling] Stopped');
  };

  /**
   * Auto-stop polling when registration is confirmed
   */
  useEffect(() => {
    if (isPollingRef.current && status === RegistrationStatus.REGISTERED) {
      console.log('✅ [RegistrationPolling] Registration confirmed, stopping poll');
      stopPolling();
      onConfirmed?.();
    }
  }, [status, onConfirmed]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling: isPollingRef.current,
    attemptCount: attemptCountRef.current,
  };
}
