/**
 * FX Rate Client - Real-Time Exchange Rate Fetching
 * 
 * Fetches FX rates from the EQUA Netlify function (get-fx-rates),
 * which reads blob-stored rates updated hourly by the update-fx-rates scheduled function.
 * NEVER calls ExchangeRate-API directly from the browser.
 * Provides 4-layer fallback chain for maximum reliability:
 * 1. Fresh localStorage cache (<2h old)
 * 2. Netlify get-fx-rates function (reads from blobs, updated hourly)
 * 3. Stale localStorage cache (emergency fallback)
 * 4. Static DEFAULT_RATES from localeCurrency.ts
 * 
 * Features:
 * - 2-hour localStorage caching with TTL (aligns with hourly Netlify backend updates)
 * - Staleness detection (>24 hours old)
 * - Never throws - always returns a rate (even if stale/static)
 * - USD always returns rate 1.0 with zero age
 */

import { DEFAULT_RATES } from './localeCurrency';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Netlify function endpoints for FX rate data
 * Reads blob-stored rates updated hourly by the update-fx-rates scheduled function.
 * Can be overridden via NEXT_PUBLIC_FX_RATES_URL environment variable.
 * NEVER call ExchangeRate-API directly from the browser.
 */
const FX_RATES_PRIMARY_URL = 
  process.env.NEXT_PUBLIC_FX_RATES_URL || 
  'https://equa-frontend.netlify.app/.netlify/functions/get-fx-rates';
const FX_RATES_FALLBACK_URL = 
  process.env.NEXT_PUBLIC_FX_RATES_FALLBACK_URL ||
  'https://equa-frontend.netlify.app/.netlify/functions/get-fx-rates';

/**
 * Cache configuration
 * - TTL: 2 hours (aligns with hourly Netlify scheduled function updates)
 * - Staleness: 24 hours (for warning threshold)
 * 
 * With Netlify updating FX rates hourly, a 2h cache ensures:
 * - Frontend refreshes within 3 backend update cycles max
 * - Offline resilience still maintained
 * - Balance between freshness and API call reduction
 */
const CACHE_KEY = 'equa_fx_rates_cache';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (reduced from 6h)
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * FX rate data structure from backend
 * Matches brainstorm4x/EQUA backend API contract
 */
export interface FxRateData {
  rates: Record<string, number>;        // 162 currency pairs
  timestamp: number;                     // Unix timestamp (ms)
  date: string;                          // YYYY-MM-DD
  source: "exchangerate-api" | "fallback";
  next_update?: number;                  // Optional: next update timestamp
  api_response_time?: number;            // Optional: API response time in ms
}

/**
 * FX rate response for a specific currency
 */
export interface FxRateResponse {
  rate: number;                          // Exchange rate (USD → currency)
  source: "exchangerate-api" | "fallback" | "cache" | "static";
  age: number;                           // Milliseconds since last update
  isStale: boolean;                      // True if >24 hours old
}

/**
 * Cached FX rate data with TTL metadata
 */
interface CachedFxData {
  data: FxRateData;
  cachedAt: number;                      // Timestamp when cached (ms)
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached FX rate data from localStorage
 * @returns Cached data or null if not found/expired
 */
function getCachedData(): CachedFxData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedFxData;
    const now = Date.now();
    
    // Check if cache is expired (strict TTL check)
    if (now - parsed.cachedAt > CACHE_TTL_MS) {
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to read FX rate cache:', error);
    return null;
  }
}

/**
 * Get stale cache (even if expired) as last resort
 * @returns Cached data or null if not found
 */
function getStaleCachedData(): CachedFxData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    return JSON.parse(cached) as CachedFxData;
  } catch (error) {
    console.warn('Failed to read stale FX rate cache:', error);
    return null;
  }
}

/**
 * Save FX rate data to localStorage
 * @param data - FX rate data to cache
 */
function setCachedData(data: FxRateData): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cached: CachedFxData = {
      data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to save FX rate cache:', error);
  }
}

/**
 * Clear FX rate cache from localStorage
 */
export function clearFxCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear FX rate cache:', error);
  }
}

/**
 * Check if cache is valid (fresh and not expired)
 * @returns True if cache is valid, false otherwise
 */
export function isCacheValid(): boolean {
  const cached = getCachedData();
  return cached !== null;
}

/**
 * Get age of cached data in hours
 * @returns Age in hours, or null if no cache
 */
export function getRateAge(): number | null {
  const cached = getStaleCachedData();
  if (!cached) return null;
  
  const ageMs = Date.now() - cached.cachedAt;
  return ageMs / (60 * 60 * 1000); // Convert to hours
}

