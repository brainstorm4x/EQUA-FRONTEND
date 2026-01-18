/**
 * Tier-based mint limit calculation utilities
 * 
 * This module implements the exact tier limit logic from the backend Rust program
 * (programs/equa_token/src/lib.rs lines 1260-1364).
 * 
 * Critical: These functions MUST match the backend implementation exactly to ensure
 * the frontend requests the correct mint amounts that the backend will approve.
 */

// ============================================================================
// Tier Constants (matching backend lib.rs lines 53-72)
// ============================================================================
// All values are in base units (6 decimals: 1 EQUA = 1,000,000 base units)

/** Tier 1: User #1 - 100,000 EQUA per attempt (for first 100 attempts) */
export const TIER_1_MINT_LIMIT = 100_000_000_000n; // 100,000 EQUA

/** Tier 2: Users #2-10 - 10,000 EQUA per attempt (for first 100 attempts) */
export const TIER_2_MINT_LIMIT = 10_000_000_000n;  // 10,000 EQUA

/** Tier 3: Users #11-100 - 1,000 EQUA per attempt (for first 100 attempts) */
export const TIER_3_MINT_LIMIT = 1_000_000_000n;   // 1,000 EQUA

/** Tier 4: Users #1-1000 (base rate after elevated attempts) - 100 EQUA */
export const TIER_4_MINT_LIMIT = 100_000_000n;     // 100 EQUA

/** Tier 5: Users #1001-10000 - 10 EQUA */
export const TIER_5_MINT_LIMIT = 10_000_000n;      // 10 EQUA

/** Tier 6: Users #10001-100000 - 1 EQUA */
export const TIER_6_MINT_LIMIT = 1_000_000n;       // 1 EQUA

/** Tier 7: Users #100001-1000000 - 0.1 EQUA */
export const TIER_7_MINT_LIMIT = 100_000n;         // 0.1 EQUA

/** Tier 8: Users #1000001-10000000 - 0.01 EQUA */
export const TIER_8_MINT_LIMIT = 10_000n;          // 0.01 EQUA

/** Tier 9: Users #10000001-100000000 - 0.001 EQUA */
export const TIER_9_MINT_LIMIT = 1_000n;           // 0.001 EQUA

/** Tier 10: Users #100000001+ - 0.0005 EQUA */
export const TIER_10_MINT_LIMIT = 500n;            // 0.0005 EQUA

/** Number of elevated attempts available to Tiers 1-3 */
export const ELEVATED_MINT_ATTEMPTS = 100;

// ============================================================================
// Tier Calculation Functions
// ============================================================================

/**
 * Calculate the prevailing rate based on total user count
 * 
 * This implements the backend logic from calculate_prevailing_rate()
 * The prevailing rate is the mint limit for NEW users joining at the current total_users count.
 * 
 * @param totalUsers - Current total user count from GlobalState
 * @returns Prevailing rate in base units (bigint)
 */
export function calculatePrevailingRate(totalUsers: number): bigint {
  // Match backend tier boundaries exactly
  if (totalUsers >= 1 && totalUsers <= 100) {
    return TIER_4_MINT_LIMIT; // 100 EQUA
  } else if (totalUsers >= 101 && totalUsers <= 1_000) {
    return TIER_4_MINT_LIMIT; // 100 EQUA
  } else if (totalUsers >= 1_001 && totalUsers <= 10_000) {
    return TIER_5_MINT_LIMIT; // 10 EQUA
  } else if (totalUsers >= 10_001 && totalUsers <= 100_000) {
    return TIER_6_MINT_LIMIT; // 1 EQUA
  } else if (totalUsers >= 100_001 && totalUsers <= 1_000_000) {
    return TIER_7_MINT_LIMIT; // 0.1 EQUA
  } else if (totalUsers >= 1_000_001 && totalUsers <= 10_000_000) {
    return TIER_8_MINT_LIMIT; // 0.01 EQUA
  } else if (totalUsers >= 10_000_001 && totalUsers <= 100_000_000) {
    return TIER_9_MINT_LIMIT; // 0.001 EQUA
  } else {
    // totalUsers >= 100_000_001
    return TIER_10_MINT_LIMIT; // 0.0005 EQUA
  }
}

