/**
 * FRED (Federal Reserve Economic Data) CPI Integration
 *
 * Fetches real US CPI data from the St. Louis Fed FRED API to replace
 * the hardcoded 3.2% annual inflation rate used in computeUsdInflationIndex().
 *
 * Series: CPIAUCSL — Consumer Price Index for All Urban Consumers: All Items
 *   in U.S. City Average (seasonally adjusted, monthly)
 * Source: Bureau of Labor Statistics via St. Louis Fed
 *
 * API docs: https://fred.stlouisfed.org/docs/api/fred/
 */

// ============================================================================
// Constants
// ============================================================================

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_SERIES_ID = 'CPIAUCSL';

/** Cache TTL: 24 hours (CPI data is monthly, no need to hit FRED every hour) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Default fallback annual CPI rate (~3.2%) — matches the original hardcoded
 * HOURLY_INFLATION_RATE in tursoStorage.ts. Exported so it is documentable
 * and testable.
 */
export const FALLBACK_ANNUAL_CPI_RATE = 0.032;

/**
 * EQUA genesis timestamp (Unix ms), mirrored from tursoStorage.ts to avoid
 * a circular import. Reads from env var; falls back to 2025-01-01T00:00:00Z.
 */
const GENESIS_TIMESTAMP_MS: number = process.env.EQUA_GENESIS_TIMESTAMP
  ? parseInt(process.env.EQUA_GENESIS_TIMESTAMP, 10)
  : new Date('2025-01-01T00:00:00Z').getTime();

// ============================================================================
// Types
// ============================================================================

/** A single CPI observation as returned by the FRED API. */
export interface CpiObservation {
  /** Observation date — YYYY-MM-DD */
  date: string;
  /** Raw CPI index value as a string (may be "." for missing/revised data) */
  value: string;
}

// ============================================================================
// In-memory cache
// ============================================================================

/** Module-level cache to avoid hitting FRED on every hourly snapshot. */
let _cache: { data: CpiObservation[]; fetchedAt: number } | null = null;

// ============================================================================
// FRED API Client
// ============================================================================

/**
 * Fetch the latest 24 monthly CPI observations from FRED series CPIAUCSL.
 *
 * Results are cached in memory for 24 hours (CPI is monthly; no need to
 * refresh on every hourly invocation).
 *
 * Returns `null` on any failure so callers can fall back gracefully.
 *
 * @returns Array of CPI observations (newest first), or `null` on failure.
 */