// ============================================================================
// API Fetching
// ============================================================================

/**
 * Fetch FX rates from a specific URL
 * @param url - URL to fetch from
 * @returns FX rate data or null if fetch fails
 */
async function fetchFromUrl(url: string): Promise<FxRateData | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache at HTTP level - we manage our own cache
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.warn(`FX rate fetch failed from ${url}: ${response.status}`);
      return null;
    }
    
    const apiData = await response.json();
    
    // Validate required fields — Netlify get-fx-rates response format:
    // { timestamp: number (ms), date: string, rates: {...}, source: string, next_update?: number }
    
    // Validate required fields with type checking
    if (!apiData.rates || typeof apiData.rates !== 'object') {
      console.warn(`Invalid FX rate data from ${url}:  missing or invalid rates`);
      return null;
    }
    
    if (!apiData.timestamp || typeof apiData.timestamp !== 'number') {
      console.warn(`Invalid FX rate data from ${url}: missing or invalid timestamp`);
      return null;
    }
    
    // Validate at least one rate exists
    if (Object.keys(apiData.rates).length === 0) {
      console.warn(`Invalid FX rate data from ${url}:  empty rates object`);
      return null;
    }
        
    return {
      rates: apiData.rates,
      timestamp: apiData.timestamp,   // already milliseconds from our Netlify function
      date: apiData.date || new Date().toISOString().split('T')[0],
      source: apiData.source || 'exchangerate-api',
      next_update: apiData.next_update,
    };
  } catch (error) {
    console.warn(`Error fetching FX rates from ${url}:`, error);
    return null;
  }
}

/**
 * Fetch all FX rates from the Netlify get-fx-rates function
 * 
 * Fallback chain:
 * 1. Fresh localStorage cache (<2h old)
 * 2. Netlify get-fx-rates function (reads from blobs, updated hourly)
 * 3. Stale localStorage cache (emergency fallback)
 * 4. Static DEFAULT_RATES (never returns null)
 * 
 * @returns FX rate data (never null)
 */
export async function fetchFxRates(): Promise<FxRateData> {
  // Check fresh cache first
  const cached = getCachedData();
  if (cached) {
    return cached.data;
  }
  
  // Try primary URL
  let data = await fetchFromUrl(FX_RATES_PRIMARY_URL);
  if (data) {
    setCachedData(data);
    return data;
  }
  
  // Try fallback URL
  data = await fetchFromUrl(FX_RATES_FALLBACK_URL);
  if (data) {
    setCachedData(data);
    return data;
  }
  
  // Try stale cache as last resort
  const staleCache = getStaleCachedData();
  if (staleCache) {
    console.warn('Using stale FX rate cache (API unavailable)');
    return staleCache.data;
  }
  
  // Final fallback: construct data from DEFAULT_RATES
  console.warn('All FX rate sources failed, using static DEFAULT_RATES');
  return {
    rates: Object.fromEntries(
      Object.entries(DEFAULT_RATES).map(([code, info]) => [code, info.rate])
    ),
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    source: "fallback",
  };
}

/**
 * Get FX rate for a specific currency
 * 
 * Special cases:
 * - USD always returns { rate: 1.0, source: "static", age: 0, isStale: false }
 * - Unknown currencies fall back to rate 1.0 with source: "static"
 * 
 * @param currency - Currency code (e.g., 'EUR', 'INR', 'JPY')
 * @returns FX rate response with metadata
 */
export async function getFxRate(currency: string): Promise<FxRateResponse> {
  // Special case: USD is always 1.0
  if (currency === 'USD') {
    return {
      rate: 1.0,
      source: "static",
      age: 0,
      isStale: false,
    };
  }
  
  // Check if we have fresh cache BEFORE fetching
  const cachedBefore = getCachedData();
  const wasFromCache = cachedBefore !== null;
  
  // Fetch fresh or cached data
  const fxData = await fetchFxRates();
  
  // Get rate for currency
  const rate = fxData.rates[currency];
  
  // Unknown currency - fall back to 1.0
  if (!rate) {
    console.warn(`Unknown currency ${currency}, using rate 1.0`);
    return {
      rate: 1.0,
      source: "static",
      age: 0,
      isStale: false,
    };
  }
  
  // Calculate age
  const now = Date.now();
  const age = now - fxData.timestamp;
  const isStale = age > STALE_THRESHOLD_MS;
  
  // Determine source based on whether we used cache
  let source: FxRateResponse['source'] = fxData.source;
  if (wasFromCache) {
    source = 'cache';
  }
  
  return {
    rate,
    source,
    age,
    isStale,
  };
}
