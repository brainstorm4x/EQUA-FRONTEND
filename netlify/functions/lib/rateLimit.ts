/**
 * Shared rate-limit helper for Netlify Functions, backed by Netlify Blobs.
 *
 * Model: per-key sliding window of request timestamps. On each request we
 *   1. fetch the timestamp list for the key
 *   2. drop entries outside the window
 *   3. reject (429) if the count is >= the limit
 *   4. append "now" and write back
 *
 * Caveats:
 * - Netlify Blobs is eventually consistent across regions, so two parallel
 *   requests *can* both pass when only one slot was free. For abuse-prevention
 *   this is acceptable; for hard quotas use a dedicated store.
 * - On Blobs read/write failure we FAIL OPEN: a transient storage outage
 *   should not lock out legitimate traffic. The error is logged so it can be
 *   alerted on separately.
 *
 * Identifier choice:
 * - For unauthenticated endpoints we key on the client IP, sourced from
 *   x-nf-client-connection-ip (Netlify's authoritative header) and falling
 *   back to x-forwarded-for / x-real-ip. If we can't determine an IP we use
 *   the literal "unknown" — every such request shares a bucket, which is
 *   the safe default (over-limits "unknown" before a real user is harmed).
 * - For authenticated endpoints, callers can pass a stable identity string
 *   (e.g. SHA-256 of the bearer token) so server-to-server callers get their
 *   own bucket rather than sharing the egress NAT IP.
 */

import { getStore as getNetlifyStore } from '@netlify/blobs';
import { createHash } from 'crypto';

const STORE_NAME = 'rate-limits';
const STORE_KEY_PREFIX = 'rl';

export interface RateLimitOptions {
  /** Logical endpoint name. Same name = same bucket. */
  endpoint: string;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed within the window. */
  max: number;
  /** Optional override identifier (defaults to client IP). */
  identity?: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Number of requests inside the window AFTER this one would be counted. */
  count: number;
  /** Same as `count` if rejected; never written if rejected. */
  limit: number;
  /** Milliseconds until the oldest entry exits the window. */
  retryAfterMs: number;
}

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

/**
 * Extract the client IP from a Netlify Functions event.
 */
export function clientIpFrom(
  headers: Record<string, string | undefined>,
): string {
  const direct =
    headers['x-nf-client-connection-ip'] ??
    headers['X-Nf-Client-Connection-Ip'];
  if (direct) return direct;

  const fwd = headers['x-forwarded-for'] ?? headers['X-Forwarded-For'];
  if (fwd) return fwd.split(',')[0].trim();

  const real = headers['x-real-ip'] ?? headers['X-Real-Ip'];
  if (real) return real;

  return 'unknown';
}

/**
 * Stable per-token identity string. Used so authenticated callers don't share
 * a bucket with whatever NAT IP they're routed through.
 */
export function identityFromToken(token: string): string {
  return 'auth:' + createHash('sha256').update(token).digest('hex').slice(0, 16);
}

/**
 * Build the rate-limit response headers per draft-ietf-httpapi-ratelimit.
 */
function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Remaining': String(Math.max(0, decision.limit - decision.count)),
    'Retry-After': String(Math.ceil(decision.retryAfterMs / 1000)),
  };
}

/**
 * Core sliding-window check. Returns the decision; never throws.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
  identity: string,
): Promise<RateLimitDecision> {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  const key = `${STORE_KEY_PREFIX}:${opts.endpoint}:${identity}`;

  const store = getStore();
  if (!store) {
    // Blobs unavailable: fail open with a single-request count.
    return { allowed: true, count: 1, limit: opts.max, retryAfterMs: 0 };
  }

  let timestamps: number[] = [];
  try {
    const existing = await store.get(key, { type: 'json' });
    if (Array.isArray(existing)) {
      timestamps = existing.filter(
        (t): t is number => typeof t === 'number' && t > windowStart,
      );
    }
  } catch (err) {
    console.warn('[rateLimit] read failed, failing open:', err);
    return { allowed: true, count: 1, limit: opts.max, retryAfterMs: 0 };
  }

  if (timestamps.length >= opts.max) {
    const oldest = timestamps[0];
    return {
      allowed: false,
      count: timestamps.length,
      limit: opts.max,
      retryAfterMs: Math.max(0, oldest + opts.windowMs - now),
    };
  }

  timestamps.push(now);

  try {
    await store.setJSON(key, timestamps);
  } catch (err) {
    // Write failure means we won't enforce the next request, but we've
    // already allowed this one — log and move on rather than fail closed.
    console.warn('[rateLimit] write failed:', err);
  }

  return { allowed: true, count: timestamps.length, limit: opts.max, retryAfterMs: 0 };
}

/**
 * Convenience wrapper: enforce a rate limit and return a 429 response on
 * failure, or null on pass. The 429 body and headers carry rate-limit metadata
 * compatible with common clients (Retry-After + X-RateLimit-* headers).
 */
export async function enforceRateLimit(
  headers: Record<string, string | undefined>,
  opts: RateLimitOptions,
  baseResponseHeaders: Record<string, string>,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} | null> {
  const identity = opts.identity ?? clientIpFrom(headers);
  const decision = await checkRateLimit(opts, identity);
  if (decision.allowed) return null;

  return {
    statusCode: 429,
    headers: { ...baseResponseHeaders, ...rateLimitHeaders(decision) },
    body: JSON.stringify({
      success: false,
      error: 'RateLimited',
      message:
        `Too many requests to ${opts.endpoint}. ` +
        `Try again in ${Math.ceil(decision.retryAfterMs / 1000)}s.`,
      retryAfterMs: decision.retryAfterMs,
    }),
  };
}
