/**
 * Tests for dynamic decimal token formatting utilities
 * Ensures proper handling of different decimal configurations
 */

import {
  formatEquaRaw,
  formatEquaBalance,
  parseEquaFormatted,
  rawToDecimal,
  decimalToRaw,
  parseDecimalStringToRaw,
} from '@/utils/tokenFormat';

describe('Token Format with Dynamic Decimals', () => {
  describe('formatEquaRaw with different decimals', () => {
    it('should format with 6 decimals (default)', () => {
      const raw = 1_000_000; // 1 UNIA with 6 decimals
      expect(formatEquaRaw(raw)).toMatch(/1\.0/);
      expect(formatEquaRaw(raw, { tokenDecimals: 6 })).toMatch(/1\.0/);
    });

    it('should format with 9 decimals', () => {
      const raw = 1_000_000_000; // 1 UNIA with 9 decimals
      expect(formatEquaRaw(raw, { tokenDecimals: 9 })).toMatch(/1\.0/);
    });

    it('should handle small amounts with 6 decimals', () => {
      const raw = 123_456; // 0.123456 UNIA with 6 decimals
      const formatted = formatEquaRaw(raw, { tokenDecimals: 6 });
      expect(formatted).toMatch(/0\.123456/);
    });

    it('should handle large amounts with 6 decimals', () => {
      const raw = 100_000_000_000; // 100,000 UNIA with 6 decimals
      const formatted = formatEquaRaw(raw, { tokenDecimals: 6, useGrouping: true });
      expect(formatted).toContain('100,000');
    });
  });

  describe('rawToDecimal with different decimals', () => {
    it('should convert with 6 decimals (default)', () => {
      expect(rawToDecimal(1_000_000)).toBe(1);
      expect(rawToDecimal(500_000)).toBe(0.5);
      expect(rawToDecimal(123_456)).toBeCloseTo(0.123456);
    });

    it('should convert with 9 decimals', () => {
      expect(rawToDecimal(1_000_000_000, 9)).toBe(1);
      expect(rawToDecimal(500_000_000, 9)).toBe(0.5);
    });

    it('should handle zero', () => {
      expect(rawToDecimal(0)).toBe(0);
      expect(rawToDecimal(0, 9)).toBe(0);
    });
  });

  describe('decimalToRaw with different decimals', () => {
    it('should convert with 6 decimals (default)', () => {
      expect(decimalToRaw(1)).toBe(1_000_000);
      expect(decimalToRaw(0.5)).toBe(500_000);
      expect(decimalToRaw(100)).toBe(100_000_000);
    });

    it('should convert with 9 decimals', () => {
      expect(decimalToRaw(1, 9)).toBe(1_000_000_000);
      expect(decimalToRaw(0.5, 9)).toBe(500_000_000);
    });

    it('should handle zero', () => {
      expect(decimalToRaw(0)).toBe(0);
      expect(decimalToRaw(0, 9)).toBe(0);
    });

    it('should round properly', () => {
      // 0.1234567 with 6 decimals should round to 123457
      expect(decimalToRaw(0.1234567, 6)).toBe(123457);
    });
  });

  describe('parseDecimalStringToRaw', () => {
    it('should parse decimal strings with 6 decimals', () => {
      expect(parseDecimalStringToRaw('1', 6)).toBe(1_000_000n);
      expect(parseDecimalStringToRaw('0.5', 6)).toBe(500_000n);
      expect(parseDecimalStringToRaw('1.123456', 6)).toBe(1_123_456n);
      expect(parseDecimalStringToRaw('100', 6)).toBe(100_000_000n);
    });

    it('should parse decimal strings with 9 decimals', () => {
      expect(parseDecimalStringToRaw('1', 9)).toBe(1_000_000_000n);
      expect(parseDecimalStringToRaw('0.5', 9)).toBe(500_000_000n);
      expect(parseDecimalStringToRaw('1.123456789', 9)).toBe(1_123_456_789n);
    });

    it('should handle strings with no decimal part', () => {
      expect(parseDecimalStringToRaw('42', 6)).toBe(42_000_000n);
      expect(parseDecimalStringToRaw('100', 9)).toBe(100_000_000_000n);
    });

    it('should truncate excess decimals (no rounding)', () => {
      // More than 6 decimals should truncate
      expect(parseDecimalStringToRaw('1.1234567', 6)).toBe(1_123456n);
      expect(parseDecimalStringToRaw('0.9999999', 6)).toBe(999999n);
    });

    it('should handle zero', () => {
      expect(parseDecimalStringToRaw('0', 6)).toBe(0n);
      expect(parseDecimalStringToRaw('0.0', 6)).toBe(0n);
      expect(parseDecimalStringToRaw('0.000000', 6)).toBe(0n);
    });

    it('should return null for invalid input', () => {
      expect(parseDecimalStringToRaw('', 6)).toBeNull();
      expect(parseDecimalStringToRaw('abc', 6)).toBeNull();
      expect(parseDecimalStringToRaw('1.2.3', 6)).toBeNull();
      expect(parseDecimalStringToRaw('1.2a', 6)).toBeNull();
    });

    it('should handle whitespace', () => {
      expect(parseDecimalStringToRaw('  1.5  ', 6)).toBe(1_500_000n);
    });

    it('should handle very small amounts', () => {
      expect(parseDecimalStringToRaw('0.000001', 6)).toBe(1n);
      expect(parseDecimalStringToRaw('0.000000001', 9)).toBe(1n);
    });

    it('should handle large amounts without precision loss', () => {
      // BigInt preserves precision for large numbers
      expect(parseDecimalStringToRaw('1000000', 6)).toBe(1_000_000_000_000n);
      expect(parseDecimalStringToRaw('999999.999999', 6)).toBe(999_999_999_999n);
    });
  });

  describe('formatEquaBalance with different decimals', () => {
    it('should format balance with 6 decimals', () => {
      expect(formatEquaBalance(1_000_000, 6)).toMatch(/1/);
      expect(formatEquaBalance(100_000_000, 6)).toMatch(/100/);
    });

    it('should format balance with 9 decimals', () => {
      expect(formatEquaBalance(1_000_000_000, 9)).toMatch(/1/);
    });

    it('should show appropriate decimals for fractional amounts', () => {
      const formatted = formatEquaBalance(1_234_567, 6); // 1.234567 UNIA
      expect(formatted).toContain('1.234567');
    });
  });

  describe('parseEquaFormatted with different decimals', () => {
    it('should parse with 6 decimals', () => {
      expect(parseEquaFormatted('1', 6)).toBe(1_000_000);
      expect(parseEquaFormatted('1,000', 6)).toBe(1_000_000_000);
    });

    it('should parse with 9 decimals', () => {
      expect(parseEquaFormatted('1', 9)).toBe(1_000_000_000);
      expect(parseEquaFormatted('0.5', 9)).toBe(500_000_000);
    });

    it('should handle formatted numbers with commas', () => {
      expect(parseEquaFormatted('1,234.56', 6)).toBe(1_234_560_000);
    });
  });

  describe('Decimal mismatch scenarios', () => {
    it('should demonstrate 6 vs 9 decimal difference', () => {
      // Same raw value, different decimals = different token amounts
      const raw = 1_000_000_000;
      
      // With 6 decimals: 1,000 tokens
      expect(rawToDecimal(raw, 6)).toBe(1000);
      
      // With 9 decimals: 1 token
      expect(rawToDecimal(raw, 9)).toBe(1);
      
      // This demonstrates the bug when hardcoded as 9 but actual is 6
    });

    it('should show impact on transfer amounts', () => {
      // User wants to send 1 UNIA
      const desiredAmount = 1;
      
      // With correct decimals (6): 1,000,000 base units
      const correctRaw = decimalToRaw(desiredAmount, 6);
      expect(correctRaw).toBe(1_000_000);
      
      // With wrong decimals (9): 1,000,000,000 base units (1000x more!)
      const wrongRaw = decimalToRaw(desiredAmount, 9);
      expect(wrongRaw).toBe(1_000_000_000);
      
      // Using wrong decimals would try to send 1000x more tokens
      expect(wrongRaw).toBe(correctRaw * 1000);
    });
  });
});
