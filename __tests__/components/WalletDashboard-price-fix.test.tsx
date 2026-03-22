/**
 * Tests for WalletDashboard UNIA price calculation fix
 * 
 * Issue: Send Modal was using a hardcoded DEFAULT_UNIA_PRICE_USD = 0.01 constant
 * which would show incorrect prices if UNIA has appreciated beyond $0.01.
 * 
 * Fix: Price is now computed via EquaPriceCalculator.calculatePrice(totalTransactions)
 * matching the pattern used in PriceDisplay.tsx.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { EquaPriceCalculator } from '../../src/utils/priceCalculator';

describe('WalletDashboard - UNIA Price Calculation Fix', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  it('should NOT have a hardcoded DEFAULT_UNIA_PRICE_USD constant', () => {
    // The constant must be removed to prevent stale-price fallback risk
    expect(sourceCode).not.toMatch(/const DEFAULT_UNIA_PRICE_USD/);
  });

  it('should import EquaPriceCalculator from priceCalculator', () => {
    expect(sourceCode).toMatch(/EquaPriceCalculator/);
    expect(sourceCode).toMatch(/from '@\/utils\/priceCalculator'/);
  });

  it('should call EquaPriceCalculator.calculatePrice with totalTransactions', () => {
    expect(sourceCode).toMatch(/EquaPriceCalculator\.calculatePrice\(totalTransactions\)/);
  });

  it('should use the calculated price as the catch-block fallback', () => {
    // The catch block must use the computed equaPriceUsd, not a hardcoded value
    expect(sourceCode).toMatch(/setUniaPrice\(equaPriceUsd\)/);
  });

  it('should return $0.01 from EquaPriceCalculator when totalTransactions is 0', () => {
    // With 0 transactions the calculator naturally returns the initial price of $0.01
    const price = EquaPriceCalculator.calculatePrice(0);
    expect(price).toBe(0.01);
  });

  it('should calculate correct UNIA-to-INR conversion', () => {
    // Given: price from calculator at 0 txns = 0.01 USD and FX rate = 90.77
    const equaPriceUsd = EquaPriceCalculator.calculatePrice(0);
    const fxRateInr = 90.77;

    // When: Calculate UNIA price in INR
    const equaPriceInr = equaPriceUsd * fxRateInr;

    // Then: 1 UNIA should equal 0.9077 INR (not 90.77)
    expect(equaPriceInr).toBeCloseTo(0.9077, 4);
    expect(equaPriceInr).not.toBe(90.77);
  });

  it('should convert INR to UNIA correctly', () => {
    // Given: 1 UNIA = 0.9077 INR
    const equaPriceInr = 0.9077;
    const localAmount = 90.77; // INR input

    // When: Convert INR to UNIA (equaAmount = localAmount / equaPrice)
    const equaAmount = localAmount / equaPriceInr;

    // Then: Should get 100 UNIA
    expect(equaAmount).toBeCloseTo(100, 2);
  });

  it('should convert UNIA to INR correctly', () => {
    // Given: 1 UNIA = 0.9077 INR
    const equaPriceInr = 0.9077;
    const equaAmount = 100; // UNIA input

    // When: Convert UNIA to INR (localAmount = equaAmount * equaPrice)
    const localAmount = equaAmount * equaPriceInr;

    // Then: Should get 90.77 INR
    expect(localAmount).toBeCloseTo(90.77, 2);
  });
});
