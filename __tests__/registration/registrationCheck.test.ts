/**
 * Unit tests for registrationCheck utility
 * 
 * Tests validate the canonical registration check functions that serve
 * as the single source of truth across the application.
 */

import { PublicKey } from '@solana/web3.js';
import { isUserRegistered, getUserMetadataIfRegistered } from '@/utils/registrationCheck';
import { fetchUserMetadata } from '@/utils/userMetadata';
import { rememberRegistered, wasRegistered } from '@/utils/registeredWallets';

// Mock fetchUserMetadata dependency
jest.mock('@/utils/userMetadata', () => ({
  fetchUserMetadata: jest.fn()
}));

const mockFetchUserMetadata = fetchUserMetadata as jest.MockedFunction<typeof fetchUserMetadata>;

describe('registrationCheck - Single Source of Truth', () => {
  const mockConnection = {} as any;
  const mockAuthority = new PublicKey('User111111111111111111111111111111111111111');

  beforeEach(() => {
    jest.clearAllMocks();
    // Each test starts on a device that has not seen any registration
    window.localStorage.clear();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isUserRegistered - Canonical Registration Check', () => {
    it('should return true when UserMetadata exists (registered user)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 42,
        elevated_mint_attempts_used: 5
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(true);
      expect(mockFetchUserMetadata).toHaveBeenCalledWith(mockConnection, mockAuthority);
      expect(mockFetchUserMetadata).toHaveBeenCalledTimes(1);
    });

    it('should return false when UserMetadata does not exist (unregistered user)', async () => {
      mockFetchUserMetadata.mockResolvedValue(null);

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(false);
      expect(mockFetchUserMetadata).toHaveBeenCalledWith(mockConnection, mockAuthority);
    });

    it('should return false on RPC network error', async () => {
      mockFetchUserMetadata.mockRejectedValue(new Error('Network error'));

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ [RegistrationCheck] Unexpected error'),
        expect.any(Error)
      );
    });

    it('should return false on timeout error', async () => {
      mockFetchUserMetadata.mockRejectedValue(new Error('Request timeout'));

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(false);
    });

    it('should log registration check details for registered user', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 100,
        elevated_mint_attempts_used: 50
      });

      await isUserRegistered(mockConnection, mockAuthority);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 [RegistrationCheck] Checking registration for:'),
        expect.any(String)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ [RegistrationCheck] User is registered')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('- User Index:'),
        100
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('- Elevated Attempts Used:'),
        50
      );
    });

    it('should log when user is not registered', async () => {
      mockFetchUserMetadata.mockResolvedValue(null);

      await isUserRegistered(mockConnection, mockAuthority);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️ [RegistrationCheck] User not registered')
      );
    });

    it('should handle first user (user_index=1)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 1,
        elevated_mint_attempts_used: 0
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(true);
    });

    it('should handle elevated user (user_index=100)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 100,
        elevated_mint_attempts_used: 99
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(true);
    });

    it('should handle standard user (user_index=1000)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 1000,
        elevated_mint_attempts_used: 0
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(true);
    });
  });

  describe('getUserMetadataIfRegistered - Helper Function', () => {
    it('should return metadata object when user is registered', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 42,
        elevated_mint_attempts_used: 5
      });

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toEqual({
        userIndex: 42,
        elevatedMintAttemptsUsed: 5
      });
      expect(mockFetchUserMetadata).toHaveBeenCalledWith(mockConnection, mockAuthority);
    });

    it('should return null when user is not registered', async () => {
      mockFetchUserMetadata.mockResolvedValue(null);

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toBeNull();
    });

    it('should transform field names to camelCase (userIndex)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 123,
        elevated_mint_attempts_used: 10
      });

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toHaveProperty('userIndex', 123);
      expect(result).not.toHaveProperty('user_index');
    });

    it('should transform field names to camelCase (elevatedMintAttemptsUsed)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 123,
        elevated_mint_attempts_used: 10
      });

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toHaveProperty('elevatedMintAttemptsUsed', 10);
      expect(result).not.toHaveProperty('elevated_mint_attempts_used');
    });

    it('should handle user with zero elevated attempts', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 500,
        elevated_mint_attempts_used: 0
      });

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toEqual({
        userIndex: 500,
        elevatedMintAttemptsUsed: 0
      });
    });

    it('should handle user with maximum elevated attempts (100)', async () => {
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 1,
        elevated_mint_attempts_used: 100
      });

      const result = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(result).toEqual({
        userIndex: 1,
        elevatedMintAttemptsUsed: 100
      });
    });
  });

  describe('Integration: isUserRegistered + getUserMetadataIfRegistered', () => {
    it('should be consistent - both return data for registered user', async () => {
      const mockMetadata = {
        user_index: 42,
        elevated_mint_attempts_used: 5
      };
      mockFetchUserMetadata.mockResolvedValue(mockMetadata);

      const isRegistered = await isUserRegistered(mockConnection, mockAuthority);
      const metadata = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(isRegistered).toBe(true);
      expect(metadata).not.toBeNull();
      expect(metadata?.userIndex).toBe(42);
    });

    it('should be consistent - both return null/false for unregistered user', async () => {
      mockFetchUserMetadata.mockResolvedValue(null);

      const isRegistered = await isUserRegistered(mockConnection, mockAuthority);
      const metadata = await getUserMetadataIfRegistered(mockConnection, mockAuthority);

      expect(isRegistered).toBe(false);
      expect(metadata).toBeNull();
    });
  });

  describe('Consistency with existing components', () => {
    it('should match behavior of app/page.tsx registration check', async () => {
      // app/page.tsx: const metadata = await fetchUserMetadata(connection, publicKey);
      // app/page.tsx: if (metadata) { setIsRegistered(true); }
      
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 50,
        elevated_mint_attempts_used: 10
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      // Should match: metadata !== null → isRegistered = true
      expect(result).toBe(true);
    });

    it('should match behavior of app/mint/page.tsx registration check', async () => {
      // app/mint/page.tsx: const metadata = await fetchUserMetadata(connection, publicKey);
      // app/mint/page.tsx: if (metadata) { setRegistered(true); }
      
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 75,
        elevated_mint_attempts_used: 20
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      // Should match: metadata !== null → registered = true
      expect(result).toBe(true);
    });

    it('should match behavior of WalletDashboard.tsx registration check', async () => {
      // WalletDashboard.tsx: const metadata = await fetchUserMetadata(connection, publicKey);
      // WalletDashboard.tsx: setIsRegistered(metadata !== null);
      
      mockFetchUserMetadata.mockResolvedValue({
        user_index: 200,
        elevated_mint_attempts_used: 0
      });

      const result = await isUserRegistered(mockConnection, mockAuthority);

      // Should match: metadata !== null → setIsRegistered(true)
      expect(result).toBe(true);
    });
  });

  describe('Error handling and fail-safe behavior', () => {
    it('should fail safe (return false) on unexpected error types', async () => {
      mockFetchUserMetadata.mockRejectedValue('String error');

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(false);
    });

    it('should fail safe (return false) on null error', async () => {
      mockFetchUserMetadata.mockRejectedValue(null);

      const result = await isUserRegistered(mockConnection, mockAuthority);

      expect(result).toBe(false);
    });

    it('should not throw error to caller on RPC failure', async () => {
      mockFetchUserMetadata.mockRejectedValue(new Error('RPC failed'));

      await expect(isUserRegistered(mockConnection, mockAuthority)).resolves.toBe(false);
    });
  });

  describe('wallets already seen registered on this device', () => {
    it('stays registered when the RPC node briefly answers "not found" after registering', async () => {
      mockFetchUserMetadata.mockResolvedValueOnce({ user_index: 7, elevated_mint_attempts_used: 0 });
      expect(await isUserRegistered(mockConnection, mockAuthority)).toBe(true);

      // A lagging node, a moment later (e.g. after a reload or the back button)
      mockFetchUserMetadata.mockResolvedValueOnce(null);
      expect(await isUserRegistered(mockConnection, mockAuthority)).toBe(true);
    });

    it('stays registered when the RPC check fails', async () => {
      rememberRegistered(mockAuthority);
      mockFetchUserMetadata.mockRejectedValueOnce(new Error('Network error'));
      expect(await isUserRegistered(mockConnection, mockAuthority)).toBe(true);
    });

    it('remembers only the wallet that registered', async () => {
      rememberRegistered(mockAuthority);
      const other = PublicKey.unique();
      mockFetchUserMetadata.mockResolvedValueOnce(null);
      expect(await isUserRegistered(mockConnection, other)).toBe(false);
      expect(wasRegistered(other)).toBe(false);
    });

    it('a new deployment (different program ID) starts clean', () => {
      // The key includes the program ID, so registrations on an old program are not reused
      window.localStorage.setItem(`uniyaa:registered:SomeOldProgram:${mockAuthority.toBase58()}`, '1');
      expect(wasRegistered(mockAuthority)).toBe(false);
    });

    it('works without storage (private mode): the on-chain check decides', async () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      mockFetchUserMetadata.mockResolvedValueOnce(null);
      expect(await isUserRegistered(mockConnection, mockAuthority)).toBe(false);
      expect(spy).toHaveBeenCalled();
    });
  });
});
