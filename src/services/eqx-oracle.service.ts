/**
 * EQX Oracle Service
 * 
 * Provides real-time price data for the EQX (EQUA Index) basket using Pyth Network
 * price feeds on Solana with CoinGecko fallback.
 * 
 * The EQX basket is designed to hedge against USD volatility by tracking:
 * - 50% major currencies (USD, EUR, CNY, JPY, GBP)
 * - 30% gold (XAU)
 * - 20% commodities (oil, copper, wheat)
 */

import { Connection } from '@solana/web3.js';
import axios, { AxiosError } from 'axios';

// =============================================================================
// CONSTANTS AND TYPES
// =============================================================================

/**
 * Pyth Network Price Feed IDs for Solana (Hermes API)
 * These are the hex-encoded feed IDs for each asset
 */
export const PYTH_FEED_IDS = {
  XAU_USD: '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420d3a674090221e80d2ffb69f',
  WTI_USD: '0x5875cb5df6a67b4d79a1a09e8f9038a52d21ba5fb8e8eca1b96a69bb5f9dff6f',
  COPPER_USD: '0x3dd9286e6c3b509b5ff7439ef18722e088a96b7fb29eefb103d8798f2d37c5f5',
  WHEAT_USD: '0xec5d399846a9209f3fe3881d87c43dac0aedd198de854066da373bde2dd440c2',
  EUR_USD: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0d3d3bec0f26b3bd62e',
  CNY_USD: '0x132d3c0b603eee992d53674ba3c30ac1f38a571a6c1bc269fb251cadbe926e88',
  JPY_USD: '0xef2c98c804ba503c6a707e38be4dfb16684ce99c5e41615f56ce631b5b605b63',
  GBP_USD: '0x84c2dde129ada19c6800e6f4ee73b63e43741dd8d874b6fd5e367f4e9587fb88',
  BTC_USD: '0xc9d8b075a5c69303365ae23d7190c565b5ead26888fe7722529c1ce66b91bb32',
} as const;

/**
 * EQX Basket Composition (100% total)
 * 
 * Currencies (50%):
 *   - USD: 20%
 *   - EUR: 15%
 *   - CNY: 8%
 *   - JPY: 4%
 *   - GBP: 3%
 * 
 * Gold (30%):
 *   - XAU: 30%
 * 
 * Commodities (20%):
 *   - OIL (WTI): 7%
 *   - COPPER: 7%
 *   - WHEAT: 6%
 */
export const EQX_BASKET_WEIGHTS = {
  // Currencies (50% total)
  USD: 0.20,  // 20%
  EUR: 0.15,  // 15%
  CNY: 0.08,  // 8%
  JPY: 0.04,  // 4%
  GBP: 0.03,  // 3%
  // Gold (30% total)
  XAU: 0.30,  // 30%
  // Commodities (20% total)
  OIL: 0.07,  // 7%
  COPPER: 0.07, // 7%
  WHEAT: 0.06,  // 6%
} as const;

/**
 * Category totals for basket composition
 */
export const EQX_CATEGORY_WEIGHTS = {
  CURRENCIES: 0.50, // 50%
  GOLD: 0.30,       // 30%
  COMMODITIES: 0.20 // 20%
} as const;

/**
 * Cache TTL in milliseconds (5 minutes)
 */
export const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Request timeout in milliseconds (10 seconds)
 */
export const REQUEST_TIMEOUT_MS = 10 * 1000;

/**
 * Pyth Hermes API endpoint (mainnet)
 */
export const PYTH_HERMES_API = 'https://hermes.pyth.network';

/**
 * CoinGecko API endpoint
 */
export const COINGECKO_API = 'https://api.coingecko.com/api/v3';

/**
 * Asset price data structure
 */
export interface AssetPrice {
  symbol: string;
  priceUsd: number;
  timestamp: number;
  source: 'pyth' | 'coingecko' | 'fallback';
  confidence?: number;
}

/**
 * Complete basket prices
 */
export interface BasketPrices {
  xau: AssetPrice;      // Gold
  oil: AssetPrice;      // WTI Oil
  copper: AssetPrice;   // Copper
  wheat: AssetPrice;    // Wheat
  eur: AssetPrice;      // EUR/USD
  cny: AssetPrice;      // CNY/USD
  jpy: AssetPrice;      // JPY/USD
  gbp: AssetPrice;      // GBP/USD
  usd: AssetPrice;      // USD (always 1.0)
}

