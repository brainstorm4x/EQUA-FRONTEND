/**
 * Tests for the UNIYAA price helpers.
 *
 * The price itself is computed on-chain (GlobalState.price_index); the
 * frontend only converts and formats it.
 */

import {
  PRICE_SCALE,
  INITIAL_PRICE_USD,
  MAX_DAILY_GROWTH,
  PRICE_CURVE_K_USD,
  maxDailyGrowthAt,
  formatDailyRate,
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
    expect(MAX_DAILY_GROWTH).toBe(0.01);
    expect(PRICE_CURVE_K_USD).toBe(150_000);
  });

  it('slows the daily rate smoothly as the price rises', () => {
    expect(formatDailyRate(maxDailyGrowthAt(0.01))).toBe('1%');
    expect(formatDailyRate(maxDailyGrowthAt(150_000))).toBe('0.5%');
    // Far above K the daily increase levels off at $1,500
    expect(maxDailyGrowthAt(10_000_000) * 10_000_000).toBeCloseTo(1_478, 0);
    expect(formatDailyRate(maxDailyGrowthAt(10_000_000))).toBe('0.015%');
  });

  it('formats with 6 decimals', () => {
    expect(formatUniyaaPrice(0.01)).toBe(`$${(0.01).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`);
  });
});
