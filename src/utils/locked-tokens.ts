import { BN } from '@coral-xyz/anchor';
import { intervalToDuration } from 'date-fns';

/**
 * Time conversion constants
 * Note: Uses simplified calculations (365-day year, 30-day month) for consistency
 */
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const DAYS_PER_MONTH = 30; // Simplified for consistent formatting
const DAYS_PER_YEAR = 365; // Simplified (no leap year) to match backend
const SECONDS_PER_MONTH = DAYS_PER_MONTH * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY;

/**
 * Lock period duration (4 years in seconds)
 * Note: This uses a simplified 365-day year calculation (not accounting for leap years)
 * to match the backend implementation. This may result in slight timing inaccuracies
 * (~1 day over 4 years), but ensures frontend/backend consistency.
 */
export const LOCK_PERIOD_SECONDS = 4 * 365 * 24 * 60 * 60; // 126,144,000 seconds

/**
 * Check if locked tokens are ready to unlock
 * 
 * @param unlockTimestamp - Unix timestamp when tokens unlock (from LockedTokenAccount)
 * @returns true if current time >= unlock timestamp
 */
export function canUnlock(unlockTimestamp:  BN): boolean {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp >= unlockTimestamp. toNumber();
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
 * Format remaining time as human-readable string using date-fns
 * 
 * Uses date-fns intervalToDuration for accurate calendar-aware calculation that: 
 * - Handles variable month lengths (28-31 days)
 * - Accounts for leap years (e.g., Feb 29, 2028)
 * - Provides precise year/month/day breakdown
 * - Eliminates the "12 months" bug from manual calculation
 * 
 * @param seconds - Seconds remaining until unlock
 * @returns Formatted string (e.g., "3 years, 11 months, 29 days")
 * 
 * Backend reference: brainstorm4x/UNIYAA - programs/uniyaa_token/src/lib.rs (mint_tokens)
 * Frontend issue: https://github.com/brainstorm4x/UNIYAA-FRONTEND/issues/XXX
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Unlocked";
  
  // Create a duration interval from now to unlock time
  // date-fns will calculate the calendar-accurate difference
  const now = new Date();
  const futureDate = new Date(now.getTime() + seconds * 1000);
  
  const duration = intervalToDuration({
    start: now,
    end: futureDate
  });
  
  // Build custom format string (years, months, days only)
  const parts: string[] = [];
  
  if (duration.years && duration.years > 0) {
    parts.push(`${duration.years} year${duration.years > 1 ? 's' : ''}`);
  }
  
  if (duration.months && duration.months > 0) {
    parts.push(`${duration.months} month${duration. months > 1 ? 's' : ''}`);
  }
  
  if (duration. days && duration.days > 0) {
    parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
  }
  
  // Edge case: if we have positive seconds but no days/months/years
  // (e.g., only hours remaining), show "0 days"
  if (parts.length === 0 && seconds > 0) {
    parts.push('0 days');
  }
  
  return parts.join(', ');
}

/**
 * Format unlock date as human-readable string
 * 
 * @param unlockTimestamp - Unix timestamp when tokens unlock
 * @returns Formatted date (e.g., "December 31, 2029")
 */
export function formatUnlockDate(unlockTimestamp: BN): string {
  const date = new Date(unlockTimestamp. toNumber() * 1000);
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
  const TIER_1_UNLOCKED = new BN(100_000_000);      // 100 UNIYAA
  const TIER_1_LOCKED = new BN(99_900_000_000);     // 99,900 UNIYAA
  
  const TIER_2_UNLOCKED = new BN(100_000_000);      // 100 UNIYAA
  const TIER_2_LOCKED = new BN(9_900_000_000);      // 9,900 UNIYAA
  
  const TIER_3_UNLOCKED = new BN(100_000_000);      // 100 UNIYAA
  const TIER_3_LOCKED = new BN(900_000_000);        // 900 UNIYAA
  
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
  return { unlocked:  totalAmount, locked: new BN(0) };
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
