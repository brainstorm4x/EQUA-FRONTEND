/**
 * Registration utilities for UNIYAA Token
 */

// Account type options
export type AccountType = 'individual' | 'business';

// Default account type for all registrations
export const DEFAULT_ACCOUNT_TYPE: AccountType = 'individual';

// User type enum values (as sent to on-chain program)
export enum UserType {
  Individual = 0,
  Business = 1,
}

// Map account type to user type enum
export function accountTypeToUserType(accountType: AccountType): UserType {
  return accountType === 'business' ? UserType.Business : UserType.Individual;
}

// Minimum SOL balance required for registration
export const MIN_SOL_BALANCE = 0.01;

// Elevated mint tier configuration
export interface ElevatedMintTier {
  minUser: number;
  maxUser: number;
  uniyaaPerAttempt: number;
  elevatedAttempts: number;
}

export const ELEVATED_MINT_TIERS: ElevatedMintTier[] = [
  { minUser: 1, maxUser: 1, uniyaaPerAttempt: 100000, elevatedAttempts: 100 },        // User #1: 100,000 UNIYAA/day × 100 days
  { minUser: 2, maxUser: 10, uniyaaPerAttempt: 10000, elevatedAttempts: 100 },        // Users #2-10: 10,000 UNIYAA/day × 100 days
  { minUser: 11, maxUser: 100, uniyaaPerAttempt: 1000, elevatedAttempts: 100 },       // Users #11-100: 1,000 UNIYAA/day × 100 days
  { minUser: 101, maxUser: 1000, uniyaaPerAttempt: 100, elevatedAttempts: 0 },        // Users #101-1000: 100 UNIYAA/day
  { minUser: 1001, maxUser: 10000, uniyaaPerAttempt: 10, elevatedAttempts: 0 },       // Users #1001-10000: 10 UNIYAA/day
  { minUser: 10001, maxUser: 100000, uniyaaPerAttempt: 1, elevatedAttempts: 0 },      // Users #10001-100000: 1 UNIYAA/day
  { minUser: 100001, maxUser: 1000000, uniyaaPerAttempt: 0.1, elevatedAttempts: 0 },  // Users #100001-1000000: 0.1 UNIYAA/day
  { minUser: 1000001, maxUser: 10000000, uniyaaPerAttempt: 0.01, elevatedAttempts: 0 }, // Users #1000001-10000000: 0.01 UNIYAA/day
  { minUser: 10000001, maxUser: Infinity, uniyaaPerAttempt: 0.001, elevatedAttempts: 0 }, // Users #10000001+: 0.001 UNIYAA/day (unlimited)
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
