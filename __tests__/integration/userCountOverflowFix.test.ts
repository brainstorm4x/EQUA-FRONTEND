/**
 * Integration test for user count overflow bug fix
 * 
 * This test demonstrates that the overflow bug has been fixed
 * by showing that the problematic value (17179869188) now returns 0
 * instead of causing issues.
 */

import * as anchor from '@coral-xyz/anchor';
import { safeParseUserCount } from '@/utils/safeAccountParsing';

describe('User Count Overflow Bug Fix - Integration Test', () => {
  it('should handle the specific overflow value from the bug report', () => {
    // Create account data with the problematic value from the bug report
    const buffer = Buffer.alloc(16);
    
    // 17179869188 = 0x400000004 = the exact value reported in the bug
    const problematicValue = new anchor.BN(17179869188);
    problematicValue.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
    
    // Before the fix: This would have returned 17179869188 or caused overflow
    // After the fix: This should return 0
    const result = safeParseUserCount(buffer);
    
    expect(result).toBe(0);
    expect(result).toBeLessThan(1_000_000);
  });

  it('should ensure referral gating works correctly with safe user count', () => {
    // Simulate various scenarios
    
    // Scenario 1: Fresh setup (uninitialized data)
    const uninitializedBuffer = Buffer.alloc(16);
    uninitializedBuffer.fill(0xFF); // Common uninitialized memory pattern
    const freshSetupCount = safeParseUserCount(uninitializedBuffer);
    expect(freshSetupCount).toBe(0);
    expect(freshSetupCount).toBeLessThan(100); // Referral should be optional
    
    // Scenario 2: Early adopters (< 100 users)
    const earlyBuffer = Buffer.alloc(16);
    new anchor.BN(50).toArrayLike(Buffer, 'le', 8).copy(earlyBuffer, 8);
    const earlyAdopterCount = safeParseUserCount(earlyBuffer);
    expect(earlyAdopterCount).toBe(50);
    expect(earlyAdopterCount).toBeLessThan(100); // Referral should be optional
    
    // Scenario 3: After threshold (>= 100 users)
    const afterThresholdBuffer = Buffer.alloc(16);
    new anchor.BN(150).toArrayLike(Buffer, 'le', 8).copy(afterThresholdBuffer, 8);
    const afterThresholdCount = safeParseUserCount(afterThresholdBuffer);
    expect(afterThresholdCount).toBe(150);
    expect(afterThresholdCount).toBeGreaterThanOrEqual(100); // Referral should be required
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
      { value: 17179869188, expected: 0 }, // The bug value
      { value: Number.MAX_SAFE_INTEGER, expected: 0 }, // JavaScript max
    ];

    testCases.forEach(({ value, expected }) => {
      const buffer = Buffer.alloc(16);
      try {
        const bn = new anchor.BN(value);
        bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
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
    
    const buffer = Buffer.alloc(16);
    const overflowValue = new anchor.BN(17179869188);
    overflowValue.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
    
    const result = safeParseUserCount(buffer);
    
    expect(result).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('User count overflow detected')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('17179869188')
    );
    
    consoleSpy.mockRestore();
  });
});
