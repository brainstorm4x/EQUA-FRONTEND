/**
 * Turso (libSQL) Storage Helpers for UNX Price History
 *
 * Provides durable, long-term storage for UNX price snapshots in a Turso
 * database. Used by the hourly update-unx-price function to persist data
 * beyond the 30-day Netlify Blobs retention window.
 *
 * Storage Schema:
 * - Table: `unx_price_snapshots`      - Hourly UNX price snapshots with
 *   per-currency UNIA prices, inflation index, and purchasing power.
 * - Table: `unx_daily_performance`    - Pre-aggregated daily records with
 *   "$100 held" comparison metrics (written by snapshot-daily-performance).
 */

import { createClient } from '@libsql/client/web';
import { computeRealInflationIndex } from './fredInflation';

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
 * The 16 send-modal currencies tracked in the UNIA Flutter app.
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
 * UNIA genesis timestamp (Unix ms).
 * Reads from UNIA_GENESIS_TIMESTAMP env var; falls back to 2025-01-01T00:00:00Z.
 */
export const UNIA_GENESIS_TIMESTAMP: number = process.env.UNIA_GENESIS_TIMESTAMP
  ? parseInt(process.env.UNIA_GENESIS_TIMESTAMP, 10)
  : new Date('2025-01-01T00:00:00Z').getTime();

// ============================================================================
// Types
// ============================================================================

/**
 * A single UNX price snapshot for storage in Turso.
 */
