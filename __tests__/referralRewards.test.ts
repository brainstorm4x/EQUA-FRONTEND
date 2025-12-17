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
  computeReferralRewards,
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
    it('should return referral rewards balance from account data (LEGACY stored value)', async () => {
      // Create mock account data with referral_rewards = 1000000 (1 EQUA with 6 decimals)
      const mockAccountData = Buffer.alloc(136); // Correct size: no locked_until field
      mockAccountData.writeUInt8(0, 0); // discriminator
      
      // Write referral_rewards at offset 120 (8 + 32 + 32 + 32 + 8 + 8 = 120)
      const rewards = new BN(1000000);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 120);

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
    it('should return true when rewards > 0 (checks LEGACY stored value)', async () => {
      const mockAccountData = Buffer.alloc(136); // Correct size
      const rewards = new BN(1000000);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 120); // Correct offset

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
      const mockAccountData = Buffer.alloc(136); // Correct size
      const rewards = new BN(0);
      mockAccountData.writeBigUInt64LE(BigInt(rewards.toString()), 120); // Correct offset

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
    it('should return complete referral statistics with COMPUTED rewards', async () => {
      // Mock user account data (correct 136-byte structure)
      const mockAccountData = Buffer.alloc(136);
      
      // Set authority at offset 8
      const authorityBytes = testUserPubkey.toBuffer();
      authorityBytes.copy(mockAccountData, 8);

      // Mock referred user account with minted_amount = 500_000_000 (500 EQUA with 6 decimals)
      const mockReferredPubkey = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');
      const referredAccountData = Buffer.alloc(136);
      
      // Set authority in referred account (correct Buffer.copy order)
      mockReferredPubkey.toBuffer().copy(referredAccountData, 8);
      
      // Set minted_amount at offset 104 (8 + 32 + 32 + 32)
      const mintedAmount = new BN(500_000_000); // 500 EQUA
      referredAccountData.writeBigUInt64LE(BigInt(mintedAmount.toString()), 104);

      // First call: getAccountInfo for referrer's account
      // Second call: getAccountInfo for referred user's account (during computeReferralRewards)
      mockConnection.getAccountInfo
        .mockResolvedValueOnce({
          data: mockAccountData,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        })
        .mockResolvedValueOnce({
          data: referredAccountData,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        });

      // Mock getProgramAccounts to return the referred user
      mockConnection.getProgramAccounts.mockResolvedValue([
        { pubkey: mockReferredPubkey, account: {} as AccountInfo<Buffer> },
      ]);

      const result = await getReferralStats(mockConnection, testUserPubkey);

      expect(result).not.toBeNull();
      // Computed reward should be 1% of 500 EQUA = 5 EQUA = 5_000_000 base units
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

  describe('computeReferralRewards', () => {
    it('should compute rewards from referred users minted amounts', async () => {
      const referredPubkey1 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
      const referredPubkey2 = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');

      // Mock getProgramAccounts to return two referred users
      mockConnection.getProgramAccounts.mockResolvedValue([
        { pubkey: referredPubkey1, account: {} as AccountInfo<Buffer> },
        { pubkey: referredPubkey2, account: {} as AccountInfo<Buffer> },
      ]);

      // Mock account data for referred users with different minted amounts
      const accountData1 = Buffer.alloc(136);
      // Write authority at offset 8
      referredPubkey1.toBuffer().copy(accountData1, 8);
      // Write minted_amount at offset 104
      accountData1.writeBigUInt64LE(BigInt(100_000_000), 104); // 100 EQUA

      const accountData2 = Buffer.alloc(136);
      // Write authority at offset 8
      referredPubkey2.toBuffer().copy(accountData2, 8);
      // Write minted_amount at offset 104
      accountData2.writeBigUInt64LE(BigInt(200_000_000), 104); // 200 EQUA

      mockConnection.getAccountInfo
        .mockResolvedValueOnce({
          data: accountData1,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        })
        .mockResolvedValueOnce({
          data: accountData2,
          executable: false,
          lamports: 1000000,
          owner: PROGRAM_ID,
          rentEpoch: 0,
        });

      const result = await computeReferralRewards(mockConnection, testReferrerPubkey);

      expect(result).not.toBeNull();
      // Total minted: 300 EQUA = 300_000_000 base units
      // 1% reward = 3 EQUA = 3_000_000 base units
      expect(result?.toString()).toBe('3000000');
    });

    it('should return zero when no referred users', async () => {
      mockConnection.getProgramAccounts.mockResolvedValue([]);

      const result = await computeReferralRewards(mockConnection, testReferrerPubkey);

      expect(result).not.toBeNull();
      expect(result?.toString()).toBe('0');
    });

    it('should handle errors gracefully and return zero when getUsersReferredBy fails', async () => {
      // getUsersReferredBy catches errors and returns empty array
      mockConnection.getProgramAccounts.mockRejectedValue(new Error('Network error'));

      const result = await computeReferralRewards(mockConnection, testReferrerPubkey);

      // Should return 0 since getUsersReferredBy returns [] on error
      expect(result).not.toBeNull();
      expect(result?.toString()).toBe('0');
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
