/**
 * Tests to verify the main fixes:
 * 1. Wallet and button components use ssr: false
 * 2. Account data short errors are handled gracefully
 * (Issue 3, the Pyth endpoint, went with UNX in 89d93a8.)
 */

import { parseUserAccountData, getUserAccountData } from '@/utils/onchainRegistration';
import { Connection, PublicKey } from '@solana/web3.js';

describe('Fix verification tests', () => {
  describe('Issue 2: Account data handling', () => {
    it('should return null for empty account data without throwing error', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = parseUserAccountData(emptyBuffer);
      expect(result).toBeNull();
    });

    it('should return null for account data that is too short', () => {
      const shortBuffer = Buffer.alloc(50); // Less than required 136 bytes (locked_until removed)
      const result = parseUserAccountData(shortBuffer);
      expect(result).toBeNull();
    });

    it('should return null for account data that is exactly below threshold', () => {
      const shortBuffer = Buffer.alloc(135); // 1 byte less than required (136 bytes after locked_until removal)
      const result = parseUserAccountData(shortBuffer);
      expect(result).toBeNull();
    });

    it('should handle getUserAccountData with null account gracefully', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(null),
      } as unknown as Connection;

      const testPubkey = new PublicKey('11111111111111111111111111111111');
      const result = await getUserAccountData(mockConnection, testPubkey);

      expect(result).toBeNull();
      expect(mockConnection.getAccountInfo).toHaveBeenCalledWith(testPubkey);
    });

    it('should handle getUserAccountData with empty data gracefully', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: Buffer.alloc(0),
          owner: new PublicKey('11111111111111111111111111111111'),
          lamports: 0,
          executable: false,
        }),
      } as unknown as Connection;

      const testPubkey = new PublicKey('11111111111111111111111111111111');
      const result = await getUserAccountData(mockConnection, testPubkey);

      expect(result).toBeNull();
    });

    it('should parse valid user account data correctly', () => {
      // Create a valid buffer with 136 bytes (locked_until field removed)
      const validBuffer = Buffer.alloc(136);
      
      // Fill with discriminator (8 bytes)
      validBuffer.fill(0, 0, 8);
      
      // Create a valid 32-byte public key buffer (not base58 encoded)
      // Using the system program ID as a known valid key
      const testKey = new PublicKey('11111111111111111111111111111111').toBuffer();
      testKey.copy(validBuffer, 8); // authority
      testKey.copy(validBuffer, 40); // referral
      testKey.copy(validBuffer, 72); // token_account
      
      // Fill with test u64/i64 values (8 bytes each)
      // minted_amount, mint_start, referral_rewards, last_mint_time (locked_until removed)
      for (let i = 0; i < 4; i++) {
        validBuffer.writeBigUInt64LE(BigInt(i * 1000), 104 + i * 8);
      }

      const result = parseUserAccountData(validBuffer);
      
      expect(result).not.toBeNull();
      expect(result?.authority).toBeInstanceOf(PublicKey);
      expect(result?.referral).toBeInstanceOf(PublicKey);
      expect(result?.tokenAccount).toBeInstanceOf(PublicKey);
    });
  });
});
