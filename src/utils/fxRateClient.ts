/**
 * FX Rate Client - Real-Time Exchange Rate Fetching
 *
 * Fetches FX rates from the UNIA Netlify function (get-fx-rates),
 * which reads blob-stored rates updated hourly by the update-fx-rates scheduled function.
 * NEVER calls ExchangeRate-API directly from the browser.
 * Provides 4-layer fallback chain for maximum reliability:
 * 1. Fresh localStorage cache (<2h old)
 * 2. Netlify get-fx-rates function (reads from blobs, updated hourly)
 * 3. Stale localStorage cache (emergency fallback)
 * 4. Static DEFAULT_RATES from localeCurrency.ts
 *
 * Features:
 * - In-flight request deduplication (prevents concurrent duplicate calls)
 * - 2-hour localStorage caching with TTL
 * - Staleness detection (>24 hours old)
 * - Never throws - always returns a rate (even if stale/static)
 * - USD always returns rate 1.0 with zero age
 */

import { DEFAULT_RATES } from "./localeCurrency";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Netlify function endpoint for FX rate data (relative path for same-origin).
 * Using a relative URL ensures:
 *  - Correct routing on any Netlify domain/branch deploy
 *  - Same-origin request (no CORS overhead)
 *  - HTTP Cache-Control header from the function is respected by the browser
 *
 * Can be overridden via NEXT_PUBLIC_FX_RATES_URL for local dev.
 * NEVER point this to ExchangeRate-API directly from the browser.
 */
const FX_RATES_URL =
  process.env.NEXT_PUBLIC_FX_RATES_URL || "/.netlify/functions/get-fx-rates";

/**
 * Cache configuration
 * - TTL: 2 hours (aligns with hourly Netlify scheduled function updates)
 * - Staleness: 24 hours (for warning/staleness detection)
 */
// Increment this version when a deploy should force-clear all client FX caches
// (e.g., after fixing stale data bugs, changing the Blobs data format, etc.)
const CACHE_VERSION = "v2";
const CACHE_KEY = `equa_fx_rates_cache_${CACHE_VERSION}`;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const BLOBS_STALE_THRESHOLD_SECONDS = 7200; // 2 hours — warn if Blobs data is older than this

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface FxRateData {
  rates: Record<string, number>;
  timestamp: number;
  date: string;
  source: "exchangerate-api" | "fallback";
  next_update?: number;
  api_response_time?: number;
}

export interface FxRateResponse {
  rate: number;
  source: "exchangerate-api" | "fallback" | "cache" | "static";
  age: number;
  isStale: boolean;
}

interface CachedFxData {
  data: FxRateData;
  cachedAt: number;
}

// ============================================================================
// In-Flight Request Deduplication
// ============================================================================

/**
 * Module-level in-flight promise.
 * If fetchFxRates() is called concurrently (e.g. multiple components mounting
 * at the same time), all callers share the same in-flight fetch rather than
 * each issuing an independent network request.
 */
let _inflight: Promise<FxRateData> | null = null;

// ============================================================================
// Cache Management
// ============================================================================

function getCachedData(): CachedFxData | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedFxData;
    // Expire on localStorage TTL
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    // Also expire if the upstream source has signalled a newer update is available
    if (parsed.data.next_update && Date.now() > parsed.data.next_update) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getStaleCachedData(): CachedFxData | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as CachedFxData;
  } catch {
    return null;
  }
}

function setCachedData(data: FxRateData): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedFxData = { data, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage may be unavailable (private mode, storage full)
  }
}

export function clearFxCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function isCacheValid(): boolean {
  return getCachedData() !== null;
}

export function getRateAge(): number | null {
  const cached = getStaleCachedData();
  if (!cached) return null;
  return (Date.now() - cached.cachedAt) / (60 * 60 * 1000);
}

// ============================================================================
// API Fetching
// ============================================================================

