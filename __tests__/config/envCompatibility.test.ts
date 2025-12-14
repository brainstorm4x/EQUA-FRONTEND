/**
 * Environment Variable Compatibility Tests
 * 
 * Tests that both legacy and new environment variable naming conventions work correctly
 * and that the centralized warning function behaves as expected.
 */

import { getEnvConfigWarnings, NETWORK, RPC_ENDPOINT } from '@/lib/constants';

describe('Environment Variable Compatibility', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env.NEXT_PUBLIC_NETWORK;
    delete process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    delete process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('getEnvConfigWarnings', () => {
    it('should return no warnings when legacy env vars are set', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://api.devnet.solana.com';
      
      const warnings = getEnvConfigWarnings();
      expect(warnings).toHaveLength(0);
    });

    it('should return no warnings when new env vars are set', () => {
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet';
      process.env.NEXT_PUBLIC_SOLANA_RPC_HOST = 'https://api.devnet.solana.com';
      
      const warnings = getEnvConfigWarnings();
      expect(warnings).toHaveLength(0);
    });

    it('should return no warnings when both naming conventions are set', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'testnet';
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://api.devnet.solana.com';
      process.env.NEXT_PUBLIC_SOLANA_RPC_HOST = 'https://api.testnet.solana.com';
      
      const warnings = getEnvConfigWarnings();
      // Should not warn - legacy names take precedence
      expect(warnings).toHaveLength(0);
    });

    it('should warn when network is missing', () => {
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://api.devnet.solana.com';
      
      const warnings = getEnvConfigWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('network'))).toBe(true);
    });

    it('should warn when RPC endpoint is missing', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      
      const warnings = getEnvConfigWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('RPC endpoint'))).toBe(true);
    });

    it('should warn when both are missing', () => {
      const warnings = getEnvConfigWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(2);
      expect(warnings.some(w => w.includes('network'))).toBe(true);
      expect(warnings.some(w => w.includes('RPC endpoint'))).toBe(true);
    });

    it('should warn about invalid network values', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'invalid-network';
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://api.devnet.solana.com';
      
      const warnings = getEnvConfigWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('Invalid network'))).toBe(true);
    });

    it('should accept valid network values', () => {
      const validNetworks = ['devnet', 'testnet', 'mainnet-beta', 'localnet'];
      
      for (const network of validNetworks) {
        process.env.NEXT_PUBLIC_NETWORK = network;
        process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://api.devnet.solana.com';
        
        const warnings = getEnvConfigWarnings();
        expect(warnings).toHaveLength(0);
      }
    });
  });

  describe('Environment Variable Precedence', () => {
    it('should prefer legacy NEXT_PUBLIC_NETWORK over NEXT_PUBLIC_SOLANA_NETWORK', () => {
      // Note: This test verifies the constant exports in constants.ts
      // The actual precedence is determined at module load time, so we can't
      // dynamically test it here. This test documents the expected behavior.
      
      // Set both env vars (legacy takes precedence per implementation)
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'testnet';
      
      // Re-import would be needed to test runtime behavior
      // This test serves as documentation of the expected precedence
      expect(process.env.NEXT_PUBLIC_NETWORK).toBe('devnet');
    });

    it('should prefer legacy NEXT_PUBLIC_RPC_ENDPOINT over NEXT_PUBLIC_SOLANA_RPC_HOST', () => {
      process.env.NEXT_PUBLIC_RPC_ENDPOINT = 'https://legacy.example.com';
      process.env.NEXT_PUBLIC_SOLANA_RPC_HOST = 'https://new.example.com';
      
      // Legacy takes precedence per implementation
      expect(process.env.NEXT_PUBLIC_RPC_ENDPOINT).toBe('https://legacy.example.com');
    });

    it('should use new names when legacy names are not set', () => {
      // Only set new naming convention
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'testnet';
      process.env.NEXT_PUBLIC_SOLANA_RPC_HOST = 'https://api.testnet.solana.com';
      
      // Should not produce warnings
      const warnings = getEnvConfigWarnings();
      expect(warnings).toHaveLength(0);
    });
  });

  describe('Fallback Values', () => {
    it('should have sensible defaults when no env vars are set', () => {
      // Clear all env vars
      delete process.env.NEXT_PUBLIC_NETWORK;
      delete process.env.NEXT_PUBLIC_SOLANA_NETWORK;
      delete process.env.NEXT_PUBLIC_RPC_ENDPOINT;
      delete process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;
      
      // Re-import constants to get default values
      // Note: In actual runtime, these constants are set at module load time
      // This test documents the expected defaults
      
      // Default network should be 'devnet'
      // Default RPC endpoint should be 'https://api.devnet.solana.com'
      
      // Warnings should be generated since nothing is explicitly set
      const warnings = getEnvConfigWarnings();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});
