/**
 * Registry utilities for fetching and resolving referral codes
 */

import { PublicKey } from '@solana/web3.js';
import {
  ReferralRegistry,
  ReferralCodeEntry,
  ReferralResolutionResult,
  ReferralState,
} from '@/types/referral';
import { CODE_PATTERN, CODE_TTL_SECONDS } from '@/config/referral';

/**
 * Mock referral registry for development/testing
 * In production, this would be fetched from an external source
 */
const MOCK_REGISTRY: ReferralRegistry = {
  // Example valid code - expires in the future
  'ABC123xyz9': {
    referrer_pubkey: '11111111111111111111111111111111',
    created_at: Math.floor(Date.now() / 1000) - 60, // Created 1 minute ago
    expires_at: Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS - 60, // Expires in ~14 minutes
    used: false,
  },
  // Example used code
  'UsedCode01': {
    referrer_pubkey: '22222222222222222222222222222222',
    created_at: Math.floor(Date.now() / 1000) - 300,
    expires_at: Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS - 300,
    used: true,
  },
  // Example expired code
  'ExpiredCd1': {
    referrer_pubkey: '33333333333333333333333333333333',
    created_at: Math.floor(Date.now() / 1000) - CODE_TTL_SECONDS - 60, // Created 16 minutes ago
    expires_at: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
    used: false,
  },
};

/**
 * Fetches the referral registry from the data source
 * @returns Promise resolving to the referral registry
 */
export async function fetchReferralRegistry(): Promise<ReferralRegistry> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // For now, return the mock registry
  // In production, this would fetch from a GitHub JSON file or other source
  return MOCK_REGISTRY;
}

/**
 * Checks if a string is a valid 10-character referral code format
 * @param input - The string to check
 * @returns true if the input matches the referral code pattern
 */
export function isValidCodeFormat(input: string): boolean {
  return CODE_PATTERN.test(input);
}

/**
 * Checks if a string is a valid Solana public key
 * @param input - The string to check
 * @returns true if the input is a valid base58-encoded public key
 */
export function isValidPublicKey(input: string): boolean {
  try {
    new PublicKey(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a referral input (code or public key) against the registry
 * @param input - The user input (referral code or public key)
 * @param registry - The referral registry to check against
 * @returns The resolution result with state and referrer info
 */
export function resolveReferralInput(
  input: string,
  registry: ReferralRegistry
): ReferralResolutionResult {
  // Trim the input
  const trimmedInput = input.trim();
  
  // Empty input
  if (!trimmedInput) {
    return { state: ReferralState.IDLE };
  }
  
  // Check if it's a 10-character referral code
  if (isValidCodeFormat(trimmedInput)) {
    const entry = registry[trimmedInput];
    
    // Code not found in registry
    if (!entry) {
      return {
        state: ReferralState.NOT_FOUND,
        error: 'Referral code not found',
      };
    }
    
    // Check if code has been used
    if (entry.used) {
      return {
        state: ReferralState.USED,
        error: 'This referral code has already been used',
      };
    }
    
    // Check if code has expired
    const now = Math.floor(Date.now() / 1000);
    if (now > entry.expires_at) {
      return {
        state: ReferralState.EXPIRED,
        error: 'This referral code has expired',
      };
    }
    
    // Code is valid
    return {
      state: ReferralState.VALID,
      referrerPubkey: entry.referrer_pubkey,
      expiresInSeconds: entry.expires_at - now,
    };
  }
  
  // Check if it's a direct public key
  try {
    const pubkey = new PublicKey(trimmedInput);
    return {
      state: ReferralState.PUBLIC_KEY,
      referrerPubkey: pubkey.toBase58(),
    };
  } catch {
    // Not a valid public key either
    return {
      state: ReferralState.MALFORMED,
      error: 'Invalid referral code or wallet address format',
    };
  }
}

/**
 * Creates a new referral code entry
 * @param referrerPubkey - The referrer's public key
 * @returns A new ReferralCodeEntry
 */
export function createReferralCodeEntry(referrerPubkey: string): ReferralCodeEntry {
  const now = Math.floor(Date.now() / 1000);
  return {
    referrer_pubkey: referrerPubkey,
    created_at: now,
    expires_at: now + CODE_TTL_SECONDS,
    used: false,
  };
}

/**
 * Gets the time remaining until a code expires
 * @param entry - The referral code entry
 * @returns Seconds remaining, or 0 if expired
 */
export function getTimeRemaining(entry: ReferralCodeEntry): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, entry.expires_at - now);
}

/**
 * Formats seconds into mm:ss format for countdown display
 * @param seconds - Number of seconds
 * @returns Formatted string in mm:ss format
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