async function fetchFromUrl(url: string): Promise<FxRateData | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Do NOT use 'no-store' — allow the browser to honour the
      // Cache-Control: public, max-age=3600 header returned by get-fx-rates.
      // Our localStorage layer handles application-level caching.
    });

    if (!response.ok) {
      console.warn(`FX rate fetch failed from ${url}: ${response.status}`);
      return null;
    }

    const apiData = await response.json();

    if (!apiData.rates || typeof apiData.rates !== "object") {
      console.warn(
        `Invalid FX rate data from ${url}: missing or invalid rates`,
      );
      return null;
    }
    if (!apiData.timestamp || typeof apiData.timestamp !== "number") {
      console.warn(
        `Invalid FX rate data from ${url}: missing or invalid timestamp`,
      );
      return null;
    }
    if (Object.keys(apiData.rates).length === 0) {
      console.warn(`Invalid FX rate data from ${url}: empty rates object`);
      return null;
    }

    if (apiData.data_age_seconds && apiData.data_age_seconds > BLOBS_STALE_THRESHOLD_SECONDS) {
      console.warn(
        `⚠ Blobs data is ${Math.round(apiData.data_age_seconds / 3600)}h old — ` +
        `update-fx-rates may not have run recently. Rates may be stale.`
      );
    }

    return {
      rates: apiData.rates,
      timestamp: apiData.timestamp,
      date: apiData.date || new Date().toISOString().split("T")[0],
      source: apiData.source || "exchangerate-api",
      next_update: apiData.next_update,
    };
  } catch (error) {
    console.warn(`Error fetching FX rates from ${url}:`, error);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch all FX rates from the Netlify get-fx-rates function.
 *
 * Resolution order:
 * 1. Fresh localStorage cache (<2h old) — zero network requests
 * 2. Netlify get-fx-rates function — reads from Netlify Blobs (updated hourly)
 * 3. Stale localStorage cache — emergency offline fallback
 * 4. Static DEFAULT_RATES — never returns null
 *
 * Concurrent calls within the same page are deduplicated via a shared
 * in-flight Promise, so only ONE network request is ever made per page cold load.
 */
export async function fetchFxRates(): Promise<FxRateData> {
  // 1. Fresh cache hit — no network request needed
  const cached = getCachedData();
  if (cached) {
    return cached.data;
  }

  // 2. Deduplicate concurrent calls: if a fetch is already in progress,
  //    all concurrent callers await the same promise.
  if (_inflight) {
    return _inflight;
  }

  _inflight = (async () => {
    try {
      const data = await fetchFromUrl(FX_RATES_URL);
      if (data) {
        setCachedData(data);
        return data;
      }

      // Network fetch failed — try stale cache
      const staleCache = getStaleCachedData();
      if (staleCache) {
        console.warn("FX rate fetch failed, using stale cache");
        return staleCache.data;
      }

      // Last resort: static DEFAULT_RATES
      console.warn("All FX rate sources failed, using static DEFAULT_RATES");
      return {
        rates: Object.fromEntries(
          Object.entries(DEFAULT_RATES).map(([code, info]) => [
            code,
            info.rate,
          ]),
        ),
        timestamp: Date.now(),
        date: new Date().toISOString().split("T")[0],
        source: "fallback" as const,
      };
    } finally {
      // Always clear the in-flight reference so future calls (after cache
      // expires) can issue a fresh request.
      _inflight = null;
    }
  })();

  return _inflight;
}

/**
 * Get FX rate for a specific currency.
 *
 * Special cases:
 * - USD always returns { rate: 1.0, source: "static", age: 0, isStale: false }
 * - Unknown currencies fall back to rate 1.0
 */
export async function getFxRate(currency: string): Promise<FxRateResponse> {
  if (currency === "USD") {
    return { rate: 1.0, source: "static", age: 0, isStale: false };
  }

  const cachedBefore = getCachedData();
  const wasFromCache = cachedBefore !== null;

  const fxData = await fetchFxRates();
  const rate = fxData.rates[currency];

  if (!rate) {
    console.warn(`Unknown currency ${currency}, using rate 1.0`);
    return { rate: 1.0, source: "static", age: 0, isStale: false };
  }

  const age = Date.now() - fxData.timestamp;
  const isStale = age > STALE_THRESHOLD_MS;
  const source: FxRateResponse["source"] = wasFromCache
    ? "cache"
    : fxData.source;

  return { rate, source, age, isStale };
}
