/**
 * Tests for token formatting utilities
 * Covers UNIYAA balance formatting with 6 decimals
 */

import {
  formatUniyaaRaw,
  formatUniyaaBalance,
  parseUniyaaFormatted,
  rawToDecimal,
  decimalToRaw,
  getSmallestUnitName,
  getUniyaaDecimals,
  SMALLEST_UNIT_NAME,
  SMALLEST_UNIT_NAME_PLURAL,
} from '@/utils/tokenFormat';

const UNIYAA_DECIMAL_MULTIPLIER = 1_000_000; // 6 decimals

describe('Token Format Utilities', () => {
  describe('formatUniyaaRaw', () => {
    it('should format raw amounts correctly with 6 decimals', () => {
      // 1 UNIYAA = 1,000,000 base units (6 decimals)
      expect(formatUniyaaRaw(1_000_000)).toMatch(/1\.0/);
    });

    it('should handle large amounts', () => {
      // 100,000 UNIYAA
      const raw = 100_000 * UNIYAA_DECIMAL_MULTIPLIER;
      const formatted = formatUniyaaRaw(raw, { useGrouping: true });
      expect(formatted).toContain('100,000');
    });

    it('should handle small amounts', () => {
      // 0.123456 UNIYAA (6 decimals)
      const raw = 123_456;
      const formatted = formatUniyaaRaw(raw);
      expect(formatted).toMatch(/0\.123456/);
    });

    it('should handle zero', () => {
      expect(formatUniyaaRaw(0)).toMatch(/0/);
    });

    it('should handle invalid input', () => {
      expect(formatUniyaaRaw(NaN)).toMatch(/0/);
      expect(formatUniyaaRaw(Infinity)).toMatch(/0/);
    });
  });

  describe('formatUniyaaBalance', () => {
    it('should format User #1 balance (100,000 UNIYAA) correctly', () => {
      const rawBalance = 100_000 * UNIYAA_DECIMAL_MULTIPLIER;
      const formatted = formatUniyaaBalance(rawBalance);
      expect(formatted).toBe('100,000');
    });

    it('should format whole numbers without decimals', () => {
      const rawBalance = 1_000 * UNIYAA_DECIMAL_MULTIPLIER;
      expect(formatUniyaaBalance(rawBalance)).toBe('1,000');
    });

    it('should format fractional amounts with appropriate decimals', () => {
      const rawBalance = 1.5 * UNIYAA_DECIMAL_MULTIPLIER;
      const formatted = formatUniyaaBalance(rawBalance);
      expect(formatted).toMatch(/1\.5/);
    });

    it('should handle zero balance', () => {
      expect(formatUniyaaBalance(0)).toBe('0');
    });

    it('should handle small balances', () => {
      const rawBalance = 0.001 * UNIYAA_DECIMAL_MULTIPLIER; // 0.001 UNIYAA
      const formatted = formatUniyaaBalance(rawBalance);
      expect(formatted).toMatch(/0\.001/);
    });
  });

  describe('parseUniyaaFormatted', () => {
    it('should parse formatted amounts back to raw', () => {
      expect(parseUniyaaFormatted('1,000')).toBe(1_000 * UNIYAA_DECIMAL_MULTIPLIER);
      expect(parseUniyaaFormatted('100000')).toBe(100_000 * UNIYAA_DECIMAL_MULTIPLIER);
    });

    it('should handle decimal amounts', () => {
      const parsed = parseUniyaaFormatted('0.5');
      expect(parsed).toBe(500_000); // 0.5 UNIYAA in base units (6 decimals)
    });

    it('should handle invalid input', () => {
      expect(parseUniyaaFormatted('invalid')).toBe(0);
      expect(parseUniyaaFormatted('')).toBe(0);
    });
  });

  describe('rawToDecimal', () => {
    it('should convert raw base units to decimal UNIYAA (6 decimals)', () => {
      // 1,000,000 base units = 1 UNIYAA
      expect(rawToDecimal(1_000_000)).toBe(1);
    });

    it('should handle fractional amounts', () => {
      // 500,000 base units = 0.5 UNIYAA
      expect(rawToDecimal(500_000)).toBe(0.5);
    });

    it('should handle zero', () => {
      expect(rawToDecimal(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      // 100,000,000,000 base units = 100,000 UNIYAA
      expect(rawToDecimal(100_000_000_000)).toBe(100_000);
    });

    it('should handle invalid input', () => {
      expect(rawToDecimal(NaN)).toBe(0);
      expect(rawToDecimal(Infinity)).toBe(0);
    });
  });

  describe('decimalToRaw', () => {
    it('should convert decimal UNIYAA to raw base units (6 decimals)', () => {
      // 1 UNIYAA = 1,000,000 base units
      expect(decimalToRaw(1)).toBe(1_000_000);
    });

    it('should convert 10,000 UNIYAA to 10,000,000,000 base units', () => {
      // Critical test case from problem statement
      // 10,000 UNIYAA should be 10,000 * 1,000,000 = 10,000,000,000 base units (6 decimals)
      expect(decimalToRaw(10_000)).toBe(10_000_000_000);
    });

    it('should handle fractional amounts', () => {
      // 0.5 UNIYAA = 500,000 base units
      expect(decimalToRaw(0.5)).toBe(500_000);
    });

    it('should handle zero', () => {
      expect(decimalToRaw(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      // 100,000 UNIYAA
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

  describe('getUniyaaDecimals', () => {
    it('should return correct number of decimals for UNIYAA', () => {
      expect(getUniyaaDecimals()).toBe(6); // UNIYAA uses 6 decimals
    });
  });

  describe('Balance Display Scenarios', () => {
    it('should correctly display User #1 balance after mint (100,000 UNIYAA)', () => {
      // User #1 mints 100,000 UNIYAA
      const uniyaaAmount = 100_000;
      const rawBalance = uniyaaAmount * UNIYAA_DECIMAL_MULTIPLIER;
      
      // Verify raw amount (6 decimals)
      expect(rawBalance).toBe(100_000_000_000);
      
      // Verify formatted display
      const displayBalance = formatUniyaaBalance(rawBalance);
      expect(displayBalance).toBe('100,000');
    });

    it('should correctly display User #2-10 balance after mint (10,000 UNIYAA)', () => {
      const uniyaaAmount = 10_000;
      const rawBalance = uniyaaAmount * UNIYAA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(10_000_000_000);
      expect(formatUniyaaBalance(rawBalance)).toBe('10,000');
    });

    it('should correctly display User #11-100 balance after mint (1,000 UNIYAA)', () => {
      const uniyaaAmount = 1_000;
      const rawBalance = uniyaaAmount * UNIYAA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(1_000_000_000);
      expect(formatUniyaaBalance(rawBalance)).toBe('1,000');
    });

    it('should correctly display standard user balance after mint (100 UNIYAA)', () => {
      const uniyaaAmount = 100;
      const rawBalance = uniyaaAmount * UNIYAA_DECIMAL_MULTIPLIER;
      
      expect(rawBalance).toBe(100_000_000);
      expect(formatUniyaaBalance(rawBalance)).toBe('100');
    });
  });
});