/**
 * EQX value calculation result
 */
export interface EqxValue {
  /** The calculated EQX basket value in USD */
  value: number;
  /** Breakdown by category */
  breakdown: {
    currencies: number;
    gold: number;
    commodities: number;
  };
  /** Individual asset contributions */
  contributions: Record<string, number>;
  /** Timestamp of calculation */
  timestamp: number;
  /** Whether prices are from cache */
  cached: boolean;
}

/**
 * EQUA price in multiple formats
 */
export interface EquaPriceMultiFormat {
  /** EQUA price in EQX units */
  eqx: number;
  /** EQUA price in USD */
  usd: number;
  /** EQUA price in local currency */
  localCurrency: number;
  /** Local currency code */
  localCurrencyCode: string;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry<AssetPrice>>();
const basketCache: { value: BasketPrices | null; timestamp: number } = {
  value: null,
  timestamp: 0,
};

/**
 * Get cached price if valid
 */
function getCachedPrice(symbol: string): AssetPrice | null {
  const entry = priceCache.get(symbol);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > PRICE_CACHE_TTL_MS) {
    priceCache.delete(symbol);
    return null;
  }
  
  return entry.value;
}

/**
 * Set cache entry
 */
function setCachedPrice(symbol: string, price: AssetPrice): void {
  priceCache.set(symbol, { value: price, timestamp: Date.now() });
}

/**
 * Check if basket cache is valid
 */
function isBasketCacheValid(): boolean {
  return basketCache.value !== null && 
         Date.now() - basketCache.timestamp < PRICE_CACHE_TTL_MS;
}

/**
 * Clear all caches
 */
export function clearPriceCache(): void {
  priceCache.clear();
  basketCache.value = null;
  basketCache.timestamp = 0;
}

// =============================================================================
// FALLBACK PRICES
// =============================================================================

/**
 * Fallback prices used when both Pyth and CoinGecko fail
 * These are approximate values and should only be used as last resort
 */
export const FALLBACK_PRICES: Record<string, number> = {
  XAU: 2000.00,    // Gold ~$2000/oz
  OIL: 75.00,      // WTI Oil ~$75/barrel
  COPPER: 4.00,    // Copper ~$4/lb
  WHEAT: 6.00,     // Wheat ~$6/bushel
  EUR: 1.08,       // EUR/USD
  CNY: 0.14,       // CNY/USD (1 CNY ≈ $0.14)
  JPY: 0.0067,     // JPY/USD (1 JPY ≈ $0.0067)
  GBP: 1.26,       // GBP/USD
  USD: 1.00,       // USD/USD
};

// =============================================================================
// PYTH NETWORK INTEGRATION
// =============================================================================

/**
 * Pyth price feed response structure
 */
interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

/**
 * Fetch price from Pyth Network Hermes API
 */
