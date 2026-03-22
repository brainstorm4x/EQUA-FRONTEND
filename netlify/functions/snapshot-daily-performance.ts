/**
 * Netlify Scheduled Function: Snapshot Daily Performance
 *
 * Schedule: 0 0 * * * (daily at 00:00 UTC)
 *
 * Tasks:
 * 1. Fetch yesterday's hourly rows from the unx_price_snapshots Turso table.
 * 2. Compute daily OHLC values for the UNIA price and the UNX basket close.
 * 3. Compute "$100 held" comparison metrics (uniaHoldingValue, usdHoldingValue,
 *    advantagePerHundred) using the very first snapshot as the baseline.
 * 4. Write a row to the unx_daily_performance table (idempotent via INSERT OR REPLACE).
 * 5. Run Netlify Blobs housekeeping (delete snapshots older than 30 days).
 */

import { Handler } from '@netlify/functions';
import {
  getUnxPerformanceHistory,
  getEarliestSnapshot,
  storeDailyPerformance,
} from './lib/tursoStorage';
import { cleanupOldUnxPrices } from './lib/blobStorage';

// Initial investment amount used as the baseline for "$100 held" calculations.
const BASELINE_INVESTMENT_USD = 100;

// ============================================================================
// Handler
// ============================================================================

const handler: Handler = async (): Promise<{ statusCode: number; body: string }> => {
  console.log('snapshot-daily-performance: starting');

  // ------------------------------------------------------------------
  // Guard: require Turso credentials
  // ------------------------------------------------------------------
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error(
      'snapshot-daily-performance: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set. Aborting.'
    );
    return { statusCode: 503, body: 'Turso database not configured' };
  }

  // ------------------------------------------------------------------
  // Determine yesterday's date window (UTC)
  // ------------------------------------------------------------------
  const now = new Date();
  const yesterdayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0)
  );
  const yesterdayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999)
  );

  const dateStr =
    `${yesterdayStart.getUTCFullYear()}-` +
    `${String(yesterdayStart.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(yesterdayStart.getUTCDate()).padStart(2, '0')}`;

  console.log(`snapshot-daily-performance: snapshotting ${dateStr}`);

  // ------------------------------------------------------------------
  // Fetch hourly rows for yesterday
  // ------------------------------------------------------------------
  let rows;
  try {
    rows = await getUnxPerformanceHistory(yesterdayStart, yesterdayEnd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('snapshot-daily-performance: failed to fetch hourly rows:', msg);
    return { statusCode: 500, body: `Failed to fetch hourly rows: ${msg}` };
  }

  if (rows.length === 0) {
    console.warn(`snapshot-daily-performance: no hourly data found for ${dateStr}. Skipping write.`);
    // Still run cleanup before exiting
    await runCleanup();
    return { statusCode: 200, body: `No data for ${dateStr}; cleanup ran.` };
  }

  // ------------------------------------------------------------------
  // Compute OHLC values
  // ------------------------------------------------------------------
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  const uniaPriceOpen = firstRow.uniaPriceUsd;
  const uniaPriceClose = lastRow.uniaPriceUsd;
  const uniaPriceHigh = Math.max(...rows.map((r) => r.uniaPriceUsd));
  const uniaPriceLow = Math.min(...rows.map((r) => r.uniaPriceUsd));
  const unxBasketClose = lastRow.unxPriceUsd;
  const usdInflationIndex = lastRow.usdInflationIndex;

  // Determine source label (use 'hermes' if any row came from hermes, else 'fallback')
  const source = rows.some((r) => r.source === 'hermes') ? 'hermes' : 'fallback';

  // ------------------------------------------------------------------
  // Compute "$100 held" metrics using the very first snapshot as baseline
  // ------------------------------------------------------------------
  let firstEverUniaPrice = uniaPriceOpen;
  try {
    const earliest = await getEarliestSnapshot();
    if (earliest && earliest.uniaPriceUsd > 0) {
      firstEverUniaPrice = earliest.uniaPriceUsd;
    }
  } catch (err) {
    console.warn(
      'snapshot-daily-performance: could not fetch earliest snapshot, using day-open as baseline:',
      err instanceof Error ? err.message : String(err)
    );
  }

  const uniaHoldingValue =
    firstEverUniaPrice > 0 ? BASELINE_INVESTMENT_USD * (uniaPriceClose / firstEverUniaPrice) : BASELINE_INVESTMENT_USD;
  const usdHoldingValue = usdInflationIndex > 0 ? BASELINE_INVESTMENT_USD / usdInflationIndex : BASELINE_INVESTMENT_USD;
  const advantagePerHundred = uniaHoldingValue - usdHoldingValue;

  // ------------------------------------------------------------------
  // Write daily performance record
  // ------------------------------------------------------------------
  const writeResult = await storeDailyPerformance({
    date: dateStr,
    uniaPriceOpen,
    uniaPriceClose,
    uniaPriceHigh,
    uniaPriceLow,
    unxBasketClose,
    usdInflationIndex,
    uniaHoldingValue,
    usdHoldingValue,
    advantagePerHundred,
    hourlyDataPoints: rows.length,
    source,
  });

  if (!writeResult.success) {
    console.error(
      'snapshot-daily-performance: failed to write daily record:',
      writeResult.error
    );
    // Run cleanup even on write failure (best-effort housekeeping)
    await runCleanup();
    return { statusCode: 500, body: `Write failed: ${writeResult.error}` };
  }

  // ------------------------------------------------------------------
  // Housekeeping: clean up Blob snapshots older than 30 days
  // ------------------------------------------------------------------
  await runCleanup();

  console.log(
    `snapshot-daily-performance: done — ${dateStr} | ` +
      `uniaHolding=$${uniaHoldingValue.toFixed(2)} ` +
      `usdHolding=$${usdHoldingValue.toFixed(2)} ` +
      `advantage=$${advantagePerHundred.toFixed(2)} ` +
      `rows=${rows.length}`
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      date: dateStr,
      uniaHoldingValue,
      usdHoldingValue,
      advantagePerHundred,
      hourlyDataPoints: rows.length,
    }),
  };
};

// ============================================================================
// Helpers
// ============================================================================

async function runCleanup(): Promise<void> {
  try {
    await cleanupOldUnxPrices();
  } catch (err) {
    // Cleanup is best-effort — never let it fail the function
    console.warn(
      'snapshot-daily-performance: cleanup error (non-fatal):',
      err instanceof Error ? err.message : String(err)
    );
  }
}

export { handler };
