/**
 * FX Rate Client - Real-Time Exchange Rate Fetching
 * 
 * Fetches real-time FX rates from ExchangeRate-API (exchangerate-api.com).
 * Provides 3-layer fallback chain for maximum reliability:
 * 1. ExchangeRate-API (primary endpoint)
 * 2. ExchangeRate-API (fallback endpoint - same URL, retry logic)
 * 3. Stale localStorage cache
 * 4. Static DEFAULT_RATES from localeCurrency.ts
 * 
 * Features:
 * - 6-hour localStorage caching with TTL (refreshes 4x daily)
 * - Staleness detection (>24 hours old)
 * - Never throws - always returns a rate (even if stale/static)
 * - USD always returns rate 1.0 with zero age
 */

import { DEFAULT_RATES } from './localeCurrency';

// ============================================================================
// Configuration
// ============================================================================

/**
 * ExchangeRate-API endpoints for FX rate data
 * Free tier: 1,500 requests/month, updates daily
 * Can be overridden via NEXT_PUBLIC_FX_API_URL environment variable
 */
const FX_RATES_PRIMARY_URL = 
  process.env.NEXT_PUBLIC_FX_API_URL || 
  'https://api.exchangerate-api.com/v4/latest/USD';
const FX_RATES_FALLBACK_URL = 
  process.env.NEXT_PUBLIC_FX_API_FALLBACK_URL || 
  'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Cache configuration
 * - TTL: 6 hours (backend updates daily, so 6h ensures freshness within same day)
 * - Staleness: 24 hours (for warning threshold)
 */
const CACHE_KEY = 'equa_fx_rates_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
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
    
    // Transform ExchangeRate-API format to FxRateData
    // API response: { base: "USD", date: "2026-01-06", time_last_updated: 1736121600, rates: {...} }
    // Our format: { rates: {...}, timestamp: number (ms), date: string, source: string }
    
    if (!apiData.rates || !apiData.time_last_updated) {
      console.warn(`Invalid FX rate data from ${url}`);
      return null;
    }
    
    return {
      rates: apiData.rates,
      timestamp: apiData.time_last_updated * 1000, // Convert Unix seconds to milliseconds
      date: apiData.date || new Date().toISOString().split('T')[0],
      source: "exchangerate-api",
    };
  } catch (error) {
    console.warn(`Error fetching FX rates from ${url}:`, error);
    return null;
  }
}

/**
 * Fetch all FX rates from ExchangeRate-API
 * 
 * Fallback chain:
 * 1. Primary ExchangeRate-API endpoint
 * 2. Fallback ExchangeRate-API endpoint (same URL, retry logic)
 * 3. Stale localStorage cache
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
