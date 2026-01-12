/**
 * Registration utilities for EQUA Token
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
export const MIN_SOL_BALANCE = 0.05;

// Number of users who can register without a referral
export const REFERRAL_FREE_LIMIT = 100;

// ============================================================================
// TIER CONSTANTS - SYNCHRONIZED WITH BACKEND (6 DECIMALS)
// ============================================================================
// All amounts in RAW base units (6 decimals: 1 EQUA = 1,000,000 units)
// Backend source: brainstorm4x/EQUA - CANONICAL_CONFIG.md

// Elevated Tiers (1-3): High amounts with locked tokens
export const TIER_1_MINT_LIMIT = 100_000_000_000; // 100,000 EQUA
export const TIER_2_MINT_LIMIT = 10_000_000_000;  // 10,000 EQUA
export const TIER_3_MINT_LIMIT = 1_000_000_000;   // 1,000 EQUA

// Flat Rate Tiers (4-9): Lower amounts, no locking
export const TIER_4_MINT_LIMIT = 100_000_000;     // 100 EQUA
export const TIER_5_MINT_LIMIT = 10_000_000;      // 10 EQUA
export const TIER_6_MINT_LIMIT = 1_000_000;       // 1 EQUA
export const TIER_7_MINT_LIMIT = 100_000;         // 0.1 EQUA
export const TIER_8_MINT_LIMIT = 10_000;          // 0.01 EQUA
export const TIER_9_MINT_LIMIT = 1_000;           // 0.001 EQUA

// Lock percentages for elevated tiers
export const TIER_1_LOCK_PERCENTAGE = 99.9; // 99.9% locked
export const TIER_2_LOCK_PERCENTAGE = 99.0; // 99% locked
export const TIER_3_LOCK_PERCENTAGE = 90.0; // 90% locked

// Elevated mint attempts (Tiers 1-3 only)
export const ELEVATED_MINT_ATTEMPTS = 100;

// Time constants (seconds)
export const MINTING_COOLDOWN_SECONDS = 86400;    // 24 hours
export const LOCK_PERIOD_SECONDS = 126144000;     // 4 years (1461 days)

// Tier configuration interface
export interface ElevatedMintTier {
  minUser: number;
  maxUser: number;
  rawAmountPerAttempt: number; // Raw base units (6 decimals)
  elevatedAttempts: number;
  lockPercentage: number; // Percentage of tokens locked (0-100)
}

// Tier definitions matching backend exactly
// Backend has 9 tiers total (NOT 10)
export const ELEVATED_MINT_TIERS: ElevatedMintTier[] = [
  // Elevated Tiers (1-3): High amounts with locked tokens
  { minUser: 1, maxUser: 1, rawAmountPerAttempt: TIER_1_MINT_LIMIT, elevatedAttempts: ELEVATED_MINT_ATTEMPTS, lockPercentage: TIER_1_LOCK_PERCENTAGE },
  { minUser: 2, maxUser: 10, rawAmountPerAttempt: TIER_2_MINT_LIMIT, elevatedAttempts: ELEVATED_MINT_ATTEMPTS, lockPercentage: TIER_2_LOCK_PERCENTAGE },
  { minUser: 11, maxUser: 100, rawAmountPerAttempt: TIER_3_MINT_LIMIT, elevatedAttempts: ELEVATED_MINT_ATTEMPTS, lockPercentage: TIER_3_LOCK_PERCENTAGE },
  
  // Flat Rate Tiers (4-9): Lower amounts, no locking, unlimited attempts
  { minUser: 101, maxUser: 1000, rawAmountPerAttempt: TIER_4_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
  { minUser: 1001, maxUser: 10000, rawAmountPerAttempt: TIER_5_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
  { minUser: 10001, maxUser: 100000, rawAmountPerAttempt: TIER_6_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
  { minUser: 100001, maxUser: 1000000, rawAmountPerAttempt: TIER_7_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
  { minUser: 1000001, maxUser: 10000000, rawAmountPerAttempt: TIER_8_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
  { minUser: 10000001, maxUser: 100000000, rawAmountPerAttempt: TIER_9_MINT_LIMIT, elevatedAttempts: 0, lockPercentage: 0 },
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
 * Get the decimal EQUA amount for a tier
 * Converts raw amount (6 decimals) to human-readable EQUA
 * 
 * @param tier - Mint tier configuration
 * @returns Decimal EQUA amount (e.g., 100000 for Tier 1)
 */
export function getTierDecimalAmount(tier: ElevatedMintTier): number {
  return tier.rawAmountPerAttempt / 1_000_000; // 6 decimals
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
