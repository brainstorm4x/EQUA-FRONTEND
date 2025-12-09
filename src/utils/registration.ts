/**
 * Registration utilities for EQUA Token
 */

// Account type options (maintained for compatibility, always uses 'individual')
export type AccountType = 'individual' | 'business';

// Default account type for all registrations
export const DEFAULT_ACCOUNT_TYPE: AccountType = 'individual';

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
  { minUser: 1, maxUser: 1, equaPerAttempt: 100000, elevatedAttempts: 100 },        // User #1: 100,000 EQUA/day × 100 days
  { minUser: 2, maxUser: 10, equaPerAttempt: 10000, elevatedAttempts: 100 },        // Users #2-10: 10,000 EQUA/day × 100 days
  { minUser: 11, maxUser: 100, equaPerAttempt: 1000, elevatedAttempts: 100 },       // Users #11-100: 1,000 EQUA/day × 100 days
  { minUser: 101, maxUser: 1000, equaPerAttempt: 100, elevatedAttempts: 0 },        // Users #101-1000: 100 EQUA/day
  { minUser: 1001, maxUser: 10000, equaPerAttempt: 10, elevatedAttempts: 0 },       // Users #1001-10000: 10 EQUA/day
  { minUser: 10001, maxUser: 100000, equaPerAttempt: 1, elevatedAttempts: 0 },      // Users #10001-100000: 1 EQUA/day
  { minUser: 100001, maxUser: 1000000, equaPerAttempt: 0.1, elevatedAttempts: 0 },  // Users #100001-1000000: 0.1 EQUA/day
  { minUser: 1000001, maxUser: 10000000, equaPerAttempt: 0.01, elevatedAttempts: 0 }, // Users #1000001-10000000: 0.01 EQUA/day
  { minUser: 10000001, maxUser: 100000000, equaPerAttempt: 0.001, elevatedAttempts: 0 }, // Users #10000001-100000000: 0.001 EQUA/day
  { minUser: 100000001, maxUser: 1000000000, equaPerAttempt: 0.0005, elevatedAttempts: 0 }, // Users #100000001-1000000000: 0.0005 EQUA/day
  { minUser: 1000000001, maxUser: Infinity, equaPerAttempt: 0.0005, elevatedAttempts: 0 }, // Users #1000000001+: 0.0005 EQUA/day (continue at same rate)
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
 * Check if a user is in an elevated tier (users with elevated attempts)
 */
export function isElevatedUser(userNumber: number): boolean {
  const tier = getUserMintTier(userNumber);
  return tier !== null && tier.elevatedAttempts > 0;
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
 * Returns false for implausible/overflow values (treated as invalid data)
 */
export function isReferralRequired(totalUsers: number): boolean {
  // Treat implausible values as invalid data (no referral required)
  if (totalUsers < 0 || totalUsers > 10_000_000) {
    return false;
  }
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