/**
 * Calculate tier-based mint limit for a user
 * 
 * This implements the backend logic from calculate_tier_limit() (lib.rs lines 1260-1332)
 * 
 * Algorithm:
 * 1. Check if user is in elevated tier (1-100) and has elevated attempts remaining
 *    - User #1 with <100 attempts: 100,000 EQUA
 *    - Users #2-10 with <100 attempts: 10,000 EQUA
 *    - Users #11-100 with <100 attempts: 1,000 EQUA
 * 
 * 2. Calculate user's base tier rate (based on their user_index):
 *    - Users #1-100 (exhausted elevated): 100 EQUA
 *    - Users #101-1000: 100 EQUA
 *    - Users #1001-10000: 10 EQUA
 *    - And so on...
 * 
 * 3. Calculate prevailing rate (based on total_users)
 * 
 * 4. Return MINIMUM of user's tier rate and prevailing rate
 *    - This ensures users can't mint at higher rates than current ecosystem state
 * 
 * @param userIndex - User's registration index (1-based, from UserMetadata.user_index)
 * @param elevatedAttemptsUsed - Number of elevated attempts already used (from UserMetadata.elevated_mint_attempts_used)
 * @param totalUsers - Current total user count (from GlobalState.user_count)
 * @returns Mint limit in base units (bigint with 6 decimals)
 * 
 * @example
 * // User #6 with 0 elevated attempts used, total 9 users
 * calculateTierLimit(6, 0, 9) // Returns 100_000_000_000n (100,000 EQUA)
 * 
 * // User #6 with 100 elevated attempts used (exhausted), total 9 users
 * calculateTierLimit(6, 100, 9) // Returns 10_000_000_000n (10,000 EQUA - prevailing rate)
 * 
 * // User #101, total 101 users
 * calculateTierLimit(101, 0, 101) // Returns 100_000_000n (100 EQUA)
 */
export function calculateTierLimit(
  userIndex: number,
  elevatedAttemptsUsed: number,
  totalUsers: number
): bigint {
  // STEP 1: Check elevated attempts (Tier 1-3 only)
  // These users get higher rates for their first 100 attempts
  
  if (userIndex === 1 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    // User #1: 100,000 EQUA per attempt (elevated)
    return TIER_1_MINT_LIMIT;
  }
  
  if (userIndex >= 2 && userIndex <= 10 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    // Users #2-10: 10,000 EQUA per attempt (elevated)
    return TIER_2_MINT_LIMIT;
  }
  
  if (userIndex >= 11 && userIndex <= 100 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    // Users #11-100: 1,000 EQUA per attempt (elevated)
    return TIER_3_MINT_LIMIT;
  }
  
  // STEP 2: Calculate user's base tier rate (based on user_index)
  // This is the rate they get after exhausting elevated attempts (or if never had them)
  let userTierRate: bigint;
  
  if (userIndex >= 1 && userIndex <= 100) {
    // Users #1-100 (after exhausting elevated attempts)
    userTierRate = TIER_4_MINT_LIMIT; // 100 EQUA
  } else if (userIndex >= 101 && userIndex <= 1_000) {
    // Users #101-1000
    userTierRate = TIER_4_MINT_LIMIT; // 100 EQUA
  } else if (userIndex >= 1_001 && userIndex <= 10_000) {
    // Users #1001-10000
    userTierRate = TIER_5_MINT_LIMIT; // 10 EQUA
  } else if (userIndex >= 10_001 && userIndex <= 100_000) {
    // Users #10001-100000
    userTierRate = TIER_6_MINT_LIMIT; // 1 EQUA
  } else if (userIndex >= 100_001 && userIndex <= 1_000_000) {
    // Users #100001-1000000
    userTierRate = TIER_7_MINT_LIMIT; // 0.1 EQUA
  } else if (userIndex >= 1_000_001 && userIndex <= 10_000_000) {
    // Users #1000001-10000000
    userTierRate = TIER_8_MINT_LIMIT; // 0.01 EQUA
  } else if (userIndex >= 10_000_001 && userIndex <= 100_000_000) {
    // Users #10000001-100000000
    userTierRate = TIER_9_MINT_LIMIT; // 0.001 EQUA
  } else {
    // Users #100000001+
    userTierRate = TIER_10_MINT_LIMIT; // 0.0005 EQUA
  }
  
  // STEP 3: Calculate prevailing rate (based on total_users)
  const prevailingRate = calculatePrevailingRate(totalUsers);
  
  // STEP 4: Return the MINIMUM (user cannot mint at previous tier rates)
  // Use BigInt comparison
  return userTierRate < prevailingRate ? userTierRate : prevailingRate;
}

