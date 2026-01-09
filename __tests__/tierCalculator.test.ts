/**
 * Tests for tierCalculator utility
 * 
 * Validates that frontend tier calculation logic matches backend exactly.
 */

import { calculateTierLimit, getTierName, getTierInfo } from '@/utils/tierCalculator';

describe('tierCalculator', () => {
  describe('calculateTierLimit', () => {
    describe('Elevated Tiers (1-3)', () => {
      it('should return 100,000 EQUA for user #1 with available attempts', () => {
        expect(calculateTierLimit(1, 0)).toBe(100_000);
        expect(calculateTierLimit(1, 50)).toBe(100_000);
        expect(calculateTierLimit(1, 99)).toBe(100_000);
      });

      it('should return Tier 4 limit for exhausted user #1', () => {
        expect(calculateTierLimit(1, 100)).toBe(100);
        expect(calculateTierLimit(1, 150)).toBe(100);
      });

      it('should return 10,000 EQUA for users #2-10 with available attempts', () => {
        expect(calculateTierLimit(2, 0)).toBe(10_000);
        expect(calculateTierLimit(5, 50)).toBe(10_000);
        expect(calculateTierLimit(10, 99)).toBe(10_000);
      });

      it('should return Tier 4 limit for exhausted users #2-10', () => {
        expect(calculateTierLimit(2, 100)).toBe(100);
        expect(calculateTierLimit(10, 100)).toBe(100);
      });

      it('should return 1,000 EQUA for users #11-100 with available attempts', () => {
        expect(calculateTierLimit(11, 0)).toBe(1_000);
        expect(calculateTierLimit(50, 50)).toBe(1_000);
        expect(calculateTierLimit(100, 99)).toBe(1_000);
      });

      it('should return Tier 4 limit for exhausted users #11-100', () => {
        expect(calculateTierLimit(11, 100)).toBe(100);
        expect(calculateTierLimit(100, 100)).toBe(100);
      });
    });

    describe('Standard Tiers (4-9)', () => {
      it('should return 100 EQUA for Tier 4 (users #1-1,000)', () => {
        expect(calculateTierLimit(101, 0)).toBe(100);
        expect(calculateTierLimit(500, 0)).toBe(100);
        expect(calculateTierLimit(1_000, 0)).toBe(100);
      });

      it('should return 10 EQUA for Tier 5 (users #1,001-10,000)', () => {
        expect(calculateTierLimit(1_001, 0)).toBe(10);
        expect(calculateTierLimit(5_000, 0)).toBe(10);
        expect(calculateTierLimit(10_000, 0)).toBe(10);
      });

      it('should return 1 EQUA for Tier 6 (users #10,001-100,000)', () => {
        expect(calculateTierLimit(10_001, 0)).toBe(1);
        expect(calculateTierLimit(50_000, 0)).toBe(1);
        expect(calculateTierLimit(100_000, 0)).toBe(1);
      });

      it('should return 0.1 EQUA for Tier 7 (users #100,001-1,000,000)', () => {
        expect(calculateTierLimit(100_001, 0)).toBe(0.1);
        expect(calculateTierLimit(500_000, 0)).toBe(0.1);
        expect(calculateTierLimit(1_000_000, 0)).toBe(0.1);
      });

      it('should return 0.01 EQUA for Tier 8 (users #1,000,001-10,000,000)', () => {
        expect(calculateTierLimit(1_000_001, 0)).toBe(0.01);
        expect(calculateTierLimit(5_000_000, 0)).toBe(0.01);
        expect(calculateTierLimit(10_000_000, 0)).toBe(0.01);
      });

      it('should return 0.001 EQUA for Tier 9 (users #10,000,001+)', () => {
        expect(calculateTierLimit(10_000_001, 0)).toBe(0.001);
        expect(calculateTierLimit(50_000_000, 0)).toBe(0.001);
        expect(calculateTierLimit(100_000_000, 0)).toBe(0.001);
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary between elevated and standard tiers', () => {
        // User #100 with 99 attempts - still elevated
        expect(calculateTierLimit(100, 99)).toBe(1_000);
        // User #100 with 100 attempts - standard tier 4
        expect(calculateTierLimit(100, 100)).toBe(100);
      });

      it('should handle boundaries between standard tiers', () => {
        expect(calculateTierLimit(1_000, 0)).toBe(100);   // Last of Tier 4
        expect(calculateTierLimit(1_001, 0)).toBe(10);    // First of Tier 5
        
        expect(calculateTierLimit(10_000, 0)).toBe(10);   // Last of Tier 5
        expect(calculateTierLimit(10_001, 0)).toBe(1);    // First of Tier 6
        
        expect(calculateTierLimit(100_000, 0)).toBe(1);   // Last of Tier 6
        expect(calculateTierLimit(100_001, 0)).toBe(0.1); // First of Tier 7
      });
    });
  });

  describe('getTierName', () => {
    it('should return correct tier names for all limits', () => {
      expect(getTierName(100_000)).toBe('Tier 1');
      expect(getTierName(10_000)).toBe('Tier 2');
      expect(getTierName(1_000)).toBe('Tier 3');
      expect(getTierName(100)).toBe('Tier 4');
      expect(getTierName(10)).toBe('Tier 5');
      expect(getTierName(1)).toBe('Tier 6');
      expect(getTierName(0.1)).toBe('Tier 7');
      expect(getTierName(0.01)).toBe('Tier 8');
      expect(getTierName(0.001)).toBe('Tier 9');
    });

    it('should return Tier 9 for unknown limits', () => {
      expect(getTierName(0.0001)).toBe('Tier 9');
      expect(getTierName(999)).toBe('Tier 9');
    });
  });

  describe('getTierInfo', () => {
    it('should return complete tier information for elevated users', () => {
      const info = getTierInfo(1, 50);
      expect(info.tierName).toBe('Tier 1');
      expect(info.limit).toBe(100_000);
      expect(info.isElevated).toBe(true);
      expect(info.remainingElevatedAttempts).toBe(50);
    });

    it('should return complete tier information for exhausted elevated users', () => {
      const info = getTierInfo(10, 100);
      expect(info.tierName).toBe('Tier 4');
      expect(info.limit).toBe(100);
      expect(info.isElevated).toBe(false);
      expect(info.remainingElevatedAttempts).toBe(0);
    });

    it('should return complete tier information for standard tier users', () => {
      const info = getTierInfo(5_000, 0);
      expect(info.tierName).toBe('Tier 5');
      expect(info.limit).toBe(10);
      expect(info.isElevated).toBe(false);
      expect(info.remainingElevatedAttempts).toBe(0);
    });
  });
});