export interface TursoUnxSnapshot {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** UNX basket value in USD (e.g. ~933.0) */
  unxPriceUsd: number;
  /** UNIA token price in USD (from tier-based formula) */
  uniaPriceUsd: number;
  /** UNIA price expressed in UNX units (= uniaPriceUsd / unxPriceUsd) */
  uniaPriceUnx: number;
  /** UNIA price in each of the 16 send-modal currencies */
  currencyPrices: Record<string, number>;
  /**
   * Raw UNX basket component prices in XXX/USD format (USD in denominator).
   * Note: field names use the corrected XXX/USD convention, but the
   * corresponding SQL columns retain the original names (comp_usdeur, etc.)
   * to avoid a breaking schema migration.
   */
  components: {
    XAUUSD: number;
    EURUSD: number;  // SQL column: comp_usdeur
    CNHUSD: number;  // SQL column: comp_usdcny
    JPYUSD: number;  // SQL column: comp_usdjpy
    GBPUSD: number;  // SQL column: comp_usdgbp
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
 * The index starts at 1.0 at UNIA_GENESIS_TIMESTAMP and compounds hourly
 * at HOURLY_INFLATION_RATE (based on ~3.2% annual US CPI).
 *
 * @param snapshotTimestampMs - Unix timestamp of the snapshot in milliseconds
 * @returns inflation index (>= 1.0)
 */
export function computeUsdInflationIndex(snapshotTimestampMs: number): number {
  const hoursElapsed = (snapshotTimestampMs - UNIA_GENESIS_TIMESTAMP) / (1000 * 60 * 60);
  return Math.pow(HOURLY_INFLATION_RATE, Math.max(0, hoursElapsed));
}

/**
 * Async variant of `computeUsdInflationIndex` that uses real FRED CPI data
 * when available. Used in the write path (hourly snapshot) where an async
 * call is acceptable.
 *
 * Falls back transparently to the synchronous hardcoded-rate behaviour if
 * FRED is unavailable or `FRED_API_KEY` is not set.
 *
 * @param snapshotTimestampMs - Unix timestamp of the snapshot in milliseconds
 * @returns inflation index (>= 1.0)
 */
export async function computeUsdInflationIndexAsync(snapshotTimestampMs: number): Promise<number> {
  return computeRealInflationIndex(snapshotTimestampMs);
}

// ============================================================================
// Schema Initialization
// ============================================================================

/**
 * Ensure the unx_price_snapshots table and its indexes exist.
 * Safe to call on every invocation (uses IF NOT EXISTS).
 *
 * @param client - Turso libSQL client
 */
export async function initTursoSchema(
  client: ReturnType<typeof createClient>
): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS unx_price_snapshots (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp             INTEGER NOT NULL,
      recorded_at           TEXT NOT NULL,
      source                TEXT NOT NULL,
      unx_price_usd         REAL NOT NULL,
      unia_price_usd        REAL NOT NULL,
      unia_price_unx        REAL NOT NULL,
      unia_price_usd_val    REAL,
      unia_price_eur        REAL,
      unia_price_gbp        REAL,
      unia_price_inr        REAL,
      unia_price_jpy        REAL,
      unia_price_cny        REAL,
      unia_price_krw        REAL,
      unia_price_brl        REAL,
      unia_price_mxn        REAL,
      unia_price_aud        REAL,
      unia_price_cad        REAL,
      unia_price_chf        REAL,
      unia_price_ngn        REAL,
      unia_price_zar        REAL,
      unia_price_aed        REAL,
      unia_price_sgd        REAL,
      comp_xauusd           REAL,
      comp_usdeur           REAL,
      comp_usdcny           REAL,
      comp_usdjpy           REAL,
      comp_usdgbp           REAL,
      comp_oil              REAL,
      comp_usdusd           REAL,
      total_transactions    INTEGER,
      usd_inflation_index   REAL NOT NULL DEFAULT 1.0,
      unia_purchasing_power REAL,
      UNIQUE(timestamp)
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_unx_timestamp ON unx_price_snapshots(timestamp DESC)
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_unx_recorded_at ON unx_price_snapshots(recorded_at)
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS unx_daily_performance (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      date                  TEXT NOT NULL,
      unia_price_open       REAL NOT NULL,
      unia_price_close      REAL NOT NULL,
      unia_price_high       REAL NOT NULL,
      unia_price_low        REAL NOT NULL,
      unx_basket_close      REAL NOT NULL,
      usd_inflation_index   REAL NOT NULL,
      unia_holding_value    REAL NOT NULL,
      usd_holding_value     REAL NOT NULL,
      advantage_per_hundred REAL NOT NULL,
      hourly_data_points    INTEGER NOT NULL,
      source                TEXT NOT NULL,
      UNIQUE(date)
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_daily_perf_date ON unx_daily_performance(date DESC)
  `);

  await migrateTursoColumns(client);
}

/**
 * Idempotent migration: rename all `equa_*` columns to `unia_*` in the two
 * Turso tables.  Each ALTER is wrapped in its own try/catch so columns that
 * have already been renamed (or never existed with the old name) are silently
 * skipped.  Safe to run on every invocation.
 *
 * Note: SQLite does not support parameterized column names in ALTER TABLE
 * statements.  All column names below are hard-coded string literals from a
 * closed allowlist, so there is no SQL-injection risk.
 *
 * @param client - Turso libSQL client
 */
async function migrateTursoColumns(
  client: ReturnType<typeof createClient>
): Promise<void> {
  const snapshotRenames: [string, string][] = [
    ['equa_price_usd',        'unia_price_usd'],
    ['equa_price_unx',        'unia_price_unx'],
    ['equa_price_usd_val',    'unia_price_usd_val'],
    ['equa_price_eur',        'unia_price_eur'],
    ['equa_price_gbp',        'unia_price_gbp'],
    ['equa_price_inr',        'unia_price_inr'],
    ['equa_price_jpy',        'unia_price_jpy'],
    ['equa_price_cny',        'unia_price_cny'],
    ['equa_price_krw',        'unia_price_krw'],
    ['equa_price_brl',        'unia_price_brl'],
    ['equa_price_mxn',        'unia_price_mxn'],
    ['equa_price_aud',        'unia_price_aud'],
    ['equa_price_cad',        'unia_price_cad'],
    ['equa_price_chf',        'unia_price_chf'],
    ['equa_price_ngn',        'unia_price_ngn'],
    ['equa_price_zar',        'unia_price_zar'],
    ['equa_price_aed',        'unia_price_aed'],
    ['equa_price_sgd',        'unia_price_sgd'],
    ['equa_purchasing_power', 'unia_purchasing_power'],
  ];

  const dailyRenames: [string, string][] = [
    ['equa_price_open',    'unia_price_open'],
    ['equa_price_close',   'unia_price_close'],
    ['equa_price_high',    'unia_price_high'],
    ['equa_price_low',     'unia_price_low'],
    ['equa_holding_value', 'unia_holding_value'],
  ];

  for (const [oldCol, newCol] of snapshotRenames) {
    try {
      await client.execute(
        `ALTER TABLE unx_price_snapshots RENAME COLUMN ${oldCol} TO ${newCol}`
      );
    } catch (err) {
      // Expected when the column was already renamed on a previous invocation.
      // Log at debug level so genuine unexpected errors remain visible in logs.
      const msg = err instanceof Error ? err.message : String(err);
      console.debug(`migrateTursoColumns: skipping unx_price_snapshots.${oldCol} → ${newCol} (${msg})`);
    }
  }

  for (const [oldCol, newCol] of dailyRenames) {
    try {
      await client.execute(
        `ALTER TABLE unx_daily_performance RENAME COLUMN ${oldCol} TO ${newCol}`
      );
    } catch (err) {
      // Expected when the column was already renamed on a previous invocation.
      const msg = err instanceof Error ? err.message : String(err);
      console.debug(`migrateTursoColumns: skipping unx_daily_performance.${oldCol} → ${newCol} (${msg})`);
    }
  }
}

// ============================================================================
// Write Functions
// ============================================================================

/**
 * Store an UNX price snapshot to Turso.
 *
 * This is best-effort and non-fatal: callers should never rely on this
 * succeeding; a failure here must not interrupt the main hourly function.
 *
 * @param snap - Snapshot data to persist
 * @returns `{ success: true }` on success or `{ success: false, error }` on failure
 */
export async function storeUnxSnapshotToTurso(
  snap: TursoUnxSnapshot
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();
    await initTursoSchema(client);

    const usdInflationIndex =
      snap.usdInflationIndex ?? computeUsdInflationIndex(snap.timestamp);

    const uniaPurchasingPower = snap.uniaPriceUsd / usdInflationIndex;

    const recordedAt = new Date(snap.timestamp).toISOString();
    const cp = snap.currencyPrices;
    const co = snap.components;

    await client.execute({
      sql: `
        INSERT OR REPLACE INTO unx_price_snapshots (
          timestamp,
          recorded_at,
          source,
          unx_price_usd,
          unia_price_usd,
          unia_price_unx,
          unia_price_usd_val,
          unia_price_eur,
          unia_price_gbp,
          unia_price_inr,
          unia_price_jpy,
          unia_price_cny,
          unia_price_krw,
          unia_price_brl,
          unia_price_mxn,
          unia_price_aud,
          unia_price_cad,
          unia_price_chf,
          unia_price_ngn,
          unia_price_zar,
          unia_price_aed,
          unia_price_sgd,
          comp_xauusd,
          comp_usdeur,
          comp_usdcny,
          comp_usdjpy,
          comp_usdgbp,
          comp_oil,
          comp_usdusd,
          total_transactions,
          usd_inflation_index,
          unia_purchasing_power
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      args: [
        snap.timestamp,
        recordedAt,
        snap.source,
        snap.unxPriceUsd,
        snap.uniaPriceUsd,
        snap.uniaPriceUnx,
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
        co.EURUSD ?? null,  // maps to comp_usdeur SQL column
        co.CNHUSD ?? null,  // maps to comp_usdcny SQL column
        co.JPYUSD ?? null,  // maps to comp_usdjpy SQL column
        co.GBPUSD ?? null,  // maps to comp_usdgbp SQL column
        co.OIL ?? null,
        co.USDUSD ?? null,
        snap.totalTransactions ?? null,
        usdInflationIndex,
        uniaPurchasingPower,
      ],
    });

    console.log(
      `✓ UNX snapshot written to Turso — timestamp: ${snap.timestamp}, ` +
      `uniaPriceUsd: ${snap.uniaPriceUsd}`
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
 * Map an accepted currency code to the matching `unia_price_*` SQL column
 * literal. Returns the USD column for any unknown/missing value. Keeping the
 * mapping exhaustive (rather than constructing the column name from the
 * input) means a future rename of `SEND_MODAL_CURRENCIES` cannot accidentally
 * widen what `getUnxPerformanceHistory` will splice into SQL.
 */
function resolveLocalPriceColumn(currency?: string): string {
  switch ((currency ?? '').toUpperCase()) {
    case 'USD': return 'unia_price_usd_val';
    case 'EUR': return 'unia_price_eur';
    case 'GBP': return 'unia_price_gbp';
    case 'INR': return 'unia_price_inr';
    case 'JPY': return 'unia_price_jpy';
    case 'CNY': return 'unia_price_cny';
    case 'KRW': return 'unia_price_krw';
    case 'BRL': return 'unia_price_brl';
    case 'MXN': return 'unia_price_mxn';
    case 'AUD': return 'unia_price_aud';
    case 'CAD': return 'unia_price_cad';
    case 'CHF': return 'unia_price_chf';
    case 'NGN': return 'unia_price_ngn';
    case 'ZAR': return 'unia_price_zar';
    case 'AED': return 'unia_price_aed';
    case 'SGD': return 'unia_price_sgd';
    default:    return 'unia_price_usd_val';
  }
}

/**
 * Performance history row returned by getUnxPerformanceHistory.
 */
export interface UnxPerformanceRow {
  timestamp: number;
  recordedAt: string;
  uniaPriceUsd: number;
  uniaPriceLocal: number | null;
  unxPriceUsd: number;
  usdInflationIndex: number;
  uniaPurchasingPower: number;
  source: string;
}

/**
 * Query UNX performance history from Turso.
 *
 * @param from - Start of the query window (inclusive)
 * @param to - End of the query window (inclusive)
 * @param currency - One of the 16 send-modal currency codes. Defaults to USD.
 * @returns Array of performance rows ordered by ascending timestamp
 */
export async function getUnxPerformanceHistory(
  from: Date,
  to: Date,
  currency?: string
): Promise<UnxPerformanceRow[]> {
  const client = getTursoClient();

  // Determine which currency column to return as the local price.
  // libSQL/SQLite cannot parameterize identifiers, so the column name is
  // chosen by an exhaustive allowlist that maps each accepted currency to a
  // hard-coded column literal. Anything outside the allowlist falls through
  // to the USD column — there is no path that splices user input into SQL.
  const localCol: string = resolveLocalPriceColumn(currency);

  const result = await client.execute({
    sql: `
      SELECT
        timestamp,
        recorded_at,
        unia_price_usd,
        ${localCol} AS unia_price_local,
        unx_price_usd,
        usd_inflation_index,
        unia_purchasing_power,
        source
      FROM unx_price_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `,
    args: [from.getTime(), to.getTime()],
  });

  return result.rows.map((row) => ({
    timestamp: row['timestamp'] as number,
    recordedAt: row['recorded_at'] as string,
    uniaPriceUsd: row['unia_price_usd'] as number,
    uniaPriceLocal: row['unia_price_local'] as number | null,
    unxPriceUsd: row['unx_price_usd'] as number,
    usdInflationIndex: row['usd_inflation_index'] as number,
    uniaPurchasingPower: row['unia_purchasing_power'] as number,
    source: row['source'] as string,
  }));
}

// ============================================================================
// Daily Performance Types
// ============================================================================

/**
 * A daily performance record for the unx_daily_performance table.
 */
export interface TursoDailyPerformance {
  /** Date of the record in YYYY-MM-DD format */
  date: string;
  /** UNIA price at the first hourly snapshot of the day */
  uniaPriceOpen: number;
  /** UNIA price at the last hourly snapshot of the day */
  uniaPriceClose: number;
  /** Highest UNIA price seen during the day */
  uniaPriceHigh: number;
  /** Lowest UNIA price seen during the day */
  uniaPriceLow: number;
  /** UNX basket price at the last hourly snapshot of the day */
  unxBasketClose: number;
  /** USD inflation index at the last hourly snapshot of the day */
  usdInflationIndex: number;
  /**
   * Current value of a $100 UNIA holding (relative to the first-ever snapshot).
   * Formula: 100 * (uniaPriceClose / firstEverUniaPrice)
   */
  uniaHoldingValue: number;
  /**
   * Current value of a $100 USD holding after inflation.
   * Formula: 100 / usdInflationIndex  (index starts at 1.0 at genesis)
   */
  usdHoldingValue: number;
  /** uniaHoldingValue − usdHoldingValue */
  advantagePerHundred: number;
  /** Number of hourly data points that contributed to this record */
  hourlyDataPoints: number;
  /** Data source label */
  source: string;
}

/**
 * A daily performance row returned by getDailyPerformance.
 * Extends TursoDailyPerformance with the numeric Unix timestamp
 * of midnight UTC for easy sorting / chart rendering.
 */
export interface DailyPerformanceRow extends TursoDailyPerformance {
  /** Unix timestamp (ms) for midnight UTC of `date` */
  timestamp: number;
  /** ISO 8601 string for midnight UTC of `date` */
  recordedAt: string;
}

// ============================================================================
// Daily Performance Write Functions
// ============================================================================

/**
 * Store a daily performance record in the unx_daily_performance table.
 * Uses INSERT OR REPLACE so re-running the snapshot function is idempotent.
 *
 * @param record - Daily performance data to persist
 * @returns `{ success: true }` on success or `{ success: false, error }` on failure
 */
export async function storeDailyPerformance(
  record: TursoDailyPerformance
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();
    await initTursoSchema(client);

    await client.execute({
      sql: `
        INSERT OR REPLACE INTO unx_daily_performance (
          date,
          unia_price_open,
          unia_price_close,
          unia_price_high,
          unia_price_low,
          unx_basket_close,
          usd_inflation_index,
          unia_holding_value,
          usd_holding_value,
          advantage_per_hundred,
          hourly_data_points,
          source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        record.date,
        record.uniaPriceOpen,
        record.uniaPriceClose,
        record.uniaPriceHigh,
        record.uniaPriceLow,
        record.unxBasketClose,
        record.usdInflationIndex,
        record.uniaHoldingValue,
        record.usdHoldingValue,
        record.advantagePerHundred,
        record.hourlyDataPoints,
        record.source,
      ],
    });

    console.log(`✓ Daily performance record written to Turso — date: ${record.date}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('⚠ Turso daily performance write failed (non-fatal):', message);
    return { success: false, error: message };
  }
}

// ============================================================================
// Daily Performance Read Functions
// ============================================================================

/**
 * Query daily performance records from the unx_daily_performance table.
 *
 * @param from - Start of the date window (inclusive; only the date part is used)
 * @param to   - End of the date window (inclusive; only the date part is used)
 * @returns Array of daily performance rows ordered by ascending date
 */
export async function getDailyPerformance(
  from: Date,
  to: Date
): Promise<DailyPerformanceRow[]> {
  const client = getTursoClient();

  const fromStr = utcDateString(from);
  const toStr = utcDateString(to);

  const result = await client.execute({
    sql: `
      SELECT
        date,
        unia_price_open,
        unia_price_close,
        unia_price_high,
        unia_price_low,
        unx_basket_close,
        usd_inflation_index,
        unia_holding_value,
        usd_holding_value,
        advantage_per_hundred,
        hourly_data_points,
        source
      FROM unx_daily_performance
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `,
    args: [fromStr, toStr],
  });

  return result.rows.map((row) => {
    const date = row['date'] as string;
    return {
      date,
      timestamp: new Date(date + 'T00:00:00.000Z').getTime(),
      recordedAt: date + 'T00:00:00.000Z',
      uniaPriceOpen: row['unia_price_open'] as number,
      uniaPriceClose: row['unia_price_close'] as number,
      uniaPriceHigh: row['unia_price_high'] as number,
      uniaPriceLow: row['unia_price_low'] as number,
      unxBasketClose: row['unx_basket_close'] as number,
      usdInflationIndex: row['usd_inflation_index'] as number,
      uniaHoldingValue: row['unia_holding_value'] as number,
      usdHoldingValue: row['usd_holding_value'] as number,
      advantagePerHundred: row['advantage_per_hundred'] as number,
      hourlyDataPoints: row['hourly_data_points'] as number,
      source: row['source'] as string,
    };
  });
}

// ============================================================================
// Earliest Snapshot Query
// ============================================================================

/**
 * Fetch the very first row from unx_price_snapshots.
 * Used as the baseline for "$100 held" calculations.
 *
 * @returns The earliest snapshot row, or null if the table is empty
 */
export async function getEarliestSnapshot(): Promise<UnxPerformanceRow | null> {
  const client = getTursoClient();

  const result = await client.execute(`
    SELECT
      timestamp,
      recorded_at,
      unia_price_usd,
      unia_price_usd_val AS unia_price_local,   -- USD value column; no local currency conversion needed here
      unx_price_usd,
      usd_inflation_index,
      unia_purchasing_power,
      source
    FROM unx_price_snapshots
    ORDER BY timestamp ASC
    LIMIT 1
  `);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    timestamp: row['timestamp'] as number,
    recordedAt: row['recorded_at'] as string,
    uniaPriceUsd: row['unia_price_usd'] as number,
    uniaPriceLocal: row['unia_price_local'] as number | null,
    unxPriceUsd: row['unx_price_usd'] as number,
    usdInflationIndex: row['usd_inflation_index'] as number,
    uniaPurchasingPower: row['unia_purchasing_power'] as number,
    source: row['source'] as string,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Format a Date as a UTC date string (YYYY-MM-DD).
 */
function utcDateString(d: Date): string {
  return (
    `${d.getUTCFullYear()}-` +
    `${String(d.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getUTCDate()).padStart(2, '0')}`
  );
}