/**
 * Get a human-readable description of the tier calculation
 * Useful for debugging and logging
 * 
 * @param userIndex - User's registration index
 * @param elevatedAttemptsUsed - Number of elevated attempts used
 * @param totalUsers - Current total user count
 * @returns Object with calculation details
 */
export function describeTierCalculation(
  userIndex: number,
  elevatedAttemptsUsed: number,
  totalUsers: number
): {
  tierLimit: bigint;
  tierLimitEqua: number;
  isElevated: boolean;
  tierName: string;
  userTierRate: bigint;
  prevailingRate: bigint;
  limitedBy: 'user_tier' | 'prevailing_rate';
} {
  const tierLimit = calculateTierLimit(userIndex, elevatedAttemptsUsed, totalUsers);
  
  // Determine if elevated
  const isElevated = (
    (userIndex === 1 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) ||
    (userIndex >= 2 && userIndex <= 10 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) ||
    (userIndex >= 11 && userIndex <= 100 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS)
  );
  
  // Determine tier name
  let tierName: string;
  if (userIndex === 1 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    tierName = 'Tier 1 (Elevated)';
  } else if (userIndex >= 2 && userIndex <= 10 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    tierName = 'Tier 2 (Elevated)';
  } else if (userIndex >= 11 && userIndex <= 100 && elevatedAttemptsUsed < ELEVATED_MINT_ATTEMPTS) {
    tierName = 'Tier 3 (Elevated)';
  } else if (userIndex >= 1 && userIndex <= 1_000) {
    tierName = 'Tier 4';
  } else if (userIndex >= 1_001 && userIndex <= 10_000) {
    tierName = 'Tier 5';
  } else if (userIndex >= 10_001 && userIndex <= 100_000) {
    tierName = 'Tier 6';
  } else if (userIndex >= 100_001 && userIndex <= 1_000_000) {
    tierName = 'Tier 7';
  } else if (userIndex >= 1_000_001 && userIndex <= 10_000_000) {
    tierName = 'Tier 8';
  } else if (userIndex >= 10_000_001 && userIndex <= 100_000_000) {
    tierName = 'Tier 9';
  } else {
    tierName = 'Tier 10';
  }
  
  // Calculate component rates
  let userTierRate: bigint;
  if (isElevated) {
    // Return the elevated rate as user tier rate
    userTierRate = tierLimit;
  } else {
    // Calculate non-elevated user tier rate
    if (userIndex >= 1 && userIndex <= 1_000) {
      userTierRate = TIER_4_MINT_LIMIT;
    } else if (userIndex >= 1_001 && userIndex <= 10_000) {
      userTierRate = TIER_5_MINT_LIMIT;
    } else if (userIndex >= 10_001 && userIndex <= 100_000) {
      userTierRate = TIER_6_MINT_LIMIT;
    } else if (userIndex >= 100_001 && userIndex <= 1_000_000) {
      userTierRate = TIER_7_MINT_LIMIT;
    } else if (userIndex >= 1_000_001 && userIndex <= 10_000_000) {
      userTierRate = TIER_8_MINT_LIMIT;
    } else if (userIndex >= 10_000_001 && userIndex <= 100_000_000) {
      userTierRate = TIER_9_MINT_LIMIT;
    } else {
      userTierRate = TIER_10_MINT_LIMIT;
    }
  }
  
  const prevailingRate = calculatePrevailingRate(totalUsers);
  const limitedBy = tierLimit === userTierRate ? 'user_tier' : 'prevailing_rate';
  
  return {
    tierLimit,
    tierLimitEqua: Number(tierLimit) / 1_000_000, // Convert to EQUA (6 decimals)
    isElevated,
    tierName,
    userTierRate,
    prevailingRate,
    limitedBy,
  };
}