async function fetchPythPrice(feedId: string, symbol: string): Promise<AssetPrice | null> {
  try {
    const response = await axios.get<PythPriceData[]>(
      `${PYTH_HERMES_API}/api/latest_price_feeds`,
      {
        params: {
          ids: [feedId.replace('0x', '')],
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    if (response.data && response.data.length > 0) {
      const priceData = response.data[0];
      const price = parseInt(priceData.price.price) * Math.pow(10, priceData.price.expo);
      const confidence = parseInt(priceData.price.conf) * Math.pow(10, priceData.price.expo);
      
      return {
        symbol,
        priceUsd: price,
        timestamp: priceData.price.publish_time * 1000,
        source: 'pyth',
        confidence,
      };
    }
  } catch (error) {
    const isAxiosError = error instanceof AxiosError;
    console.warn(`Pyth fetch failed for ${symbol}:`, isAxiosError ? error.message : error);
  }
  
  return null;
}

/**
 * Fetch all prices from Pyth Network in a single batch request
 */
async function fetchAllPythPrices(): Promise<Partial<BasketPrices>> {
  const feedIds = [
    PYTH_FEED_IDS.XAU_USD,
    PYTH_FEED_IDS.WTI_USD,
    PYTH_FEED_IDS.COPPER_USD,
    PYTH_FEED_IDS.WHEAT_USD,
    PYTH_FEED_IDS.EUR_USD,
    PYTH_FEED_IDS.CNY_USD,
    PYTH_FEED_IDS.JPY_USD,
    PYTH_FEED_IDS.GBP_USD,
  ];

  const symbolMap: Record<string, keyof BasketPrices> = {
    [PYTH_FEED_IDS.XAU_USD]: 'xau',
    [PYTH_FEED_IDS.WTI_USD]: 'oil',
    [PYTH_FEED_IDS.COPPER_USD]: 'copper',
    [PYTH_FEED_IDS.WHEAT_USD]: 'wheat',
    [PYTH_FEED_IDS.EUR_USD]: 'eur',
    [PYTH_FEED_IDS.CNY_USD]: 'cny',
    [PYTH_FEED_IDS.JPY_USD]: 'jpy',
    [PYTH_FEED_IDS.GBP_USD]: 'gbp',
  };

  const symbolNames: Record<string, string> = {
    [PYTH_FEED_IDS.XAU_USD]: 'XAU',
    [PYTH_FEED_IDS.WTI_USD]: 'OIL',
    [PYTH_FEED_IDS.COPPER_USD]: 'COPPER',
    [PYTH_FEED_IDS.WHEAT_USD]: 'WHEAT',
    [PYTH_FEED_IDS.EUR_USD]: 'EUR',
    [PYTH_FEED_IDS.CNY_USD]: 'CNY',
    [PYTH_FEED_IDS.JPY_USD]: 'JPY',
    [PYTH_FEED_IDS.GBP_USD]: 'GBP',
  };

  try {
    const response = await axios.get<PythPriceData[]>(
      `${PYTH_HERMES_API}/api/latest_price_feeds`,
      {
        params: {
          ids: feedIds.map(id => id.replace('0x', '')),
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    const prices: Partial<BasketPrices> = {};

    if (response.data) {
      for (const priceData of response.data) {
        const fullId = '0x' + priceData.id;
        const key = symbolMap[fullId];
        const symbol = symbolNames[fullId];
        
        if (key && symbol) {
          const price = parseInt(priceData.price.price) * Math.pow(10, priceData.price.expo);
          const confidence = parseInt(priceData.price.conf) * Math.pow(10, priceData.price.expo);
          
          const assetPrice: AssetPrice = {
            symbol,
            priceUsd: price,
            timestamp: priceData.price.publish_time * 1000,
            source: 'pyth',
            confidence,
          };
          
          prices[key] = assetPrice;
          setCachedPrice(symbol, assetPrice);
        }
      }
    }

    return prices;
  } catch (error) {
    const isAxiosError = error instanceof AxiosError;
    console.warn('Pyth batch fetch failed:', isAxiosError ? error.message : error);
    return {};
  }
}

// =============================================================================
// COINGECKO FALLBACK
// =============================================================================

/**
 * CoinGecko price mapping
 */
const COINGECKO_IDS: Record<string, string> = {
  XAU: 'gold',
  // Note: CoinGecko doesn't have WTI, Copper, Wheat directly
  // We'll use proxies or skip them
};

/**
 * Fetch price from CoinGecko as fallback
 */
async function fetchCoinGeckoPrice(symbol: string): Promise<AssetPrice | null> {
  const coinId = COINGECKO_IDS[symbol];
  if (!coinId) return null;

  try {
    const response = await axios.get(
      `${COINGECKO_API}/simple/price`,
      {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    if (response.data && response.data[coinId]) {
      return {
        symbol,
        priceUsd: response.data[coinId].usd,
        timestamp: Date.now(),
        source: 'coingecko',
      };
    }
  } catch (error) {
    const isAxiosError = error instanceof AxiosError;
    console.warn(`CoinGecko fetch failed for ${symbol}:`, isAxiosError ? error.message : error);
  }

  return null;
}

// =============================================================================
// EQX ORACLE SERVICE CLASS
// =============================================================================

export class EqxOracleService {
  private connection: Connection | null = null;

  constructor(connection?: Connection) {
    this.connection = connection || null;
  }

  /**
   * Set Solana connection
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Fetch all basket prices with fallback logic
   * Tries Pyth first, then CoinGecko, then fallback values
   */
  async fetchBasketPrices(forceRefresh = false): Promise<BasketPrices> {
    // Check cache first
    if (!forceRefresh && isBasketCacheValid() && basketCache.value) {
      return basketCache.value;
    }

    // USD is always 1.0
    const usdPrice: AssetPrice = {
      symbol: 'USD',
      priceUsd: 1.0,
      timestamp: Date.now(),
      source: 'fallback',
    };

    // Try Pyth first for all prices
    const pythPrices = await fetchAllPythPrices();

    // Build basket prices with fallbacks
    const prices: BasketPrices = {
      xau: pythPrices.xau || await this.getPriceWithFallback('XAU'),
      oil: pythPrices.oil || await this.getPriceWithFallback('OIL'),
      copper: pythPrices.copper || await this.getPriceWithFallback('COPPER'),
      wheat: pythPrices.wheat || await this.getPriceWithFallback('WHEAT'),
      eur: pythPrices.eur || await this.getPriceWithFallback('EUR'),
      cny: pythPrices.cny || await this.getPriceWithFallback('CNY'),
      jpy: pythPrices.jpy || await this.getPriceWithFallback('JPY'),
      gbp: pythPrices.gbp || await this.getPriceWithFallback('GBP'),
      usd: usdPrice,
    };

    // Update cache
    basketCache.value = prices;
    basketCache.timestamp = Date.now();

    return prices;
  }

  /**
   * Get price for a single asset with fallback chain
   */
  private async getPriceWithFallback(symbol: string): Promise<AssetPrice> {
    // Check cache first
    const cached = getCachedPrice(symbol);
    if (cached) return cached;

    // Try CoinGecko for supported assets
    const coinGeckoPrice = await fetchCoinGeckoPrice(symbol);
    if (coinGeckoPrice) {
      setCachedPrice(symbol, coinGeckoPrice);
      return coinGeckoPrice;
    }

    // Use fallback price
    const fallbackPrice: AssetPrice = {
      symbol,
      priceUsd: FALLBACK_PRICES[symbol] || 1.0,
      timestamp: Date.now(),
      source: 'fallback',
    };
    
    setCachedPrice(symbol, fallbackPrice);
    return fallbackPrice;
  }

  /**
   * Calculate EQX basket value
   * 
   * The basket is normalized so that at the reference point (when the basket
   * was defined), 1 EQX = 1 USD. As currency/commodity values change,
   * the EQX value will change relative to USD.
   */
  async calculateEqxValue(forceRefresh = false): Promise<EqxValue> {
    const prices = await this.fetchBasketPrices(forceRefresh);
    
    // Calculate weighted contributions
    // For currencies: use their USD exchange rate
    // For commodities: normalize to a reference value
    
    // Reference values for normalization (when 1 EQX = 1 USD)
    const referenceValues = {
      XAU: 2000,     // Gold at $2000/oz
      OIL: 75,       // Oil at $75/barrel
      COPPER: 4,     // Copper at $4/lb
      WHEAT: 6,      // Wheat at $6/bushel
      EUR: 1.08,     // EUR/USD at 1.08
      CNY: 0.14,     // CNY/USD at 0.14
      JPY: 0.0067,   // JPY/USD at 0.0067
      GBP: 1.26,     // GBP/USD at 1.26
      USD: 1.0,      // USD/USD always 1
    };

    // Calculate normalized price ratios (current/reference)
    const ratios = {
      USD: prices.usd.priceUsd / referenceValues.USD,
      EUR: prices.eur.priceUsd / referenceValues.EUR,
      CNY: prices.cny.priceUsd / referenceValues.CNY,
      JPY: prices.jpy.priceUsd / referenceValues.JPY,
      GBP: prices.gbp.priceUsd / referenceValues.GBP,
      XAU: prices.xau.priceUsd / referenceValues.XAU,
      OIL: prices.oil.priceUsd / referenceValues.OIL,
      COPPER: prices.copper.priceUsd / referenceValues.COPPER,
      WHEAT: prices.wheat.priceUsd / referenceValues.WHEAT,
    };

    // Calculate weighted contributions
    const contributions: Record<string, number> = {
      USD: ratios.USD * EQX_BASKET_WEIGHTS.USD,
      EUR: ratios.EUR * EQX_BASKET_WEIGHTS.EUR,
      CNY: ratios.CNY * EQX_BASKET_WEIGHTS.CNY,
      JPY: ratios.JPY * EQX_BASKET_WEIGHTS.JPY,
      GBP: ratios.GBP * EQX_BASKET_WEIGHTS.GBP,
      XAU: ratios.XAU * EQX_BASKET_WEIGHTS.XAU,
      OIL: ratios.OIL * EQX_BASKET_WEIGHTS.OIL,
      COPPER: ratios.COPPER * EQX_BASKET_WEIGHTS.COPPER,
      WHEAT: ratios.WHEAT * EQX_BASKET_WEIGHTS.WHEAT,
    };

    // Sum up category totals
    const currencyTotal = contributions.USD + contributions.EUR + contributions.CNY + 
                          contributions.JPY + contributions.GBP;
    const goldTotal = contributions.XAU;
    const commodityTotal = contributions.OIL + contributions.COPPER + contributions.WHEAT;

    // Total EQX value in USD
    const totalValue = currencyTotal + goldTotal + commodityTotal;

    return {
      value: totalValue,
      breakdown: {
        currencies: currencyTotal,
        gold: goldTotal,
        commodities: commodityTotal,
      },
      contributions,
      timestamp: Date.now(),
      cached: isBasketCacheValid(),
    };
  }

  /**
   * Convert USD price to EQX
   * 
   * If EQX basket is worth $1.05 USD, then:
   * - $1 USD = 1/1.05 = 0.952 EQX
   * - $100 USD = 100/1.05 = 95.24 EQX
   */
  async convertUsdToEqx(usdAmount: number, forceRefresh = false): Promise<number> {
    const eqxValue = await this.calculateEqxValue(forceRefresh);
    return usdAmount / eqxValue.value;
  }

  /**
   * Convert EQX price to USD
   * 
   * If EQX basket is worth $1.05 USD, then:
   * - 1 EQX = $1.05 USD
   * - 100 EQX = $105 USD
   */
  async convertEqxToUsd(eqxAmount: number, forceRefresh = false): Promise<number> {
    const eqxValue = await this.calculateEqxValue(forceRefresh);
    return eqxAmount * eqxValue.value;
  }

  /**
   * Get EQUA price in multiple formats (EQX, USD, local currency)
   * 
   * @param equaPriceUsd - The EQUA price in USD (from price calculator)
   * @param localCurrencyCode - The local currency code (e.g., 'INR', 'EUR')
   * @param localCurrencyRate - The exchange rate from USD to local currency
   */
  async getEquaPriceMultiFormat(
    equaPriceUsd: number,
    localCurrencyCode: string,
    localCurrencyRate: number,
    forceRefresh = false
  ): Promise<EquaPriceMultiFormat> {
    const eqxValue = await this.calculateEqxValue(forceRefresh);
    
    // Convert USD price to EQX
    const equaPriceEqx = equaPriceUsd / eqxValue.value;
    
    // Convert USD price to local currency
    const equaPriceLocal = equaPriceUsd * localCurrencyRate;

    return {
      eqx: equaPriceEqx,
      usd: equaPriceUsd,
      localCurrency: equaPriceLocal,
      localCurrencyCode,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the current EQX/USD rate
   */
  async getEqxUsdRate(forceRefresh = false): Promise<number> {
    const eqxValue = await this.calculateEqxValue(forceRefresh);
    return eqxValue.value;
  }

  /**
   * Check if the oracle is connected and working
   */
  async checkConnection(): Promise<{
    connected: boolean;
    pythAvailable: boolean;
    message: string;
  }> {
    try {
      const prices = await fetchAllPythPrices();
      const pythAvailable = Object.keys(prices).length > 0;
      
      return {
        connected: true,
        pythAvailable,
        message: pythAvailable 
          ? 'Pyth oracle connected successfully'
          : 'Connected, using fallback prices',
      };
    } catch (error) {
      return {
        connected: false,
        pythAvailable: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    basketCached: boolean;
    basketAge: number;
    ttl: number;
    individualPriceCount: number;
  } {
    return {
      basketCached: isBasketCacheValid(),
      basketAge: basketCache.timestamp > 0 ? Date.now() - basketCache.timestamp : -1,
      ttl: PRICE_CACHE_TTL_MS,
      individualPriceCount: priceCache.size,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let eqxOracleInstance: EqxOracleService | null = null;

/**
 * Get the singleton EQX Oracle Service instance
 */
export function getEqxOracleService(connection?: Connection): EqxOracleService {
  if (!eqxOracleInstance) {
    eqxOracleInstance = new EqxOracleService(connection);
  } else if (connection) {
    eqxOracleInstance.setConnection(connection);
  }
  return eqxOracleInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetEqxOracleService(): void {
  eqxOracleInstance = null;
  clearPriceCache();
}
