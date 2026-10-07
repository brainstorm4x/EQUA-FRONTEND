/**
 * Tests for the UNIYAA price helpers.
 *
 * The price itself is computed on-chain (GlobalState.price_index); the
 * frontend only converts and formats it.
 */

import {
  PRICE_SCALE,
  INITIAL_PRICE_USD,
  TERMINAL_PRICE_USD,
  MAX_DAILY_GROWTH,
  MAX_DAILY_LINEAR_INCREMENT_USD,
  priceIndexToUsd,
  formatUniyaaPrice,
} from '@/utils/priceCalculator';

describe('price helpers', () => {
  it('converts price_index to USD', () => {
    expect(priceIndexToUsd(10_000_000)).toBe(0.01);
    expect(priceIndexToUsd(1_000_000 * PRICE_SCALE)).toBe(1_000_000);
  });

  it('matches the program constants', () => {
    expect(INITIAL_PRICE_USD).toBe(0.01);
    expect(TERMINAL_PRICE_USD).toBe(1_000_000);
    expect(MAX_DAILY_GROWTH).toBe(0.01);
    expect(MAX_DAILY_LINEAR_INCREMENT_USD * 30).toBeCloseTo(25_000, 6);
  });

  it('formats with 6 decimals', () => {
    expect(formatUniyaaPrice(0.01)).toBe(`$${(0.01).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`);
  });
});
