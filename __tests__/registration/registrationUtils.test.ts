/**
 * Tests for registration utilities
 * Covers mint tiers, elevated attempts, and balance validation
 */

import {
  getUserMintTier,
  isElevatedUser,
  getRemainingElevatedAttempts,
  hasMinimumSolBalance,
  formatSolBalance,
  ELEVATED_MINT_TIERS,
  MIN_SOL_BALANCE,
} from '@/utils/registration';

describe('Registration Utilities', () => {
  describe('getUserMintTier', () => {
    it('should return correct tier for User #1 (100,000 UNIA per attempt)', () => {
      const tier = getUserMintTier(1);
      expect(tier).not.toBeNull();
      expect(tier?.equaPerAttempt).toBe(100000);
      expect(tier?.elevatedAttempts).toBe(100);
    });

    it('should return correct tier for Users #2-10 (10,000 UNIA per attempt)', () => {
      for (let userNum = 2; userNum <= 10; userNum++) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(10000);
        expect(tier?.elevatedAttempts).toBe(100);
      }
    });

    it('should return correct tier for Users #11-100 (1,000 UNIA per attempt)', () => {
      for (const userNum of [11, 50, 100]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(1000);
        expect(tier?.elevatedAttempts).toBe(100);
      }
    });

    it('should return correct tier for Users #101-1000 (100 UNIA per attempt, no elevated)', () => {
      for (const userNum of [101, 500, 1000]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(100);
        expect(tier?.elevatedAttempts).toBe(0);
      }
    });

    it('should return correct tier for Users #1001-10000 (10 UNIA per attempt)', () => {
      for (const userNum of [1001, 5000, 10000]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(10);
        expect(tier?.elevatedAttempts).toBe(0);
      }
    });

    it('should return correct tier for Users #10001-100000 (1 UNIA per attempt)', () => {
      for (const userNum of [10001, 50000, 100000]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(1);
        expect(tier?.elevatedAttempts).toBe(0);
      }
    });

    it('should return correct tier for Users #100001-1000000 (0.1 UNIA per attempt)', () => {
      for (const userNum of [100001, 500000, 1000000]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(0.1);
        expect(tier?.elevatedAttempts).toBe(0);
      }
    });

    it('should return correct tier for Users #1000001-10000000 (0.01 UNIA per attempt)', () => {
      for (const userNum of [1000001, 5000000, 10000000]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(0.01);
        expect(tier?.elevatedAttempts).toBe(0);
      }
    });

    it('should return Tier 9 for Users #10000001+ with unlimited upper bound', () => {
      for (const userNum of [10000001, 50000000, 100000000, 999999999]) {
        const tier = getUserMintTier(userNum);
        expect(tier).not.toBeNull();
        expect(tier?.equaPerAttempt).toBe(0.001);
        expect(tier?.elevatedAttempts).toBe(0);
        expect(tier?.maxUser).toBe(Infinity);
      }
    });

    it('should return null for user number 0', () => {
      const tier = getUserMintTier(0);
      expect(tier).toBeNull();
    });

    it('should return null for negative user numbers', () => {
      const tier = getUserMintTier(-1);
      expect(tier).toBeNull();
    });
  });

  describe('isElevatedUser', () => {
    it('should return true for users #1-100 (elevated tiers)', () => {
      for (const userNum of [1, 5, 10, 50, 100]) {
        expect(isElevatedUser(userNum)).toBe(true);
      }
    });

    it('should return false for users #101+ (standard tier)', () => {
      for (const userNum of [101, 200, 1000]) {
        expect(isElevatedUser(userNum)).toBe(false);
      }
    });

    it('should return false for invalid user numbers', () => {
      expect(isElevatedUser(0)).toBe(false);
      expect(isElevatedUser(-1)).toBe(false);
    });
  });

  describe('getRemainingElevatedAttempts', () => {
    it('should return full attempts for user with no mints', () => {
      expect(getRemainingElevatedAttempts(1, 0)).toBe(100);
      expect(getRemainingElevatedAttempts(5, 0)).toBe(100);
      expect(getRemainingElevatedAttempts(50, 0)).toBe(100);
    });

    it('should correctly decrement attempts after mints', () => {
      expect(getRemainingElevatedAttempts(1, 1)).toBe(99);
      expect(getRemainingElevatedAttempts(1, 50)).toBe(50);
      expect(getRemainingElevatedAttempts(1, 99)).toBe(1);
      expect(getRemainingElevatedAttempts(1, 100)).toBe(0);
    });

    it('should return 0 when all attempts are used', () => {
      expect(getRemainingElevatedAttempts(1, 100)).toBe(0);
      expect(getRemainingElevatedAttempts(1, 150)).toBe(0);
    });

    it('should return 0 for non-elevated users', () => {
      expect(getRemainingElevatedAttempts(101, 0)).toBe(0);
      expect(getRemainingElevatedAttempts(500, 0)).toBe(0);
    });

    it('should return 0 for invalid user numbers', () => {
      expect(getRemainingElevatedAttempts(0, 0)).toBe(0);
      expect(getRemainingElevatedAttempts(-1, 0)).toBe(0);
    });
  });

  describe('hasMinimumSolBalance', () => {
    it('should return true for sufficient balance', () => {
      const sufficientLamports = MIN_SOL_BALANCE * 1_000_000_000;
      expect(hasMinimumSolBalance(sufficientLamports)).toBe(true);
      expect(hasMinimumSolBalance(sufficientLamports * 2)).toBe(true);
    });

    it('should return false for insufficient balance', () => {
      const insufficientLamports = (MIN_SOL_BALANCE - 0.01) * 1_000_000_000;
      expect(hasMinimumSolBalance(insufficientLamports)).toBe(false);
      expect(hasMinimumSolBalance(0)).toBe(false);
    });
  });

  describe('formatSolBalance', () => {
    it('should format balance correctly', () => {
      expect(formatSolBalance(1_000_000_000)).toBe('1.0000');
      expect(formatSolBalance(500_000_000)).toBe('0.5000');
      expect(formatSolBalance(50_000_000)).toBe('0.0500');
    });
  });

  describe('ELEVATED_MINT_TIERS configuration', () => {
    it('should have correct number of tiers', () => {
      expect(ELEVATED_MINT_TIERS.length).toBe(9);
    });

    it('should have non-overlapping ranges', () => {
      for (let i = 0; i < ELEVATED_MINT_TIERS.length - 1; i++) {
        const currentTier = ELEVATED_MINT_TIERS[i];
        const nextTier = ELEVATED_MINT_TIERS[i + 1];
        expect(currentTier.maxUser).toBeLessThan(nextTier.minUser);
      }
    });

    it('should cover all user numbers from 1 to infinity', () => {
      expect(ELEVATED_MINT_TIERS[0].minUser).toBe(1);
      expect(ELEVATED_MINT_TIERS[ELEVATED_MINT_TIERS.length - 1].maxUser).toBe(Infinity);
    });
  });
});
