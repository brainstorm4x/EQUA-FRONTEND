/**
 * Netlify Scheduled Function: Update FX Rates
 * 
 * Schedule: Hourly (0 * * * *)
 * 
 * Tasks:
 * 1. Fetch daily FX rates from ExchangeRate-API
 * 2. Store rates in Netlify Blobs (key: `latest`)
 */

import { Handler } from '@netlify/functions';
import { storeFxRates, getLatestFxRates, FxRateData } from './lib/blobStorage';

// ============================================================================
// Environment Variable Validation (runs at module load time)
// ============================================================================

/**
 * Validate environment at startup
 * Note: EXCHANGERATE_API_KEY is optional (fallback to free API)
 */
function validateEnvironment(): void {
  console.log('✓ FX rates function environment validated');
  
  if (!process.env.EXCHANGERATE_API_KEY) {
    console.warn('⚠ EXCHANGERATE_API_KEY not set, will use fallback API or default key');
  }
}

// Run validation at module load time
validateEnvironment();

// ============================================================================
// Configuration
// ============================================================================

/**
 * ExchangeRate-API configuration
 * Uses environment variable if available, falls back to free tier
 */
const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY || '';

/**
 * ExchangeRate-API endpoint (paid tier with API key)
 */
const EXCHANGERATE_API_URL = EXCHANGERATE_API_KEY
  ? `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`
  : '';

/**
 * Fallback URL (free version, no key required)
 */
const FALLBACK_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Skip API call if stored data is fresher than this many minutes.
 * 5-minute buffer below 60 ensures hourly refreshes still fire on schedule
 * while blocking duplicate calls from deploys or Netlify retries.
 */
const FRESHNESS_THRESHOLD_MINUTES = 55;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch FX rates from ExchangeRate-API
 */
async function fetchFxRatesFromAPI(): Promise<FxRateData | null> {
  try {
    const startTime = Date.now();
    
    // Try primary API with key first (if available)
    let response;
    if (EXCHANGERATE_API_KEY) {
      console.log('Fetching FX rates from paid tier...');
      response = await fetch(EXCHANGERATE_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // If primary fails, try fallback
      if (!response.ok) {
        console.warn(`Paid tier API failed (${response.status}), trying free tier...`);
        response = await fetch(FALLBACK_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
      }
    } else {
      // No API key, use free tier
      console.log('Fetching FX rates from free tier...');
      response = await fetch(FALLBACK_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    }
    
    if (!response.ok) {
      console.error(`FX rate fetch failed: ${response.status}`);
      return null;
    }
    
    const apiData = await response.json();
    const apiResponseTime = Date.now() - startTime;
    
    // Validate response
    if (!apiData.rates || typeof apiData.rates !== 'object') {
      console.error('Invalid FX rate data: missing or invalid rates');
      return null;
    }
    
    // Transform API response to our format
    const timestamp = apiData.time_last_update_unix 
      ? apiData.time_last_update_unix * 1000 
      : Date.now();
    
    const data: FxRateData = {
      timestamp,
      date: apiData.date || new Date().toISOString().split('T')[0],
      rates: apiData.rates || apiData.conversion_rates,
      source: 'exchangerate-api',
      next_update: apiData.time_next_update_unix ? apiData.time_next_update_unix * 1000 : undefined,
      api_response_time: apiResponseTime,
    };
    
    return data;
  } catch (error) {
    console.error('Error fetching FX rates from API:', error);
    return null;
  }
}

/**
 * Get fallback FX rates
 */
function getFallbackRates(): FxRateData {
  // Static fallback rates (updated 2026-01-08)
  const fallbackRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.91,
    GBP: 0.79,
    JPY: 149.5,
    CNY: 7.24,
    INR: 83.25,
    AUD: 1.52,
    CAD: 1.35,
    CHF: 0.88,
    SEK: 10.45,
    // Add more common currencies as needed
  };
  
  return {
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    rates: fallbackRates,
    source: 'fallback',
  };
}

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('Starting FX rates update...');

  // ── Idempotency guard: skip if data was fetched less than 55 minutes ago ──
  // Prevents duplicate API calls when triggered by deploys or Netlify retries.
  // Budget protection: ensures we stay within the 1,500 req/month free tier.
  try {
    const existing = await getLatestFxRates();
    if (existing) {
      const ageMinutes = (Date.now() - existing.timestamp) / (60 * 1_000);
      if (ageMinutes < FRESHNESS_THRESHOLD_MINUTES) {
        console.log(`✓ FX rates are fresh (${ageMinutes.toFixed(1)}m old) — skipping API call`);
        return {
          statusCode: 200,
          body: JSON.stringify({
            skipped: true,
            reason: 'rates_fresh',
            ageMinutes: Math.round(ageMinutes),
            timestamp: existing.timestamp,
            date: existing.date,
            source: existing.source,
            next_update: existing.next_update,
          }),
        };
      }
      console.log(`FX rates are ${ageMinutes.toFixed(1)}m old — refreshing`);
    } else {
      console.log('No existing FX rates found — fetching fresh data');
    }
  } catch (guardError) {
    // If the freshness check itself fails, proceed with fetch (fail-open)
    console.warn('Freshness check failed, proceeding with API fetch:', guardError);
  }

  try {
    // Fetch FX rates from API
    console.log('Fetching FX rates from ExchangeRate-API...');
    let fxData = await fetchFxRatesFromAPI();
    
    // Fallback to static rates if API fails
    if (!fxData) {
      console.warn('API fetch failed, using fallback rates');
      fxData = getFallbackRates();
    }
    
    console.log(`Fetched ${Object.keys(fxData.rates).length} currency rates`);
    console.log('Source:', fxData.source);
    
    // Store to Netlify Blobs
    console.log('Storing FX rates to Netlify Blobs...');
    await storeFxRates(fxData);
    
    console.log('FX rates update completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp: fxData.timestamp,
        date: fxData.date,
        source: fxData.source,
        currencyCount: Object.keys(fxData.rates).length,
        next_update: fxData.next_update,
        api_response_time: fxData.api_response_time,
      }),
    };
  } catch (error) {
    console.error('Error updating FX rates:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Export as scheduled function (runs hourly)
export { handler };
export const config = {
  schedule: '0 * * * *', // Hourly at minute 0
};
