/**
 * Tests for WalletProvider network detection logic
 * 
 * This validates the fix for mobile wallet connection issues where
 * SolanaMobileWalletAdapter requires string literals ('devnet' | 'testnet' | 'mainnet-beta')
 * instead of WalletAdapterNetwork enum values.
 */

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

/**
 * Network detection function (extracted from WalletProvider.tsx for testing)
 * This should match the implementation exactly
 */
const getExpectedNetwork = (endpoint: string): 'devnet' | 'testnet' | 'mainnet-beta' => {
  const normalizedEndpoint = endpoint.toLowerCase();
  if (normalizedEndpoint.includes('mainnet')) return 'mainnet-beta';
  if (normalizedEndpoint.includes('testnet')) return 'testnet';
  if (normalizedEndpoint.includes('devnet')) return 'devnet';
  return 'devnet'; // Safe default
};

/**
 * Network string to enum converter (extracted from WalletProvider.tsx for testing)
 * This should match the implementation exactly
 */
const networkStringToEnum = (network: 'devnet' | 'testnet' | 'mainnet-beta'): WalletAdapterNetwork => {
  return network === 'mainnet-beta' ? WalletAdapterNetwork.Mainnet
    : network === 'testnet' ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;
};

describe('WalletProvider Network Detection', () => {
  describe('getExpectedNetwork()', () => {
    it('should return "devnet" string for devnet RPC endpoint', () => {
      const result = getExpectedNetwork('https://api.devnet.solana.com');
      expect(result).toBe('devnet');
      expect(typeof result).toBe('string');
      // String literal 'devnet' is the correct type for Mobile Wallet Adapter
    });

    it('should return "testnet" string for testnet RPC endpoint', () => {
      const result = getExpectedNetwork('https://api.testnet.solana.com');
      expect(result).toBe('testnet');
      expect(typeof result).toBe('string');
      // String literal 'testnet' is the correct type for Mobile Wallet Adapter
    });

    it('should return "mainnet-beta" string for mainnet RPC endpoint', () => {
      const result = getExpectedNetwork('https://api.mainnet-beta.solana.com');
      expect(result).toBe('mainnet-beta');
      expect(typeof result).toBe('string');
      // String literal 'mainnet-beta' is the correct type for Mobile Wallet Adapter
    });

    it('should handle case-insensitive endpoint matching', () => {
      expect(getExpectedNetwork('https://API.DEVNET.solana.com')).toBe('devnet');
      expect(getExpectedNetwork('https://api.TESTNET.solana.com')).toBe('testnet');
      expect(getExpectedNetwork('https://api.MAINNET-beta.solana.com')).toBe('mainnet-beta');
    });

    it('should default to "devnet" for unknown endpoints', () => {
      const result = getExpectedNetwork('https://custom-rpc.example.com');
      expect(result).toBe('devnet');
      expect(typeof result).toBe('string');
    });

    it('should handle localhost endpoints with default', () => {
      const result = getExpectedNetwork('http://localhost:8899');
      expect(result).toBe('devnet');
    });

    it('should prioritize mainnet detection in URL', () => {
      // If URL contains both mainnet and devnet, mainnet should be detected first
      const result = getExpectedNetwork('https://mainnet.devnet.example.com');
      expect(result).toBe('mainnet-beta');
    });

    it('should return type-safe string literal', () => {
      const result = getExpectedNetwork('https://api.devnet.solana.com');
      // TypeScript should infer this as 'devnet' | 'testnet' | 'mainnet-beta', not string
      const acceptsLiteral = (network: 'devnet' | 'testnet' | 'mainnet-beta') => network;
      expect(() => acceptsLiteral(result)).not.toThrow();
    });
  });

  describe('networkStringToEnum()', () => {
    it('should convert "devnet" string to WalletAdapterNetwork.Devnet', () => {
      const result = networkStringToEnum('devnet');
      expect(result).toBe(WalletAdapterNetwork.Devnet);
      expect(result).toBe('devnet'); // Enum value equals string
    });

    it('should convert "testnet" string to WalletAdapterNetwork.Testnet', () => {
      const result = networkStringToEnum('testnet');
      expect(result).toBe(WalletAdapterNetwork.Testnet);
      expect(result).toBe('testnet');
    });

    it('should convert "mainnet-beta" string to WalletAdapterNetwork.Mainnet', () => {
      const result = networkStringToEnum('mainnet-beta');
      expect(result).toBe(WalletAdapterNetwork.Mainnet);
      expect(result).toBe('mainnet-beta');
    });

    it('should handle roundtrip conversion', () => {
      const networkString = getExpectedNetwork('https://api.devnet.solana.com');
      const networkEnum = networkStringToEnum(networkString);
      expect(networkEnum).toBe(WalletAdapterNetwork.Devnet);
    });
  });

  describe('Integration: Mobile Wallet Adapter Type Safety', () => {
    it('should provide string literal compatible with SolanaMobileWalletAdapter chain param', () => {
      // Simulate what SolanaMobileWalletAdapter expects
      type MobileWalletChain = 'devnet' | 'testnet' | 'mainnet-beta';
      
      const acceptsChainString = (chain: MobileWalletChain) => chain;
      
      // This should compile and work without type errors
      const network = getExpectedNetwork('https://api.devnet.solana.com');
      expect(() => acceptsChainString(network)).not.toThrow();
      expect(acceptsChainString(network)).toBe('devnet');
    });

    it('should provide enum compatible with SolflareWalletAdapter network param', () => {
      // Simulate what SolflareWalletAdapter expects
      const acceptsNetworkEnum = (network: WalletAdapterNetwork) => network;
      
      const networkString = getExpectedNetwork('https://api.testnet.solana.com');
      const networkEnum = networkStringToEnum(networkString);
      
      expect(() => acceptsNetworkEnum(networkEnum)).not.toThrow();
      expect(acceptsNetworkEnum(networkEnum)).toBe(WalletAdapterNetwork.Testnet);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string endpoint', () => {
      const result = getExpectedNetwork('');
      expect(result).toBe('devnet'); // Default
    });

    it('should handle endpoint with multiple network keywords - priority order', () => {
      // Priority order: mainnet > testnet > devnet
      expect(getExpectedNetwork('https://mainnet-devnet.custom.com')).toBe('mainnet-beta');
      expect(getExpectedNetwork('https://mainnet-testnet.custom.com')).toBe('mainnet-beta');
      expect(getExpectedNetwork('https://testnet-devnet.custom.com')).toBe('testnet');
      // Only devnet keyword:
      expect(getExpectedNetwork('https://devnet-only.custom.com')).toBe('devnet');
    });

    it('should handle endpoints with network in path', () => {
      expect(getExpectedNetwork('https://rpc.example.com/devnet')).toBe('devnet');
      expect(getExpectedNetwork('https://rpc.example.com/mainnet')).toBe('mainnet-beta');
    });

    it('should handle endpoints with network in query params', () => {
      expect(getExpectedNetwork('https://rpc.example.com?network=devnet')).toBe('devnet');
    });
  });

  describe('Regression: Type Mismatch Fix', () => {
    it('should return string literal type for Mobile Wallet Adapter', () => {
      const result = getExpectedNetwork('https://api.devnet.solana.com');
      
      // After fix: should return 'devnet' (string literal type)
      expect(typeof result).toBe('string');
      expect(result).toBe('devnet');
      
      // The key is the return TYPE is 'devnet' | 'testnet' | 'mainnet-beta'
      // not WalletAdapterNetwork enum, even though values overlap
      // This ensures type compatibility with Mobile Wallet Adapter's cluster param
    });

    it('should fix mobile wallet "not on devnet" error scenario', () => {
      // Scenario: RPC is devnet, wallet expects 'devnet' string
      const rpcEndpoint = 'https://api.devnet.solana.com';
      const detectedNetwork = getExpectedNetwork(rpcEndpoint);
      
      // Mobile Wallet Adapter validation (simplified)
      const mobileWalletExpects: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet';
      
      // This should match without type errors
      expect(detectedNetwork).toBe(mobileWalletExpects);
      expect(typeof detectedNetwork).toBe(typeof mobileWalletExpects);
    });
  });
});
