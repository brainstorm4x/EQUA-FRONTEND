/**
 * UNIYAA price helpers.
 *
 * The price is stored on-chain in GlobalState.price_index (USD scaled by
 * PRICE_SCALE) and grows once per UTC day with participation, along one
 * smooth curve (K = $150,000):
 *
 *   price += price × 1% × K / (K + price) × (payers that day / users)
 *
 * Far below K this is 1%/day compounding; far above K the daily increase
 * levels off at $1,500 ($45,000 per 30 days).
 *
 * Each sender counts at most once per UTC day. The frontend only reads and
 * formats the price; it never computes it. Program source:
 * programs/uniyaa_token/src/lib.rs (grow_price, record_counted_payment).
 */

/** price_index units per USD (matches PRICE_SCALE in the program). */
export const PRICE_SCALE = 1_000_000_000;
export const INITIAL_PRICE_USD = 0.01;
/** Maximum daily growth far below K (at 100% participation). */
export const MAX_DAILY_GROWTH = 0.01;
/** Price at which the daily rate has halved (PRICE_CURVE_K in the program). */
export const PRICE_CURVE_K_USD = 150_000;

/** Maximum daily growth rate at `priceUsd` (at 100% participation). */
export function maxDailyGrowthAt(priceUsd: number): number {
  return (MAX_DAILY_GROWTH * PRICE_CURVE_K_USD) / (PRICE_CURVE_K_USD + priceUsd);
}

/** Percentage label for a daily rate, to two significant digits: 1, 0.5, 0.015. */
export function formatDailyRate(rate: number): string {
  return `${Number((rate * 100).toPrecision(2))}%`;
}

/** Convert the on-chain price_index to USD. */
export function priceIndexToUsd(priceIndex: number): number {
  return priceIndex / PRICE_SCALE;
}

/**
 * Format UNIYAA price for display.
 * Always shows 6 decimal places so small daily increments are visible.
 * Uses locale grouping for thousands separators.
 */
export function formatUniyaaPrice(price: number): string {
  return `$${price.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6
  })}`;
}
