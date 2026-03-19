/**
 * Turso (libSQL) Storage Helpers for EQX Price History
 *
 * Provides durable, long-term storage for EQX price snapshots in a Turso
 * database. Used by the hourly update-eqx-price function to persist data
 * beyond the 30-day Netlify Blobs retention window.
 *
 * Storage Schema:
 * - Table: `eqx_price_snapshots` - Hourly EQX price snapshots with
 *   per-currency EQUA prices, inflation index, and purchasing power.
 */

import { createClient } from '@libsql/client';

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create and return a Turso libSQL client.
 * Reads connection details from environment variables.
 * Throws a descriptive error if any required variable is missing.
 */
function getTursoClient(): ReturnType<typeof createClient> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'Missing required environment variable: TURSO_DATABASE_URL. ' +
      'Please set this in your Netlify dashboard (Site settings → Environment variables).'
    );
  }

  if (!authToken) {
    throw new Error(
      'Missing required environment variable: TURSO_AUTH_TOKEN. ' +
      'Please set this in your Netlify dashboard (Site settings → Environment variables).'
    );
  }

  return createClient({ url, authToken });
}

// ============================================================================
// Constants
// ============================================================================

/**
 * The 16 send-modal currencies tracked in the EQUA Flutter app.
 * Order matches lib/features/send/send_screen.dart exactly.
 */
export const SEND_MODAL_CURRENCIES: string[] = [
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'KRW', 'BRL',
  'MXN', 'AUD', 'CAD', 'CHF', 'NGN', 'ZAR', 'AED', 'SGD',
];

/**
 * Hourly compound inflation rate derived from US CPI (~3.2% annual).
 * Uses 365.25 days/year to account for leap years.
 * Applies to the usdInflationIndex: index grows by this factor each hour.
 */
export const HOURLY_INFLATION_RATE = 1 + (0.032 / (365.25 * 24));

/**
 * EQUA genesis timestamp (Unix ms).
 * Reads from EQUA_GENESIS_TIMESTAMP env var; falls back to 2025-01-01T00:00:00Z.
 */
export const EQUA_GENESIS_TIMESTAMP: number = process.env.EQUA_GENESIS_TIMESTAMP
  ? parseInt(process.env.EQUA_GENESIS_TIMESTAMP, 10)
  : new Date('2025-01-01T00:00:00Z').getTime();

// ============================================================================
// Types
// ============================================================================

/**
 * A single EQX price snapshot for storage in Turso.
 */
export interface TursoEqxSnapshot {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** EQX basket value in USD (e.g. ~933.0) */
  eqxPriceUsd: number;
  /** EQUA token price in USD (from tier-based formula) */
  equaPriceUsd: number;
  /** EQUA price expressed in EQX units (= equaPriceUsd / eqxPriceUsd) */
  equaPriceEqx: number;
  /** EQUA price in each of the 16 send-modal currencies */
  currencyPrices: Record<string, number>;
  /** Raw EQX basket component prices */
  components: {
    XAUUSD: number;
    USDEUR: number;
    USDCNY: number;
    USDJPY: number;
    USDGBP: number;
    OIL: number;
    USDUSD: number;
  };
  /** On-chain total transactions count (best-effort) */
  totalTransactions?: number;
  /** Whether prices came from live Hermes API or fallback */
  source: 'hermes' | 'fallback';
  /**
   * USD inflation index at snapshot time.
   * 1.0 at genesis, compounding hourly at US CPI rate.
   * If omitted, computed automatically via computeUsdInflationIndex().
   */
  usdInflationIndex?: number;
}

// ============================================================================
// Inflation Utilities
// ============================================================================

/**
 * Compute the USD inflation index for a given snapshot timestamp.
 *
 * The index starts at 1.0 at EQUA_GENESIS_TIMESTAMP and compounds hourly
 * at HOURLY_INFLATION_RATE (based on ~3.2% annual US CPI).
 *
 * @param snapshotTimestampMs - Unix timestamp of the snapshot in milliseconds
 * @returns inflation index (>= 1.0)
 */
export function computeUsdInflationIndex(snapshotTimestampMs: number): number {
  const hoursElapsed = (snapshotTimestampMs - EQUA_GENESIS_TIMESTAMP) / (1000 * 60 * 60);
  return Math.pow(HOURLY_INFLATION_RATE, Math.max(0, hoursElapsed));
}

// ============================================================================
// Schema Initialization
// ============================================================================

/**
 * Ensure the eqx_price_snapshots table and its indexes exist.
 * Safe to call on every invocation (uses IF NOT EXISTS).
 *
 * @param client - Turso libSQL client
 */
