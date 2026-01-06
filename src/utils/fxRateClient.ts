/**
 * FX Rate Client - Dynamic Foreign Exchange Rate Fetcher
 * 
 * Fetches real-time FX rates from backend (brainstorm4x/EQUA)
 * Falls back to static rates if fetch fails or data is stale
 * 
 * Backend provides daily FX rates via GitHub Actions at:
 * https://raw.githubusercontent.com/brainstorm4x/EQUA/main/data/fx-rates/current.json
 */

import { DEFAULT_RATES, type CurrencyInfo } from './localeCurrency';

/**
 * FX rate data with metadata
 */
export interface FxRateData {
  rate: number;
  source: 'exchangerate-api' | 'cache' | 'fallback' | 'static';
  age: number;  // Age in milliseconds
  isStale: boolean;  // True if rate is >24 hours old
}

/**
 * Backend FX rates format
 */
interface BackendFxRate {
  currency: string;
  rate: number;
  timestamp: string;  // ISO 8601
}

/**
 * Backend FX rates format (matches brainstorm4x/EQUA/data/fx-rates/current. json)
 */
interface BackendFxRatesResponse {
  rates: Record<string, number>;  // { "USD": 1, "EUR": 0.92, ... }
  timestamp: number;               // Unix timestamp in milliseconds
  date: string;                    // YYYY-MM-DD
  source: 'exchangerate-api' | 'fallback';
  next_update?: number;
  api_response_time?: number;
}

/**
 * Fetch FX rates from backend
 * 
 * @returns Map of currency code to FxRateData or null if fetch fails
 */
async function fetchFxRatesFromBackend(): Promise<Map<string, FxRateData> | null> {
  try {
    const response = await fetch(BACKEND_FX_RATES_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache to ensure we get latest rates
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`FX rates fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data:  BackendFxRatesResponse = await response.json();
    
    // Parse rates
    const ratesMap = new Map<string, FxRateData>();
    const now = Date.now();
    const age = now - data. timestamp;  // ✅ Use timestamp field
    const isStale = age > STALENESS_THRESHOLD_MS;
    
    // Convert backend rates object to Map
    for (const [currencyCode, rate] of Object. entries(data.rates)) {
      ratesMap.set(currencyCode, {
        rate,
        source: 'exchangerate-api',
        age,
        isStale,
      });
    }
    
    return ratesMap;
  } catch (error) {
    console.error('Error fetching FX rates from backend:', error);
    return null;
  }
}
/**
 * Get FX rate for a specific currency
 * 
 * Fallback chain:
 * 1. GitHub backend API (fresh data)
 * 2. Stale cache (if available)
 * 3. Static DEFAULT_RATES
 * 
 * @param currencyCode - Currency code (e.g., 'EUR', 'INR')
 * @returns FX rate data with metadata
 */
export async function getFxRate(currencyCode: string): Promise<FxRateData> {
  // Special case: USD always returns 1.0
  if (currencyCode === 'USD') {
    return {
      rate: 1.0,
      source: 'static',
      age: 0,
      isStale: false,
    };
  }
  
  const now = Date.now();
  
  // Check if cache is valid (not expired)
  const cacheAge = now - cacheTimestamp;
  const isCacheValid = fxRatesCache !== null && cacheAge < CACHE_TTL_MS;
  
  // Try to use cache first
  if (isCacheValid && fxRatesCache!.has(currencyCode)) {
    const cachedRate = fxRatesCache!.get(currencyCode)!;
    return {
      ...cachedRate,
      source: 'cache',
    };
  }
  
  // Cache miss or expired - fetch from backend
  const freshRates = await fetchFxRatesFromBackend();
  
  if (freshRates) {
    // Update cache
    fxRatesCache = freshRates;
    cacheTimestamp = now;
    
    // Return fresh rate if available
    if (freshRates.has(currencyCode)) {
      return freshRates.get(currencyCode)!;
    }
  }
  
  // Backend fetch failed - try stale cache
  if (fxRatesCache && fxRatesCache.has(currencyCode)) {
    const staleRate = fxRatesCache.get(currencyCode)!;
    return {
      ...staleRate,
      source: 'fallback',
      isStale: true,
    };
  }
  
  // All else failed - use static fallback
  const staticRate = DEFAULT_RATES[currencyCode];
  if (staticRate) {
    return {
      rate: staticRate.rate,
      source: 'static',
      age: 0,
      isStale: true,  // Static rates are always considered stale
    };
  }
  
  // Currency not found - return 1.0 as ultimate fallback
  console.warn(`Currency ${currencyCode} not found in any source, using 1.0`);
  return {
    rate: 1.0,
    source: 'static',
    age: 0,
    isStale: true,
  };
}

/**
 * Clear FX rates cache (for testing)
 */
export function clearFxRatesCache(): void {
  fxRatesCache = null;
  cacheTimestamp = 0;
}
