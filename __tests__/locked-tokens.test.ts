/**
 * Tests for locked token utilities
 */

import { BN } from '@coral-xyz/anchor';
import {
  LOCK_PERIOD_SECONDS,
  canUnlock,
  getSecondsUntilUnlock,
  formatTimeRemaining,
  formatUnlockDate,
  calculateLockSplit,
  hasTokenLocking,
} from '@/utils/locked-tokens';

describe('locked-tokens utilities', () => {
  describe('LOCK_PERIOD_SECONDS', () => {
    it('should be 4 years in seconds', () => {
      const fourYearsInSeconds = 4 * 365 * 24 * 60 * 60;
      expect(LOCK_PERIOD_SECONDS).toBe(fourYearsInSeconds);
      expect(LOCK_PERIOD_SECONDS).toBe(126_144_000);
    });
  });

  describe('canUnlock', () => {
    it('should return true if current time is past unlock timestamp', () => {
      const pastTimestamp = new BN(Math.floor(Date.now() / 1000) - 1000);
      expect(canUnlock(pastTimestamp)).toBe(true);
    });

    it('should return false if current time is before unlock timestamp', () => {
      const futureTimestamp = new BN(Math.floor(Date.now() / 1000) + 1000);
      expect(canUnlock(futureTimestamp)).toBe(false);
    });

    it('should return true if current time equals unlock timestamp', () => {
      const currentTimestamp = new BN(Math.floor(Date.now() / 1000));
      expect(canUnlock(currentTimestamp)).toBe(true);
    });
  });

  describe('getSecondsUntilUnlock', () => {
    it('should return 0 for past timestamps', () => {
      const pastTimestamp = new BN(Math.floor(Date.now() / 1000) - 1000);
      expect(getSecondsUntilUnlock(pastTimestamp)).toBe(0);
    });

    it('should return correct seconds for future timestamps', () => {
      const futureTimestamp = new BN(Math.floor(Date.now() / 1000) + 3600);
      const seconds = getSecondsUntilUnlock(futureTimestamp);
      expect(seconds).toBeGreaterThan(3590);
      expect(seconds).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for current timestamp', () => {
      const currentTimestamp = new BN(Math.floor(Date.now() / 1000));
      expect(getSecondsUntilUnlock(currentTimestamp)).toBe(0);
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return "Unlocked" for 0 or negative seconds', () => {
      expect(formatTimeRemaining(0)).toBe('Unlocked');
      expect(formatTimeRemaining(-100)).toBe('Unlocked');
    });

    it('should format years, months, and days correctly', () => {
      const twoYears = 2 * 365 * 24 * 60 * 60;
      const result = formatTimeRemaining(twoYears);
      expect(result).toContain('2 years');
    });

    it('should handle singular year', () => {
      const oneYear = 365 * 24 * 60 * 60;
      const result = formatTimeRemaining(oneYear);
      expect(result).toContain('1 year');
      expect(result).not.toContain('years');
    });

    it('should format days only for small durations', () => {
      const fiveDays = 5 * 24 * 60 * 60;
      const result = formatTimeRemaining(fiveDays);
      expect(result).toContain('5 days');
      expect(result).not.toContain('year');
      expect(result).not.toContain('month');
    });

    it('should show "0 days" for very small durations', () => {
      const oneHour = 60 * 60;
      const result = formatTimeRemaining(oneHour);
      expect(result).toContain('0 days');
    });

    it('should never show 12 months (edge case near 4 years)', () => {
      // Test value that would show 12 months without the fix
      // 126,143,999 seconds = 3 years + 31,535,999 remaining
      // 31,535,999 / 2,592,000 = 12.16 months
      const nearFourYears = 126_143_999;
      const result = formatTimeRemaining(nearFourYears);
      
      // Should never show 12 months - should roll to 4 years instead
      expect(result).not.toContain('12 months');
      
      // Should show 4 years since months >= 12
      expect(result).toContain('4 years');
      expect(result).toContain('4 days');
    });

    it('should handle exactly 4 years', () => {
      const fourYears = 4 * 365 * 24 * 60 * 60; // 126,144,000 seconds
      const result = formatTimeRemaining(fourYears);
      expect(result).toContain('4 years');
      // Should show 0 months and 0 days (which means no months/days in output)
      expect(result).not.toContain('months');
    });
  });

  describe('formatUnlockDate', () => {
    it('should format timestamp as readable date', () => {
      const timestamp = new BN(1735689600); // 2025-01-01 00:00:00 UTC
      const result = formatUnlockDate(timestamp);
      expect(result).toContain('2025');
      expect(result).toContain('January');
    });

    it('should handle distant future dates', () => {
      const fourYearsFromNow = Math.floor(Date.now() / 1000) + LOCK_PERIOD_SECONDS;
      const timestamp = new BN(fourYearsFromNow);
      const result = formatUnlockDate(timestamp);
      expect(result.length).toBeGreaterThan(0);
      // Year should be in 2020s or 2030s depending on current date
      const yearMatch = result.match(/\d{4}/);
      expect(yearMatch).toBeTruthy();
      const year = parseInt(yearMatch![0]);
      expect(year).toBeGreaterThan(2025);
      expect(year).toBeLessThan(2035);
    });
  });

  describe('calculateLockSplit', () => {
    it('should return Tier 1 split for user #1', () => {
      const totalAmount = new BN(100_000_000_000); // 100,000 EQUA
      const { unlocked, locked } = calculateLockSplit(1, totalAmount);
      
      expect(unlocked.toNumber()).toBe(100_000_000); // 100 EQUA
      expect(locked.toNumber()).toBe(99_900_000_000); // 99,900 EQUA
    });

    it('should return Tier 2 split for users #2-10', () => {
      const totalAmount = new BN(10_000_000_000); // 10,000 EQUA
      
      for (let userIndex = 2; userIndex <= 10; userIndex++) {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(100_000_000); // 100 EQUA
        expect(locked.toNumber()).toBe(9_900_000_000); // 9,900 EQUA
      }
    });

    it('should return Tier 3 split for users #11-100', () => {
      const totalAmount = new BN(1_000_000_000); // 1,000 EQUA
      
      // Test a few representative users
      [11, 50, 100].forEach(userIndex => {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(100_000_000); // 100 EQUA
        expect(locked.toNumber()).toBe(900_000_000); // 900 EQUA
      });
    });

    it('should return no locking for users #101+', () => {
      const totalAmount = new BN(100_000_000); // 100 EQUA
      
      // Test users in different tiers
      [101, 500, 1000, 10000].forEach(userIndex => {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(totalAmount.toNumber());
        expect(locked.toNumber()).toBe(0);
      });
    });

    it('should respect total amount parameter for non-locked tiers', () => {
      const totalAmount = new BN(50_000_000); // 50 EQUA
      const { unlocked, locked } = calculateLockSplit(200, totalAmount);
      
      expect(unlocked.toNumber()).toBe(50_000_000);
      expect(locked.toNumber()).toBe(0);
    });
  });

  describe('hasTokenLocking', () => {
    it('should return true for user #1', () => {
      expect(hasTokenLocking(1)).toBe(true);
    });

    it('should return true for users #2-10', () => {
      for (let i = 2; i <= 10; i++) {
        expect(hasTokenLocking(i)).toBe(true);
      }
    });

    it('should return true for users #11-100', () => {
      [11, 50, 100].forEach(userIndex => {
        expect(hasTokenLocking(userIndex)).toBe(true);
      });
    });

    it('should return false for user #101+', () => {
      [101, 200, 1000, 10000].forEach(userIndex => {
        expect(hasTokenLocking(userIndex)).toBe(false);
      });
    });

    it('should return false for user #0 or negative', () => {
      expect(hasTokenLocking(0)).toBe(false);
      expect(hasTokenLocking(-1)).toBe(false);
    });
  });
});
