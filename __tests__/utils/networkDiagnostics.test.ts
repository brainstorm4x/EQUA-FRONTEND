/**
 * Tests for networkDiagnostics utilities
 */

import { Connection } from '@solana/web3.js';
import {
  detectClusterFromEndpoint,
  getClusterInfo,
  getExpectedCluster,
  isClusterAligned,
  ClusterType,
} from '@/utils/networkDiagnostics';

describe('networkDiagnostics', () => {
  describe('detectClusterFromEndpoint', () => {
    it('should detect mainnet-beta from standard endpoint', () => {
      const result = detectClusterFromEndpoint('https://api.mainnet-beta.solana.com');
      expect(result).toBe('mainnet-beta');
    });

    it('should detect devnet from standard endpoint', () => {
      const result = detectClusterFromEndpoint('https://api.devnet.solana.com');
      expect(result).toBe('devnet');
    });

    it('should detect testnet from standard endpoint', () => {
      const result = detectClusterFromEndpoint('https://api.testnet.solana.com');
      expect(result).toBe('testnet');
    });

    it('should detect localnet from localhost', () => {
      const result = detectClusterFromEndpoint('http://localhost:8899');
      expect(result).toBe('localnet');
    });

    it('should detect localnet from 127.0.0.1', () => {
      const result = detectClusterFromEndpoint('http://127.0.0.1:8899');
      expect(result).toBe('localnet');
    });

    it('should detect mainnet from partial match', () => {
      const result = detectClusterFromEndpoint('https://my-mainnet-rpc.example.com');
      expect(result).toBe('mainnet-beta');
    });

    it('should detect devnet from partial match', () => {
      const result = detectClusterFromEndpoint('https://devnet.helius-rpc.com');
      expect(result).toBe('devnet');
    });

    it('should return custom for unknown endpoints', () => {
      const result = detectClusterFromEndpoint('https://my-custom-rpc.example.com');
      expect(result).toBe('custom');
    });

    it('should be case-insensitive', () => {
      const result = detectClusterFromEndpoint('HTTPS://API.DEVNET.SOLANA.COM');
      expect(result).toBe('devnet');
    });

    it('should handle trailing spaces', () => {
      const result = detectClusterFromEndpoint('https://api.devnet.solana.com  ');
      expect(result).toBe('devnet');
    });
  });

  describe('getClusterInfo', () => {
    it('should return correct info for devnet connection', () => {
      const connection = new Connection('https://api.devnet.solana.com');
      const info = getClusterInfo(connection);

      expect(info.type).toBe('devnet');
      expect(info.endpoint).toBe('https://api.devnet.solana.com');
      expect(info.displayName).toBe('Devnet');
    });

    it('should return correct info for mainnet connection', () => {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const info = getClusterInfo(connection);

      expect(info.type).toBe('mainnet-beta');
      expect(info.endpoint).toBe('https://api.mainnet-beta.solana.com');
      expect(info.displayName).toBe('Mainnet Beta');
    });

    it('should return correct info for localnet connection', () => {
      const connection = new Connection('http://localhost:8899');
      const info = getClusterInfo(connection);

      expect(info.type).toBe('localnet');
      expect(info.endpoint).toBe('http://localhost:8899');
      expect(info.displayName).toBe('Localnet');
    });

    it('should return correct info for custom RPC', () => {
      const connection = new Connection('https://custom-rpc.example.com');
      const info = getClusterInfo(connection);

      expect(info.type).toBe('custom');
      expect(info.endpoint).toBe('https://custom-rpc.example.com');
      expect(info.displayName).toBe('Custom RPC');
    });
  });

  describe('getExpectedCluster', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return null when no network env is set', () => {
      delete process.env.NEXT_PUBLIC_NETWORK;
      delete process.env.NEXT_PUBLIC_SOLANA_NETWORK;
      
      const result = getExpectedCluster();
      expect(result).toBeNull();
    });

    it('should detect devnet from NEXT_PUBLIC_NETWORK', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      delete process.env.NEXT_PUBLIC_SOLANA_NETWORK;
      
      const result = getExpectedCluster();
      expect(result).toBe('devnet');
    });

    it('should detect mainnet-beta from NEXT_PUBLIC_NETWORK', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'mainnet-beta';
      
      const result = getExpectedCluster();
      expect(result).toBe('mainnet-beta');
    });

    it('should accept mainnet as mainnet-beta', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'mainnet';
      
      const result = getExpectedCluster();
      expect(result).toBe('mainnet-beta');
    });

    it('should detect localnet from NEXT_PUBLIC_NETWORK', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'localnet';
      
      const result = getExpectedCluster();
      expect(result).toBe('localnet');
    });

    it('should prefer NEXT_PUBLIC_NETWORK over NEXT_PUBLIC_SOLANA_NETWORK', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'mainnet-beta';
      
      const result = getExpectedCluster();
      expect(result).toBe('devnet');
    });

    it('should fall back to NEXT_PUBLIC_SOLANA_NETWORK', () => {
      delete process.env.NEXT_PUBLIC_NETWORK;
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'testnet';
      
      const result = getExpectedCluster();
      expect(result).toBe('testnet');
    });

    it('should be case-insensitive', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'DEVNET';
      
      const result = getExpectedCluster();
      expect(result).toBe('devnet');
    });

    it('should return null for unknown network values', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'unknown-network';
      
      const result = getExpectedCluster();
      expect(result).toBeNull();
    });
  });

  describe('isClusterAligned', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return true when no expected cluster is set', () => {
      delete process.env.NEXT_PUBLIC_NETWORK;
      delete process.env.NEXT_PUBLIC_SOLANA_NETWORK;
      
      const connection = new Connection('https://api.devnet.solana.com');
      const result = isClusterAligned(connection);
      
      expect(result).toBe(true);
    });

    it('should return true when clusters match', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'devnet';
      
      const connection = new Connection('https://api.devnet.solana.com');
      const result = isClusterAligned(connection);
      
      expect(result).toBe(true);
    });

    it('should return false when clusters do not match', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'mainnet-beta';
      
      const connection = new Connection('https://api.devnet.solana.com');
      const result = isClusterAligned(connection);
      
      expect(result).toBe(false);
    });

    it('should return true for localnet when configured', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'localnet';
      
      const connection = new Connection('http://localhost:8899');
      const result = isClusterAligned(connection);
      
      expect(result).toBe(true);
    });

    it('should return false for wrong localnet endpoint', () => {
      process.env.NEXT_PUBLIC_NETWORK = 'localnet';
      
      const connection = new Connection('https://api.devnet.solana.com');
      const result = isClusterAligned(connection);
      
      expect(result).toBe(false);
    });
  });
});
