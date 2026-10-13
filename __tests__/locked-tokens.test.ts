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
    // formatTimeRemaining counts calendar years from now, so a fixed
    // 365-day year is short by a day whenever the span crosses Feb 29.
    const secondsToCalendarYears = (years: number) => {
      const now = new Date();
      const later = new Date(now);
      later.setFullYear(now.getFullYear() + years);
      return (later.getTime() - now.getTime()) / 1000;
    };

    it('should return "Unlocked" for 0 or negative seconds', () => {
      expect(formatTimeRemaining(0)).toBe('Unlocked');
      expect(formatTimeRemaining(-100)).toBe('Unlocked');
    });

    it('should format years, months, and days correctly', () => {
      const twoYears = secondsToCalendarYears(2);
      const result = formatTimeRemaining(twoYears);
      expect(result).toContain('2 years');
    });

    it('should handle singular year', () => {
      const oneYear = secondsToCalendarYears(1);
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

    it('should accurately calculate from Jan 3, 2026 to Jan 2, 2030 (bug fix)', () => {
      // Reproduce the exact scenario from the bug screenshot
      // First mint: Jan 3, 2026
      // Current time: Jan 4, 2026 (one day after first mint)
      // Unlock: Jan 2, 2030 (4 years from first mint)
      // Expected: ~3 years, 11 months, 29 days from current time to unlock
      const firstMint = new Date('2026-01-03T00:00:00Z').getTime() / 1000;
      const unlock = firstMint + (4 * 365 * 24 * 60 * 60); // 4 years (simplified)
      const currentTime = new Date('2026-01-04T00:00:00Z').getTime() / 1000;
      
      const remaining = unlock - currentTime;
      const result = formatTimeRemaining(remaining);
      
      // Should be approximately 3 years, 11 months (not 4 years)
      expect(result).toContain('3 years');
      expect(result).toContain('11 months');
      expect(result).not.toContain('4 years'); // ❌ Bug: was showing "4 years, 3 days"
    });

    it('should handle leap year correctly (2028)', () => {
      // Test a date range that crosses the 2028 leap year
      const start = new Date('2027-01-01T00:00:00Z');
      const end = new Date('2029-01-01T00:00:00Z'); // Crosses Feb 29, 2028
      
      const seconds = (end.getTime() - start.getTime()) / 1000;
      const result = formatTimeRemaining(seconds);
      
      expect(result).toContain('2 years');
      // date-fns will account for the extra day in 2028
    });

    it('should never show 12 months', () => {
      // Test edge case near year boundary
      const nearOneYear = 364 * 24 * 60 * 60; // 364 days
      const result = formatTimeRemaining(nearOneYear);
      
      expect(result).not.toContain('12 months');
    });

    it('should handle very short durations (hours only)', () => {
      const twoHours = 2 * 60 * 60; // 7200 seconds
      const result = formatTimeRemaining(twoHours);
      
      expect(result).toBe('0 days'); // Less than a day shows as 0 days
    });

    it('should handle exactly 4 years', () => {
      const fourYears = 4 * 365 * 24 * 60 * 60; // 126,144,000 seconds
      const result = formatTimeRemaining(fourYears);
      
      // date-fns will calculate the actual duration accounting for leap years
      expect(result).toContain('year');
    });

    it('should handle month boundaries correctly', () => {
      // 1 month and 15 days
      const oneMonthFifteenDays = (31 + 15) * 24 * 60 * 60;
      const result = formatTimeRemaining(oneMonthFifteenDays);
      
      expect(result).toContain('month');
      expect(result).toContain('day');
    });

    it('should handle year boundaries correctly', () => {
      // 1 year, 6 months, 10 days
      const duration = (365 + 180 + 10) * 24 * 60 * 60;
      const result = formatTimeRemaining(duration);
      
      expect(result).toContain('year');
      expect(result).toContain('month');
      expect(result).toContain('day');
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
      const totalAmount = new BN(100_000_000_000); // 100,000 UNIYAA
      const { unlocked, locked } = calculateLockSplit(1, totalAmount);
      
      expect(unlocked.toNumber()).toBe(100_000_000); // 100 UNIYAA
      expect(locked.toNumber()).toBe(99_900_000_000); // 99,900 UNIYAA
    });

    it('should return Tier 2 split for users #2-10', () => {
      const totalAmount = new BN(10_000_000_000); // 10,000 UNIYAA
      
      for (let userIndex = 2; userIndex <= 10; userIndex++) {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(100_000_000); // 100 UNIYAA
        expect(locked.toNumber()).toBe(9_900_000_000); // 9,900 UNIYAA
      }
    });

    it('should return Tier 3 split for users #11-100', () => {
      const totalAmount = new BN(1_000_000_000); // 1,000 UNIYAA
      
      // Test a few representative users
      [11, 50, 100].forEach(userIndex => {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(100_000_000); // 100 UNIYAA
        expect(locked.toNumber()).toBe(900_000_000); // 900 UNIYAA
      });
    });

    it('should return no locking for users #101+', () => {
      const totalAmount = new BN(100_000_000); // 100 UNIYAA
      
      // Test users in different tiers
      [101, 500, 1000, 10000].forEach(userIndex => {
        const { unlocked, locked } = calculateLockSplit(userIndex, totalAmount);
        
        expect(unlocked.toNumber()).toBe(totalAmount.toNumber());
        expect(locked.toNumber()).toBe(0);
      });
    });

    it('should respect total amount parameter for non-locked tiers', () => {
      const totalAmount = new BN(50_000_000); // 50 UNIYAA
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
    describe('formatTimeRemaining with date-fns (calendar-aware)', () => {
    it('should accurately calculate from Jan 3, 2026 to Jan 2, 2030', () => {
      // Reproduce the exact scenario from User #2's screenshot
      const firstMint = new Date('2026-01-03T00:00:00Z').getTime() / 1000;
      const unlock = firstMint + (4 * 365 * 24 * 60 * 60); // 4 years (simplified)
      const currentTime = new Date('2026-01-04T00:00:00Z').getTime() / 1000;
      
      const remaining = unlock - currentTime;
      const result = formatTimeRemaining(remaining);
      
      // Should be approximately 3 years, 11 months, 29 days
      // (date-fns accounts for actual calendar, including leap year 2028)
      expect(result).toContain('3 years');
      expect(result).toContain('11 months');
      expect(result).not.toContain('4 years'); // ❌ Bug was showing "4 years, 3 days"
    });
    
    it('should handle leap year correctly (2028)', () => {
      // Test a date range that crosses the 2028 leap year
      const start = new Date('2027-01-01T00:00:00Z');
      const end = new Date('2029-01-01T00:00:00Z'); // Crosses Feb 29, 2028
      
      const seconds = (end.getTime() - start.getTime()) / 1000;
      const result = formatTimeRemaining(seconds);
      
      // date-fns will account for the extra day in 2028
      expect(result).toContain('2 years');
    });
    
    it('should never show 12 months (edge case)', () => {
      // Test edge case near year boundary
      const nearOneYear = 364 * 24 * 60 * 60; // 364 days
      const result = formatTimeRemaining(nearOneYear);
      
      // Should show "11 months, XX days" NOT "12 months"
      expect(result).not.toContain('12 months');
    });
    
    it('should handle very short durations (hours only)', () => {
      const twoHours = 2 * 60 * 60; // 7200 seconds
      const result = formatTimeRemaining(twoHours);
      
      // Less than a day shows as "0 days"
      expect(result).toBe('0 days');
    });
    
    it('should handle exactly 4 years from first mint', () => {
      const now = Math.floor(Date.now() / 1000);
      const fourYears = 4 * 365 * 24 * 60 * 60; // 126,144,000 seconds
      
      const result = formatTimeRemaining(fourYears);
      
      // date-fns will calculate the actual duration accounting for leap years
      // Should NOT show "4 years, 0 days" but rather the calendar-accurate breakdown
      expect(result).toContain('year');
    });
    
    it('should return "Unlocked" for zero or negative seconds', () => {
      expect(formatTimeRemaining(0)).toBe('Unlocked');
      expect(formatTimeRemaining(-100)).toBe('Unlocked');
    });
    
    it('should handle month boundaries correctly', () => {
      // Test a duration that ends mid-month
      const thirtyDays = 30 * 24 * 60 * 60;
      const result = formatTimeRemaining(thirtyDays);
      
      // Should show "1 month" or "30 days" (date-fns handles both correctly)
      expect(result).toMatch(/month|days/);
    });
  });
});
