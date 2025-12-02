/**
 * Runtime Program ID Assertion Utility
 * 
 * Provides optional runtime validation that the configured program ID
 * matches expected values. Useful for development and debugging.
 */

import { PublicKey } from '@solana/web3.js';
import { getProgramId, PROGRAM_ID } from '@/config/program';

/**
 * Assert that the current program ID matches an expected value.
 * In development, logs a warning. In production, can optionally throw.
 * 
 * @param expectedProgramId - The expected program ID string
 * @param throwOnMismatch - If true, throws an error on mismatch (default: false in dev, true in prod)
 */
export function assertProgramId(
  expectedProgramId: string,
  throwOnMismatch: boolean = process.env.NODE_ENV === 'production'
): void {
  const currentProgramId = getProgramId().toBase58();
  
  if (currentProgramId !== expectedProgramId) {
    const message = `Program ID mismatch! Expected: ${expectedProgramId}, Got: ${currentProgramId}`;
    
    if (throwOnMismatch) {
      throw new Error(message);
    } else {
      console.warn(`[assertProgramId] ${message}`);
    }
  }
}

/**
 * Get the current program ID as a base58 string
 */
export function getCurrentProgramId(): string {
  return getProgramId().toBase58();
}

/**
 * Check if an environment override is being used
 */
export function isUsingProgramIdOverride(): boolean {
  return !!process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;
}

/**
 * Get the effective program ID source
 */
export function getProgramIdSource(): 'environment' | 'default' {
  return isUsingProgramIdOverride() ? 'environment' : 'default';
}

/**
 * Log current program ID configuration (useful for debugging)
 */
export function logProgramIdConfig(): void {
  const source = getProgramIdSource();
  const programId = getCurrentProgramId();
  
  console.log('[Program ID Configuration]');
  console.log(`  Source: ${source}`);
  console.log(`  Program ID: ${programId}`);
  
  if (source === 'environment') {
    console.log(`  Override: ${process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID}`);
  }
}

/**
 * Verify that a given public key matches the current program ID
 */
export function isProgramId(publicKey: PublicKey): boolean {
  return publicKey.equals(PROGRAM_ID);
}

// Export constants for convenience
export const DEFAULT_PROGRAM_ID = '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP';
export const LEGACY_PROGRAM_ID = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';

/**
 * Check if using the legacy program ID
 */
export function isUsingLegacyProgramId(): boolean {
  return getCurrentProgramId() === LEGACY_PROGRAM_ID;
}
