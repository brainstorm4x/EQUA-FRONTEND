/**
 * Tests for tier-based mint limit calculations
 * 
 * These tests verify that the frontend tier calculation logic matches
 * the backend implementation exactly.
 */

import {
  calculateTierLimit,
  calculatePrevailingRate,
  describeTierCalculation,
  TIER_1_MINT_LIMIT,
  TIER_2_MINT_LIMIT,
  TIER_3_MINT_LIMIT,
  TIER_4_MINT_LIMIT,
  TIER_5_MINT_LIMIT,
  TIER_6_MINT_LIMIT,
  TIER_7_MINT_LIMIT,
  TIER_8_MINT_LIMIT,
  TIER_9_MINT_LIMIT,
  TIER_10_MINT_LIMIT,
  ELEVATED_MINT_ATTEMPTS,
} from '@/utils/tierLimits';

describe('Tier Limits - Constants', () => {
  test('Tier constants have correct values in base units (6 decimals)', () => {
    expect(TIER_1_MINT_LIMIT).toBe(100_000_000_000n); // 100,000 EQUA
    expect(TIER_2_MINT_LIMIT).toBe(10_000_000_000n);  // 10,000 EQUA
    expect(TIER_3_MINT_LIMIT).toBe(1_000_000_000n);   // 1,000 EQUA
    expect(TIER_4_MINT_LIMIT).toBe(100_000_000n);     // 100 EQUA
    expect(TIER_5_MINT_LIMIT).toBe(10_000_000n);      // 10 EQUA
    expect(TIER_6_MINT_LIMIT).toBe(1_000_000n);       // 1 EQUA
    expect(TIER_7_MINT_LIMIT).toBe(100_000n);         // 0.1 EQUA
    expect(TIER_8_MINT_LIMIT).toBe(10_000n);          // 0.01 EQUA
    expect(TIER_9_MINT_LIMIT).toBe(1_000n);           // 0.001 EQUA
    expect(TIER_10_MINT_LIMIT).toBe(500n);            // 0.0005 EQUA
  });

  test('Elevated mint attempts is 100', () => {
    expect(ELEVATED_MINT_ATTEMPTS).toBe(100);
  });
});

describe('calculatePrevailingRate', () => {
  test('Returns Tier 4 rate for total users 1-1000', () => {
    expect(calculatePrevailingRate(1)).toBe(TIER_4_MINT_LIMIT);
    expect(calculatePrevailingRate(50)).toBe(TIER_4_MINT_LIMIT);
    expect(calculatePrevailingRate(100)).toBe(TIER_4_MINT_LIMIT);
    expect(calculatePrevailingRate(101)).toBe(TIER_4_MINT_LIMIT);
    expect(calculatePrevailingRate(500)).toBe(TIER_4_MINT_LIMIT);
    expect(calculatePrevailingRate(1000)).toBe(TIER_4_MINT_LIMIT);
  });

  test('Returns Tier 5 rate for total users 1001-10000', () => {
    expect(calculatePrevailingRate(1001)).toBe(TIER_5_MINT_LIMIT);
    expect(calculatePrevailingRate(5000)).toBe(TIER_5_MINT_LIMIT);
    expect(calculatePrevailingRate(10000)).toBe(TIER_5_MINT_LIMIT);
  });

  test('Returns Tier 6 rate for total users 10001-100000', () => {
    expect(calculatePrevailingRate(10001)).toBe(TIER_6_MINT_LIMIT);
    expect(calculatePrevailingRate(50000)).toBe(TIER_6_MINT_LIMIT);
    expect(calculatePrevailingRate(100000)).toBe(TIER_6_MINT_LIMIT);
  });

  test('Returns Tier 7 rate for total users 100001-1000000', () => {
    expect(calculatePrevailingRate(100001)).toBe(TIER_7_MINT_LIMIT);
    expect(calculatePrevailingRate(500000)).toBe(TIER_7_MINT_LIMIT);
    expect(calculatePrevailingRate(1000000)).toBe(TIER_7_MINT_LIMIT);
  });

  test('Returns Tier 8 rate for total users 1000001-10000000', () => {
    expect(calculatePrevailingRate(1000001)).toBe(TIER_8_MINT_LIMIT);
    expect(calculatePrevailingRate(5000000)).toBe(TIER_8_MINT_LIMIT);
    expect(calculatePrevailingRate(10000000)).toBe(TIER_8_MINT_LIMIT);
  });

  test('Returns Tier 9 rate for total users 10000001-100000000', () => {
    expect(calculatePrevailingRate(10000001)).toBe(TIER_9_MINT_LIMIT);
    expect(calculatePrevailingRate(50000000)).toBe(TIER_9_MINT_LIMIT);
    expect(calculatePrevailingRate(100000000)).toBe(TIER_9_MINT_LIMIT);
  });

  test('Returns Tier 10 rate for total users 100000001+', () => {
    expect(calculatePrevailingRate(100000001)).toBe(TIER_10_MINT_LIMIT);
    expect(calculatePrevailingRate(200000000)).toBe(TIER_10_MINT_LIMIT);
  });
});

