/**
 * Unit tests for UserMetadata decoding
 * 
 * Tests validate the 96-byte on-chain UserMetadata struct decoding,
 * ensuring correct field offsets and error handling.
 */

import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { fetchUserMetadata } from '@/utils/userMetadata';

// Mock getUserMetadataPDA to avoid circular dependencies
jest.mock('@/lib/program', () => ({
  getUserMetadataPDA: (authority: PublicKey) => [
    new PublicKey('UserMetaPDA11111111111111111111111111111111'),
    255
  ]
}));

/**
 * Create a valid 96-byte UserMetadata buffer with specified fields
 * 
 * Layout (96 bytes total):
 * - Offset 0-7:   discriminator (8 bytes)
 * - Offset 8-39:  user_account (32 bytes)
 * - Offset 40:    user_type (1 byte)
 * - Offset 41-44: user_index (4 bytes) ← KEY FIELD
 * - Offset 45-48: elevated_mint_attempts_used (4 bytes) ← KEY FIELD
 * - Offset 49:    kyc_verified (1 byte)
 * - Offset 50:    captcha_passed (1 byte)
 * - Offset 51-82: device_fingerprint (32 bytes)
 * - Offset 83-90: last_referral_slot (8 bytes)
 * - Offset 91-94: referrals_made (4 bytes)
 * - Offset 95:    version (1 byte)
 */
function createUserMetadataBuffer(
  user_index: number,
  elevated_mint_attempts_used: number
): Buffer {
  const buffer = Buffer.alloc(96);
  
  // Discriminator (offset 0-7) - use Anchor's account discriminator pattern
  buffer.write('UserMeta', 0); // 8-byte discriminator
  
  // user_account (offset 8-39) - dummy pubkey
  const dummyPubkey = new PublicKey('11111111111111111111111111111111');
  dummyPubkey.toBuffer().copy(buffer, 8);
  
  // user_type (offset 40) - 0 for individual
  buffer.writeUInt8(0, 40);
  
  // user_index (offset 41-44) - u32 little-endian
  const userIndexBN = new anchor.BN(user_index);
  userIndexBN.toArrayLike(Buffer, 'le', 4).copy(buffer, 41);
  
  // elevated_mint_attempts_used (offset 45-48) - u32 little-endian
  const elevatedAttemptsBN = new anchor.BN(elevated_mint_attempts_used);
  elevatedAttemptsBN.toArrayLike(Buffer, 'le', 4).copy(buffer, 45);
  
  // kyc_verified (offset 49) - false
  buffer.writeUInt8(0, 49);
  
  // captcha_passed (offset 50) - false
  buffer.writeUInt8(0, 50);
  
  // device_fingerprint (offset 51-82) - zeros
  // (already zero-initialized)
  
  // last_referral_slot (offset 83-90) - u64 little-endian
  const lastReferralSlot = new anchor.BN(0);
  lastReferralSlot.toArrayLike(Buffer, 'le', 8).copy(buffer, 83);
  
  // referrals_made (offset 91-94) - u32 little-endian
  const referralsMade = new anchor.BN(0);
  referralsMade.toArrayLike(Buffer, 'le', 4).copy(buffer, 91);
  
  // version (offset 95) - u8
  buffer.writeUInt8(1, 95);
  
  return buffer;
}

describe('UserMetadata Decoding', () => {
  describe('Valid 96-byte UserMetadata', () => {
    it('should decode user_index=1 and elevated_attempts=0 (user #1)', async () => {
      const buffer = createUserMetadataBuffer(1, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(1);
      expect(result?.elevated_mint_attempts_used).toBe(0);
    });

    it('should decode user_index=100 and elevated_attempts=50 (elevated user)', async () => {
      const buffer = createUserMetadataBuffer(100, 50);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(100);
      expect(result?.elevated_mint_attempts_used).toBe(50);
    });

    it('should decode user_index=1000 and elevated_attempts=0 (standard user)', async () => {
      const buffer = createUserMetadataBuffer(1000, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(1000);
      expect(result?.elevated_mint_attempts_used).toBe(0);
    });

    it('should decode user_index=100000 (large but valid)', async () => {
      const buffer = createUserMetadataBuffer(100000, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(100000);
      expect(result?.elevated_mint_attempts_used).toBe(0);
    });
  });

  describe('Account size validation', () => {
    it('should reject account with size < 96 bytes', async () => {
      const buffer = Buffer.alloc(50); // Too small
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should reject empty buffer', async () => {
      const buffer = Buffer.alloc(0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should accept account with size exactly 96 bytes', async () => {
      const buffer = createUserMetadataBuffer(42, 5);
      expect(buffer.length).toBe(96);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(42);
      expect(result?.elevated_mint_attempts_used).toBe(5);
    });
  });

  describe('Invalid user_index values', () => {
    it('should reject user_index=0', async () => {
      const buffer = createUserMetadataBuffer(0, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should reject user_index > 100,000,000', async () => {
      const buffer = createUserMetadataBuffer(100_000_001, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should reject garbage user_index (3,614,518,954)', async () => {
      // This is the actual garbage value from the issue
      const buffer = createUserMetadataBuffer(3_614_518_954, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });
  });

  describe('Invalid elevated_mint_attempts_used values', () => {
    it('should accept elevated_attempts=0 (minimum valid)', async () => {
      const buffer = createUserMetadataBuffer(100, 0);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.elevated_mint_attempts_used).toBe(0);
    });

    it('should reject elevated_attempts > 1000', async () => {
      const buffer = createUserMetadataBuffer(100, 1001);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should accept elevated_attempts=1000 (boundary)', async () => {
      const buffer = createUserMetadataBuffer(100, 1000);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).not.toBeNull();
      expect(result?.elevated_mint_attempts_used).toBe(1000);
    });
  });

  describe('Account not found', () => {
    it('should return null when account does not exist', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(null)
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });
  });

  describe('Network errors', () => {
    it('should return null on RPC connection error', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error('Network error'))
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error('Request timeout'))
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      expect(result).toBeNull();
    });
  });

  describe('Regression: Offset verification', () => {
    it('should NOT read user_index from wrong offset (offset 8)', async () => {
      // Create buffer with different values at old offset (8) vs new offset (41)
      const buffer = createUserMetadataBuffer(100, 50);
      
      // Overwrite offset 8-11 with a garbage value that would cause issues
      const garbageValue = new anchor.BN(3_614_518_954); // The actual bug value
      garbageValue.toArrayLike(Buffer, 'le', 4).copy(buffer, 8);
      
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: buffer,
          lamports: 1000000,
          owner: new PublicKey('11111111111111111111111111111111'),
          executable: false,
          rentEpoch: 0
        })
      } as any;
      
      const authority = new PublicKey('User111111111111111111111111111111111111111');
      const result = await fetchUserMetadata(mockConnection, authority);
      
      // Should decode correctly from offset 41, ignoring garbage at offset 8
      expect(result).not.toBeNull();
      expect(result?.user_index).toBe(100);
      expect(result?.elevated_mint_attempts_used).toBe(50);
    });
  });
});
