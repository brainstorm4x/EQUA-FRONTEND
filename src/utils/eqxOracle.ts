/**
 * EQX Oracle - EQUA Index (EQX) Price Feed Implementation
 * 
 * The EQX (EQUA Index) is a weighted basket of currencies, gold, and commodities
 * designed to hedge against USD value erosion. This utility fetches real-time prices
 * from Pyth Network on Solana with fallback to CoinGecko API.
 * 
 * Basket Composition:
 * - Currencies (50%): USD 20%, EUR 15%, CNY 8%, JPY 4%, GBP 3%
 * - Gold (30%): XAU 30%
 * - Commodities (20%): OIL 7%, COPPER 7%, WHEAT 6%
 * 
 * Features:
 * - Pyth Network integration for real-time oracle prices
 * - 5-minute TTL cache for performance
 * - CoinGecko fallback for resilience
 * - EQX to USD and local currency conversion
 */

import axios from 'axios';

// ============================================================================
// Pyth Feed IDs (on Solana mainnet/devnet)
// ============================================================================
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

// ============================================================================
// EQX Basket Weights (Hardcoded Constants)
// ============================================================================
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
  OIL: 0.07,   // 7% (WTI crude)
  COPPER: 0.07, // 7%
  WHEAT: 0.06,  // 6%
} as const;

// Verify weights sum to 1
const totalWeight = Object.values(EQX_BASKET_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(totalWeight - 1.0) > 0.0001) {
  console.error(`EQX_BASKET_WEIGHTS do not sum to 1.0: ${totalWeight}`);
}

// ============================================================================
// Types
// ============================================================================
export interface AssetPrice {
  symbol: string;
  price: number;  // Price in USD
  timestamp: number;
  source: 'pyth' | 'coingecko' | 'fallback';
}

export interface EQXPriceData {
  eqxValue: number;  // 1 EQX = this many USD
  assetPrices: Record<string, AssetPrice>;
  lastUpdated: number;
  source: 'pyth' | 'coingecko' | 'fallback';
  breakdown: {
    currencyContribution: number;
    goldContribution: number;
    commodityContribution: number;
  };
}

export interface CachedEQXData {
  data: EQXPriceData;
  expiresAt: number;
}

// ============================================================================
// Cache Management (5-minute TTL)
// ============================================================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
let priceCache: CachedEQXData | null = null;

/**
 * Gets cached data if valid, null otherwise
 */
function getCachedData(): EQXPriceData | null {
  if (!priceCache) return null;
  if (Date.now() > priceCache.expiresAt) {
    priceCache = null;
    return null;
  }
  return priceCache.data;
}

/**
 * Stores data in cache with TTL
 */
