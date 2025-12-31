import { BN } from '@coral-xyz/anchor';

/**
 * Lock period duration (4 years in seconds)
 */
export const LOCK_PERIOD_SECONDS = 4 * 365 * 24 * 60 * 60; // 126,144,000 seconds

/**
 * Check if locked tokens are ready to unlock
 * 
 * @param unlockTimestamp - Unix timestamp when tokens unlock (from LockedTokenAccount)
 * @returns true if current time >= unlock timestamp
 */
export function canUnlock(unlockTimestamp: BN): boolean {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp >= unlockTimestamp.toNumber();
}

/**
 * Get remaining time until unlock (in seconds)
 * 
 * @param unlockTimestamp - Unix timestamp when tokens unlock
 * @returns Seconds remaining (0 if already unlocked)
 */
export function getSecondsUntilUnlock(unlockTimestamp: BN): number {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const remaining = unlockTimestamp.toNumber() - currentTimestamp;
  return Math.max(0, remaining);
}

/**
 * Format remaining time as human-readable string
 * 
 * @param seconds - Seconds remaining until unlock
 * @returns Formatted string (e.g., "2 years, 3 months, 15 days")
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Unlocked";
  
  const years = Math.floor(seconds / (365 * 24 * 60 * 60));
  const months = Math.floor((seconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60));
  const days = Math.floor((seconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
}

/**
 * Format unlock date as human-readable string
 * 
 * @param unlockTimestamp - Unix timestamp when tokens unlock
 * @returns Formatted date (e.g., "December 31, 2029")
 */
export function formatUnlockDate(unlockTimestamp: BN): string {
  const date = new Date(unlockTimestamp.toNumber() * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate locked/unlocked amounts for a given tier
 * Matches backend calculate_lock_split logic
 * 
 * @param userIndex - User registration index (1-based)
 * @param totalAmount - Total mint amount (base units)
 * @returns {unlocked, locked} amounts in base units
 */
export function calculateLockSplit(userIndex: number, totalAmount: BN): { unlocked: BN; locked: BN } {
  const TIER_1_UNLOCKED = new BN(100_000_000);      // 100 EQUA
  const TIER_1_LOCKED = new BN(99_900_000_000);     // 99,900 EQUA
  
  const TIER_2_UNLOCKED = new BN(100_000_000);      // 100 EQUA
  const TIER_2_LOCKED = new BN(9_900_000_000);      // 9,900 EQUA
  
  const TIER_3_UNLOCKED = new BN(100_000_000);      // 100 EQUA
  const TIER_3_LOCKED = new BN(900_000_000);        // 900 EQUA
  
  // Tier 1: User #1
  if (userIndex === 1) {
    return { unlocked: TIER_1_UNLOCKED, locked: TIER_1_LOCKED };
  }
  
  // Tier 2: Users #2-10
  if (userIndex >= 2 && userIndex <= 10) {
    return { unlocked: TIER_2_UNLOCKED, locked: TIER_2_LOCKED };
  }
  
  // Tier 3: Users #11-100
  if (userIndex >= 11 && userIndex <= 100) {
    return { unlocked: TIER_3_UNLOCKED, locked: TIER_3_LOCKED };
  }
  
  // Tiers 4-9: No locking
  return { unlocked: totalAmount, locked: new BN(0) };
}

/**
 * Check if a user tier has token locking
 * 
 * @param userIndex - User registration index (1-based)
 * @returns true if user is in a locked tier (1-3)
 */
export function hasTokenLocking(userIndex: number): boolean {
  return userIndex >= 1 && userIndex <= 100;
}
