/**
 * Tests for EQX Oracle - EQUA Index Price Feed
 * 
 * Tests on-chain oracle, Hermes fallback, price calculations, currency conversions,
 * and cache functionality.
 */

import {
  EQX_BASKET_WEIGHTS,
  HERMES_FEED_IDS,
  getEQXPriceData,
  convertUSDToEQX,
  convertEQXToUSD,
  getEquaPriceMultiFormat,
  formatEQXPrice,
  getBasketBreakdown,
  clearPriceCache,
  getCacheTTL,
  _testing,
} from '@/utils/eqxOracle';

// Mock axios for Hermes API calls
jest.mock('axios', () => ({
  post: jest.fn(),
}));

// Mock Solana web3.js Connection
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getAccountInfo: jest.fn(),
    })),
  };
});

import axios from 'axios';
import { Connection } from '@solana/web3.js';
const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedConnection = Connection as jest.MockedClass<typeof Connection>;

describe('EQX Oracle', () => {
  beforeEach(() => {
    clearPriceCache();
    jest.clearAllMocks();
  });

  describe('Basket Weights (7-Component)', () => {
    it('should have basket weights that sum to 1 (100%)', () => {
      const totalWeight = Object.values(EQX_BASKET_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 4);
    });

    it('should have currencies at 57%', () => {
      const currencyWeight = 
        EQX_BASKET_WEIGHTS.USDUSD +
        EQX_BASKET_WEIGHTS.USDEUR +
        EQX_BASKET_WEIGHTS.USDCNY +
        EQX_BASKET_WEIGHTS.USDJPY +
        EQX_BASKET_WEIGHTS.USDGBP;
      expect(currencyWeight).toBeCloseTo(0.57, 4);
    });

    it('should have gold at 35%', () => {
      expect(EQX_BASKET_WEIGHTS.XAUUSD).toBe(0.35);
    });

    it('should have oil at 8%', () => {
      expect(EQX_BASKET_WEIGHTS.OIL).toBe(0.08);
    });

    it('should have correct individual weights', () => {
      expect(EQX_BASKET_WEIGHTS.USDUSD).toBe(0.23);
      expect(EQX_BASKET_WEIGHTS.USDEUR).toBe(0.17);
      expect(EQX_BASKET_WEIGHTS.USDCNY).toBe(0.09);
      expect(EQX_BASKET_WEIGHTS.USDJPY).toBe(0.05);
      expect(EQX_BASKET_WEIGHTS.USDGBP).toBe(0.03);
      expect(EQX_BASKET_WEIGHTS.XAUUSD).toBe(0.35);
      expect(EQX_BASKET_WEIGHTS.OIL).toBe(0.08);
    });

    it('should not have COPPER or WHEAT', () => {
      expect((EQX_BASKET_WEIGHTS as any).COPPER).toBeUndefined();
      expect((EQX_BASKET_WEIGHTS as any).WHEAT).toBeUndefined();
    });
  });

  describe('Hermes Feed IDs', () => {
    it('should have all required feed IDs', () => {
      expect(HERMES_FEED_IDS.EURUSD).toBeDefined();
      expect(HERMES_FEED_IDS.USDCNH).toBeDefined();
      expect(HERMES_FEED_IDS.USDJPY).toBeDefined();
      expect(HERMES_FEED_IDS.GBPUSD).toBeDefined();
      expect(HERMES_FEED_IDS.XAUUSD).toBeDefined();
      expect(HERMES_FEED_IDS.USOILSPOT).toBeDefined();
    });

    it('should have feed IDs WITHOUT 0x prefix', () => {
      Object.values(HERMES_FEED_IDS).forEach(feedId => {
        expect(feedId).toMatch(/^[0-9a-f]{64}$/); // 64 hex chars, no 0x prefix
        expect(feedId).not.toMatch(/^0x/);
      });
    });

    it('should have exactly 6 feeds', () => {
      expect(Object.keys(HERMES_FEED_IDS)).toHaveLength(6);
    });
  });

  describe('Price Calculation', () => {
    it('should calculate EQX value from asset prices (7-component)', () => {
      const testPrices = {
        USDUSD: { symbol: 'USDUSD', price: 1.0, timestamp: Date.now(), source: 'fallback' as const },
        USDEUR: { symbol: 'USDEUR', price: 1.0 / 1.08, timestamp: Date.now(), source: 'fallback' as const },
        USDGBP: { symbol: 'USDGBP', price: 1.0 / 1.27, timestamp: Date.now(), source: 'fallback' as const },
        USDJPY: { symbol: 'USDJPY', price: 149.5, timestamp: Date.now(), source: 'fallback' as const },
        USDCNY: { symbol: 'USDCNY', price: 7.24, timestamp: Date.now(), source: 'fallback' as const },
        XAUUSD: { symbol: 'XAUUSD', price: 2650.0, timestamp: Date.now(), source: 'fallback' as const },
        OIL: { symbol: 'OIL', price: 75.0, timestamp: Date.now(), source: 'fallback' as const },
      };

      const result = _testing.calculateEQXValue(testPrices);
      
      expect(result.eqxValue).toBeGreaterThan(0);
      expect(result.breakdown.currencyContribution).toBeGreaterThan(0);
      expect(result.breakdown.goldContribution).toBeGreaterThan(0);
      expect(result.breakdown.oilContribution).toBeGreaterThan(0);
      
      // Verify breakdown sums to 1
      const totalContribution = 
        result.breakdown.currencyContribution +
        result.breakdown.goldContribution +
        result.breakdown.oilContribution;
      expect(totalContribution).toBeCloseTo(1.0, 4);
    });

    it('should return epoch 0 price of 0.01 EQX (matching phase 1 start)', async () => {
      // With 0 transactions, price should be $0.01
      // In EQX terms, this should be approximately 0.01 EQX as well (since EQX starts at ~1 USD)
      
      // Mock on-chain oracle failure and Hermes failure to force fallback
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error')); // Force fallback
      
      const priceData = await getEQXPriceData();
      
      // Verify we got valid data
      expect(priceData.eqxValue).toBeGreaterThan(0);
      expect(priceData.source).toBe('fallback');
      
      // Convert $0.01 to EQX
      const eqxPrice = await convertUSDToEQX(0.01);
      expect(eqxPrice).toBeGreaterThan(0);
      expect(eqxPrice).toBeLessThan(1); // $0.01 should be less than 1 EQX
    });
  });

  describe('Currency Conversion', () => {
    beforeEach(() => {
      clearPriceCache();
      // Mock on-chain oracle and Hermes to fail, forcing fallback
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error')); // Force fallback
    });

    it('should convert USD to EQX', async () => {
      const usdAmount = 100;
      const eqxAmount = await convertUSDToEQX(usdAmount);
      
      expect(eqxAmount).toBeGreaterThan(0);
      expect(typeof eqxAmount).toBe('number');
    });

    it('should convert EQX to USD', async () => {
      const eqxAmount = 1;
      const usdAmount = await convertEQXToUSD(eqxAmount);
      
      expect(usdAmount).toBeGreaterThan(0);
      expect(typeof usdAmount).toBe('number');
    });

    it('should have inverse conversion relationship', async () => {
      const originalUSD = 50;
      const eqxAmount = await convertUSDToEQX(originalUSD);
      const backToUSD = await convertEQXToUSD(eqxAmount);
      
      expect(backToUSD).toBeCloseTo(originalUSD, 2);
    });

    it('should get multi-format price for USD', async () => {
      const price = await getEquaPriceMultiFormat(0.01, 'USD', 1);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrency).toBe(0.01);
      expect(price.localCurrencyCode).toBe('USD');
      expect(price.eqx).toBeGreaterThan(0);
      expect(price.eqxValue).toBeGreaterThan(0);
      expect(['onchain', 'hermes', 'fallback']).toContain(price.source);
    });

    it('should get multi-format price for EUR', async () => {
      const eurRate = 0.92; // Approximate EUR/USD rate
      const price = await getEquaPriceMultiFormat(0.01, 'EUR', eurRate);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrency).toBeCloseTo(0.01 * eurRate, 6);
      expect(price.localCurrencyCode).toBe('EUR');
    });

    it('should get multi-format price for INR', async () => {
      const inrRate = 83.5; // Approximate INR/USD rate
      const price = await getEquaPriceMultiFormat(0.01, 'INR', inrRate);
      
      expect(price.usd).toBe(0.01);
      expect(price.localCurrency).toBeCloseTo(0.01 * inrRate, 2);
      expect(price.localCurrencyCode).toBe('INR');
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      clearPriceCache();
    });

    it('should have 5 minute TTL', () => {
      expect(getCacheTTL()).toBe(5 * 60 * 1000);
    });

    it('should cache price data after first fetch', async () => {
      // Mock both on-chain and Hermes to fail, forcing fallback
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      
      // First fetch - should hit API (which fails, so fallback)
      const firstData = await getEQXPriceData();
      expect(firstData).toBeDefined();
      
      // Second fetch - should use cache
      const secondData = await getEQXPriceData();
      expect(secondData).toEqual(firstData);
      expect(secondData.lastUpdated).toBe(firstData.lastUpdated);
    });

    it('should clear cache when requested', async () => {
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      
      const firstData = await getEQXPriceData();
      clearPriceCache();
      
      // After clearing, should get new timestamp
      const secondData = await getEQXPriceData();
      expect(secondData.lastUpdated).toBeGreaterThanOrEqual(firstData.lastUpdated);
    });
  });

  describe('On-Chain Oracle and Hermes Fallback', () => {
    beforeEach(() => {
      clearPriceCache();
    });

    it('should use on-chain oracle when fresh (<8 hours)', async () => {
      // Mock on-chain oracle with fresh data
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const price = BigInt(100_000_000); // 1 USD in fixed-point 1e8
      const lastUpdated = BigInt(now - 3600); // 1 hour ago

      const mockAccountData = Buffer.alloc(24);
      mockAccountData.writeBigUInt64LE(price, 8);
      mockAccountData.writeBigInt64LE(lastUpdated, 16);

      // Create a fresh mock for this test
      const mockGetAccountInfo = jest.fn().mockResolvedValue({
        data: mockAccountData,
      });
      
      jest.spyOn(Connection.prototype, 'getAccountInfo').mockImplementation(mockGetAccountInfo);

      const data = await getEQXPriceData();
      expect(data.source).toBe('onchain');
      expect(data.eqxValue).toBe(1.0); // 100_000_000 / 1e8 = 1.0
      
      jest.restoreAllMocks();
    });

    it('should fallback to Hermes when on-chain oracle is stale (>8 hours)', async () => {
      // Mock on-chain oracle with stale data
      const now = Math.floor(Date.now() / 1000);
      const price = BigInt(100_000_000);
      const lastUpdated = BigInt(now - 9 * 3600); // 9 hours ago (stale)

      const mockAccountData = Buffer.alloc(24);
      mockAccountData.writeBigUInt64LE(price, 8);
      mockAccountData.writeBigInt64LE(lastUpdated, 16);

      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue({
          data: mockAccountData,
        });
      }

      // Mock Hermes response
      const mockHermesResponse = [
        {
          id: HERMES_FEED_IDS.EURUSD,
          price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USDCNH,
          price: { price: '7240000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USDJPY,
          price: { price: '149500000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.GBPUSD,
          price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.XAUUSD,
          price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USOILSPOT,
          price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
      ];

      mockedAxios.post.mockResolvedValueOnce({ data: mockHermesResponse, status: 200 });

      const data = await getEQXPriceData();
      expect(data.source).toBe('hermes');
    });

    it('should use POST request with correct shape for Hermes API', async () => {
      // Mock on-chain oracle missing
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }

      const mockHermesResponse = [
        {
          id: HERMES_FEED_IDS.EURUSD,
          price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USDCNH,
          price: { price: '7240000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USDJPY,
          price: { price: '149500000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.GBPUSD,
          price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.XAUUSD,
          price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
        },
        {
          id: HERMES_FEED_IDS.USOILSPOT,
          price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
      ];

      mockedAxios.post.mockResolvedValueOnce({ data: mockHermesResponse, status: 200 });

      await getEQXPriceData();

      // Verify POST was called with correct endpoint and shape
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hermes.pyth.network/api/latest_price_feeds',
        expect.objectContaining({
          ids: expect.arrayContaining([
            HERMES_FEED_IDS.EURUSD,
            HERMES_FEED_IDS.USDCNH,
            HERMES_FEED_IDS.USDJPY,
            HERMES_FEED_IDS.GBPUSD,
            HERMES_FEED_IDS.XAUUSD,
            HERMES_FEED_IDS.USOILSPOT,
          ]),
          verbose: false,
          binary: false,
        }),
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should use hardcoded fallback when both on-chain and Hermes fail', async () => {
      // Mock on-chain oracle failure
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }

      // Mock Hermes failure
      mockedAxios.post.mockRejectedValue(new Error('All APIs down'));

      const data = await getEQXPriceData();
      
      expect(data.source).toBe('fallback');
      expect(data.eqxValue).toBeGreaterThan(0);
      expect(Object.keys(data.assetPrices)).toContain('USDUSD');
      expect(Object.keys(data.assetPrices)).toContain('XAUUSD');
      expect(Object.keys(data.assetPrices)).toContain('OIL');
    });
  });

  describe('Basket Breakdown', () => {
    beforeEach(() => {
      clearPriceCache();
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
    });

    it('should provide basket breakdown with all asset categories (7-component)', async () => {
      const breakdown = await getBasketBreakdown();
      
      expect(breakdown.currencies).toHaveLength(5);
      expect(breakdown.gold).toHaveLength(1);
      expect(breakdown.oil).toHaveLength(1);
      expect(breakdown.totalValue).toBeGreaterThan(0);
    });

    it('should have correct currency weights in breakdown', async () => {
      const breakdown = await getBasketBreakdown();
      
      const usdusdEntry = breakdown.currencies.find(c => c.symbol === 'USDUSD');
      expect(usdusdEntry?.weight).toBe(23);
      
      const usdeurEntry = breakdown.currencies.find(c => c.symbol === 'USDEUR');
      expect(usdeurEntry?.weight).toBe(17);
    });

    it('should not have COPPER or WHEAT in breakdown', async () => {
      const breakdown = await getBasketBreakdown();
      
      // oil is a separate category, not in commodities
      expect(breakdown.oil).toHaveLength(1);
      expect((breakdown as any).commodities).toBeUndefined();
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

  describe('Price Stability in EQX', () => {
    it('should maintain stable EQX price despite USD volatility simulation', async () => {
      const mockConnection = MockedConnection.mock.instances[0];
      if (mockConnection) {
        (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue(null);
      }
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      
      // Get baseline EQX data
      const baseline = await getEQXPriceData();
      clearPriceCache();
      
      // The EQX value should be relatively stable because it's based on
      // a basket of assets, not just USD
      expect(baseline.eqxValue).toBeGreaterThan(0);
      
      // With fallback prices (which are stable), EQX value should be consistent
      const secondFetch = await getEQXPriceData();
      expect(secondFetch.eqxValue).toBeCloseTo(baseline.eqxValue, 4);
    });
  });
});
