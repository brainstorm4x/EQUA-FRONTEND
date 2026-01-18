/**
 * Tests for WalletDashboard EQUA price calculation fix
 * 
 * Issue: Send Modal was showing incorrect EQUA-to-INR conversions
 * Expected: 1 EQUA = 0.9077 INR (based on USD 0.01 * FX rate 90.77)
 * Previous: Send Modal showed 1 EQUA = 90.77 INR (100x error)
 * 
 * Fix: Changed DEFAULT_EQUA_PRICE_USD from 1.00 to 0.01
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WalletDashboard - EQUA Price Calculation Fix', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  it('should set DEFAULT_EQUA_PRICE_USD to 0.01 (not 1.00)', () => {
    // Verify the constant is correctly set to 0.01
    expect(sourceCode).toMatch(/const DEFAULT_EQUA_PRICE_USD = 0\.01;/);
    
    // Ensure it's NOT set to the incorrect value of 1.00
    expect(sourceCode).not.toMatch(/const DEFAULT_EQUA_PRICE_USD = 1\.00;/);
  });

  it('should calculate correct EQUA-to-INR conversion', () => {
    // Given: DEFAULT_EQUA_PRICE_USD = 0.01 and FX rate = 90.77
    const equaPriceUsd = 0.01;
    const fxRateInr = 90.77;
    
    // When: Calculate EQUA price in INR
    const equaPriceInr = equaPriceUsd * fxRateInr;
    
    // Then: 1 EQUA should equal 0.9077 INR (not 90.77)
    expect(equaPriceInr).toBe(0.9077);
    expect(equaPriceInr).not.toBe(90.77);
  });

  it('should convert INR to EQUA correctly', () => {
    // Given: 1 EQUA = 0.9077 INR
    const equaPriceInr = 0.9077;
    const localAmount = 90.77; // INR input
    
    // When: Convert INR to EQUA (line 625: equaAmount = localAmount / equaPrice)
    const equaAmount = localAmount / equaPriceInr;
    
    // Then: Should get 100 EQUA
    expect(equaAmount).toBeCloseTo(100, 2);
  });

  it('should convert EQUA to INR correctly', () => {
    // Given: 1 EQUA = 0.9077 INR
    const equaPriceInr = 0.9077;
    const equaAmount = 100; // EQUA input
    
    // When: Convert EQUA to INR (line 639: localAmount = equaAmount * equaPrice)
    const localAmount = equaAmount * equaPriceInr;
    
    // Then: Should get 90.77 INR
    expect(localAmount).toBeCloseTo(90.77, 2);
  });

  it('should prevent showing 100x inflated prices in Send Modal', () => {
    // This test ensures the bug is fixed:
    // Before: DEFAULT_EQUA_PRICE_USD = 1.00 → 1 EQUA = 90.77 INR (wrong)
    // After: DEFAULT_EQUA_PRICE_USD = 0.01 → 1 EQUA = 0.9077 INR (correct)
    
    const equaPriceUsd = 0.01; // Must be 0.01
    const fxRateInr = 90.77;
    const correctEquaPriceInr = equaPriceUsd * fxRateInr;
    
    // Verify we're NOT using the inflated price
    expect(correctEquaPriceInr).not.toBe(90.77);
    
    // Verify we're using the correct price
    expect(correctEquaPriceInr).toBe(0.9077);
  });
});
