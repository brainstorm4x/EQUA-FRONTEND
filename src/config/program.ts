import { PublicKey } from '@solana/web3.js';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Memoized Constants
// PublicKey construction is not free - cache these values
// ============================================================================

// Lazy-initialized cached program ID
let _programId: PublicKey | null = null;

/**
 * Get the deployed program ID on Devnet (memoized)
 * Supports environment variable override via NEXT_PUBLIC_EQUA_PROGRAM_ID
 * @returns Cached PublicKey instance
 */
export function getProgramId(): PublicKey {
  if (!_programId) {
    const programIdStr = process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP';
    _programId = new PublicKey(programIdStr);
  }
  return _programId;
}

// Export as constant for backward compatibility
// Note: This is still evaluated once at module load time, but accessing
// it multiple times won't create new PublicKey instances
// Can be overridden via NEXT_PUBLIC_EQUA_PROGRAM_ID environment variable
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'
);

// Devnet configuration - these are primitive values, no optimization needed
export const NETWORK = 'devnet' as const;
export const COMMITMENT = 'confirmed' as const;

// NOTE: PDA seeds should be imported from lib/constants.ts to maintain consistency
// The following are deprecated - use lib/constants.ts instead
// Global state PDA seed - matches lib/constants.ts (must match Rust backend exactly)
export const GLOBAL_STATE_SEED = 'global-state' as const;

// User account seed
export const USER_ACCOUNT_SEED = 'user_account' as const;
