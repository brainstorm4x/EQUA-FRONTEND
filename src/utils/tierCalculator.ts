/**
 * Tier Calculation Utilities
 * 
 * Frontend implementation of backend tier calculation logic.
 * MUST match the backend's calculate_tier_limit function exactly.
 * 
 * Backend source: programs/equa_token/src/lib.rs (lines 1121-1225)
 * 
 * Tier Structure:
 * - Elevated Tiers (1-3): Users 1-100 with 100 elevated attempts each
 * - Standard Tiers (4-9): All other users, with decreasing limits per user index
 */

/**
 * Calculate the tier limit for a user based on their index and attempts used
 * 
 * This function matches the backend's calculate_tier_limit logic exactly.
 * It determines how much EQUA a user can mint per attempt based on:
 * 1. Their user_index (registration order, 1-based)
 * 2. Their elevated_mint_attempts_used (for elevated tier users)
 * 
 * @param userIndex - User's registration index (1-based)
 * @param attemptsUsed - Number of elevated mint attempts already used
 * @returns Tier limit in EQUA tokens (decimal, e.g., 100_000, 10_000, 100, 10, 1, 0.1, 0.01, 0.001)
 */
export function calculateTierLimit(
  userIndex: number,
  attemptsUsed: number
): number {
  // Elevated Tier 1: User #1 with <100 attempts
  if (userIndex === 1 && attemptsUsed < 100) {
    return 100_000;
  }
  
  // Elevated Tier 2: Users #2-10 with <100 attempts
  if (userIndex >= 2 && userIndex <= 10 && attemptsUsed < 100) {
    return 10_000;
  }
  
  // Elevated Tier 3: Users #11-100 with <100 attempts
  if (userIndex >= 11 && userIndex <= 100 && attemptsUsed < 100) {
    return 1_000;
  }
  
  // Standard tiers below (including exhausted elevated users who default to Tier 4)
  
  // Standard Tier 4: Users #1-1,000 (including exhausted elevated users)
  if (userIndex >= 1 && userIndex <= 1_000) {
    return 100;
  }
  
  // Standard Tier 5: Users #1,001-10,000
  if (userIndex >= 1_001 && userIndex <= 10_000) {
    return 10;
  }
  
  // Standard Tier 6: Users #10,001-100,000
  if (userIndex >= 10_001 && userIndex <= 100_000) {
    return 1;
  }
  
  // Standard Tier 7: Users #100,001-1,000,000
  if (userIndex >= 100_001 && userIndex <= 1_000_000) {
    return 0.1;
  }
  
  // Standard Tier 8: Users #1,000,001-10,000,000
  if (userIndex >= 1_000_001 && userIndex <= 10_000_000) {
    return 0.01;
  }
  
  // Standard Tier 9: Users #10,000,001+
  return 0.001;
}

/**
 * Get human-readable tier name from tier limit
 * 
 * @param limit - Tier limit in EQUA tokens
 * @returns Tier name (e.g., "Tier 1", "Tier 4", "Tier 9")
 */
export function getTierName(limit: number): string {
  if (limit === 100_000) return 'Tier 1';
  if (limit === 10_000) return 'Tier 2';
  if (limit === 1_000) return 'Tier 3';
  if (limit === 100) return 'Tier 4';
  if (limit === 10) return 'Tier 5';
  if (limit === 1) return 'Tier 6';
  if (limit === 0.1) return 'Tier 7';
  if (limit === 0.01) return 'Tier 8';
  return 'Tier 9';
}

/**
 * Get detailed tier information including name, limit, and range
 * 
 * @param userIndex - User's registration index (1-based)
 * @param attemptsUsed - Number of elevated mint attempts already used
 * @returns Tier information object
 */
export function getTierInfo(
  userIndex: number,
  attemptsUsed: number
): {
  tierName: string;
  limit: number;
  isElevated: boolean;
  remainingElevatedAttempts: number;
} {
  const limit = calculateTierLimit(userIndex, attemptsUsed);
  const tierName = getTierName(limit);
  
  // Check if user is in elevated tier (Tiers 1-3 with remaining attempts)
  const isElevated = (
    (userIndex === 1 && attemptsUsed < 100) ||
    (userIndex >= 2 && userIndex <= 10 && attemptsUsed < 100) ||
    (userIndex >= 11 && userIndex <= 100 && attemptsUsed < 100)
  );
  
  // Calculate remaining elevated attempts
  let remainingElevatedAttempts = 0;
  if (userIndex >= 1 && userIndex <= 100) {
    remainingElevatedAttempts = Math.max(0, 100 - attemptsUsed);
  }
  
  return {
    tierName,
    limit,
    isElevated,
    remainingElevatedAttempts,
  };
}
