/**
 * Tests for token formatting utilities
 * Covers EQUA balance formatting with 6 decimals
 */

import {
  formatEquaRaw,
  formatEquaBalance,
  parseEquaFormatted,
  rawToDecimal,
  decimalToRaw,
  getSmallestUnitName,
  getEquaDecimals,
  SMALLEST_UNIT_NAME,
  SMALLEST_UNIT_NAME_PLURAL,
} from '@/utils/tokenFormat';

const EQUA_DECIMAL_MULTIPLIER = 1_000_000; // 6 decimals

describe('Token Format Utilities', () => {
  describe('formatEquaRaw', () => {
    it('should format raw amounts correctly with 6 decimals', () => {
      // 1 EQUA = 1,000,000 base units (6 decimals)
      expect(formatEquaRaw(1_000_000)).toMatch(/1\.0/);
    });

    it('should handle large amounts', () => {
      // 100,000 EQUA
      const raw = 100_000 * EQUA_DECIMAL_MULTIPLIER;
      const formatted = formatEquaRaw(raw, { useGrouping: true });
      expect(formatted).toContain('100,000');
    });

    it('should handle small amounts', () => {
      // 0.123456 EQUA (6 decimals)
      const raw = 123_456;
      const formatted = formatEquaRaw(raw);
      expect(formatted).toMatch(/0\.123456/);
    });

    it('should handle zero', () => {
      expect(formatEquaRaw(0)).toMatch(/0/);
    });

    it('should handle invalid input', () => {
      expect(formatEquaRaw(NaN)).toMatch(/0/);
      expect(formatEquaRaw(Infinity)).toMatch(/0/);
    });
  });

  describe('formatEquaBalance', () => {
    it('should format User #1 balance (100,000 EQUA) correctly', () => {
      const rawBalance = 100_000 * EQUA_DECIMAL_MULTIPLIER;
      const formatted = formatEquaBalance(rawBalance);
      expect(formatted).toBe('100,000');
    });

    it('should format whole numbers without decimals', () => {
      const rawBalance = 1_000 * EQUA_DECIMAL_MULTIPLIER;
      expect(formatEquaBalance(rawBalance)).toBe('1,000');
    });

    it('should format fractional amounts with appropriate decimals', () => {
      const rawBalance = 1.5 * EQUA_DECIMAL_MULTIPLIER;
      const formatted = formatEquaBalance(rawBalance);
      expect(formatted).toMatch(/1\.5/);
    });

    it('should handle zero balance', () => {
      expect(formatEquaBalance(0)).toBe('0');
    });

    it('should handle small balances', () => {
      const rawBalance = 0.001 * EQUA_DECIMAL_MULTIPLIER; // 0.001 EQUA
      const formatted = formatEquaBalance(rawBalance);
      expect(formatted).toMatch(/0\.001/);
    });
  });

  describe('parseEquaFormatted', () => {
    it('should parse formatted amounts back to raw', () => {
      expect(parseEquaFormatted('1,000')).toBe(1_000 * EQUA_DECIMAL_MULTIPLIER);
      expect(parseEquaFormatted('100000')).toBe(100_000 * EQUA_DECIMAL_MULTIPLIER);
    });

    it('should handle decimal amounts', () => {
      const parsed = parseEquaFormatted('0.5');
      expect(parsed).toBe(500_000); // 0.5 EQUA in base units (6 decimals)
    });

    it('should handle invalid input', () => {
      expect(parseEquaFormatted('invalid')).toBe(0);
      expect(parseEquaFormatted('')).toBe(0);
    });
  });

  describe('rawToDecimal', () => {
    it('should convert raw base units to decimal EQUA (6 decimals)', () => {
      // 1,000,000 base units = 1 EQUA
      expect(rawToDecimal(1_000_000)).toBe(1);
    });

    it('should handle fractional amounts', () => {
      // 500,000 base units = 0.5 EQUA
      expect(rawToDecimal(500_000)).toBe(0.5);
    });

    it('should handle zero', () => {
      expect(rawToDecimal(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      // 100,000,000,000 base units = 100,000 EQUA
      expect(rawToDecimal(100_000_000_000)).toBe(100_000);
    });

    it('should handle invalid input', () => {
      expect(rawToDecimal(NaN)).toBe(0);
      expect(rawToDecimal(Infinity)).toBe(0);
    });
  });

  describe('decimalToRaw', () => {
    it('should convert decimal EQUA to raw base units (6 decimals)', () => {
      // 1 EQUA = 1,000,000 base units
      expect(decimalToRaw(1)).toBe(1_000_000);
    });

    it('should convert 10,000 EQUA to 10,000,000,000 base units', () => {
      // Critical test case from problem statement
      // 10,000 EQUA should be 10,000 * 1,000,000 = 10,000,000,000 base units (6 decimals)
      expect(decimalToRaw(10_000)).toBe(10_000_000_000);
    });

    it('should handle fractional amounts', () => {
      // 0.5 EQUA = 500,000 base units
      expect(decimalToRaw(0.5)).toBe(500_000);
    });

    it('should handle zero', () => {
      expect(decimalToRaw(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      // 100,000 EQUA
      expect(decimalToRaw(100_000)).toBe(100_000_000_000);
    });

    it('should handle invalid input', () => {
      expect(decimalToRaw(NaN)).toBe(0);
      expect(decimalToRaw(Infinity)).toBe(0);
    });
  });

  describe('getSmallestUnitName', () => {
    it('should return singular for 1', () => {
      expect(getSmallestUnitName(1)).toBe(SMALLEST_UNIT_NAME);
    });

    it('should return plural for amounts != 1', () => {
      expect(getSmallestUnitName(0)).toBe(SMALLEST_UNIT_NAME_PLURAL);
      expect(getSmallestUnitName(2)).toBe(SMALLEST_UNIT_NAME_PLURAL);
      expect(getSmallestUnitName(100)).toBe(SMALLEST_UNIT_NAME_PLURAL);
    });
  });

  describe('getEquaDecimals', () => {
    it('should return correct number of decimals for EQUA', () => {
      expect(getEquaDecimals()).toBe(6); // EQUA uses 6 decimals
    });
  });

  describe('Balance Display Scenarios', () => {
    it('should correctly display User #1 balance after mint (100,000 EQUA)', () => {
      // User #1 mints 100,000 EQUA
      const equaAmount = 100_000;
      const rawBalance = equaAmount * EQUA_DECIMAL_MULTIPLIER;
      
      // Verify raw amount (6 decimals)
      expect(rawBalance).toBe(100_000_000_000);
      
      // Verify formatted display
      const displayBalance = formatEquaBalance(rawBalance);
      expect(displayBalance).toBe('100,000');
    });

    it('should correctly display User #2-10 balance after mint (10,000 EQUA)', () => {
      const equaAmount = 10_000;
      const rawBalance = equaAmount * EQUA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(10_000_000_000);
      expect(formatEquaBalance(rawBalance)).toBe('10,000');
    });

    it('should correctly display User #11-100 balance after mint (1,000 EQUA)', () => {
      const equaAmount = 1_000;
      const rawBalance = equaAmount * EQUA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(1_000_000_000);
      expect(formatEquaBalance(rawBalance)).toBe('1,000');
    });

    it('should correctly display standard user balance after mint (100 EQUA)', () => {
      const equaAmount = 100;
      const rawBalance = equaAmount * EQUA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(100_000_000);
      expect(formatEquaBalance(rawBalance)).toBe('100');
    });
  });
});