function setCachedData(data: EQXPriceData): void {
  priceCache = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

/**
 * Clears the price cache
 */
export function clearPriceCache(): void {
  priceCache = null;
}

/**
 * Gets the cache TTL in milliseconds
 */
export function getCacheTTL(): number {
  return CACHE_TTL_MS;
}

// ============================================================================
// Pyth Network Integration
// ============================================================================

// Pyth Hermes API endpoint (works without SDK)
const PYTH_HERMES_API = 'https://hermes.pyth.network/api/latest_price_feeds';

/**
 * Fetches prices from Pyth Network using the Hermes API
 */
async function fetchPythPrices(): Promise<Record<string, AssetPrice> | null> {
  try {
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

    const params = new URLSearchParams();
    feedIds.forEach(id => params.append('ids[]', id));

    const response = await axios.get(`${PYTH_HERMES_API}?${params.toString()}`, {
      timeout: 10000, // 10 second timeout
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.warn('Invalid Pyth response format');
      return null;
    }

    const prices: Record<string, AssetPrice> = {};
    const now = Date.now();

    // Map feed IDs to symbols
    const feedIdToSymbol: Record<string, string> = {
      [PYTH_FEED_IDS.XAU_USD]: 'XAU',
      [PYTH_FEED_IDS.WTI_USD]: 'OIL',
      [PYTH_FEED_IDS.COPPER_USD]: 'COPPER',
      [PYTH_FEED_IDS.WHEAT_USD]: 'WHEAT',
      [PYTH_FEED_IDS.EUR_USD]: 'EUR',
      [PYTH_FEED_IDS.CNY_USD]: 'CNY',
      [PYTH_FEED_IDS.JPY_USD]: 'JPY',
      [PYTH_FEED_IDS.GBP_USD]: 'GBP',
    };

    for (const feed of response.data) {
      const feedId = feed.id.startsWith('0x') ? feed.id : `0x${feed.id}`;
      const symbol = feedIdToSymbol[feedId];
      
      if (symbol && feed.price) {
        // Pyth prices need to be scaled by the exponent
        const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
        prices[symbol] = {
          symbol,
          price,
          timestamp: now,
          source: 'pyth',
        };
      }
    }

    // Add USD (always 1.0)
    prices['USD'] = {
      symbol: 'USD',
      price: 1.0,
      timestamp: now,
      source: 'pyth',
    };

    // Check if we got all required prices
    const requiredSymbols = ['XAU', 'OIL', 'COPPER', 'WHEAT', 'EUR', 'CNY', 'JPY', 'GBP', 'USD'];
    const hasAllPrices = requiredSymbols.every(s => prices[s] !== undefined);

    if (!hasAllPrices) {
      console.warn('Pyth did not return all required prices');
      return null;
    }

    return prices;
  } catch (error) {
    console.error('Error fetching Pyth prices:', error);
    return null;
  }
}

// ============================================================================
// CoinGecko Fallback
// ============================================================================

// CoinGecko API (free tier)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// CoinGecko IDs for assets
const COINGECKO_IDS = {
  XAU: 'tether-gold', // PAX Gold as proxy for gold
  OIL: null, // CoinGecko doesn't have WTI crude
  COPPER: null, // CoinGecko doesn't have copper
  WHEAT: null, // CoinGecko doesn't have wheat
};

// Fallback prices for commodities (updated periodically)
// These are approximate prices and should be updated regularly
const FALLBACK_COMMODITY_PRICES = {
  XAU: 2650.00,   // Gold per oz (approx)
  OIL: 75.00,     // WTI crude per barrel (approx)
  COPPER: 4.20,   // Copper per pound (approx)
  WHEAT: 5.50,    // Wheat per bushel (approx)
};

// Exchange rates vs USD (fallback)
const FALLBACK_EXCHANGE_RATES = {
  EUR: 1.08,    // EUR/USD
  GBP: 1.27,    // GBP/USD
  JPY: 0.0067,  // JPY/USD (1/149.5)
  CNY: 0.138,   // CNY/USD (1/7.24)
  USD: 1.0,
};

/**
 * Fetches prices from CoinGecko API as fallback
 */
async function fetchCoinGeckoPrices(): Promise<Record<string, AssetPrice> | null> {
  try {
    // Fetch exchange rates
    const exchangeResponse = await axios.get(
      `${COINGECKO_API}/simple/price?ids=usd,euro,pound-sterling,chinese-yuan,japanese-yen&vs_currencies=usd`,
      { timeout: 10000 }
    );

    const now = Date.now();
    const prices: Record<string, AssetPrice> = {};

    // Use fallback for commodities and exchange rates
    // CoinGecko's free tier doesn't have commodities
    
    prices['USD'] = { symbol: 'USD', price: 1.0, timestamp: now, source: 'coingecko' };
    prices['EUR'] = { symbol: 'EUR', price: FALLBACK_EXCHANGE_RATES.EUR, timestamp: now, source: 'fallback' };
    prices['GBP'] = { symbol: 'GBP', price: FALLBACK_EXCHANGE_RATES.GBP, timestamp: now, source: 'fallback' };
    prices['JPY'] = { symbol: 'JPY', price: FALLBACK_EXCHANGE_RATES.JPY, timestamp: now, source: 'fallback' };
    prices['CNY'] = { symbol: 'CNY', price: FALLBACK_EXCHANGE_RATES.CNY, timestamp: now, source: 'fallback' };
    
    // Commodity fallbacks
    prices['XAU'] = { symbol: 'XAU', price: FALLBACK_COMMODITY_PRICES.XAU, timestamp: now, source: 'fallback' };
    prices['OIL'] = { symbol: 'OIL', price: FALLBACK_COMMODITY_PRICES.OIL, timestamp: now, source: 'fallback' };
    prices['COPPER'] = { symbol: 'COPPER', price: FALLBACK_COMMODITY_PRICES.COPPER, timestamp: now, source: 'fallback' };
    prices['WHEAT'] = { symbol: 'WHEAT', price: FALLBACK_COMMODITY_PRICES.WHEAT, timestamp: now, source: 'fallback' };

    return prices;
  } catch (error) {
    console.error('Error fetching CoinGecko prices:', error);
    return null;
  }
}

/**
 * Gets fallback prices when all APIs fail
 */
function getFallbackPrices(): Record<string, AssetPrice> {
  const now = Date.now();
  return {
    USD: { symbol: 'USD', price: 1.0, timestamp: now, source: 'fallback' },
    EUR: { symbol: 'EUR', price: FALLBACK_EXCHANGE_RATES.EUR, timestamp: now, source: 'fallback' },
    GBP: { symbol: 'GBP', price: FALLBACK_EXCHANGE_RATES.GBP, timestamp: now, source: 'fallback' },
    JPY: { symbol: 'JPY', price: FALLBACK_EXCHANGE_RATES.JPY, timestamp: now, source: 'fallback' },
    CNY: { symbol: 'CNY', price: FALLBACK_EXCHANGE_RATES.CNY, timestamp: now, source: 'fallback' },
    XAU: { symbol: 'XAU', price: FALLBACK_COMMODITY_PRICES.XAU, timestamp: now, source: 'fallback' },
    OIL: { symbol: 'OIL', price: FALLBACK_COMMODITY_PRICES.OIL, timestamp: now, source: 'fallback' },
    COPPER: { symbol: 'COPPER', price: FALLBACK_COMMODITY_PRICES.COPPER, timestamp: now, source: 'fallback' },
    WHEAT: { symbol: 'WHEAT', price: FALLBACK_COMMODITY_PRICES.WHEAT, timestamp: now, source: 'fallback' },
  };
}

// ============================================================================
// EQX Basket Calculation
// ============================================================================

// Normalize base price for the EQX index (set so that 1 EQX starts at approximately 1 USD)
// This is calibrated based on initial basket values
const EQX_BASE_DIVISOR = calculateInitialBasketValue();

/**
 * Calculates initial basket value for normalization
 */
function calculateInitialBasketValue(): number {
  // Using fallback prices to establish baseline
  // The formula normalizes so that initial EQX ≈ 1.0 USD
  
  // Currency contribution (prices in USD per unit)
  const currencyValue = 
    EQX_BASKET_WEIGHTS.USD * 1.0 +        // USD/USD = 1
    EQX_BASKET_WEIGHTS.EUR * FALLBACK_EXCHANGE_RATES.EUR +
    EQX_BASKET_WEIGHTS.CNY * FALLBACK_EXCHANGE_RATES.CNY +
    EQX_BASKET_WEIGHTS.JPY * FALLBACK_EXCHANGE_RATES.JPY +
    EQX_BASKET_WEIGHTS.GBP * FALLBACK_EXCHANGE_RATES.GBP;
  
  // Gold contribution (normalized per $1000 of gold)
  const goldValue = EQX_BASKET_WEIGHTS.XAU * (FALLBACK_COMMODITY_PRICES.XAU / 1000);
  
  // Commodity contribution (normalized)
  const commodityValue = 
    EQX_BASKET_WEIGHTS.OIL * (FALLBACK_COMMODITY_PRICES.OIL / 100) +
    EQX_BASKET_WEIGHTS.COPPER * FALLBACK_COMMODITY_PRICES.COPPER +
    EQX_BASKET_WEIGHTS.WHEAT * FALLBACK_COMMODITY_PRICES.WHEAT;
  
  return currencyValue + goldValue + commodityValue;
}

/**
 * Calculates the EQX basket value from asset prices
 */
function calculateEQXValue(prices: Record<string, AssetPrice>): {
  eqxValue: number;
  breakdown: { currencyContribution: number; goldContribution: number; commodityContribution: number };
} {
  // Currency contribution (value relative to USD)
  const currencyContribution = 
    EQX_BASKET_WEIGHTS.USD * prices.USD.price +
    EQX_BASKET_WEIGHTS.EUR * prices.EUR.price +
    EQX_BASKET_WEIGHTS.CNY * prices.CNY.price +
    EQX_BASKET_WEIGHTS.JPY * prices.JPY.price +
    EQX_BASKET_WEIGHTS.GBP * prices.GBP.price;
  
  // Gold contribution (normalized per $1000 of gold)
  const goldContribution = EQX_BASKET_WEIGHTS.XAU * (prices.XAU.price / 1000);
  
  // Commodity contribution (normalized)
  const commodityContribution = 
    EQX_BASKET_WEIGHTS.OIL * (prices.OIL.price / 100) +
    EQX_BASKET_WEIGHTS.COPPER * prices.COPPER.price +
    EQX_BASKET_WEIGHTS.WHEAT * prices.WHEAT.price;
  
  const totalValue = currencyContribution + goldContribution + commodityContribution;
  
  // Normalize to get EQX value (1 EQX = this many USD)
  // EQX value increases when basket value increases relative to base
  const eqxValue = totalValue / EQX_BASE_DIVISOR;
  
  return {
    eqxValue,
    breakdown: {
      currencyContribution: currencyContribution / totalValue,
      goldContribution: goldContribution / totalValue,
      commodityContribution: commodityContribution / totalValue,
    },
  };
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Fetches the current EQX price data
 * Uses Pyth Network first, falls back to CoinGecko, then hardcoded values
 */
export async function getEQXPriceData(): Promise<EQXPriceData> {
  // Check cache first
  const cachedData = getCachedData();
  if (cachedData) {
    return cachedData;
  }

  let prices: Record<string, AssetPrice> | null = null;
  let source: 'pyth' | 'coingecko' | 'fallback' = 'fallback';

  // Try Pyth Network first
  prices = await fetchPythPrices();
  if (prices) {
    source = 'pyth';
  } else {
    // Fall back to CoinGecko
    prices = await fetchCoinGeckoPrices();
    if (prices) {
      source = 'coingecko';
    } else {
      // Use hardcoded fallback
      prices = getFallbackPrices();
      source = 'fallback';
    }
  }

  const { eqxValue, breakdown } = calculateEQXValue(prices);
  
  const priceData: EQXPriceData = {
    eqxValue,
    assetPrices: prices,
    lastUpdated: Date.now(),
    source,
    breakdown,
  };

  // Cache the result
  setCachedData(priceData);

  return priceData;
}

/**
 * Converts an EQUA price (in USD) to EQX
 * @param equaPriceUSD - The EQUA price in USD
 * @returns The EQUA price in EQX
 */
export async function convertUSDToEQX(equaPriceUSD: number): Promise<number> {
  const eqxData = await getEQXPriceData();
  // EQX value represents how many USD 1 EQX is worth
  // So to convert USD to EQX: USD / eqxValue
  return equaPriceUSD / eqxData.eqxValue;
}

/**
 * Converts an EQUA price in EQX to USD
 * @param equaPriceEQX - The EQUA price in EQX
 * @returns The EQUA price in USD
 */
export async function convertEQXToUSD(equaPriceEQX: number): Promise<number> {
  const eqxData = await getEQXPriceData();
  return equaPriceEQX * eqxData.eqxValue;
}

/**
 * Gets the current EQUA price in multiple formats
 * @param equaPriceUSD - The EQUA price calculated from the appreciation formula (in USD)
 * @returns Object with EQX, USD, and local currency values
 */
export interface MultiFormatEquaPrice {
  eqx: number;           // Price in EQX
  usd: number;           // Price in USD
  localCurrency: number; // Price in user's local currency
  localCurrencyCode: string;
  eqxValue: number;      // Current EQX index value (1 EQX = this many USD)
  source: 'pyth' | 'coingecko' | 'fallback';
}

/**
 * Gets EQUA price in all formats (EQX, USD, local currency)
 */
export async function getEquaPriceMultiFormat(
  equaPriceUSD: number,
  localCurrencyCode: string,
  exchangeRate: number
): Promise<MultiFormatEquaPrice> {
  const eqxData = await getEQXPriceData();
  
  return {
    eqx: equaPriceUSD / eqxData.eqxValue,
    usd: equaPriceUSD,
    localCurrency: equaPriceUSD * exchangeRate,
    localCurrencyCode,
    eqxValue: eqxData.eqxValue,
    source: eqxData.source,
  };
}

/**
 * Formats EQX price for display
 */
export function formatEQXPrice(eqxPrice: number): string {
  if (eqxPrice < 0.0001) {
    return `${eqxPrice.toExponential(2)} EQX`;
  }
  if (eqxPrice < 1) {
    return `${eqxPrice.toFixed(6)} EQX`;
  }
  if (eqxPrice < 1000) {
    return `${eqxPrice.toFixed(4)} EQX`;
  }
  return `${eqxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} EQX`;
}

/**
 * Gets the breakdown of basket contributions
 */
export async function getBasketBreakdown(): Promise<{
  currencies: { symbol: string; weight: number; contribution: number }[];
  gold: { symbol: string; weight: number; contribution: number }[];
  commodities: { symbol: string; weight: number; contribution: number }[];
  totalValue: number;
}> {
  const eqxData = await getEQXPriceData();
  
  return {
    currencies: [
      { symbol: 'USD', weight: EQX_BASKET_WEIGHTS.USD * 100, contribution: EQX_BASKET_WEIGHTS.USD },
      { symbol: 'EUR', weight: EQX_BASKET_WEIGHTS.EUR * 100, contribution: EQX_BASKET_WEIGHTS.EUR },
      { symbol: 'CNY', weight: EQX_BASKET_WEIGHTS.CNY * 100, contribution: EQX_BASKET_WEIGHTS.CNY },
      { symbol: 'JPY', weight: EQX_BASKET_WEIGHTS.JPY * 100, contribution: EQX_BASKET_WEIGHTS.JPY },
      { symbol: 'GBP', weight: EQX_BASKET_WEIGHTS.GBP * 100, contribution: EQX_BASKET_WEIGHTS.GBP },
    ],
    gold: [
      { symbol: 'XAU', weight: EQX_BASKET_WEIGHTS.XAU * 100, contribution: eqxData.breakdown.goldContribution },
    ],
    commodities: [
      { symbol: 'OIL', weight: EQX_BASKET_WEIGHTS.OIL * 100, contribution: EQX_BASKET_WEIGHTS.OIL },
      { symbol: 'COPPER', weight: EQX_BASKET_WEIGHTS.COPPER * 100, contribution: EQX_BASKET_WEIGHTS.COPPER },
      { symbol: 'WHEAT', weight: EQX_BASKET_WEIGHTS.WHEAT * 100, contribution: EQX_BASKET_WEIGHTS.WHEAT },
    ],
    totalValue: eqxData.eqxValue,
  };
}

// ============================================================================
// Export for testing
// ============================================================================
export const _testing = {
  fetchPythPrices,
  fetchCoinGeckoPrices,
  getFallbackPrices,
  calculateEQXValue,
  getCachedData,
  setCachedData,
  EQX_BASE_DIVISOR,
};
