/**
 * Tests for EQX Oracle - On-Chain Oracle Integration
 * 
 * Tests the on-chain EQX oracle integration and multi-format price conversions.
 */

import { Connection } from '@solana/web3.js';
import {
  getEquaPriceMultiFormat,
  formatEQXPrice,
} from '@/utils/eqxOracle';

// Mock Connection
const mockConnection = {
  getAccountInfo: jest.fn(),
  commitment: 'confirmed',
} as unknown as Connection;

// Mock getFxRate from fxRateClient
jest.mock('@/utils/fxRateClient', () => ({
  getFxRate: jest.fn(async (currency: string) => ({
    rate: currency === 'USD' ? 1 : currency === 'EUR' ? 0.92 : currency === 'INR' ? 83.5 : 1,
    source: 'exchangerate-api' as const,
    age: 1000 * 60 * 60,  // 1 hour
    isStale: false,
  })),
}));

// Mock Anchor program
jest.mock('@coral-xyz/anchor', () => ({
  Program: jest.fn().mockImplementation(() => ({
    account: {
      eqxOracle: {
        fetch: jest.fn().mockResolvedValue({
          price: { toString: () => '100000000' }, // 1.0 in fixed-point (1e8 precision)
          lastUpdated: { toString: () => Date.now().toString() },
          lastUpdatedSlot: { toString: () => '0' },
          componentPricesHash: new Uint8Array(32),
          weightsHash: new Uint8Array(32),
          authority: jest.fn(),
          version: 1,
        }),
      },
    },
  })),
  AnchorProvider: jest.fn().mockImplementation(() => ({})),
  Wallet: jest.fn(),
}));

describe('EQX Oracle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Currency Conversion', () => {
    it('should get multi-format price for USD', async () => {
      const price = await getEquaPriceMultiFormat(0.01, 'USD', mockConnection);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrency).toBe(0.01);
      expect(price.localCurrencyCode).toBe('USD');
      expect(price.eqx).toBeGreaterThan(0);
      expect(price.eqxValue).toBeGreaterThan(0);
      expect(price.source).toBe('on-chain-oracle');
    });

    it('should get multi-format price for EUR', async () => {
      const price = await getEquaPriceMultiFormat(0.01, 'EUR', mockConnection);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrency).toBeCloseTo(0.01 * 0.92, 6);
      expect(price.localCurrencyCode).toBe('EUR');
      
      // Verify FX metadata
      expect(price.fxRate).toBeGreaterThan(0);
      expect(price.fxSource).toMatch(/exchangerate-api|cache|fallback|static/);
      expect(typeof price.fxAge).toBe('number');
      expect(typeof price.fxIsStale).toBe('boolean');
    });

    it('should get multi-format price for INR', async () => {
      const price = await getEquaPriceMultiFormat(0.01, 'INR', mockConnection);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrencyCode).toBe('INR');
      
      // Verify dynamic rate used
      expect(price.fxRate).toBeGreaterThan(0);
      expect(price.localCurrency).toBeCloseTo(0.01 * (price.fxRate || 1), 6);
    });

    it('should include FX metadata in multi-format price', async () => {
      const price = await getEquaPriceMultiFormat(0.01, 'EUR', mockConnection);
      
      // Verify FX metadata fields exist
      expect(price.fxRate).toBeDefined();
      expect(price.fxSource).toBeDefined();
      expect(price.fxAge).toBeDefined();
      expect(price.fxIsStale).toBeDefined();
      
      // Verify EUR rate is not 1.0
      expect(price.fxRate).not.toBe(1.0);
      expect(price.fxRate).toBeCloseTo(0.92, 2);
      
      // Verify staleness is boolean
      expect(typeof price.fxIsStale).toBe('boolean');
    });
  });

  describe('EQX Price Formatting', () => {
    it('should format very small prices in exponential notation', () => {
      expect(formatEQXPrice(0.00001)).toMatch(/e/);
    });

    it('should format small prices with 6 decimal places', () => {
      const formatted = formatEQXPrice(0.001234);
      expect(formatted).toContain('0.001234');
      expect(formatted).toContain('EQX');
    });

    it('should format normal prices with 4 decimal places', () => {
      const formatted = formatEQXPrice(1.2345);
      expect(formatted).toContain('1.2345');
      expect(formatted).toContain('EQX');
    });

    it('should format large prices with locale formatting', () => {
      const formatted = formatEQXPrice(1234567.89);
      expect(formatted).toContain('EQX');
    });
  });
});
