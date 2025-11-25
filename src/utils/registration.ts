/**
 * Registration utilities for EQUA Token
 */

// Account type options
export type AccountType = 'individual' | 'business';

// Minimum SOL balance required for registration
export const MIN_SOL_BALANCE = 0.05;

// Number of users who can register without a referral
export const REFERRAL_FREE_LIMIT = 100;

// Elevated mint tier configuration
export interface ElevatedMintTier {
  minUser: number;
  maxUser: number;
  equaPerAttempt: number;
  elevatedAttempts: number;
}

export const ELEVATED_MINT_TIERS: ElevatedMintTier[] = [
  { minUser: 1, maxUser: 1, equaPerAttempt: 100000, elevatedAttempts: 100 },     // User #1
  { minUser: 2, maxUser: 10, equaPerAttempt: 10000, elevatedAttempts: 100 },     // Users #2-10
  { minUser: 11, maxUser: 100, equaPerAttempt: 1000, elevatedAttempts: 100 },    // Users #11-100
  { minUser: 101, maxUser: Infinity, equaPerAttempt: 100, elevatedAttempts: 0 }, // Standard users
];

/**
 * Get the mint tier for a specific user number
 */
export function getUserMintTier(userNumber: number): ElevatedMintTier | null {
  for (const tier of ELEVATED_MINT_TIERS) {
    if (userNumber >= tier.minUser && userNumber <= tier.maxUser) {
      return tier;
    }
  }
  return null;
}

/**
 * Check if a user is in an elevated tier
 */
export function isElevatedUser(userNumber: number): boolean {
  return userNumber >= 1 && userNumber <= 10;
}

/**
 * Get remaining elevated attempts for a user
 */
export function getRemainingElevatedAttempts(userNumber: number, totalMints: number): number {
  const tier = getUserMintTier(userNumber);
  if (!tier || tier.elevatedAttempts === 0) return 0;
  return Math.max(0, tier.elevatedAttempts - totalMints);
}

/**
 * Check if referral is required based on current user count
 */
export function isReferralRequired(totalUsers: number): boolean {
  return totalUsers >= REFERRAL_FREE_LIMIT;
}

/**
 * Validate SOL balance for registration
 */
export function hasMinimumSolBalance(balanceLamports: number): boolean {
  const balanceSOL = balanceLamports / 1_000_000_000; // Convert lamports to SOL
  return balanceSOL >= MIN_SOL_BALANCE;
}

/**
 * Format SOL balance
 */
export function formatSolBalance(balanceLamports: number): string {
  const balanceSOL = balanceLamports / 1_000_000_000;
  return balanceSOL.toFixed(4);
}
