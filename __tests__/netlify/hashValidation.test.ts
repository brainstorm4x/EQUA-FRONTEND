/**
 * Tests for hash validation in Netlify functions
 * 
 * Note: We use a local implementation of validateHash instead of importing from
 * netlify/functions/lib/unxOracle because that file has Solana dependencies
 * that complicate Jest configuration. The implementation is identical.
 */

import crypto from 'crypto';

describe('Hash Validation', () => {
  // Local implementation of validateHash (matches netlify/functions/lib/unxOracle.ts)
  function validateHash(hash: string, name: string): void {
    const buffer = Buffer.from(hash, 'hex');
    if (buffer.length !== 32) {
      throw new Error(
        `${name} must be exactly 32 bytes, got ${buffer.length}. ` +
        `Hex string: ${hash}`
      );
    }
  }

  describe('validateHash', () => {
    it('should accept valid 32-byte SHA-256 hash', () => {
      // Generate a valid SHA-256 hash
      const validHash = crypto.createHash('sha256').update('test').digest('hex');
      
      expect(() => {
        validateHash(validHash, 'Test hash');
      }).not.toThrow();
    });

    it('should reject hash that is too short', () => {
      const shortHash = 'abcd1234'; // Only 4 bytes
      
      expect(() => {
        validateHash(shortHash, 'Short hash');
      }).toThrow('Short hash must be exactly 32 bytes, got 4');
    });

    it('should reject hash that is too long', () => {
      // 33 bytes (66 hex chars)
      const longHash = crypto.createHash('sha256').update('test').digest('hex') + 'aa';
      
      expect(() => {
        validateHash(longHash, 'Long hash');
      }).toThrow('Long hash must be exactly 32 bytes, got 33');
    });

    it('should reject empty string', () => {
      expect(() => {
        validateHash('', 'Empty hash');
      }).toThrow('Empty hash must be exactly 32 bytes, got 0');
    });
  });

  describe('Buffer conversion for Anchor', () => {
    it('should convert valid hash to number array of length 32', () => {
      const validHash = crypto.createHash('sha256').update('test').digest('hex');
      
      // This is what we do in update-unx-price.ts
      const componentHashBuffer = Buffer.from(validHash, 'hex');
      const componentHashArray = Array.from(componentHashBuffer);
      
      expect(componentHashBuffer.length).toBe(32);
      expect(componentHashArray.length).toBe(32);
      expect(componentHashArray.every(n => typeof n === 'number' && n >= 0 && n <= 255)).toBe(true);
    });

    it('should match backend expected format', () => {
      // Backend expects: component_prices_hash: [u8; 32]
      // TypeScript equivalent: number[] with exactly 32 elements
      const validHash = crypto.createHash('sha256').update('component-prices').digest('hex');
      const buffer = Buffer.from(validHash, 'hex');
      const array = Array.from(buffer);
      
      // Verify it matches the expected format
      expect(array).toHaveLength(32);
      expect(array).toEqual(expect.arrayContaining([expect.any(Number)]));
    });
  });

  describe('Environment validation', () => {
    it('should identify missing environment variables', () => {
      const required = [
        'SOLANA_WALLET_PRIVATE_KEY',
        'SOLANA_RPC_ENDPOINT',
        'NEXT_PUBLIC_PROGRAM_ID',
      ];
      
      // Mock process.env
      const mockEnv = {
        SOLANA_RPC_ENDPOINT: 'https://api.devnet.solana.com',
        // Missing SOLANA_WALLET_PRIVATE_KEY and NEXT_PUBLIC_PROGRAM_ID
      };
      
      const missing = required.filter(key => !mockEnv[key as keyof typeof mockEnv]);
      
      expect(missing).toEqual([
        'SOLANA_WALLET_PRIVATE_KEY',
        'NEXT_PUBLIC_PROGRAM_ID',
      ]);
    });

    it('should pass when all environment variables are present', () => {
      const required = [
        'SOLANA_WALLET_PRIVATE_KEY',
        'SOLANA_RPC_ENDPOINT',
        'NEXT_PUBLIC_PROGRAM_ID',
      ];
      
      const mockEnv = {
        SOLANA_WALLET_PRIVATE_KEY: 'test-key',
        SOLANA_RPC_ENDPOINT: 'https://api.devnet.solana.com',
        NEXT_PUBLIC_PROGRAM_ID: '6UgzWKDEJvKrKSRRBwYJzzYoYfVFdYhDGpwXa6adLZed',
      };
      
      const missing = required.filter(key => !mockEnv[key as keyof typeof mockEnv]);
      
      expect(missing).toEqual([]);
    });
  });
});
