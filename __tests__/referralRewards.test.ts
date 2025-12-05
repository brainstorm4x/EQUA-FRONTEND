/**
 * Tests for Referral Rewards Utilities
 */

import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  getUsersReferredBy,
  getReferralRewardsBalance,
  getReferralStats,
  formatReferralRewards,
  hasClaimableRewards,
  getReferredUsersDetails,
} from '@/utils/referralRewards';
import { PROGRAM_ID } from '@/lib/constants';

// Mock Connection
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn(),
  };
});

describe('Referral Rewards Utilities', () => {
  let mockConnection: jest.Mocked<Connection>;
  let testUserPubkey: PublicKey;
  let testReferrerPubkey: PublicKey;

  beforeEach(() => {
    // Create mock connection
    mockConnection = {
      getAccountInfo: jest.fn(),
      getProgramAccounts: jest.fn(),
    } as any;

    // Create test public keys (valid base58 encoded strings)
    testUserPubkey = PublicKey.default;
    testReferrerPubkey = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
  });

  describe('getUsersReferredBy', () => {
    it('should return array of referred user public keys', async () => {
      const mockReferredPubkey1 = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');
      const mockReferredPubkey2 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');

      mockConnection.getProgramAccounts.mockResolvedValue([
        { pubkey: mockReferredPubkey1, account: {} as AccountInfo<Buffer> },
        { pubkey: mockReferredPubkey2, account: {} as AccountInfo<Buffer> },
      ]);

      const result = await getUsersReferredBy(mockConnection, testReferrerPubkey);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockReferredPubkey1);
      expect(result[1]).toEqual(mockReferredPubkey2);
      expect(mockConnection.getProgramAccounts).toHaveBeenCalledWith(
        PROGRAM_ID,
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              memcmp: expect.objectContaining({
                offset: 40,
                bytes: testReferrerPubkey.toBase58(),
              }),
            }),
          ]),
        })
      );
    });

    it('should return empty array when no users referred', async () => {
      mockConnection.getProgramAccounts.mockResolvedValue([]);

      const result = await getUsersReferredBy(mockConnection, testReferrerPubkey);

      expect(result).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockConnection.getProgramAccounts.mockRejectedValue(new Error('Network error'));

      const result = await getUsersReferredBy(mockConnection, testReferrerPubkey);

      expect(result).toHaveLength(0);
    });
  });

  describe('getReferralRewardsBalance', () => {
    it('should return referral rewards balance from account data', async () => {
      // Create mock account data with referral_rewards = 1000000 (1 EQUA with 6 decimals)
      const mockAccountData = Buffer.alloc(144);
      mockAccountData.writeUInt8(0, 0); // discriminator
      
      // Write referral_rewards at offset 128 (8 + 32 + 32 + 32 + 8 + 8 + 8 = 128)
      const rewards = new BN(1000000);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 128);

      mockConnection.getAccountInfo.mockResolvedValue({
        data: mockAccountData,
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
        rentEpoch: 0,
      });

      const result = await getReferralRewardsBalance(mockConnection, testUserPubkey);

      expect(result).not.toBeNull();
      expect(result?.toString()).toBe('1000000');
    });

    it('should return null when account does not exist', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await getReferralRewardsBalance(mockConnection, testUserPubkey);

      expect(result).toBeNull();
    });

    it('should return null when account data is too short', async () => {
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.alloc(50),
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
        rentEpoch: 0,
      });

      const result = await getReferralRewardsBalance(mockConnection, testUserPubkey);

      expect(result).toBeNull();
    });
  });

  describe('formatReferralRewards', () => {
    it('should format rewards with 6 decimals', () => {
      const rewards = new BN(1000000); // 1 EQUA
      const result = formatReferralRewards(rewards);
      expect(result).toBe('1.000000');
    });

    it('should handle fractional amounts correctly', () => {
      const rewards = new BN(1234567); // 1.234567 EQUA
      const result = formatReferralRewards(rewards);
      expect(result).toBe('1.234567');
    });

    it('should handle zero rewards', () => {
      const rewards = new BN(0);
      const result = formatReferralRewards(rewards);
      expect(result).toBe('0.000000');
    });

    it('should handle large amounts', () => {
      const rewards = new BN(1000000000000); // 1,000,000 EQUA
      const result = formatReferralRewards(rewards);
      expect(result).toBe('1000000.000000');
    });

    it('should pad remainder with leading zeros', () => {
      const rewards = new BN(100001); // 0.100001 EQUA
      const result = formatReferralRewards(rewards);
      expect(result).toBe('0.100001');
    });
  });

  describe('hasClaimableRewards', () => {
    it('should return true when rewards > 0', async () => {
      const mockAccountData = Buffer.alloc(144);
      const rewards = new BN(1000000);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 128);

      mockConnection.getAccountInfo.mockResolvedValue({
        data: mockAccountData,
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
        rentEpoch: 0,
      });

      const result = await hasClaimableRewards(mockConnection, testUserPubkey);

      expect(result).toBe(true);
    });

    it('should return false when rewards = 0', async () => {
      const mockAccountData = Buffer.alloc(144);
      const rewards = new BN(0);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 128);

      mockConnection.getAccountInfo.mockResolvedValue({
        data: mockAccountData,
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
        rentEpoch: 0,
      });

      const result = await hasClaimableRewards(mockConnection, testUserPubkey);

      expect(result).toBe(false);
    });

    it('should return false when account does not exist', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await hasClaimableRewards(mockConnection, testUserPubkey);

      expect(result).toBe(false);
    });
  });

  describe('getReferralStats', () => {
    it('should return complete referral statistics', async () => {
      // Mock user account data
      const mockAccountData = Buffer.alloc(144);
      const rewards = new BN(5000000); // 5 EQUA
      
      // Set authority at offset 8
      const authorityBytes = testUserPubkey.toBuffer();
      authorityBytes.copy(mockAccountData, 8);
      
      // Set rewards at offset 128
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 128);

      mockConnection.getAccountInfo.mockResolvedValue({
        data: mockAccountData,
        executable: false,
        lamports: 1000000,
        owner: PROGRAM_ID,
        rentEpoch: 0,
      });

      // Mock referred users
      const mockReferredPubkey = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');
      mockConnection.getProgramAccounts.mockResolvedValue([
        { pubkey: mockReferredPubkey, account: {} as AccountInfo<Buffer> },
      ]);

      const result = await getReferralStats(mockConnection, testUserPubkey);

      expect(result).not.toBeNull();
      expect(result?.referralRewards.toString()).toBe('5000000');
      expect(result?.referredUsersCount).toBe(1);
      expect(result?.referredUsers).toHaveLength(1);
      expect(result?.referredUsers[0]).toEqual(mockReferredPubkey);
    });

    it('should return null when account does not exist', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await getReferralStats(mockConnection, testUserPubkey);

      expect(result).toBeNull();
    });
  });

  describe('getReferredUsersDetails', () => {
    it('should return detailed information for each referred user', async () => {
      const referredPubkey1 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
      const referredPubkey2 = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');

      // Mock account data for each user
      const mockAccountData1 = Buffer.alloc(144);
      const mockAccountData2 = Buffer.alloc(144);

      mockConnection.getAccountInfo
        .mockResolvedValueOnce({
          data: mockAccountData1,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        })
        .mockResolvedValueOnce({
          data: mockAccountData2,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        });

      const result = await getReferredUsersDetails(mockConnection, [
        referredPubkey1,
        referredPubkey2,
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('pubkey', referredPubkey1);
      expect(result[1]).toHaveProperty('pubkey', referredPubkey2);
      expect(result[0]).toHaveProperty('authority');
      expect(result[0]).toHaveProperty('referralRewards');
    });

    it('should handle errors for individual accounts gracefully', async () => {
      const referredPubkey1 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
      const referredPubkey2 = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');

      mockConnection.getAccountInfo
        .mockResolvedValueOnce(null) // First account doesn't exist
        .mockResolvedValueOnce({
          data: Buffer.alloc(144),
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        });

      const result = await getReferredUsersDetails(mockConnection, [
        referredPubkey1,
        referredPubkey2,
      ]);

      // Should only return details for the second user
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('pubkey', referredPubkey2);
    });

    it('should return empty array for empty input', async () => {
      const result = await getReferredUsersDetails(mockConnection, []);

      expect(result).toHaveLength(0);
    });
  });
});
