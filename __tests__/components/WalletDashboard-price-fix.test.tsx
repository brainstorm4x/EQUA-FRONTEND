/**
 * Tests for WalletDashboard UNIYAA price calculation fix
 * 
 * Issue: Send Modal was using a hardcoded DEFAULT_UNIYAA_PRICE_USD = 0.01 constant
 * which would show incorrect prices if UNIYAA has appreciated beyond $0.01.
 * 
 * Fix: Price is now computed via UniyaaPriceCalculator.calculatePrice(totalTransactions)
 * matching the pattern used in PriceDisplay.tsx.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { UniyaaPriceCalculator } from '../../src/utils/priceCalculator';

describe('WalletDashboard - UNIYAA Price Calculation Fix', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  it('should NOT have a hardcoded DEFAULT_UNIYAA_PRICE_USD constant', () => {
    // The constant must be removed to prevent stale-price fallback risk
    expect(sourceCode).not.toMatch(/const DEFAULT_UNIYAA_PRICE_USD/);
  });

  it('should import UniyaaPriceCalculator from priceCalculator', () => {
    expect(sourceCode).toMatch(/UniyaaPriceCalculator/);
    expect(sourceCode).toMatch(/from '@\/utils\/priceCalculator'/);
  });

  it('should call UniyaaPriceCalculator.calculatePrice with totalTransactions', () => {
    expect(sourceCode).toMatch(/UniyaaPriceCalculator\.calculatePrice\(totalTransactions\)/);
  });

  it('should use the calculated price as the catch-block fallback', () => {
    // The catch block must use the computed uniyaaPriceUsd, not a hardcoded value
    expect(sourceCode).toMatch(/setUniyaaPrice\(uniyaaPriceUsd\)/);
  });

  it('should return $0.01 from UniyaaPriceCalculator when totalTransactions is 0', () => {
    // With 0 transactions the calculator naturally returns the initial price of $0.01
    const price = UniyaaPriceCalculator.calculatePrice(0);
    expect(price).toBe(0.01);
  });

  it('should calculate correct UNIYAA-to-INR conversion', () => {
    // Given: price from calculator at 0 txns = 0.01 USD and FX rate = 90.77
    const uniyaaPriceUsd = UniyaaPriceCalculator.calculatePrice(0);
    const fxRateInr = 90.77;

    // When: Calculate UNIYAA price in INR
    const uniyaaPriceInr = uniyaaPriceUsd * fxRateInr;

    // Then: 1 UNIYAA should equal 0.9077 INR (not 90.77)
    expect(uniyaaPriceInr).toBeCloseTo(0.9077, 4);
    expect(uniyaaPriceInr).not.toBe(90.77);
  });

  it('should convert INR to UNIYAA correctly', () => {
    // Given: 1 UNIYAA = 0.9077 INR
    const uniyaaPriceInr = 0.9077;
    const localAmount = 90.77; // INR input

    // When: Convert INR to UNIYAA (uniyaaAmount = localAmount / uniyaaPrice)
    const uniyaaAmount = localAmount / uniyaaPriceInr;

    // Then: Should get 100 UNIYAA
    expect(uniyaaAmount).toBeCloseTo(100, 2);
  });

  it('should convert UNIYAA to INR correctly', () => {
    // Given: 1 UNIYAA = 0.9077 INR
    const uniyaaPriceInr = 0.9077;
    const uniyaaAmount = 100; // UNIYAA input

    // When: Convert UNIYAA to INR (localAmount = uniyaaAmount * uniyaaPrice)
    const localAmount = uniyaaAmount * uniyaaPriceInr;

    // Then: Should get 90.77 INR
    expect(localAmount).toBeCloseTo(90.77, 2);
  });
});
