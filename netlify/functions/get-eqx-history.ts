/**
 * Netlify API Function: Get UNX Price History
 * 
 * On-demand function to query historical UNX prices for charts/analysis
 * 
 * Query params:
 * - ?from=YYYY-MM-DD (optional, default: 7 days ago)
 * - ?to=YYYY-MM-DD (optional, default: now)
 * - ?interval=hourly|daily (optional, default: hourly)
 */

import { Handler } from '@netlify/functions';
import { getUnxHistory, UnxPriceSnapshot } from './lib/blobStorage';
import { enforceRateLimit } from './lib/rateLimit';

// Historical data; query can be expensive on large windows.
const RATE_LIMIT = { endpoint: 'get-eqx-history', windowMs: 60_000, max: 60 };

const BASE_CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse date from query parameter
 */
function parseDate(dateString: string | undefined, defaultDate: Date): Date {
  if (!dateString) {
    return defaultDate;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return defaultDate;
    }
    return date;
  } catch {
    return defaultDate;
  }
}

/**
 * Aggregate hourly data to daily averages
 */
function aggregateToDaily(snapshots: UnxPriceSnapshot[]): UnxPriceSnapshot[] {
  const dailyMap = new Map<string, UnxPriceSnapshot[]>();
  
  // Group by date
  for (const snapshot of snapshots) {
    const date = new Date(snapshot.timestamp);
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, []);
    }
    dailyMap.get(dateKey)!.push(snapshot);
  }
  
  // Calculate daily averages
  const dailySnapshots: UnxPriceSnapshot[] = [];
  
  for (const [dateKey, daySnapshots] of dailyMap) {
    const avgPrice = daySnapshots.reduce((sum, s) => sum + s.price, 0) / daySnapshots.length;
    const n = daySnapshots.length;
    const avgComponents = {
      USDUSD:   daySnapshots.reduce((sum, s) => sum + s.components.USDUSD,   0) / n,
      EURUSD:   daySnapshots.reduce((sum, s) => sum + s.components.EURUSD,   0) / n,
      CNHUSD:   daySnapshots.reduce((sum, s) => sum + s.components.CNHUSD,   0) / n,
      JPYUSD:   daySnapshots.reduce((sum, s) => sum + s.components.JPYUSD,   0) / n,
      GBPUSD:   daySnapshots.reduce((sum, s) => sum + s.components.GBPUSD,   0) / n,
      XAUUSD:   daySnapshots.reduce((sum, s) => sum + s.components.XAUUSD,   0) / n,
      XAGUSD:   daySnapshots.reduce((sum, s) => sum + s.components.XAGUSD,   0) / n,
      XCUUSD:   daySnapshots.reduce((sum, s) => sum + s.components.XCUUSD,   0) / n,
      OILWTI:   daySnapshots.reduce((sum, s) => sum + s.components.OILWTI,   0) / n,
      OILBRENT: daySnapshots.reduce((sum, s) => sum + s.components.OILBRENT, 0) / n,
    };
    
    // Use the latest snapshot of the day for metadata
    const latestSnapshot = daySnapshots[daySnapshots.length - 1];
    
    dailySnapshots.push({
      timestamp: new Date(dateKey).getTime(),
      price: avgPrice,
      priceFixed: latestSnapshot.priceFixed,
      slot: latestSnapshot.slot,
      components: avgComponents,
      componentPricesHash: latestSnapshot.componentPricesHash,
      weightsHash: latestSnapshot.weightsHash,
      source: latestSnapshot.source,
    });
  }
  
  return dailySnapshots.sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  const rateLimited = await enforceRateLimit(event.headers ?? {}, RATE_LIMIT, BASE_CORS);
  if (rateLimited) return rateLimited;

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const fromDate = parseDate(params.from, sevenDaysAgo);
    const toDate = parseDate(params.to, now);
    const interval = params.interval === 'daily' ? 'daily' : 'hourly';
    
    console.log(`Fetching UNX history from ${fromDate.toISOString()} to ${toDate.toISOString()}, interval: ${interval}`);
    
    // Fetch historical data
    let snapshots = await getUnxHistory(fromDate, toDate);
    
    // Aggregate to daily if requested
    if (interval === 'daily') {
      snapshots = aggregateToDaily(snapshots);
    }
    
    // Transform to response format
    const data = snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      price: snapshot.price,
      slot: snapshot.slot,
      components: snapshot.components,
      source: snapshot.source,
    }));
    
    console.log(`Returning ${data.length} data points`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        data,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        interval,
        count: data.length,
      }),
    };
  } catch (error) {
    console.error('Error fetching UNX history:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
