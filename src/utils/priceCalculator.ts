/**
 * UNIYAA price helpers.
 *
 * The price is stored on-chain in GlobalState.price_index (USD scaled by
 * PRICE_SCALE) and grows once per UTC day with participation:
 *
 *   below $1,000,000:  price += price × 1% × (payers that day / users)
 *   from $1,000,000:   price += $833.33 × (payers that day / users)
 *
 * Each sender counts at most once per UTC day. The frontend only reads and
 * formats the price; it never computes it. Program source:
 * programs/uniyaa_token/src/lib.rs (grow_price, record_counted_payment).
 */

/** price_index units per USD (matches PRICE_SCALE in the program). */
export const PRICE_SCALE = 1_000_000_000;
export const INITIAL_PRICE_USD = 0.01;
export const TERMINAL_PRICE_USD = 1_000_000;
/** Maximum daily growth while compounding (at 100% participation). */
export const MAX_DAILY_GROWTH = 0.01;
/** Maximum daily increase in the linear phase ($25,000 per 30 days). */
export const MAX_DAILY_LINEAR_INCREMENT_USD = 25_000 / 30;

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
