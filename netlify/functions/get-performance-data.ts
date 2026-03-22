/**
 * Netlify API Function: Get UNX Performance Data
 *
 * On-demand function to serve UNIA/UNX performance history from Turso,
 * including a computed summary comparing UNIA appreciation vs USD inflation.
 *
 * Query params:
 * - ?from=YYYY-MM-DD        (optional, default: 30 days ago)
 * - ?to=YYYY-MM-DD          (optional, default: now)
 * - ?currency=USD           (optional, default: USD — one of 16 send-modal currencies)
 * - ?interval=hourly|daily  (optional, default: hourly)
 */

import { Handler, HandlerResponse } from '@netlify/functions';
import {
  getUnxPerformanceHistory,
  getDailyPerformance,
  UnxPerformanceRow,
  DailyPerformanceRow,
  SEND_MODAL_CURRENCIES,
} from './lib/tursoStorage';

// ============================================================================
// CORS / Cache headers
// ============================================================================

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a date from a query-parameter string.
 * Accepts YYYY-MM-DD or any ISO 8601 string.
 * Falls back to `defaultDate` on invalid input.
 */
function parseDate(dateString: string | undefined, defaultDate: Date): Date {
  if (!dateString) return defaultDate;
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? defaultDate : d;
  } catch {
    return defaultDate;
  }
}

/**
 * Format a Date as a UTC date key (YYYY-MM-DD).
 */
function utcDateKey(d: Date): string {
  return (
    `${d.getUTCFullYear()}-` +
    `${String(d.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getUTCDate()).padStart(2, '0')}`
  );
}

/**
 * Aggregate hourly UnxPerformanceRow records to daily averages.
 * Groups by UTC date of `recordedAt`; averages all numeric fields.
 */
