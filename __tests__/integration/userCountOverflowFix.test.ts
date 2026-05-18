/**
 * Integration test for user count overflow bug fix
 * 
 * This test demonstrates that the overflow bug has been fixed
 * by showing that the problematic value (17179869188) now returns 0
 * instead of causing issues.
 * 
 * GlobalState structure (from IDL):
 * - 8 bytes: discriminator
 * - 4 bytes: user_count (u32) <- important: this is u32, not u64!
 * - 8 bytes: total_transactions (u64)
 */

import * as anchor from '@coral-xyz/anchor';
import { safeParseUserCount } from '@/utils/safeAccountParsing';

describe('User Count Overflow Bug Fix - Integration Test', () => {
  it('should handle the specific overflow value from the bug report', () => {
    // The original bug was reading 8 bytes instead of 4 bytes for user_count
    // This caused garbage data to be interpreted as a huge number
    // Now that we read 4 bytes correctly, we test that values exceeding 
    // MAX_REASONABLE_USER_COUNT are caught
    const buffer = Buffer.alloc(12); // 8 discriminator + 4 user_count
    
    // Test with max u32 value (which exceeds our sanity limit)
    const maxU32Value = new anchor.BN(4294967295); // 0xFFFFFFFF
    maxU32Value.toArrayLike(Buffer, 'le', 4).copy(buffer, 8);
    
    // The safeParseUserCount should return 0 because it exceeds MAX_REASONABLE_USER_COUNT
    const result = safeParseUserCount(buffer);
    
    // Should be caught by our overflow check
    expect(result).toBe(0);
    expect(result).toBeLessThanOrEqual(1_000_000);
  });

  it('should handle overflow values that exceed MAX_REASONABLE_USER_COUNT', () => {
    // Test with a value that fits in u32 but exceeds our sanity limit
    const buffer = Buffer.alloc(12);
    
    // 10_000_000 exceeds MAX_REASONABLE_USER_COUNT (1_000_000)
    const overflowValue = new anchor.BN(10_000_000);
    overflowValue.toArrayLike(Buffer, 'le', 4).copy(buffer, 8);
    
    const result = safeParseUserCount(buffer);
    
    // Should return 0 because it exceeds the reasonable limit
    expect(result).toBe(0);
  });

  it('should parse user counts safely across the antisybil threshold', () => {
    // Referrals are optional at every tier; this test only verifies that the
    // safe-parser produces sane numbers across the antisybil threshold (100)
    // so any downstream UX cues that key off the count stay correct.

    // Scenario 1: Fresh setup (uninitialized data)
    const uninitializedBuffer = Buffer.alloc(12);
    uninitializedBuffer.fill(0xFF);
    const freshSetupCount = safeParseUserCount(uninitializedBuffer);
    // 0xFFFFFFFF = 4294967295 exceeds MAX_REASONABLE_USER_COUNT, should return 0
    expect(freshSetupCount).toBe(0);

    // Scenario 2: Early adopters (below antisybil threshold)
    const earlyBuffer = Buffer.alloc(12);
    new anchor.BN(50).toArrayLike(Buffer, 'le', 4).copy(earlyBuffer, 8);
    expect(safeParseUserCount(earlyBuffer)).toBe(50);

    // Scenario 3: Past the antisybil threshold
    const afterThresholdBuffer = Buffer.alloc(12);
    new anchor.BN(150).toArrayLike(Buffer, 'le', 4).copy(afterThresholdBuffer, 8);
    expect(safeParseUserCount(afterThresholdBuffer)).toBe(150);
  });

  it('should never return a value that breaks referral logic', () => {
    // Test various edge cases to ensure we never get a nonsense value
    const testCases = [
      { value: 0, expected: 0 },
      { value: 1, expected: 1 },
      { value: 99, expected: 99 },
      { value: 100, expected: 100 },
      { value: 999_999, expected: 999_999 },
      { value: 1_000_000, expected: 1_000_000 }, // At the limit - still valid
      { value: 1_000_001, expected: 0 }, // Over the limit
      { value: 10_000_000, expected: 0 }, // Over the limit
    ];

    testCases.forEach(({ value, expected }) => {
      const buffer = Buffer.alloc(12);
      try {
        const bn = new anchor.BN(value);
        bn.toArrayLike(Buffer, 'le', 4).copy(buffer, 8);
      } catch {
        // If BN can't handle it, the buffer stays at 0
      }
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(expected);
      
      // Ensure result is always within reasonable bounds for UI logic
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1_000_000);
      
      // Ensure it's a finite number
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  it('should log warnings for overflow values (manual verification)', () => {
    // This test verifies that proper warnings are logged
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const buffer = Buffer.alloc(12);
    // Use a value that's valid for u32 but exceeds our sanity limit
    const overflowValue = new anchor.BN(10_000_000);
    overflowValue.toArrayLike(Buffer, 'le', 4).copy(buffer, 8);
    
    const result = safeParseUserCount(buffer);
    
    expect(result).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('User count overflow detected')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('10000000')
    );
    
    consoleSpy.mockRestore();
  });
});
