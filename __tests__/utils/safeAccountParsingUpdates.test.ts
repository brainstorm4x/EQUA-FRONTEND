/**
 * Tests for updated account parsing with correct offsets
 */

import * as anchor from '@coral-xyz/anchor';
import { 
  decodeUserAccount, 
  USER_ACCOUNT_OFFSETS,
  USER_ACCOUNT_SIZE,
  safeParseTimestamp 
} from '@/utils/safeAccountParsing';

describe('UserAccount Parsing Updates', () => {
  describe('USER_ACCOUNT_OFFSETS', () => {
    it('should have correct offset values', () => {
      expect(USER_ACCOUNT_OFFSETS.DISCRIMINATOR).toBe(0);
      expect(USER_ACCOUNT_OFFSETS.AUTHORITY).toBe(8);
      expect(USER_ACCOUNT_OFFSETS.REFERRAL).toBe(40);
      expect(USER_ACCOUNT_OFFSETS.TOKEN_ACCOUNT).toBe(72);
      expect(USER_ACCOUNT_OFFSETS.MINTED_AMOUNT).toBe(104);
      expect(USER_ACCOUNT_OFFSETS.MINT_START).toBe(112);
      expect(USER_ACCOUNT_OFFSETS.REFERRAL_REWARDS).toBe(120);
      expect(USER_ACCOUNT_OFFSETS.LAST_MINT_TIME).toBe(128);
    });

    it('should have correct account size', () => {
      // Updated to 137 bytes with referral_type field (1 byte enum)
      expect(USER_ACCOUNT_SIZE).toBe(137);
    });
  });

  describe('decodeUserAccount', () => {
    it('should return null for invalid/empty data', () => {
      expect(decodeUserAccount(null)).toBeNull();
      expect(decodeUserAccount(undefined)).toBeNull();
      expect(decodeUserAccount(Buffer.alloc(0))).toBeNull();
      expect(decodeUserAccount(Buffer.alloc(100))).toBeNull(); // Too small
    });

    it('should decode valid UserAccount data', () => {
      // Create a mock UserAccount buffer
      const buffer = Buffer.alloc(USER_ACCOUNT_SIZE);
      
      // Fill discriminator (8 bytes)
      buffer.writeUInt32LE(12345, 0);
      
      // Authority (32 bytes) - mock public key
      const authorityBytes = new anchor.web3.PublicKey('11111111111111111111111111111111').toBuffer();
      authorityBytes.copy(buffer, USER_ACCOUNT_OFFSETS.AUTHORITY);
      
      // Referral (32 bytes) - mock public key
      const referralBytes = new anchor.web3.PublicKey('11111111111111111111111111111112').toBuffer();
      referralBytes.copy(buffer, USER_ACCOUNT_OFFSETS.REFERRAL);
      
      // Token account (32 bytes) - mock public key
      const tokenAccountBytes = new anchor.web3.PublicKey('11111111111111111111111111111113').toBuffer();
      tokenAccountBytes.copy(buffer, USER_ACCOUNT_OFFSETS.TOKEN_ACCOUNT);
      
      // Minted amount (8 bytes, u64)
      const mintedAmount = 1000000000; // 1 EQUA (with 6 decimals)
      buffer.writeBigUInt64LE(BigInt(mintedAmount), USER_ACCOUNT_OFFSETS.MINTED_AMOUNT);
      
      // Mint start (8 bytes, i64)
      const mintStart = Math.floor(Date.now() / 1000);
      buffer.writeBigInt64LE(BigInt(mintStart), USER_ACCOUNT_OFFSETS.MINT_START);
      
      // Referral rewards (8 bytes, u64)
      const referralRewards = 500000000; // 0.5 EQUA
      buffer.writeBigUInt64LE(BigInt(referralRewards), USER_ACCOUNT_OFFSETS.REFERRAL_REWARDS);
      
      // Last mint time (8 bytes, i64)
      const lastMintTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      buffer.writeBigInt64LE(BigInt(lastMintTime), USER_ACCOUNT_OFFSETS.LAST_MINT_TIME);
      
      const decoded = decodeUserAccount(buffer);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.authority).toBe('11111111111111111111111111111111');
      expect(decoded?.referral).toBe('11111111111111111111111111111112');
      expect(decoded?.tokenAccount).toBe('11111111111111111111111111111113');
      expect(decoded?.mintedAmount).toBe(mintedAmount);
      expect(decoded?.mintStart).toBe(mintStart);
      expect(decoded?.referralRewards).toBe(referralRewards);
      expect(decoded?.lastMintTime).toBe(lastMintTime);
    });

    it('should handle zero values correctly', () => {
      const buffer = Buffer.alloc(USER_ACCOUNT_SIZE);
      
      // Set valid public keys (all zeros is valid)
      const zeroKey = anchor.web3.PublicKey.default.toBuffer();
      zeroKey.copy(buffer, USER_ACCOUNT_OFFSETS.AUTHORITY);
      zeroKey.copy(buffer, USER_ACCOUNT_OFFSETS.REFERRAL);
      zeroKey.copy(buffer, USER_ACCOUNT_OFFSETS.TOKEN_ACCOUNT);
      
      // All numeric fields are already zero from Buffer.alloc
      
      const decoded = decodeUserAccount(buffer);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.mintedAmount).toBe(0);
      expect(decoded?.mintStart).toBe(0);
      expect(decoded?.referralRewards).toBe(0);
      expect(decoded?.lastMintTime).toBe(0);
    });
  });

  describe('safeParseTimestamp with correct offset', () => {
    it('should parse last_mint_time at offset 128', () => {
      const buffer = Buffer.alloc(USER_ACCOUNT_SIZE);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Write timestamp at correct offset
      buffer.writeBigInt64LE(BigInt(timestamp), USER_ACCOUNT_OFFSETS.LAST_MINT_TIME);
      
      const parsed = safeParseTimestamp(buffer, USER_ACCOUNT_OFFSETS.LAST_MINT_TIME);
      
      expect(parsed).toBe(timestamp);
    });

    it('should return 0 for account too short', () => {
      const buffer = Buffer.alloc(100); // Too small to contain last_mint_time
      
      const parsed = safeParseTimestamp(buffer, USER_ACCOUNT_OFFSETS.LAST_MINT_TIME);
      
      expect(parsed).toBe(0);
    });
  });
});
