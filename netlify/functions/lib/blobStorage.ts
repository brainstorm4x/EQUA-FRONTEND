/**
 * Netlify Blobs Storage Helpers
 *
 * Storage Schema:
 * - Store: `fx-rates` - Latest FX rates (overwritten hourly)
 *
 * NOTE (2026-06-01): The previous `unx-prices` store was retired alongside
 * the off-chain UNX basket pipeline. UNIYAA is now priced in USD directly
 * via the on-chain transaction counter; no off-chain price snapshots are
 * written. The `unx-prices` store and its contents are dropped by
 * `scripts/wipe-performance-data.mjs`.
 */

import { getStore as getNetlifyStore } from '@netlify/blobs';

// ============================================================================
// Store Configuration
// ============================================================================

/**
 * Get Netlify Blobs store with hybrid configuration.
 * Tries Netlify's auto-config first (works in-platform). Falls back to
 * manual config using NETLIFY_SITE_ID + NETLIFY_ACCESS_TOKEN env vars.
 */
function getStore(storeName: string) {
  try {
    return getNetlifyStore(storeName);
  } catch (error) {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;

    if (!siteID || !token) {
      throw new Error(
        'Netlify Blobs configuration missing. ' +
        'Please set NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN environment variables. ' +
        'See docs/NETLIFY_DEPLOYMENT.md for setup instructions.'
      );
    }

    return getNetlifyStore({
      name: storeName,
      siteID,
      token,
    });
  }
}

export const getFxRateStore = () => getStore('fx-rates');

// ============================================================================
// Types
// ============================================================================

/** FX rate data stored in blobs. */
export interface FxRateData {
  timestamp: number;
  date: string;                  // YYYY-MM-DD
  rates: Record<string, number>; // { EUR: 0.91, GBP: 0.79, ... }
  source: 'exchangerate-api' | 'fallback';
  next_update?: number;
  api_response_time?: number;
}

// ============================================================================
// FX Rate Storage Functions
// ============================================================================

/** Store FX rates (overwrites the latest key). */
export async function storeFxRates(data: FxRateData): Promise<void> {
  const store = getFxRateStore();
  await store.setJSON('latest', data);
}

/** Read the latest FX rates, or null if none have been written yet. */
export async function getLatestFxRates(): Promise<FxRateData | null> {
  const store = getFxRateStore();
  const data = await store.get('latest', { type: 'json' });
  return (data as FxRateData | null) ?? null;
}