export async function fetchLatestCpiFromFred(): Promise<CpiObservation[] | null> {
  // Return cached data if still fresh.
  if (_cache !== null && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.data;
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn('⚠ FRED_API_KEY not set — using fallback inflation rate: ' +
      `${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`);
    return null;
  }

  try {
    const url = new URL(FRED_BASE_URL);
    url.searchParams.set('series_id', FRED_SERIES_ID);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', '24');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn(`⚠ FRED API returned HTTP ${response.status} — using fallback rate: ` +
        `${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`);
      return null;
    }

    const json = await response.json();
    const observations: CpiObservation[] = json?.observations ?? [];

    if (!Array.isArray(observations) || observations.length === 0) {
      console.warn('⚠ FRED API returned no observations — using fallback rate: ' +
        `${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`);
      return null;
    }

    // Persist in module-level cache.
    _cache = { data: observations, fetchedAt: Date.now() };
    return observations;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠ FRED API fetch failed (${message}) — using fallback rate: ` +
      `${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`);
    return null;
  }
}

// ============================================================================
// Rate Computation
// ============================================================================

/**
 * Compute the annualized CPI inflation rate from FRED observations.
 *
 * Uses the year-over-year method: (latest_cpi / cpi_12_months_ago) - 1.
 * Requires at least 13 observations (current month + 12 prior months).
 *
 * Falls back to `FALLBACK_ANNUAL_CPI_RATE` (3.2%) if:
 * - Fewer than 13 observations are available
 * - Any CPI value is missing or non-numeric
 * - The computed rate is outside a reasonable range (−10 % to +50 %)
 *
 * @param observations - CPI observations sorted descending (newest first),
 *   as returned by `fetchLatestCpiFromFred()`.
 * @returns Annualized CPI rate as a decimal (e.g. 0.032 for 3.2%).
 */
export function computeAnnualizedCpiRate(observations: CpiObservation[]): number {
  if (observations.length < 13) {
    return FALLBACK_ANNUAL_CPI_RATE;
  }

  // observations[0]  = most recent month
  // observations[12] = same month, one year ago
  const latestValue = parseFloat(observations[0].value);
  const yearAgoValue = parseFloat(observations[12].value);

  if (isNaN(latestValue) || isNaN(yearAgoValue) || yearAgoValue <= 0) {
    console.warn(
      `⚠ FRED CPI values are invalid (latest="${observations[0].value}", ` +
      `yearAgo="${observations[12].value}") — using fallback rate`
    );
    return FALLBACK_ANNUAL_CPI_RATE;
  }

  const annualizedRate = (latestValue / yearAgoValue) - 1;

  // Sanity guard: reject obviously absurd rates.
  if (annualizedRate < -0.1 || annualizedRate > 0.5) {
    console.warn(
      `⚠ FRED CPI annualized rate ${(annualizedRate * 100).toFixed(2)}% is outside ` +
      `expected range — using fallback rate: ${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`
    );
    return FALLBACK_ANNUAL_CPI_RATE;
  }

  return annualizedRate;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert an annual CPI rate to the hourly compound factor used when
 * computing the inflation index.
 *
 * @param annualRate - Annual rate as a decimal (e.g. 0.032 for 3.2%).
 * @returns Hourly compound factor (e.g. 1.000003652…).
 */
function annualRateToHourlyFactor(annualRate: number): number {
  return 1 + (annualRate / (365.25 * 24));
}

// ============================================================================
// Inflation Index
// ============================================================================

/**
 * Compute the USD inflation index using real FRED CPI data.
 *
 * The index starts at 1.0 at EQUA genesis and compounds hourly using the
 * real annualized CPI rate fetched from FRED. Falls back to the hardcoded
 * 3.2% rate (same as the synchronous `computeUsdInflationIndex()`) if FRED
 * data is unavailable for any reason.
 *
 * This function is **non-fatal**: it never throws. All FRED failures degrade
 * gracefully to the hardcoded fallback.
 *
 * @param snapshotTimestampMs - Unix timestamp of the snapshot (milliseconds).
 * @returns Inflation index ≥ 1.0.
 */
export async function computeRealInflationIndex(snapshotTimestampMs: number): Promise<number> {
  const hoursElapsed = (snapshotTimestampMs - GENESIS_TIMESTAMP_MS) / (1000 * 60 * 60);
  const clampedHours = Math.max(0, hoursElapsed);

  try {
    const observations = await fetchLatestCpiFromFred();

    if (!observations) {
      // FRED unavailable — fall back to hardcoded 3.2% rate.
      console.warn(`⚠ FRED unavailable, using fallback rate: ${(FALLBACK_ANNUAL_CPI_RATE * 100).toFixed(1)}%`);
      return Math.pow(annualRateToHourlyFactor(FALLBACK_ANNUAL_CPI_RATE), clampedHours);
    }

    const annualizedRate = computeAnnualizedCpiRate(observations);
    const latestDate = observations[0]?.date ?? 'unknown';
    const yearAgoDate = observations[12]?.date ?? 'unknown';
    console.log(
      `✓ Using FRED CPI data: annualized rate = ${(annualizedRate * 100).toFixed(2)}% ` +
      `(${yearAgoDate} → ${latestDate})`
    );

    return Math.pow(annualRateToHourlyFactor(annualizedRate), clampedHours);
  } catch (err) {
    // Belt-and-suspenders: should never reach here, but ensure non-fatal.
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠ FRED inflation computation error (${message}) — using fallback rate`);
    return Math.pow(annualRateToHourlyFactor(FALLBACK_ANNUAL_CPI_RATE), clampedHours);
  }
}