export async function initTursoSchema(
  client: ReturnType<typeof createClient>
): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS eqx_price_snapshots (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp             INTEGER NOT NULL,
      recorded_at           TEXT NOT NULL,
      source                TEXT NOT NULL,
      eqx_price_usd         REAL NOT NULL,
      equa_price_usd        REAL NOT NULL,
      equa_price_eqx        REAL NOT NULL,
      equa_price_usd_val    REAL,
      equa_price_eur        REAL,
      equa_price_gbp        REAL,
      equa_price_inr        REAL,
      equa_price_jpy        REAL,
      equa_price_cny        REAL,
      equa_price_krw        REAL,
      equa_price_brl        REAL,
      equa_price_mxn        REAL,
      equa_price_aud        REAL,
      equa_price_cad        REAL,
      equa_price_chf        REAL,
      equa_price_ngn        REAL,
      equa_price_zar        REAL,
      equa_price_aed        REAL,
      equa_price_sgd        REAL,
      comp_xauusd           REAL,
      comp_usdeur           REAL,
      comp_usdcny           REAL,
      comp_usdjpy           REAL,
      comp_usdgbp           REAL,
      comp_oil              REAL,
      comp_usdusd           REAL,
      total_transactions    INTEGER,
      usd_inflation_index   REAL NOT NULL DEFAULT 1.0,
      equa_purchasing_power REAL,
      UNIQUE(timestamp)
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_eqx_timestamp ON eqx_price_snapshots(timestamp DESC)
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_eqx_recorded_at ON eqx_price_snapshots(recorded_at)
  `);
}

// ============================================================================
// Write Functions
// ============================================================================

/**
 * Store an EQX price snapshot to Turso.
 *
 * This is best-effort and non-fatal: callers should never rely on this
 * succeeding; a failure here must not interrupt the main hourly function.
 *
 * @param snap - Snapshot data to persist
 * @returns `{ success: true }` on success or `{ success: false, error }` on failure
 */
export async function storeEqxSnapshotToTurso(
  snap: TursoEqxSnapshot
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();
    await initTursoSchema(client);

    const usdInflationIndex =
      snap.usdInflationIndex ?? computeUsdInflationIndex(snap.timestamp);

    const equaPurchasingPower = snap.equaPriceUsd / usdInflationIndex;

    const recordedAt = new Date(snap.timestamp).toISOString();
    const cp = snap.currencyPrices;
    const co = snap.components;

    await client.execute({
      sql: `
        INSERT OR REPLACE INTO eqx_price_snapshots (
          timestamp,
          recorded_at,
          source,
          eqx_price_usd,
          equa_price_usd,
          equa_price_eqx,
          equa_price_usd_val,
          equa_price_eur,
          equa_price_gbp,
          equa_price_inr,
          equa_price_jpy,
          equa_price_cny,
          equa_price_krw,
          equa_price_brl,
          equa_price_mxn,
          equa_price_aud,
          equa_price_cad,
          equa_price_chf,
          equa_price_ngn,
          equa_price_zar,
          equa_price_aed,
          equa_price_sgd,
          comp_xauusd,
          comp_usdeur,
          comp_usdcny,
          comp_usdjpy,
          comp_usdgbp,
          comp_oil,
          comp_usdusd,
          total_transactions,
          usd_inflation_index,
          equa_purchasing_power
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      args: [
        snap.timestamp,
        recordedAt,
        snap.source,
        snap.eqxPriceUsd,
        snap.equaPriceUsd,
        snap.equaPriceEqx,
        cp['USD'] ?? null,
        cp['EUR'] ?? null,
        cp['GBP'] ?? null,
        cp['INR'] ?? null,
        cp['JPY'] ?? null,
        cp['CNY'] ?? null,
        cp['KRW'] ?? null,
        cp['BRL'] ?? null,
        cp['MXN'] ?? null,
        cp['AUD'] ?? null,
        cp['CAD'] ?? null,
        cp['CHF'] ?? null,
        cp['NGN'] ?? null,
        cp['ZAR'] ?? null,
        cp['AED'] ?? null,
        cp['SGD'] ?? null,
        co.XAUUSD ?? null,
        co.USDEUR ?? null,
        co.USDCNY ?? null,
        co.USDJPY ?? null,
        co.USDGBP ?? null,
        co.OIL ?? null,
        co.USDUSD ?? null,
        snap.totalTransactions ?? null,
        usdInflationIndex,
        equaPurchasingPower,
      ],
    });

    console.log(
      `✓ EQX snapshot written to Turso — timestamp: ${snap.timestamp}, ` +
      `equaPriceUsd: ${snap.equaPriceUsd}`
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('⚠ Turso write failed (non-fatal):', message);
    return { success: false, error: message };
  }
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Performance history row returned by getEqxPerformanceHistory.
 */
export interface EqxPerformanceRow {
  timestamp: number;
  recordedAt: string;
  equaPriceUsd: number;
  equaPriceLocal: number | null;
  eqxPriceUsd: number;
  usdInflationIndex: number;
  equaPurchasingPower: number;
  source: string;
}

/**
 * Query EQX performance history from Turso.
 *
 * @param from - Start of the query window (inclusive)
 * @param to - End of the query window (inclusive)
 * @param currency - One of the 16 send-modal currency codes. Defaults to USD.
 * @returns Array of performance rows ordered by ascending timestamp
 */
export async function getEqxPerformanceHistory(
  from: Date,
  to: Date,
  currency?: string
): Promise<EqxPerformanceRow[]> {
  const client = getTursoClient();

  // Determine which currency column to return as the local price
  const localCol: string =
    currency && SEND_MODAL_CURRENCIES.includes(currency.toUpperCase())
      ? `equa_price_${currency.toLowerCase()}`
      : 'equa_price_usd_val';

  const result = await client.execute({
    sql: `
      SELECT
        timestamp,
        recorded_at,
        equa_price_usd,
        ${localCol} AS equa_price_local,
        eqx_price_usd,
        usd_inflation_index,
        equa_purchasing_power,
        source
      FROM eqx_price_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `,
    args: [from.getTime(), to.getTime()],
  });

  return result.rows.map((row) => ({
    timestamp: row['timestamp'] as number,
    recordedAt: row['recorded_at'] as string,
    equaPriceUsd: row['equa_price_usd'] as number,
    equaPriceLocal: row['equa_price_local'] as number | null,
    eqxPriceUsd: row['eqx_price_usd'] as number,
    usdInflationIndex: row['usd_inflation_index'] as number,
    equaPurchasingPower: row['equa_purchasing_power'] as number,
    source: row['source'] as string,
  }));
}
