/**
 * Netlify Blobs Storage Helpers
 * 
 * Provides helper functions for storing and retrieving EQX price history and FX rates
 * using Netlify Blobs (persistent key-value storage).
 * 
 * Storage Schema:
 * - Store: `eqx-prices` - Historical EQX price snapshots (hourly)
 * - Store: `fx-rates` - Latest FX rates (overwritten hourly)
 */

import { getStore } from '@netlify/blobs';

// ============================================================================
// Types
// ============================================================================

/**
 * EQX price snapshot stored in blobs
 */
export interface EqxPriceSnapshot {
  timestamp: number;           // Unix timestamp (ms)
  price: number;               // EQX basket price (float, 8 decimals)
  priceFixed: string;          // EQX price in fixed-point format (for accuracy)
  slot: number;                // Solana slot number
  components: {
    USDUSD: number;
    EURUSD: number;
    CNHUSD: number;
    JPYUSD: number;
    GBPUSD: number;
    XAUUSD: number;
    OIL: number;
  };
  componentPricesHash: string; // SHA-256 hash (hex)
  weightsHash: string;         // SHA-256 hash (hex)
  source: 'hermes' | 'fallback';
}

/**
 * FX rate data stored in blobs
 */
export interface FxRateData {
  timestamp: number;
  date: string;                 // YYYY-MM-DD
  rates: Record<string, number>; // { EUR: 0.91, GBP: 0.79, ... }
  source: 'exchangerate-api' | 'fallback';
  next_update?: number;
  api_response_time?: number;
}

// ============================================================================
// EQX Price Storage Functions
// ============================================================================

/**
 * Store EQX price snapshot
 * Key format: YYYY-MM-DD-HH (hourly snapshots)
 * 
 * @param data - EQX price snapshot
 */
export async function storeEqxPrice(data: EqxPriceSnapshot): Promise<void> {
  try {
    const store = getStore('eqx-prices');
    
    // Generate key from timestamp
    const date = new Date(data.timestamp);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
    
    // Store as JSON
    await store.set(key, JSON.stringify(data));
    
    console.log(`Stored EQX price snapshot: ${key}`);
  } catch (error) {
    console.error('Error storing EQX price snapshot:', error);
    throw error;
  }
}

/**
 * Get EQX price history
 * 
 * @param from - Start date
 * @param to - End date
 * @returns Array of EQX price snapshots
 */
export async function getEqxHistory(
  from: Date,
  to: Date
): Promise<EqxPriceSnapshot[]> {
  try {
    const store = getStore('eqx-prices');
    
    // Generate all hourly keys in range
    const keys: string[] = [];
    const current = new Date(from);
    
    while (current <= to) {
      const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}-${String(current.getUTCHours()).padStart(2, '0')}`;
      keys.push(key);
      current.setHours(current.getHours() + 1);
    }
    
    // Fetch all snapshots
    const snapshots: EqxPriceSnapshot[] = [];
    
    for (const key of keys) {
      const data = await store.get(key);
      if (data) {
        const snapshot = JSON.parse(data) as EqxPriceSnapshot;
        snapshots.push(snapshot);
      }
    }
    
    // Sort by timestamp
    snapshots.sort((a, b) => a.timestamp - b.timestamp);
    
    return snapshots;
  } catch (error) {
    console.error('Error fetching EQX price history:', error);
    return [];
  }
}

/**
 * Get latest EQX price snapshot
 * 
 * @returns Latest EQX price snapshot or null if not found
 */
export async function getLatestEqxPrice(): Promise<EqxPriceSnapshot | null> {
  try {
    const store = getStore('eqx-prices');
    
    // Get all keys (limited to last 24 hours for performance)
    const list = await store.list();
    
    if (!list.blobs || list.blobs.length === 0) {
      return null;
    }
    
    // Sort keys in descending order (newest first)
    const sortedKeys = list.blobs
      .map(blob => blob.key)
      .sort()
      .reverse();
    
    // Get the most recent snapshot
    const latestKey = sortedKeys[0];
    const data = await store.get(latestKey);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data) as EqxPriceSnapshot;
  } catch (error) {
    console.error('Error fetching latest EQX price:', error);
    return null;
  }
}

// ============================================================================
// FX Rate Storage Functions
// ============================================================================

/**
 * Store FX rates
 * Key: `latest` (single key, overwritten hourly)
 * 
 * @param data - FX rate data
 */
export async function storeFxRates(data: FxRateData): Promise<void> {
  try {
    const store = getStore('fx-rates');
    
    // Store as JSON with key 'latest'
    await store.set('latest', JSON.stringify(data));
    
    console.log('Stored FX rates');
  } catch (error) {
    console.error('Error storing FX rates:', error);
    throw error;
  }
}

/**
 * Get latest FX rates
 * 
 * @returns FX rate data or null if not found
 */
export async function getLatestFxRates(): Promise<FxRateData | null> {
  try {
    const store = getStore('fx-rates');
    
    const data = await store.get('latest');
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data) as FxRateData;
  } catch (error) {
    console.error('Error fetching latest FX rates:', error);
    return null;
  }
}
