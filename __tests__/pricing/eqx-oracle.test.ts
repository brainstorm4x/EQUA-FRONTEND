/**
 * Tests for EQX Oracle Service
 * 
 * Validates:
 * - Pyth oracle connection
 * - Price calculations (epoch 0 = 0.01 EQX)
 * - EQX to local currency conversion (USD, EUR, INR)
 * - Fallback to CoinGecko when Pyth unavailable
 * - Cache TTL (5 minute expiration)
 * - Basket contribution calculations
 * - All commodity prices update simultaneously
 * - Price stability in EQX despite USD volatility
 */

import {
  EqxOracleService,
  EQX_BASKET_WEIGHTS,
  EQX_CATEGORY_WEIGHTS,
  PYTH_FEED_IDS,
  FALLBACK_PRICES,
  PRICE_CACHE_TTL_MS,
  clearPriceCache,
  resetEqxOracleService,
  getEqxOracleService,
  type EqxValue,
  type BasketPrices,
  type AssetPrice,
} from '@/services/eqx-oracle.service';
import { EquaPriceCalculator } from '@/utils/priceCalculator';
import {
  formatEqxPrice,
  formatEquaPriceDisplay,
  convertUsdToLocal,
  convertLocalToUsd,
  getExchangeRate,
  DEFAULT_RATES,
} from '@/utils/localeCurrency';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  get: jest.fn(),
  default: {
    get: jest.fn(),
  },
  AxiosError: class AxiosError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AxiosError';
    }
  },
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EQX Oracle Service', () => {
  let oracleService: EqxOracleService;

  beforeEach(() => {
    // Reset singleton and clear caches before each test
    resetEqxOracleService();
    clearPriceCache();
    jest.clearAllMocks();
    oracleService = new EqxOracleService();
  });

  // ===========================================================================
  // BASKET COMPOSITION TESTS
  // ===========================================================================

  describe('Basket Composition Constants', () => {
    it('should have basket weights totaling 100%', () => {
      const totalWeight = Object.values(EQX_BASKET_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it('should have currencies totaling 50%', () => {
      const currencyWeights = 
        EQX_BASKET_WEIGHTS.USD + 
        EQX_BASKET_WEIGHTS.EUR + 
        EQX_BASKET_WEIGHTS.CNY + 
        EQX_BASKET_WEIGHTS.JPY + 
        EQX_BASKET_WEIGHTS.GBP;
      expect(currencyWeights).toBeCloseTo(EQX_CATEGORY_WEIGHTS.CURRENCIES, 5);
    });

    it('should have gold totaling 30%', () => {
      expect(EQX_BASKET_WEIGHTS.XAU).toBe(EQX_CATEGORY_WEIGHTS.GOLD);
    });

    it('should have commodities totaling 20%', () => {
      const commodityWeights = 
        EQX_BASKET_WEIGHTS.OIL + 
        EQX_BASKET_WEIGHTS.COPPER + 
        EQX_BASKET_WEIGHTS.WHEAT;
      expect(commodityWeights).toBeCloseTo(EQX_CATEGORY_WEIGHTS.COMMODITIES, 5);
    });

    it('should have correct individual weights', () => {
      // Currencies
      expect(EQX_BASKET_WEIGHTS.USD).toBe(0.20);
      expect(EQX_BASKET_WEIGHTS.EUR).toBe(0.15);
      expect(EQX_BASKET_WEIGHTS.CNY).toBe(0.08);
      expect(EQX_BASKET_WEIGHTS.JPY).toBe(0.04);
      expect(EQX_BASKET_WEIGHTS.GBP).toBe(0.03);
      // Gold
      expect(EQX_BASKET_WEIGHTS.XAU).toBe(0.30);
      // Commodities
      expect(EQX_BASKET_WEIGHTS.OIL).toBe(0.07);
      expect(EQX_BASKET_WEIGHTS.COPPER).toBe(0.07);
      expect(EQX_BASKET_WEIGHTS.WHEAT).toBe(0.06);
    });
  });

  // ===========================================================================
  // PYTH FEED ID TESTS
  // ===========================================================================

  describe('Pyth Feed IDs', () => {
    it('should have all required feed IDs defined', () => {
      expect(PYTH_FEED_IDS.XAU_USD).toBeDefined();
      expect(PYTH_FEED_IDS.WTI_USD).toBeDefined();
      expect(PYTH_FEED_IDS.COPPER_USD).toBeDefined();
      expect(PYTH_FEED_IDS.WHEAT_USD).toBeDefined();
      expect(PYTH_FEED_IDS.EUR_USD).toBeDefined();
      expect(PYTH_FEED_IDS.CNY_USD).toBeDefined();
      expect(PYTH_FEED_IDS.JPY_USD).toBeDefined();
      expect(PYTH_FEED_IDS.GBP_USD).toBeDefined();
    });

    it('should have feed IDs in correct hex format', () => {
      Object.values(PYTH_FEED_IDS).forEach(feedId => {
        expect(feedId).toMatch(/^0x[a-f0-9]{64}$/);
      });
    });
  });

  // ===========================================================================
  // PRICE CALCULATION TESTS
  // ===========================================================================

  describe('Price Calculation - Epoch 0', () => {
    it('should calculate EQUA price as 0.01 EQX at epoch 0', async () => {
      // At epoch 0, EQUA price is $0.01 USD
      const equaPriceUsd = EquaPriceCalculator.calculatePrice(0);
      expect(equaPriceUsd).toBe(0.01);

      // Mock Pyth returning reference prices (so EQX = 1 USD)
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0), // All at reference prices
      });

      // Convert to EQX (should be same as USD when EQX = 1)
      const eqxValue = await oracleService.calculateEqxValue();
      expect(eqxValue.value).toBeCloseTo(1.0, 2);
      
      const equaPriceEqx = await oracleService.convertUsdToEqx(equaPriceUsd);
      expect(equaPriceEqx).toBeCloseTo(0.01, 4);
    });
  });

  describe('EQX Basket Value Calculation', () => {
    it('should return value of 1.0 when all prices are at reference levels', async () => {
      // Mock all prices at reference values
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const eqxValue = await oracleService.calculateEqxValue();
      
      expect(eqxValue.value).toBeCloseTo(1.0, 2);
      expect(eqxValue.breakdown.currencies).toBeCloseTo(0.50, 2);
      expect(eqxValue.breakdown.gold).toBeCloseTo(0.30, 2);
      expect(eqxValue.breakdown.commodities).toBeCloseTo(0.20, 2);
    });

    it('should increase EQX value when gold price increases', async () => {
      // Mock gold price 10% higher than reference
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponseWithGoldIncrease(1.1),
      });

      const eqxValue = await oracleService.calculateEqxValue(true);
      
      // Gold is 30% of basket, 10% increase = 3% increase in total
      expect(eqxValue.value).toBeGreaterThan(1.0);
      expect(eqxValue.breakdown.gold).toBeCloseTo(0.30 * 1.1, 3);
    });

    it('should calculate correct individual contributions', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const eqxValue = await oracleService.calculateEqxValue(true);

      expect(eqxValue.contributions.USD).toBeCloseTo(0.20, 3);
      expect(eqxValue.contributions.EUR).toBeCloseTo(0.15, 3);
      expect(eqxValue.contributions.XAU).toBeCloseTo(0.30, 3);
      expect(eqxValue.contributions.OIL).toBeCloseTo(0.07, 3);
    });
  });

  // ===========================================================================
  // CURRENCY CONVERSION TESTS
  // ===========================================================================

  describe('EQX to Local Currency Conversion', () => {
    it('should convert EQX to USD correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const eqxAmount = 100;
      const usdAmount = await oracleService.convertEqxToUsd(eqxAmount);
      
      // When EQX = 1 USD, 100 EQX = 100 USD
      expect(usdAmount).toBeCloseTo(100, 1);
    });

    it('should convert USD to EQX correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const usdAmount = 100;
      const eqxAmount = await oracleService.convertUsdToEqx(usdAmount);
      
      // When EQX = 1 USD, 100 USD = 100 EQX
      expect(eqxAmount).toBeCloseTo(100, 1);
    });

    it('should convert to EUR correctly', () => {
      const usdAmount = 100;
      const eurAmount = convertUsdToLocal(usdAmount, 'EUR');
      
      // EUR rate is approximately 0.92
      const expectedEur = usdAmount * DEFAULT_RATES.EUR.rate;
      expect(eurAmount).toBe(expectedEur);
    });

    it('should convert to INR correctly', () => {
      const usdAmount = 100;
      const inrAmount = convertUsdToLocal(usdAmount, 'INR');
      
      // INR rate is approximately 83.5
      const expectedInr = usdAmount * DEFAULT_RATES.INR.rate;
      expect(inrAmount).toBe(expectedInr);
    });

    it('should convert from local currency back to USD', () => {
      const originalUsd = 100;
      const inrAmount = convertUsdToLocal(originalUsd, 'INR');
      const backToUsd = convertLocalToUsd(inrAmount, 'INR');
      
      expect(backToUsd).toBeCloseTo(originalUsd, 2);
    });
  });

  describe('getEquaPriceMultiFormat', () => {
    it('should return prices in all three formats', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const equaPriceUsd = 0.01;
      const localCurrencyRate = DEFAULT_RATES.INR.rate;
      
      const result = await oracleService.getEquaPriceMultiFormat(
        equaPriceUsd,
        'INR',
        localCurrencyRate
      );

      expect(result.usd).toBe(equaPriceUsd);
      expect(result.eqx).toBeCloseTo(0.01, 4);
      expect(result.localCurrency).toBeCloseTo(equaPriceUsd * localCurrencyRate, 2);
      expect(result.localCurrencyCode).toBe('INR');
    });
  });

  // ===========================================================================
  // FALLBACK TESTS
  // ===========================================================================

  describe('Fallback to CoinGecko when Pyth unavailable', () => {
    it('should use fallback prices when Pyth fails', async () => {
      // Mock Pyth failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const prices = await oracleService.fetchBasketPrices(true);
      
      // Should have fallback prices
      expect(prices.xau.source).toBe('fallback');
      expect(prices.xau.priceUsd).toBe(FALLBACK_PRICES.XAU);
    });

    it('should have reasonable fallback prices', () => {
      expect(FALLBACK_PRICES.XAU).toBeGreaterThan(1000);
      expect(FALLBACK_PRICES.OIL).toBeGreaterThan(50);
      expect(FALLBACK_PRICES.EUR).toBeGreaterThan(1);
      expect(FALLBACK_PRICES.USD).toBe(1.0);
    });
  });

  // ===========================================================================
  // CACHE TESTS
  // ===========================================================================

  describe('Cache TTL (5 minute expiration)', () => {
    it('should have 5-minute cache TTL', () => {
      expect(PRICE_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });

    it('should return cached values within TTL', async () => {
      // First call - fetches from API
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });
      await oracleService.fetchBasketPrices();

      // Second call - should use cache
      const cachedPrices = await oracleService.fetchBasketPrices();
      
      // axios.get should only be called once
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(cachedPrices).toBeDefined();
    });

    it('should refresh when forceRefresh is true', async () => {
      mockedAxios.get.mockResolvedValue({
        data: createMockPythResponse(1.0),
      });

      await oracleService.fetchBasketPrices();
      await oracleService.fetchBasketPrices(true);
      
      // Should be called twice due to force refresh
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should clear cache properly', async () => {
      mockedAxios.get.mockResolvedValue({
        data: createMockPythResponse(1.0),
      });

      await oracleService.fetchBasketPrices();
      clearPriceCache();
      
      const status = oracleService.getCacheStatus();
      expect(status.basketCached).toBe(false);
    });
  });

  // ===========================================================================
  // SIMULTANEOUS UPDATE TESTS
  // ===========================================================================

  describe('Simultaneous Price Updates', () => {
    it('should update all commodity prices at once', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const prices = await oracleService.fetchBasketPrices(true);
      
      // All prices should have similar timestamps (within 1 second)
      const timestamps = [
        prices.xau.timestamp,
        prices.oil.timestamp,
        prices.copper.timestamp,
        prices.wheat.timestamp,
      ];
      
      // When using fallback, all timestamps should be very close
      const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(maxDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  // ===========================================================================
  // PRICE STABILITY TESTS
  // ===========================================================================

  describe('Price Stability in EQX', () => {
    it('should maintain stable EQX value when USD weakens but basket compensates', async () => {
      // Scenario: USD weakens 10%, but gold and EUR strengthen proportionally
      
      // First call: baseline
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });
      const baseline = await oracleService.calculateEqxValue(true);

      // Clear cache for next call
      clearPriceCache();
      
      // Second call: USD weak, others strong (compensating)
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponseWithCompensation(),
      });
      const compensated = await oracleService.calculateEqxValue(true);

      // EQX value should be relatively stable
      const percentChange = Math.abs(compensated.value - baseline.value) / baseline.value * 100;
      // Allow up to 10% variation as basket provides partial hedge
      expect(percentChange).toBeLessThan(10);
    });
  });

  // ===========================================================================
  // CONNECTION TEST
  // ===========================================================================

  describe('Oracle Connection Check', () => {
    it('should report connection status', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: createMockPythResponse(1.0),
      });

      const status = await oracleService.checkConnection();
      
      expect(status.connected).toBe(true);
      expect(status.message).toBeDefined();
    });

    it('should report Pyth unavailable when fetch fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));

      const status = await oracleService.checkConnection();
      
      // The service catches errors and returns empty prices, so connected is true
      // but pythAvailable is false (no prices returned)
      expect(status.connected).toBe(true);
      expect(status.pythAvailable).toBe(false);
      expect(status.message).toContain('fallback');
    });
  });

  // ===========================================================================
  // SINGLETON TESTS
  // ===========================================================================

  describe('Singleton Instance', () => {
    it('should return same instance', () => {
      const instance1 = getEqxOracleService();
      const instance2 = getEqxOracleService();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset instance properly', () => {
      const instance1 = getEqxOracleService();
      resetEqxOracleService();
      const instance2 = getEqxOracleService();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});

// =============================================================================
// EQX FORMATTING TESTS
// =============================================================================

describe('EQX Formatting Utilities', () => {
  describe('formatEqxPrice', () => {
    it('should format small EQX values with 4 decimals', () => {
      const result = formatEqxPrice(0.01);
      expect(result).toBe('0.0100 EQX');
    });

    it('should format large EQX values with 2 decimals', () => {
      const result = formatEqxPrice(100.5);
      expect(result).toMatch(/100\.50 EQX/);
    });
  });

  describe('formatEquaPriceDisplay', () => {
    it('should return all three formats', () => {
      const result = formatEquaPriceDisplay(0.01, 0.01, 'USD');
      
      expect(result.eqx).toContain('EQX');
      expect(result.usd).toContain('$');
      expect(result.localCode).toBe('USD');
    });

    it('should use user locale currency when not specified', () => {
      const result = formatEquaPriceDisplay(0.01, 0.01);
      
      expect(result.localCode).toBeDefined();
    });
  });

  describe('getExchangeRate', () => {
    it('should return correct rate for known currencies', () => {
      expect(getExchangeRate('EUR')).toBe(DEFAULT_RATES.EUR.rate);
      expect(getExchangeRate('INR')).toBe(DEFAULT_RATES.INR.rate);
      expect(getExchangeRate('USD')).toBe(1);
    });

    it('should return 1 for unknown currencies', () => {
      expect(getExchangeRate('UNKNOWN')).toBe(1);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS FOR MOCKING
// =============================================================================

/**
 * Create mock Pyth API response with prices at reference levels multiplied by a factor
 */
function createMockPythResponse(factor: number): Array<{
  id: string;
  price: { price: string; conf: string; expo: number; publish_time: number };
  ema_price: { price: string; conf: string; expo: number; publish_time: number };
}> {
  const now = Math.floor(Date.now() / 1000);
  
  // Reference prices that make EQX = 1 USD
  const referencePrices: Record<string, number> = {
    [PYTH_FEED_IDS.XAU_USD.replace('0x', '')]: 2000 * factor,
    [PYTH_FEED_IDS.WTI_USD.replace('0x', '')]: 75 * factor,
    [PYTH_FEED_IDS.COPPER_USD.replace('0x', '')]: 4 * factor,
    [PYTH_FEED_IDS.WHEAT_USD.replace('0x', '')]: 6 * factor,
    [PYTH_FEED_IDS.EUR_USD.replace('0x', '')]: 1.08 * factor,
    [PYTH_FEED_IDS.CNY_USD.replace('0x', '')]: 0.14 * factor,
    [PYTH_FEED_IDS.JPY_USD.replace('0x', '')]: 0.0067 * factor,
    [PYTH_FEED_IDS.GBP_USD.replace('0x', '')]: 1.26 * factor,
  };

  return Object.entries(referencePrices).map(([id, price]) => ({
    id,
    price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
    ema_price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
  }));
}

/**
 * Create mock response with gold price increased
 */
function createMockPythResponseWithGoldIncrease(goldFactor: number): Array<{
  id: string;
  price: { price: string; conf: string; expo: number; publish_time: number };
  ema_price: { price: string; conf: string; expo: number; publish_time: number };
}> {
  const now = Math.floor(Date.now() / 1000);
  
  const prices: Record<string, number> = {
    [PYTH_FEED_IDS.XAU_USD.replace('0x', '')]: 2000 * goldFactor, // Gold increased
    [PYTH_FEED_IDS.WTI_USD.replace('0x', '')]: 75,
    [PYTH_FEED_IDS.COPPER_USD.replace('0x', '')]: 4,
    [PYTH_FEED_IDS.WHEAT_USD.replace('0x', '')]: 6,
    [PYTH_FEED_IDS.EUR_USD.replace('0x', '')]: 1.08,
    [PYTH_FEED_IDS.CNY_USD.replace('0x', '')]: 0.14,
    [PYTH_FEED_IDS.JPY_USD.replace('0x', '')]: 0.0067,
    [PYTH_FEED_IDS.GBP_USD.replace('0x', '')]: 1.26,
  };

  return Object.entries(prices).map(([id, price]) => ({
    id,
    price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
    ema_price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
  }));
}

/**
 * Create mock response simulating USD weakness compensated by other assets
 */
function createMockPythResponseWithCompensation(): Array<{
  id: string;
  price: { price: string; conf: string; expo: number; publish_time: number };
  ema_price: { price: string; conf: string; expo: number; publish_time: number };
}> {
  const now = Math.floor(Date.now() / 1000);
  
  // USD weakness scenario: gold and EUR strengthen to compensate
  const prices: Record<string, number> = {
    [PYTH_FEED_IDS.XAU_USD.replace('0x', '')]: 2200, // Gold up 10%
    [PYTH_FEED_IDS.WTI_USD.replace('0x', '')]: 75,
    [PYTH_FEED_IDS.COPPER_USD.replace('0x', '')]: 4,
    [PYTH_FEED_IDS.WHEAT_USD.replace('0x', '')]: 6,
    [PYTH_FEED_IDS.EUR_USD.replace('0x', '')]: 1.19, // EUR up 10%
    [PYTH_FEED_IDS.CNY_USD.replace('0x', '')]: 0.14,
    [PYTH_FEED_IDS.JPY_USD.replace('0x', '')]: 0.0067,
    [PYTH_FEED_IDS.GBP_USD.replace('0x', '')]: 1.39, // GBP up 10%
  };

  return Object.entries(prices).map(([id, price]) => ({
    id,
    price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
    ema_price: {
      price: Math.round(price * 1e8).toString(),
      conf: '10000',
      expo: -8,
      publish_time: now,
    },
  }));
}
