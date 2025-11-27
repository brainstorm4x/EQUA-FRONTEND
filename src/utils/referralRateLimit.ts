/**
 * Referrer Rate Limiting Utility
 * 
 * Tracks the number of referrals per referrer within a 24-hour window.
 * If a referrer exceeds N referrals in 24 hours, their next registration
 * referral reward is reduced.
 * 
 * This is an off-chain tracking mechanism stored in localStorage/metadata.
 * In production, this should be tracked in a backend service.
 */

// Configuration
export const REFERRAL_RATE_LIMIT = 10; // Max referrals per 24h before penalty
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export const REWARD_REDUCTION_PERCENT = 50; // Reduce reward by 50% when rate limited

/**
 * Interface for tracking a single referral event
 */
export interface ReferralEvent {
  timestamp: number;
  refereeAddress: string;
}

/**
 * Interface for referrer tracking data
 */
export interface ReferrerTrackingData {
  referrerAddress: string;
  referrals: ReferralEvent[];
  totalReferrals: number;
  isRateLimited: boolean;
  lastUpdated: number;
}

/**
 * Interface for the referral registry stored in localStorage
 */
export interface ReferralRateLimitRegistry {
  [referrerAddress: string]: ReferrerTrackingData;
}

const STORAGE_KEY = 'equa_referral_rate_limit_registry';

/**
 * Gets the referral rate limit registry from localStorage
 */
export function getRateLimitRegistry(): ReferralRateLimitRegistry {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    console.warn('Failed to parse referral rate limit registry');
    return {};
  }
}

/**
 * Saves the referral rate limit registry to localStorage
 */
export function saveRateLimitRegistry(registry: ReferralRateLimitRegistry): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch {
    console.warn('Failed to save referral rate limit registry');
  }
}

/**
 * Cleans up expired referral events (older than 24 hours)
 */
export function cleanupExpiredEvents(data: ReferrerTrackingData): ReferrerTrackingData {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  
  const validReferrals = data.referrals.filter(r => r.timestamp > cutoff);
  
  return {
    ...data,
    referrals: validReferrals,
    isRateLimited: validReferrals.length >= REFERRAL_RATE_LIMIT,
    lastUpdated: now,
  };
}

/**
 * Gets tracking data for a specific referrer
 */
export function getReferrerData(referrerAddress: string): ReferrerTrackingData | null {
  const registry = getRateLimitRegistry();
  const data = registry[referrerAddress];
  
  if (!data) return null;
  
  // Clean up expired events
  return cleanupExpiredEvents(data);
}

/**
 * Counts referrals within the rate limit window (24 hours)
 */
export function countRecentReferrals(referrerAddress: string): number {
  const data = getReferrerData(referrerAddress);
  if (!data) return 0;
  
  return data.referrals.length;
}

/**
 * Checks if a referrer is rate limited
 */
export function isReferrerRateLimited(referrerAddress: string): boolean {
  const recentCount = countRecentReferrals(referrerAddress);
  return recentCount >= REFERRAL_RATE_LIMIT;
}

/**
 * Records a new referral event
 */
export function recordReferral(referrerAddress: string, refereeAddress: string): void {
  const registry = getRateLimitRegistry();
  const now = Date.now();
  
  let data = registry[referrerAddress];
  
  if (!data) {
    data = {
      referrerAddress,
      referrals: [],
      totalReferrals: 0,
      isRateLimited: false,
      lastUpdated: now,
    };
  } else {
    // Clean up expired events first
    data = cleanupExpiredEvents(data);
  }
  
  // Add new referral event
  data.referrals.push({
    timestamp: now,
    refereeAddress,
  });
  
  data.totalReferrals += 1;
  data.isRateLimited = data.referrals.length >= REFERRAL_RATE_LIMIT;
  data.lastUpdated = now;
  
  registry[referrerAddress] = data;
  saveRateLimitRegistry(registry);
}

/**
 * Calculates the adjusted referral reward based on rate limiting
 * @param baseReward The original reward amount
 * @param referrerAddress The referrer's address
 * @returns The adjusted reward (reduced if rate limited)
 */
export function calculateAdjustedReferralReward(
  baseReward: number,
  referrerAddress: string
): number {
  if (isReferrerRateLimited(referrerAddress)) {
    // Reduce reward by the configured percentage
    return Math.floor(baseReward * (1 - REWARD_REDUCTION_PERCENT / 100));
  }
  return baseReward;
}

/**
 * Gets rate limit status information for display
 */
export interface RateLimitStatus {
  isRateLimited: boolean;
  recentReferralCount: number;
  maxReferrals: number;
  remainingReferrals: number;
  rewardMultiplier: number;
  nextResetTime: number | null;
}

export function getRateLimitStatus(referrerAddress: string): RateLimitStatus {
  const data = getReferrerData(referrerAddress);
  const recentCount = data?.referrals.length || 0;
  const isLimited = recentCount >= REFERRAL_RATE_LIMIT;
  
  // Find the earliest referral to determine when the window resets
  let nextResetTime: number | null = null;
  if (data && data.referrals.length > 0) {
    const oldestReferral = data.referrals.reduce(
      (min, r) => (r.timestamp < min ? r.timestamp : min),
      data.referrals[0].timestamp
    );
    nextResetTime = oldestReferral + RATE_LIMIT_WINDOW_MS;
  }
  
  return {
    isRateLimited: isLimited,
    recentReferralCount: recentCount,
    maxReferrals: REFERRAL_RATE_LIMIT,
    remainingReferrals: Math.max(0, REFERRAL_RATE_LIMIT - recentCount),
    rewardMultiplier: isLimited ? (1 - REWARD_REDUCTION_PERCENT / 100) : 1,
    nextResetTime,
  };
}

/**
 * Format time remaining until rate limit resets
 */
export function formatTimeUntilReset(nextResetTime: number | null): string {
  if (!nextResetTime) return 'N/A';
  
  const now = Date.now();
  const remaining = nextResetTime - now;
  
  if (remaining <= 0) return 'Now';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Clears all rate limiting data (for testing/admin purposes)
 */
export function clearRateLimitRegistry(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn('Failed to clear referral rate limit registry');
  }
}
