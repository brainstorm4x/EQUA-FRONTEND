import { PublicKey } from '@solana/web3.js';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Memoized Constants
// PublicKey construction is not free - cache these values
// ============================================================================

// Lazy-initialized cached program ID
let _programId: PublicKey | null = null;

/**
 * Get the deployed program ID on Devnet (memoized)
 * @returns Cached PublicKey instance
 */
export function getProgramId(): PublicKey {
  if (!_programId) {
    _programId = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
  }
  return _programId;
}

// Export as constant for backward compatibility
// Note: This is still evaluated once at module load time, but accessing
// it multiple times won't create new PublicKey instances
export const PROGRAM_ID = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');

// Devnet configuration - these are primitive values, no optimization needed
export const NETWORK = 'devnet' as const;
export const COMMITMENT = 'confirmed' as const;

// Global state PDA seeds - freeze to prevent accidental mutation
export const GLOBAL_STATE_SEED = 'global_state' as const;

// User account seed
export const USER_ACCOUNT_SEED = 'user_account' as const;
