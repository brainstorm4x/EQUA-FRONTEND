/**
 * Tests for environment variable configuration
 */

describe('Environment Variables', () => {
  describe('NEXT_PUBLIC_RPC_ENDPOINT', () => {
    const originalEnv = process.env.NEXT_PUBLIC_RPC_ENDPOINT;

    afterEach(() => {
      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_RPC_ENDPOINT = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_RPC_ENDPOINT;
      }
    });

    it('should have a default value when not set', () => {
      delete process.env.NEXT_PUBLIC_RPC_ENDPOINT;
      
      // Re-import to get fresh value
      jest.resetModules();
      const { RPC_ENDPOINT } = require('@/lib/constants');
      
      expect(RPC_ENDPOINT).toBe('https://api.devnet.solana.com');
    });

    it('should use custom RPC endpoint when set', () => {
      const customEndpoint = 'https://custom-rpc.solana.com';
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = customEndpoint;
      
      // Re-import to get fresh value
      jest.resetModules();
      const { RPC_ENDPOINT } = require('@/lib/constants');
      
      expect(RPC_ENDPOINT).toBe(customEndpoint);
    });
  });

  describe('NEXT_PUBLIC_PROGRAM_ID', () => {
    const originalProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
    const originalLegacyId = process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;

    afterEach(() => {
      // Restore original values
      if (originalProgramId !== undefined) {
        process.env.NEXT_PUBLIC_PROGRAM_ID = originalProgramId;
      } else {
        delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      }
      if (originalLegacyId !== undefined) {
        process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID = originalLegacyId;
      } else {
        delete process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;
      }
    });

    it('should have a default program ID when not set', () => {
      delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      delete process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;
      
      // Re-import to get fresh value
      jest.resetModules();
      const { PROGRAM_ID } = require('@/lib/constants');
      
      expect(PROGRAM_ID.toBase58()).toBe('GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C');
    });

    it('should prefer NEXT_PUBLIC_PROGRAM_ID over legacy variable', () => {
      // Use valid Solana public keys for testing
      const preferredId = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';
      const legacyId = 'GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C';
      
      process.env.NEXT_PUBLIC_PROGRAM_ID = preferredId;
      process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID = legacyId;
      
      // Re-import to get fresh value
      jest.resetModules();
      const { PROGRAM_ID } = require('@/lib/constants');
      
      expect(PROGRAM_ID.toBase58()).toBe(preferredId);
    });

    it('should fall back to legacy variable when preferred is not set', () => {
      // Use valid Solana public key for testing
      const legacyId = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';
      
      delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID = legacyId;
      
      // Re-import to get fresh value
      jest.resetModules();
      const { PROGRAM_ID } = require('@/lib/constants');
      
      expect(PROGRAM_ID.toBase58()).toBe(legacyId);
    });
  });
});
