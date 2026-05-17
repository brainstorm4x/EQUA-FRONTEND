/**
 * Referral rate-limit client.
 *
 * Backed by the server-side counter at /.netlify/functions/referral-rate-limit
 * (see netlify/functions/lib/referralCounter.ts). The previous version of this
 * module stored counters in localStorage, which any user could reset by
 * clearing their browser data; the server-side counter is global and survives
 * across sessions, devices, and browsers.
 *
 * Limitations (documented):
 * - The /record endpoint does not yet cryptographically verify that the
 *   reported referral actually occurred on-chain. A real enforcement path
 *   requires the on-chain program to read this counter (or to be queried by
 *   it). Treat the rate-limit signal as advisory for UI purposes.
 * - On network failure the client returns an "unknown / not rate limited"
 *   status, matching the original fail-open behaviour and avoiding false
 *   warnings.
 */

// Public constants preserved from the prior API.
export const REFERRAL_RATE_LIMIT = 10;                  // Max referrals per 24h before penalty
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export const REWARD_REDUCTION_PERCENT = 50;             // Reduce reward by 50% when rate limited

const ENDPOINT = '/.netlify/functions/referral-rate-limit';

export interface RateLimitStatus {
  isRateLimited: boolean;
  recentReferralCount: number;
  maxReferrals: number;
  remainingReferrals: number;
  rewardMultiplier: number;
  /** Approximate time the oldest event in the window will expire. */
  nextResetTime: number | null;
}

const DEFAULT_STATUS: RateLimitStatus = {
  isRateLimited: false,
  recentReferralCount: 0,
  maxReferrals: REFERRAL_RATE_LIMIT,
  remainingReferrals: REFERRAL_RATE_LIMIT,
  rewardMultiplier: 1,
  nextResetTime: null,
};

interface ServerStatus {
  success: boolean;
  recentReferrals: number;
  totalReferrals: number;
  isRateLimited: boolean;
  limit: number;
  windowMs: number;
}

function statusFromServer(payload: ServerStatus): RateLimitStatus {
  return {
    isRateLimited: payload.isRateLimited,
    recentReferralCount: payload.recentReferrals,
    maxReferrals: payload.limit,
    remainingReferrals: Math.max(0, payload.limit - payload.recentReferrals),
    rewardMultiplier: payload.isRateLimited
      ? 1 - REWARD_REDUCTION_PERCENT / 100
      : 1,
    // We don't have the exact oldest timestamp from the server response shape,
    // so approximate with "one window from now" when at the limit. UI uses
    // this for a coarse countdown only.
    nextResetTime: payload.isRateLimited ? Date.now() + payload.windowMs : null,
  };
}

/**
 * Fetch the current rate-limit status for a referrer.
 * Returns a default ("not rate limited") status on any failure to keep the UI
 * permissive when the backend is unreachable.
 */
export async function getRateLimitStatus(referrerAddress: string): Promise<RateLimitStatus> {
  if (typeof fetch === 'undefined') return DEFAULT_STATUS;
  try {
    const url = `${ENDPOINT}?address=${encodeURIComponent(referrerAddress)}`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) return DEFAULT_STATUS;
    const json = (await resp.json()) as ServerStatus;
    if (!json?.success) return DEFAULT_STATUS;
    return statusFromServer(json);
  } catch {
    return DEFAULT_STATUS;
  }
}

/**
 * Record a referral event server-side. Fire-and-forget: a failure here must
 * not interrupt the user's registration flow.
 *
 * The `_refereeAddress` parameter is accepted for backward source
 * compatibility with the previous localStorage API but is no longer sent to
 * the server (the server only needs the referrer to maintain the counter).
 */
export async function recordReferral(
  referrerAddress: string,
  _refereeAddress?: string,
): Promise<void> {
  if (typeof fetch === 'undefined') return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrerAddress }),
    });
  } catch {
    // Intentionally swallowed; this counter is advisory.
  }
}

/**
 * Format the time remaining until the window resets. Pure helper, no network.
 */
export function formatTimeUntilReset(nextResetTime: number | null): string {
  if (!nextResetTime) return 'N/A';

  const remaining = nextResetTime - Date.now();
  if (remaining <= 0) return 'Now';

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
