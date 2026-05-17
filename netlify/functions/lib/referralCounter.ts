/**
 * Server-side referral rate-limit counter.
 *
 * Stores a 24h sliding window of referral timestamps per referrer in Netlify
 * Blobs. Replaces the previous per-browser localStorage counter, which was
 * trivially bypassable by clearing storage.
 *
 * Caveats (documented limitations of this implementation):
 * 1. The /record endpoint trusts the caller to honestly report that a
 *    referral happened. We do NOT verify the on-chain transaction in this
 *    iteration — any client can pollute a counter. This is still a strict
 *    improvement over localStorage because the counter is now global and
 *    not erasable from a single browser, but real enforcement requires
 *    the on-chain program to read/write this state (out of scope here).
 * 2. Netlify Blobs is eventually consistent; concurrent writes within the
 *    same second can lose one update. Acceptable for an advisory counter.
 */

import { getStore as getNetlifyStore } from '@netlify/blobs';

const STORE_NAME = 'referral-rate-limit';

export const REFERRAL_RATE_LIMIT = 10;                  // events
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function getStore() {
  try {
    return getNetlifyStore(STORE_NAME);
  } catch {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!siteID || !token) return null;
    return getNetlifyStore({ name: STORE_NAME, siteID, token });
  }
}

export interface ReferralRateLimitStatus {
  referrerAddress: string;
  recentReferrals: number;
  totalReferrals: number;
  isRateLimited: boolean;
  limit: number;
  windowMs: number;
}

interface StoredEntry {
  timestamps: number[];
  totalReferrals: number;
}

async function read(referrer: string): Promise<StoredEntry> {
  const store = getStore();
  if (!store) return { timestamps: [], totalReferrals: 0 };

  try {
    const existing = await store.get(referrer, { type: 'json' });
    if (existing && typeof existing === 'object') {
      const e = existing as Partial<StoredEntry>;
      return {
        timestamps: Array.isArray(e.timestamps)
          ? e.timestamps.filter((t): t is number => typeof t === 'number')
          : [],
        totalReferrals: typeof e.totalReferrals === 'number' ? e.totalReferrals : 0,
      };
    }
  } catch (err) {
    console.warn('[referralCounter] read failed:', err);
  }
  return { timestamps: [], totalReferrals: 0 };
}

async function write(referrer: string, entry: StoredEntry): Promise<void> {
  const store = getStore();
  if (!store) return;
  try {
    await store.setJSON(referrer, entry);
  } catch (err) {
    console.warn('[referralCounter] write failed:', err);
  }
}

/**
 * Read the current status for a referrer. Never mutates.
 */
export async function getStatus(referrer: string): Promise<ReferralRateLimitStatus> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const entry = await read(referrer);
  const recentReferrals = entry.timestamps.filter((t) => t > cutoff).length;
  return {
    referrerAddress: referrer,
    recentReferrals,
    totalReferrals: entry.totalReferrals,
    isRateLimited: recentReferrals >= REFERRAL_RATE_LIMIT,
    limit: REFERRAL_RATE_LIMIT,
    windowMs: RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Record a referral event for a referrer. Returns the new status.
 */
export async function recordReferral(referrer: string): Promise<ReferralRateLimitStatus> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const entry = await read(referrer);
  const pruned = entry.timestamps.filter((t) => t > cutoff);
  pruned.push(now);

  const next: StoredEntry = {
    timestamps: pruned,
    totalReferrals: entry.totalReferrals + 1,
  };
  await write(referrer, next);

  return {
    referrerAddress: referrer,
    recentReferrals: pruned.length,
    totalReferrals: next.totalReferrals,
    isRateLimited: pruned.length >= REFERRAL_RATE_LIMIT,
    limit: REFERRAL_RATE_LIMIT,
    windowMs: RATE_LIMIT_WINDOW_MS,
  };
}