function aggregateToDaily(rows: UnxPerformanceRow[]): UnxPerformanceRow[] {
  const dailyMap = new Map<string, UnxPerformanceRow[]>();

  for (const row of rows) {
    const key = utcDateKey(new Date(row.recordedAt));
    if (!dailyMap.has(key)) dailyMap.set(key, []);
    dailyMap.get(key)!.push(row);
  }

  const dailyRows: UnxPerformanceRow[] = [];

  for (const [key, dayRows] of dailyMap) {
    const n = dayRows.length;
    // Average a numeric field across the day's rows, treating null as 0.
    const avg = (field: keyof UnxPerformanceRow) =>
      dayRows.reduce((sum, r) => sum + ((r[field] as number) ?? 0), 0) / n;

    const last = dayRows[dayRows.length - 1];
    dailyRows.push({
      timestamp: new Date(key + 'T00:00:00.000Z').getTime(),
      recordedAt: key + 'T00:00:00.000Z',
      equaPriceUsd: avg('equaPriceUsd'),
      // equaPriceLocal may be null; treat null as 0 for the average then
      // restore null if all rows had null (no local currency column matched).
      equaPriceLocal: dayRows.every((r) => r.equaPriceLocal == null)
        ? null
        : avg('equaPriceLocal'),
      unxPriceUsd: avg('unxPriceUsd'),
      usdInflationIndex: avg('usdInflationIndex'),
      equaPurchasingPower: avg('equaPurchasingPower'),
      source: last.source,
    });
  }

  return dailyRows.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * UnxPerformanceRow annotated with "$100 held" comparison values.
 */
type AnnotatedPerformanceRow = UnxPerformanceRow & {
  equaHoldingValue: number;
  usdHoldingValue: number;
  advantagePerHundred: number;
};

/**
 * Compute the response summary from the first and last data points.
 */
function computeSummary(rows: UnxPerformanceRow[]) {
  if (rows.length === 0) {
    return {
      equaPriceChange: 0,
      equaPriceChangePercent: 0,
      usdPurchasingPowerLoss: 0,
      equaVsUsdAdvantage: 0,
      currentEquaPriceUsd: 0,
      currentEquaPriceLocal: null as number | null,
      currentUnxPriceUsd: 0,
      dataPoints: 0,
      equaHoldingValue: 100,
      usdHoldingValue: 100,
      advantagePerHundred: 0,
      holdingPeriodLabel: '0 days',
    };
  }

  const first = rows[0];
  const last = rows[rows.length - 1];

  const equaPriceChange = last.equaPriceUsd - first.equaPriceUsd;
  const equaPriceChangePercent =
    first.equaPriceUsd !== 0
      ? ((last.equaPriceUsd - first.equaPriceUsd) / first.equaPriceUsd) * 100
      : 0;
  const usdPurchasingPowerLoss =
    last.usdInflationIndex > 0
      ? (1 - 1 / last.usdInflationIndex) * 100
      : 0;
  const equaVsUsdAdvantage = equaPriceChangePercent + usdPurchasingPowerLoss;

  // "$100 held" metrics — baseline is the first row in the selected range
  const equaHoldingValue =
    first.equaPriceUsd > 0 ? 100 * (last.equaPriceUsd / first.equaPriceUsd) : 100;
  const usdHoldingValue =
    last.usdInflationIndex > 0
      ? 100 * (first.usdInflationIndex / last.usdInflationIndex)
      : 100;
  const advantagePerHundred = equaHoldingValue - usdHoldingValue;

  // Human-readable holding period label
  const daysElapsed = Math.round(
    (last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24)
  );
  const holdingPeriodLabel =
    daysElapsed < 1
      ? 'today'
      : daysElapsed === 1
      ? '1 day'
      : daysElapsed < 60
      ? `${daysElapsed} days`
      : daysElapsed < 365
      ? `${Math.round(daysElapsed / 30)} months`
      : `${(daysElapsed / 365).toFixed(1)} years`;

  return {
    equaPriceChange,
    equaPriceChangePercent,
    usdPurchasingPowerLoss,
    equaVsUsdAdvantage,
    currentEquaPriceUsd: last.equaPriceUsd,
    currentEquaPriceLocal: last.equaPriceLocal,
    currentUnxPriceUsd: last.unxPriceUsd,
    dataPoints: rows.length,
    equaHoldingValue,
    usdHoldingValue,
    advantagePerHundred,
    holdingPeriodLabel,
  };
}

/**
 * Annotate each row with "$100 held" comparison values.
 * The first row in the slice is used as the baseline ($100 invested).
 */
function addHoldingValues(rows: UnxPerformanceRow[]): AnnotatedPerformanceRow[] {
  if (rows.length === 0) return [];

  const firstEquaPrice = rows[0].equaPriceUsd;
  const firstInflationIndex = rows[0].usdInflationIndex;

  return rows.map((row) => {
    const equaHoldingValue =
      firstEquaPrice > 0 ? 100 * (row.equaPriceUsd / firstEquaPrice) : 100;
    const usdHoldingValue =
      row.usdInflationIndex > 0
        ? 100 * (firstInflationIndex / row.usdInflationIndex)
        : 100;
    return {
      ...row,
      equaHoldingValue,
      usdHoldingValue,
      advantagePerHundred: equaHoldingValue - usdHoldingValue,
    };
  });
}

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event): Promise<HandlerResponse> => {
  try {
    // ------------------------------------------------------------------
    // Validate Turso env vars up-front so we return 503 with a clear
    // message rather than an opaque 500 from inside getTursoClient().
    // ------------------------------------------------------------------
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      return {
        statusCode: 503,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify({
          error: 'Turso database not configured',
          message:
            'Performance data requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN ' +
            'environment variables. Please set them in your Netlify dashboard ' +
            '(Site settings → Environment variables).',
        }),
      };
    }

    // ------------------------------------------------------------------
    // Parse query parameters
    // ------------------------------------------------------------------
    const params = event.queryStringParameters || {};

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fromDate = parseDate(params.from, thirtyDaysAgo);
    const toDate = parseDate(params.to, now);

    const rawCurrency = (params.currency ?? 'USD').toUpperCase();
    const currency = SEND_MODAL_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'USD';

    const interval = params.interval === 'daily' ? 'daily' : 'hourly';

    console.log(
      `Fetching performance data: from=${fromDate.toISOString()} to=${toDate.toISOString()} ` +
        `currency=${currency} interval=${interval}`
    );

    // ------------------------------------------------------------------
    // Fetch from Turso
    // ------------------------------------------------------------------
    let rows = await getUnxPerformanceHistory(fromDate, toDate, currency);

    // ------------------------------------------------------------------
    // Aggregate to daily if requested.
    // Prefer the pre-computed unx_daily_performance table when available;
    // fall back to on-the-fly aggregation for backward compatibility.
    // ------------------------------------------------------------------
    let dailyRows: DailyPerformanceRow[] = [];
    if (interval === 'daily') {
      try {
        dailyRows = await getDailyPerformance(fromDate, toDate);
      } catch (dailyErr) {
        // The unx_daily_performance table may not exist yet on first deploy.
        // Log the error and fall back to on-the-fly aggregation.
        console.warn(
          'getDailyPerformance failed (falling back to on-the-fly aggregation):',
          dailyErr instanceof Error ? dailyErr.message : String(dailyErr)
        );
        dailyRows = [];
      }
    }

    if (interval === 'daily' && dailyRows.length > 0) {
      // Map DailyPerformanceRow → UnxPerformanceRow-compatible shape so the
      // rest of the pipeline (computeSummary, addHoldingValues) works unchanged.
      rows = dailyRows.map((d) => ({
        timestamp: d.timestamp,
        recordedAt: d.recordedAt,
        equaPriceUsd: d.equaPriceClose,
        equaPriceLocal: null,
        unxPriceUsd: d.unxBasketClose,
        usdInflationIndex: d.usdInflationIndex,
        equaPurchasingPower: d.equaPriceClose / d.usdInflationIndex,
        source: d.source,
      }));
    } else if (interval === 'daily') {
      rows = aggregateToDaily(rows);
    }

    const annotatedRows = addHoldingValues(rows);
    const summary = computeSummary(rows);

    console.log(`Returning ${rows.length} data points (${interval}, ${currency})`);

    return {
      statusCode: 200,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        data: annotatedRows,
        summary,
        currency,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        interval,
        supportedCurrencies: SEND_MODAL_CURRENCIES,
      }),
    };
  } catch (error) {
    console.error('Error fetching performance data:', error);

    return {
      statusCode: 500,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};

export { handler };
