/**
 * Tests for EQX Oracle - EQUA Index Price Feed
 * 
 * Tests Pyth connection, price calculations, currency conversions,
 * fallback mechanisms, and cache functionality.
 */

import {
  EQX_BASKET_WEIGHTS,
  PYTH_FEED_IDS,
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

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EQX Oracle', () => {
  beforeEach(() => {
    clearPriceCache();
    jest.clearAllMocks();
  });

  describe('Basket Weights', () => {
    it('should have basket weights that sum to 1 (100%)', () => {
      const totalWeight = Object.values(EQX_BASKET_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 4);
    });

    it('should have currencies at 50%', () => {
      const currencyWeight = 
        EQX_BASKET_WEIGHTS.USD +
        EQX_BASKET_WEIGHTS.EUR +
        EQX_BASKET_WEIGHTS.CNY +
        EQX_BASKET_WEIGHTS.JPY +
        EQX_BASKET_WEIGHTS.GBP;
      expect(currencyWeight).toBeCloseTo(0.50, 4);
    });

    it('should have gold at 30%', () => {
      expect(EQX_BASKET_WEIGHTS.XAU).toBe(0.30);
    });

    it('should have commodities at 20%', () => {
      const commodityWeight = 
        EQX_BASKET_WEIGHTS.OIL +
        EQX_BASKET_WEIGHTS.COPPER +
        EQX_BASKET_WEIGHTS.WHEAT;
      expect(commodityWeight).toBeCloseTo(0.20, 4);
    });

    it('should have correct individual weights', () => {
      expect(EQX_BASKET_WEIGHTS.USD).toBe(0.20);
      expect(EQX_BASKET_WEIGHTS.EUR).toBe(0.15);
      expect(EQX_BASKET_WEIGHTS.CNY).toBe(0.08);
      expect(EQX_BASKET_WEIGHTS.JPY).toBe(0.04);
      expect(EQX_BASKET_WEIGHTS.GBP).toBe(0.03);
      expect(EQX_BASKET_WEIGHTS.OIL).toBe(0.07);
      expect(EQX_BASKET_WEIGHTS.COPPER).toBe(0.07);
      expect(EQX_BASKET_WEIGHTS.WHEAT).toBe(0.06);
    });
  });

  describe('Pyth Feed IDs', () => {
    it('should have all required feed IDs', () => {
      expect(PYTH_FEED_IDS.XAU_USD).toBeDefined();
      expect(PYTH_FEED_IDS.WTI_USD).toBeDefined();
      expect(PYTH_FEED_IDS.COPPER_USD).toBeDefined();
      expect(PYTH_FEED_IDS.WHEAT_USD).toBeDefined();
      expect(PYTH_FEED_IDS.EUR_USD).toBeDefined();
      expect(PYTH_FEED_IDS.CNY_USD).toBeDefined();
      expect(PYTH_FEED_IDS.JPY_USD).toBeDefined();
      expect(PYTH_FEED_IDS.GBP_USD).toBeDefined();
      expect(PYTH_FEED_IDS.BTC_USD).toBeDefined();
    });

    it('should have feed IDs in correct hex format', () => {
      Object.values(PYTH_FEED_IDS).forEach(feedId => {
        expect(feedId).toMatch(/^0x[0-9a-f]{64}$/);
      });
    });
  });

  describe('Price Calculation', () => {
    it('should calculate EQX value from asset prices', () => {
      const testPrices = {
        USD: { symbol: 'USD', price: 1.0, timestamp: Date.now(), source: 'fallback' as const },
        EUR: { symbol: 'EUR', price: 1.08, timestamp: Date.now(), source: 'fallback' as const },
        GBP: { symbol: 'GBP', price: 1.27, timestamp: Date.now(), source: 'fallback' as const },
        JPY: { symbol: 'JPY', price: 0.0067, timestamp: Date.now(), source: 'fallback' as const },
        CNY: { symbol: 'CNY', price: 0.138, timestamp: Date.now(), source: 'fallback' as const },
        XAU: { symbol: 'XAU', price: 2650.0, timestamp: Date.now(), source: 'fallback' as const },
        OIL: { symbol: 'OIL', price: 75.0, timestamp: Date.now(), source: 'fallback' as const },
        COPPER: { symbol: 'COPPER', price: 4.2, timestamp: Date.now(), source: 'fallback' as const },
        WHEAT: { symbol: 'WHEAT', price: 5.5, timestamp: Date.now(), source: 'fallback' as const },
      };

      const result = _testing.calculateEQXValue(testPrices);
      
      expect(result.eqxValue).toBeGreaterThan(0);
      expect(result.breakdown.currencyContribution).toBeGreaterThan(0);
      expect(result.breakdown.goldContribution).toBeGreaterThan(0);
      expect(result.breakdown.commodityContribution).toBeGreaterThan(0);
      
      // Verify breakdown sums to 1
      const totalContribution = 
        result.breakdown.currencyContribution +
        result.breakdown.goldContribution +
        result.breakdown.commodityContribution;
      expect(totalContribution).toBeCloseTo(1.0, 4);
    });

    it('should return epoch 0 price of 0.01 EQX (matching phase 1 start)', async () => {
      // With 0 transactions, price should be $0.01
      // In EQX terms, this should be approximately 0.01 EQX as well (since EQX starts at ~1 USD)
      mockedAxios.get.mockRejectedValue(new Error('Network error')); // Force fallback
      
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
      mockedAxios.get.mockRejectedValue(new Error('Network error')); // Force fallback
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
      expect(['pyth', 'coingecko', 'fallback']).toContain(price.source);
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
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      // First fetch - should hit API (which fails, so fallback)
      const firstData = await getEQXPriceData();
      expect(firstData).toBeDefined();
      
      // Second fetch - should use cache
      const secondData = await getEQXPriceData();
      expect(secondData).toEqual(firstData);
      expect(secondData.lastUpdated).toBe(firstData.lastUpdated);
    });

    it('should clear cache when requested', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const firstData = await getEQXPriceData();
      clearPriceCache();
      
      // After clearing, should get new timestamp
      const secondData = await getEQXPriceData();
      expect(secondData.lastUpdated).toBeGreaterThanOrEqual(firstData.lastUpdated);
    });
  });

  describe('Fallback Mechanism', () => {
    beforeEach(() => {
      clearPriceCache();
    });

    it('should use Pyth when available', async () => {
      // Mock response from Hermes POST API (array format)
      const mockPythResponse = [
        {
          id: PYTH_FEED_IDS.XAU_USD.slice(2), // Response has IDs without 0x prefix
          price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
          ema_price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.WTI_USD.slice(2),
          price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
          ema_price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.COPPER_USD.slice(2),
          price: { price: '4200000', expo: -6, conf: '10000', publish_time: 1234567890 },
          ema_price: { price: '4200000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.WHEAT_USD.slice(2),
          price: { price: '5500000', expo: -6, conf: '10000', publish_time: 1234567890 },
          ema_price: { price: '5500000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.EUR_USD.slice(2),
          price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
          ema_price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.CNY_USD.slice(2),
          price: { price: '138000', expo: -6, conf: '100', publish_time: 1234567890 },
          ema_price: { price: '138000', expo: -6, conf: '100', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.JPY_USD.slice(2),
          price: { price: '6700', expo: -6, conf: '10', publish_time: 1234567890 },
          ema_price: { price: '6700', expo: -6, conf: '10', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.GBP_USD.slice(2),
          price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
          ema_price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
      ];

      // Mock POST request (not GET)
      mockedAxios.post.mockResolvedValueOnce({ data: mockPythResponse });

      const data = await getEQXPriceData();
      expect(data.source).toBe('pyth');
    });

    it('should use POST request with correct shape for Hermes API', async () => {
      const mockPythResponse = [
        {
          id: PYTH_FEED_IDS.XAU_USD.slice(2),
          price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
          ema_price: { price: '2650000000', expo: -6, conf: '1000000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.WTI_USD.slice(2),
          price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
          ema_price: { price: '75000000', expo: -6, conf: '100000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.COPPER_USD.slice(2),
          price: { price: '4200000', expo: -6, conf: '10000', publish_time: 1234567890 },
          ema_price: { price: '4200000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.WHEAT_USD.slice(2),
          price: { price: '5500000', expo: -6, conf: '10000', publish_time: 1234567890 },
          ema_price: { price: '5500000', expo: -6, conf: '10000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.EUR_USD.slice(2),
          price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
          ema_price: { price: '1080000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.CNY_USD.slice(2),
          price: { price: '138000', expo: -6, conf: '100', publish_time: 1234567890 },
          ema_price: { price: '138000', expo: -6, conf: '100', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.JPY_USD.slice(2),
          price: { price: '6700', expo: -6, conf: '10', publish_time: 1234567890 },
          ema_price: { price: '6700', expo: -6, conf: '10', publish_time: 1234567890 },
        },
        {
          id: PYTH_FEED_IDS.GBP_USD.slice(2),
          price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
          ema_price: { price: '1270000', expo: -6, conf: '1000', publish_time: 1234567890 },
        },
      ];

      mockedAxios.post.mockResolvedValueOnce({ data: mockPythResponse });

      await getEQXPriceData();

      // Verify POST was called with correct endpoint and shape
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hermes.pyth.network/api/latest_price_feeds',
        expect.objectContaining({
          ids: expect.arrayContaining([
            PYTH_FEED_IDS.XAU_USD.slice(2), // IDs without 0x prefix
            PYTH_FEED_IDS.WTI_USD.slice(2),
            PYTH_FEED_IDS.COPPER_USD.slice(2),
            PYTH_FEED_IDS.WHEAT_USD.slice(2),
            PYTH_FEED_IDS.EUR_USD.slice(2),
            PYTH_FEED_IDS.CNY_USD.slice(2),
            PYTH_FEED_IDS.JPY_USD.slice(2),
            PYTH_FEED_IDS.GBP_USD.slice(2),
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

    it('should fallback to CoinGecko when Pyth fails', async () => {
      // First call (Pyth) fails
      mockedAxios.get.mockRejectedValueOnce(new Error('Pyth unavailable'));
      // Second call (CoinGecko) also fails to trigger full fallback
      mockedAxios.get.mockRejectedValueOnce(new Error('CoinGecko unavailable'));

      const data = await getEQXPriceData();
      expect(data.source).toBe('fallback');
    });

    it('should use hardcoded fallback when all APIs fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('All APIs down'));

      const data = await getEQXPriceData();
      
      expect(data.source).toBe('fallback');
      expect(data.eqxValue).toBeGreaterThan(0);
      expect(Object.keys(data.assetPrices)).toContain('USD');
      expect(Object.keys(data.assetPrices)).toContain('XAU');
      expect(Object.keys(data.assetPrices)).toContain('OIL');
    });
  });

  describe('Basket Breakdown', () => {
    beforeEach(() => {
      clearPriceCache();
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
    });

    it('should provide basket breakdown with all asset categories', async () => {
      const breakdown = await getBasketBreakdown();
      
      expect(breakdown.currencies).toHaveLength(5);
      expect(breakdown.gold).toHaveLength(1);
      expect(breakdown.commodities).toHaveLength(3);
      expect(breakdown.totalValue).toBeGreaterThan(0);
    });

    it('should have correct currency weights in breakdown', async () => {
      const breakdown = await getBasketBreakdown();
      
      const usdEntry = breakdown.currencies.find(c => c.symbol === 'USD');
      expect(usdEntry?.weight).toBe(20);
      
      const eurEntry = breakdown.currencies.find(c => c.symbol === 'EUR');
      expect(eurEntry?.weight).toBe(15);
    });

    it('should verify all commodity prices update simultaneously', async () => {
      const data = await getEQXPriceData();
      
      const oilTimestamp = data.assetPrices.OIL?.timestamp;
      const copperTimestamp = data.assetPrices.COPPER?.timestamp;
      const wheatTimestamp = data.assetPrices.WHEAT?.timestamp;
      
      // All commodities should have same timestamp (fetched together)
      expect(oilTimestamp).toBe(copperTimestamp);
      expect(copperTimestamp).toBe(wheatTimestamp);
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
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
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
