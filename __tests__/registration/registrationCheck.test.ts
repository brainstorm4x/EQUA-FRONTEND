/**
 * Unit tests for registrationCheck utility
 * 
 * Tests validate the canonical registration check functions that serve
 * as the single source of truth across the application.
 */

import { PublicKey } from '@solana/web3.js';
import { isUserRegistered, getUserMetadataIfRegistered } from '@/utils/registrationCheck';
import { fetchUserMetadata } from '@/utils/userMetadata';

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

    it('reports an RPC network error instead of saying "not registered"', async () => {
      // Unknown must not show the registration form to a registered user
      mockFetchUserMetadata.mockRejectedValue(new Error('Network error'));

      await expect(isUserRegistered(mockConnection, mockAuthority)).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ [RegistrationCheck] Unexpected error'),
        expect.any(Error)
      );
    });

    it('reports a timeout instead of saying "not registered"', async () => {
      mockFetchUserMetadata.mockRejectedValue(new Error('Request timeout'));

      await expect(isUserRegistered(mockConnection, mockAuthority)).rejects.toThrow('Request timeout');
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

  describe('Error handling', () => {
    // An unknown answer must never be reported as "not registered": that
    // showed registered users the registration form. Callers offer a retry.
    it('reports unexpected error types', async () => {
      mockFetchUserMetadata.mockRejectedValue('String error');
      await expect(isUserRegistered(mockConnection, mockAuthority)).rejects.toBe('String error');
    });

    it('reports a null error', async () => {
      mockFetchUserMetadata.mockRejectedValue(null);
      await expect(isUserRegistered(mockConnection, mockAuthority)).rejects.toBeNull();
    });

    it('passes an RPC failure to the caller', async () => {
      mockFetchUserMetadata.mockRejectedValue(new Error('RPC failed'));
      await expect(isUserRegistered(mockConnection, mockAuthority)).rejects.toThrow('RPC failed');
    });
  });
});