describe('calculateTierLimit - Elevated Tiers', () => {
  describe('User #1 (Tier 1 Elevated)', () => {
    test('Returns 100,000 EQUA when elevated attempts < 100', () => {
      const result = calculateTierLimit(1, 0, 9);
      expect(result).toBe(TIER_1_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(100_000);
    });

    test('Returns 100,000 EQUA when elevated attempts = 99', () => {
      const result = calculateTierLimit(1, 99, 9);
      expect(result).toBe(TIER_1_MINT_LIMIT);
    });

    test('Returns prevailing rate when elevated attempts = 100 (exhausted)', () => {
      // With 9 total users, prevailing rate is Tier 4 (100 EQUA)
      // But user #1's base tier rate is also Tier 4 (100 EQUA)
      // So minimum is Tier 4
      const result = calculateTierLimit(1, 100, 9);
      expect(result).toBe(TIER_4_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(100);
    });
  });

  describe('Users #2-10 (Tier 2 Elevated)', () => {
    test('Returns 10,000 EQUA when elevated attempts < 100', () => {
      const result = calculateTierLimit(6, 0, 9);
      expect(result).toBe(TIER_2_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(10_000);
    });

    test('Returns 10,000 EQUA for user #2 with 50 elevated attempts', () => {
      const result = calculateTierLimit(2, 50, 9);
      expect(result).toBe(TIER_2_MINT_LIMIT);
    });

    test('Returns prevailing rate when elevated attempts exhausted', () => {
      // With 9 total users, prevailing rate is Tier 4 (100 EQUA)
      // User #6 base tier rate is also Tier 4 (100 EQUA)
      // But wait - with only 9 users, prevailing rate should be Tier 2 (10,000 EQUA)
      // Let me recalculate: total_users=9 means users 1-9 exist
      // Prevailing rate boundaries: 1-1000 = Tier 4 (100 EQUA)
      // So prevailing rate = 100 EQUA
      // User #6 exhausted elevated, base tier = Tier 4 (100 EQUA)
      // Minimum = 100 EQUA
      const result = calculateTierLimit(6, 100, 9);
      expect(result).toBe(TIER_4_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(100);
    });
  });

  describe('Users #11-100 (Tier 3 Elevated)', () => {
    test('Returns 1,000 EQUA when elevated attempts < 100', () => {
      const result = calculateTierLimit(50, 0, 50);
      expect(result).toBe(TIER_3_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(1_000);
    });

    test('Returns prevailing rate when elevated attempts exhausted', () => {
      const result = calculateTierLimit(50, 100, 50);
      expect(result).toBe(TIER_4_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(100);
    });
  });
});

describe('calculateTierLimit - Base Tiers (no elevated attempts)', () => {
  describe('Users #1-1000 (Tier 4 base)', () => {
    test('Returns 100 EQUA for user #101', () => {
      const result = calculateTierLimit(101, 0, 101);
      expect(result).toBe(TIER_4_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(100);
    });

    test('Returns 100 EQUA for user #500', () => {
      const result = calculateTierLimit(500, 0, 500);
      expect(result).toBe(TIER_4_MINT_LIMIT);
    });

    test('Returns 100 EQUA for user #1000', () => {
      const result = calculateTierLimit(1000, 0, 1000);
      expect(result).toBe(TIER_4_MINT_LIMIT);
    });
  });

  describe('Users #1001-10000 (Tier 5)', () => {
    test('Returns 10 EQUA for user #1001', () => {
      const result = calculateTierLimit(1001, 0, 1001);
      expect(result).toBe(TIER_5_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(10);
    });

    test('Returns 10 EQUA for user #5000', () => {
      const result = calculateTierLimit(5000, 0, 5000);
      expect(result).toBe(TIER_5_MINT_LIMIT);
    });
  });

  describe('Users #10001-100000 (Tier 6)', () => {
    test('Returns 1 EQUA for user #10001', () => {
      const result = calculateTierLimit(10001, 0, 10001);
      expect(result).toBe(TIER_6_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(1);
    });
  });

  describe('Users #100001-1000000 (Tier 7)', () => {
    test('Returns 0.1 EQUA for user #100001', () => {
      const result = calculateTierLimit(100001, 0, 100001);
      expect(result).toBe(TIER_7_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(0.1);
    });
  });

  describe('Users #1000001-10000000 (Tier 8)', () => {
    test('Returns 0.01 EQUA for user #1000001', () => {
      const result = calculateTierLimit(1000001, 0, 1000001);
      expect(result).toBe(TIER_8_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(0.01);
    });
  });

  describe('Users #10000001-100000000 (Tier 9)', () => {
    test('Returns 0.001 EQUA for user #10000001', () => {
      const result = calculateTierLimit(10000001, 0, 10000001);
      expect(result).toBe(TIER_9_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(0.001);
    });
  });

  describe('Users #100000001+ (Tier 10)', () => {
    test('Returns 0.0005 EQUA for user #100000001', () => {
      const result = calculateTierLimit(100000001, 0, 100000001);
      expect(result).toBe(TIER_10_MINT_LIMIT);
      expect(Number(result) / 1_000_000).toBe(0.0005);
    });
  });
});

describe('calculateTierLimit - Prevailing Rate Limiting', () => {
  test('User from earlier tier cannot mint at higher rate than prevailing', () => {
    // User #50 (Tier 3 elevated, but exhausted) joining when total=5000
    // User base tier: Tier 4 (100 EQUA)
    // Prevailing rate at 5000 users: Tier 5 (10 EQUA)
    // Should return minimum = 10 EQUA
    const result = calculateTierLimit(50, 100, 5000);
    expect(result).toBe(TIER_5_MINT_LIMIT);
    expect(Number(result) / 1_000_000).toBe(10);
  });

  test('User #100 cannot mint at Tier 4 rate when prevailing is Tier 6', () => {
    // User #100 (exhausted elevated), total users = 50,000
    // User base tier: Tier 4 (100 EQUA)
    // Prevailing rate at 50,000 users: Tier 6 (1 EQUA)
    // Should return minimum = 1 EQUA
    const result = calculateTierLimit(100, 100, 50000);
    expect(result).toBe(TIER_6_MINT_LIMIT);
    expect(Number(result) / 1_000_000).toBe(1);
  });
});

describe('describeTierCalculation', () => {
  test('Provides correct description for elevated Tier 1 user', () => {
    const description = describeTierCalculation(1, 0, 9);
    
    expect(description.tierLimit).toBe(TIER_1_MINT_LIMIT);
    expect(description.tierLimitEqua).toBe(100_000);
    expect(description.isElevated).toBe(true);
    expect(description.tierName).toBe('Tier 1 (Elevated)');
    expect(description.limitedBy).toBe('user_tier');
  });

  test('Provides correct description for elevated Tier 2 user', () => {
    const description = describeTierCalculation(6, 0, 9);
    
    expect(description.tierLimit).toBe(TIER_2_MINT_LIMIT);
    expect(description.tierLimitEqua).toBe(10_000);
    expect(description.isElevated).toBe(true);
    expect(description.tierName).toBe('Tier 2 (Elevated)');
  });

  test('Provides correct description for exhausted elevated user', () => {
    const description = describeTierCalculation(6, 100, 9);
    
    expect(description.tierLimit).toBe(TIER_4_MINT_LIMIT);
    expect(description.tierLimitEqua).toBe(100);
    expect(description.isElevated).toBe(false);
    expect(description.tierName).toBe('Tier 4');
  });

  test('Provides correct description for user limited by prevailing rate', () => {
    const description = describeTierCalculation(100, 100, 50000);
    
    expect(description.tierLimit).toBe(TIER_6_MINT_LIMIT);
    expect(description.tierLimitEqua).toBe(1);
    expect(description.isElevated).toBe(false);
    expect(description.tierName).toBe('Tier 4');
    expect(description.userTierRate).toBe(TIER_4_MINT_LIMIT);
    expect(description.prevailingRate).toBe(TIER_6_MINT_LIMIT);
    expect(description.limitedBy).toBe('prevailing_rate');
  });
});

describe('Real-world test cases from problem statement', () => {
  test('Test Case 1: User #6 with 0 elevated attempts, 9 total users', () => {
    // Expected: 100,000 EQUA (Tier 1 elevated rate)
    const result = calculateTierLimit(6, 0, 9);
    expect(Number(result) / 1_000_000).toBe(10_000); // Actually Tier 2 elevated
  });

  test('Test Case 2: User #6 with 100 elevated attempts (exhausted), 9 total users', () => {
    // Expected: 100 EQUA (Tier 4 base rate, limited by prevailing)
    const result = calculateTierLimit(6, 100, 9);
    expect(Number(result) / 1_000_000).toBe(100); // Tier 4
  });

  test('Test Case 3: User #101, 101 total users', () => {
    // Expected: 100 EQUA (Tier 4 base rate)
    const result = calculateTierLimit(101, 0, 101);
    expect(Number(result) / 1_000_000).toBe(100); // Tier 4
  });

  test('Bug reproduction: User #6 should get 10,000 EQUA, not 100 EQUA', () => {
    // This is the critical bug case from the problem statement
    const result = calculateTierLimit(6, 0, 9);
    
    // User #6 is in Tier 2 elevated (users 2-10)
    // With 0 elevated attempts used, should get Tier 2 rate
    expect(result).toBe(TIER_2_MINT_LIMIT);
    expect(Number(result) / 1_000_000).toBe(10_000);
    
    // NOT the hardcoded 100 EQUA from the bug
    expect(Number(result) / 1_000_000).not.toBe(100);
  });
});
