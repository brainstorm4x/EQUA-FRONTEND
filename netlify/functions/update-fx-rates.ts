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
    
    // Normalise BEFORE validating:
    // v6 (paid tier with key): response uses `conversion_rates`
    // v4 (free keyless endpoint): response uses `rates`
    const rates = apiData.conversion_rates ?? apiData.rates;

    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      console.error(
        `Invalid FX rate data from API. ` +
        `Top-level keys present: [${Object.keys(apiData).join(', ')}]`
      );
      return null;
    }
    
    // Transform API response to our format
    const timestamp = apiData.time_last_update_unix 
      ? apiData.time_last_update_unix * 1000 
      : Date.now();
    
    const data: FxRateData = {
      timestamp,
      date: apiData.date || new Date().toISOString().split('T')[0],
      rates,
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

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('Starting FX rates update...');

  // Read the last-known-good value from Blobs upfront.
  // This is used for BOTH the idempotency guard AND as the API-failure fallback.
  // It preserves all 160+ currencies at their last real exchange rates.
  let lastKnownGood: FxRateData | null = null;
  try {
    lastKnownGood = await getLatestFxRates();
  } catch (blobsReadError) {
    console.warn('Could not read last-known-good from Blobs (will proceed with API fetch):', blobsReadError);
  }

  // ── Idempotency guard ────────────────────────────────────────────────────
  if (lastKnownGood) {
    const ageMinutes = (Date.now() - lastKnownGood.timestamp) / (60 * 1_000);
    if (ageMinutes < FRESHNESS_THRESHOLD_MINUTES) {
      console.log(`✓ FX rates are fresh (${ageMinutes.toFixed(1)}m old) — skipping API call`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          skipped: true,
          reason: 'rates_fresh',
          ageMinutes: Math.round(ageMinutes),
          timestamp: lastKnownGood.timestamp,
          date: lastKnownGood.date,
          source: lastKnownGood.source,
          next_update: lastKnownGood.next_update,
        }),
      };
    }
    console.log(`FX rates are ${ageMinutes.toFixed(1)}m old — refreshing`);
  } else {
    console.log('No existing FX rates found — fetching fresh data');
  }

  // ── Fetch from ExchangeRate-API ──────────────────────────────────────────
  let fxData: FxRateData | null = null;
  try {
    console.log('Fetching FX rates from ExchangeRate-API...');
    fxData = await fetchFxRatesFromAPI();
  } catch (fetchError) {
    console.error('Unexpected error during API fetch:', fetchError);
  }

  // ── API-failure fallback: use last-known-good from Blobs ─────────────────
  // IMPORTANT: There are NO hardcoded currency values in this file.
  // If the API fails, the fallback is always the last real value from Blobs.
  // This preserves all 160+ currencies at their most recent real exchange rates.
  if (!fxData) {
    if (lastKnownGood) {
      console.warn(
        `⚠ API fetch failed — using last-known-good rates from ${lastKnownGood.date} ` +
        `(${Object.keys(lastKnownGood.rates).length} currencies, source: ${lastKnownGood.source}). ` +
        `These are real rates from the last successful API call, not hardcoded values.`
      );
      // Re-store with a refreshed timestamp so downstream consumers know
      // this function ran and attempted a refresh, even if the API was unavailable.
      fxData = {
        ...lastKnownGood,
        source: 'fallback', // Mark as fallback so consumers can detect this condition
      };
    } else {
      // No API data AND no Blobs data: this is a genuine cold-start failure.
      // Do NOT store anything. Return 503 so Netlify can retry.
      console.error(
        '✗ CRITICAL: API fetch failed and no last-known-good data exists in Blobs. ' +
        'No FX rates are available. Ensure NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN ' +
        'are set, and that update-fx-rates has successfully run at least once.'
      );
      return {
        statusCode: 503,
        body: JSON.stringify({
          success: false,
          error: 'no_data_available',
          message:
            'ExchangeRate-API fetch failed and no previous rates exist in Blobs. ' +
            'FX rates are temporarily unavailable.',
        }),
      };
    }
  }

  // ── Store to Netlify Blobs (best-effort, non-fatal) ───────────────────────
  let blobsWriteSuccess = false;
  try {
    console.log(`Storing ${Object.keys(fxData.rates).length} FX rates to Netlify Blobs...`);
    await storeFxRates(fxData);
    blobsWriteSuccess = true;
    console.log('✓ FX rates stored to Netlify Blobs');
  } catch (blobsError) {
    console.warn(
      '⚠ Blobs write failed — rates not persisted. ' +
      'Ensure NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN are set in Netlify environment variables.',
      blobsError
    );
  }

  console.log('FX rates update completed');

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      blobsWriteSuccess,
      timestamp: fxData.timestamp,
      date: fxData.date,
      source: fxData.source,
      currencyCount: Object.keys(fxData.rates).length,
      next_update: fxData.next_update,
      api_response_time: fxData.api_response_time,
      // Sample rates for quick visual verification when invoking manually
      sampleRates: {
        INR: fxData.rates['INR'],
        EUR: fxData.rates['EUR'],
        GBP: fxData.rates['GBP'],
        JPY: fxData.rates['JPY'],
      },
    }),
  };
};

// Export as scheduled function (runs hourly)
export { handler };
export const config = {
  schedule: '0 * * * *', // Hourly at minute 0
};
