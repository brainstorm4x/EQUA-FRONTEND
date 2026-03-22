/**
 * Unit tests for safe account data parsing utilities
 */

import * as anchor from '@coral-xyz/anchor';
import {
  safeParseUserCount,
  safeParseTimestamp,
  safeParseAmount,
} from '@/utils/safeAccountParsing';

describe('safeParseUserCount', () => {
  describe('Valid user counts', () => {
    it('should parse 0 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(0);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should parse 1 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(1);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(1);
    });

    it('should parse 100 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(100);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(100);
    });

    it('should parse 10000 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(10000);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(10000);
    });

    it('should parse maximum reasonable user count (999999)', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(999999);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(999999);
    });
  });

  describe('Overflow protection', () => {
    it('should return 0 for user count exceeding 1 million (overflow bug)', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(1_000_001);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should handle the specific overflow value from the bug report (17179869188)', () => {
      const buffer = Buffer.alloc(16);
      // 17179869188 = 0x400000004 = (1 << 34) + 4
      const bn = new anchor.BN(17179869188);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should return 0 for extremely large values (2^53)', () => {
      const buffer = Buffer.alloc(16);
      // Max safe integer in JavaScript
      const bn = new anchor.BN('9007199254740992'); // 2^53
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should return 0 for max u64 value', () => {
      const buffer = Buffer.alloc(16);
      // Max u64: 18446744073709551615
      const bn = new anchor.BN('18446744073709551615');
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });
  });

  describe('Uninitialized/corrupted data handling', () => {
    it('should return 0 for null account data', () => {
      const result = safeParseUserCount(null);
      expect(result).toBe(0);
    });

    it('should return 0 for undefined account data', () => {
      const result = safeParseUserCount(undefined);
      expect(result).toBe(0);
    });

    it('should return 0 for account data that is too short', () => {
      const buffer = Buffer.alloc(10); // Only 10 bytes, need at least 16
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should return 0 for empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });

    it('should handle all-FF bytes (uninitialized memory pattern)', () => {
      const buffer = Buffer.alloc(16);
      buffer.fill(0xFF);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0); // Should detect overflow
    });

    it('should handle all-zero bytes', () => {
      const buffer = Buffer.alloc(16);
      buffer.fill(0x00);
      
      const result = safeParseUserCount(buffer);
      expect(result).toBe(0);
    });
  });

  describe('Custom offset and length', () => {
    it('should parse from custom offset', () => {
      const buffer = Buffer.alloc(32);
      const bn = new anchor.BN(42);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 16); // Offset 16
      
      const result = safeParseUserCount(buffer, 16, 8);
      expect(result).toBe(42);
    });

    it('should return 0 if buffer too short for custom offset', () => {
      const buffer = Buffer.alloc(10);
      const result = safeParseUserCount(buffer, 16, 8);
      expect(result).toBe(0);
    });
  });
});

describe('safeParseTimestamp', () => {
  describe('Valid timestamps', () => {
    it('should parse 0 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(0);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(0);
    });

    it('should parse current Unix timestamp', () => {
      const buffer = Buffer.alloc(16);
      const now = Math.floor(Date.now() / 1000);
      const bn = new anchor.BN(now);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(now);
    });

    it('should parse reasonable future timestamp (2100)', () => {
      const buffer = Buffer.alloc(16);
      const futureTimestamp = 4102444800; // Jan 1, 2100
      const bn = new anchor.BN(futureTimestamp);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(futureTimestamp);
    });
  });

  describe('Overflow protection', () => {
    it('should return 0 for timestamp exceeding MAX_SAFE_TIMESTAMP', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(8640000001); // Just over the limit
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(0);
    });

    it('should return 0 for extremely large timestamp', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(17179869188); // Same overflow as user count bug
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(0);
    });
  });

  describe('Uninitialized/corrupted data handling', () => {
    it('should return 0 for null account data', () => {
      const result = safeParseTimestamp(null, 8);
      expect(result).toBe(0);
    });

    it('should return 0 for account data that is too short', () => {
      const buffer = Buffer.alloc(10);
      const result = safeParseTimestamp(buffer, 8);
      expect(result).toBe(0);
    });
  });
});

describe('safeParseAmount', () => {
  describe('Valid amounts', () => {
    it('should parse 0 correctly', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(0);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8);
      expect(result).toBe(0);
    });

    it('should parse standard amounts', () => {
      const buffer = Buffer.alloc(16);
      const amount = 1_000_000_000; // 1000 UNIA with 6 decimals
      const bn = new anchor.BN(amount);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8);
      expect(result).toBe(amount);
    });

    it('should parse large but reasonable amounts', () => {
      const buffer = Buffer.alloc(16);
      const amount = 1_000_000_000_000; // 1 million UNIA with 6 decimals
      const bn = new anchor.BN(amount);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8);
      expect(result).toBe(amount);
    });
  });

  describe('Overflow protection with maxValue', () => {
    it('should return 0 when amount exceeds maxValue', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(1000);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8, 8, 500); // maxValue = 500
      expect(result).toBe(0);
    });

    it('should pass when amount equals maxValue', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(500);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8, 8, 500); // maxValue = 500
      expect(result).toBe(500);
    });

    it('should pass when amount is below maxValue', () => {
      const buffer = Buffer.alloc(16);
      const bn = new anchor.BN(250);
      bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
      
      const result = safeParseAmount(buffer, 8, 8, 500); // maxValue = 500
      expect(result).toBe(250);
    });
  });

  describe('Uninitialized/corrupted data handling', () => {
    it('should return 0 for null account data', () => {
      const result = safeParseAmount(null, 8);
      expect(result).toBe(0);
    });

    it('should return 0 for account data that is too short', () => {
      const buffer = Buffer.alloc(10);
      const result = safeParseAmount(buffer, 8);
      expect(result).toBe(0);
    });
  });
});

describe('Edge cases and integration', () => {
  it('should consistently return 0 for the same corrupted data across all functions', () => {
    const buffer = Buffer.alloc(16);
    const corruptedValue = new anchor.BN(17179869188);
    corruptedValue.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);

    expect(safeParseUserCount(buffer)).toBe(0);
    expect(safeParseTimestamp(buffer, 8)).toBe(0);
    expect(safeParseAmount(buffer, 8)).toBe(17179869188); // Amount has no max by default
  });

  it('should handle Uint8Array in addition to Buffer', () => {
    const buffer = Buffer.alloc(16);
    const bn = new anchor.BN(42);
    bn.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
    
    const uint8Array = new Uint8Array(buffer);
    
    const result = safeParseUserCount(uint8Array);
    expect(result).toBe(42);
  });
});
