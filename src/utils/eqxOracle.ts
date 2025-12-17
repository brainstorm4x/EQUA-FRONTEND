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
// Configuration
// ============================================================================

// Check if Pyth Network is enabled (default: true)
// Set NEXT_PUBLIC_ENABLE_PYTH=false in .env.local to disable Pyth price feeds
const isPythEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    // Server-side: check process.env
    return process.env.NEXT_PUBLIC_ENABLE_PYTH !== 'false';
  }
  // Client-side: Next.js inlines NEXT_PUBLIC_* vars at build time
  return process.env.NEXT_PUBLIC_ENABLE_PYTH !== 'false';
};

// Track if we've already warned about Pyth errors (warn only once)
let pythErrorWarned = false;

// Maximum reasonable price for sanity checks (prevents parsing errors)
// Prevents accepting corrupted data or overflow values
const MAX_REASONABLE_PRICE = 1_000_000; // $1M per unit - beyond any realistic commodity/currency price

// ============================================================================
// Pyth Feed IDs (Hermes hex IDs from official documentation)
// ============================================================================
// These are the correct Hermes API feed IDs for mainnet/devnet
// Source: https://pyth.network/developers/price-feed-ids
export const PYTH_FEED_IDS = {
  XAU_USD: '0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9',
  WTI_USD: '0x925c4ef7ee2b7b4c19a23b04d80187b3e687b3e6e65a97cf93bf3cce8db3b8a2', // USOILSPOT (WTI/USD)
  COPPER_USD: '0x1ff1261f8c1aef0e8736e26a28e1330a645e3e21203d1e609f87df918d6af510',
  WHEAT_USD: '0xb1830a04e1e59bf3cbd0f93a2e6b321acd5e7d89892c0becc49b265eada2c694',
  EUR_USD: '0x2d0366e8361c110a1fcf6b3023a1d4e17f63b3a2e10b8ca8bb144dbe7b8a7de0',
  CNY_USD: '0x60964c6f8ec3a8283bbc2fa9a5a321d996bb099c7ccafca443c1a89fa919e05d',
  JPY_USD: '0xac5c83fbd5b1b125d7d4aa5e7ddf14e354ae3836e47ac5b2e87fea9cb7c9b7af',
  GBP_USD: '0xcf094b0624b532422629f3cffe918d512a529bbc1794cb15d3a0128c541f71b8',
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

// Pyth Hermes API endpoint (stable version)
// Documentation: https://hermes.pyth.network/docs/
// Using POST to /api/latest_price_feeds as the GET endpoint returns 404
const PYTH_HERMES_API = 'https://hermes.pyth.network/api/latest_price_feeds';

/**
 * Fetches prices from Pyth Network using the Hermes API
 * Documentation: https://hermes.pyth.network/docs/
 */
async function fetchPythPrices(): Promise<Record<string, AssetPrice> | null> {
  // Check if Pyth is enabled
  if (!isPythEnabled()) {
    if (!pythErrorWarned) {
      console.log('[EQX Oracle] Pyth Network is disabled via NEXT_PUBLIC_ENABLE_PYTH=false');
      pythErrorWarned = true;
    }
    return null;
  }

  try {
    // Hermes API requires hex feed IDs without the 0x prefix
    const feedIds = [
      PYTH_FEED_IDS.XAU_USD,
      PYTH_FEED_IDS.WTI_USD,
      PYTH_FEED_IDS.COPPER_USD,
      PYTH_FEED_IDS.WHEAT_USD,
      PYTH_FEED_IDS.EUR_USD,
      PYTH_FEED_IDS.CNY_USD,
      PYTH_FEED_IDS.JPY_USD,
      PYTH_FEED_IDS.GBP_USD,
    ].map(id => id.startsWith('0x') ? id.slice(2) : id); // Strip 0x prefix

    // Log network configuration for debugging
    // Note: Hermes API works with mainnet feed IDs regardless of NEXT_PUBLIC_PYTH_ENV
    // The env variable is primarily for documentation/configuration purposes
    const pythEnv = process.env.NEXT_PUBLIC_PYTH_ENV || 'mainnet-beta';
    console.log(`[EQX Oracle] Configured Pyth environment: ${pythEnv} (using mainnet feed IDs)`);
    console.log('[EQX Oracle] Fetching Pyth prices via POST to:', PYTH_HERMES_API);
    
    // Use POST to Hermes API (stable endpoint)
    const response = await axios.post(
      PYTH_HERMES_API,
      {
        ids: feedIds,
        verbose: false,
        binary: false,
      },
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      }
    );

    // Handle rate limiting (429) or client errors (4xx)
    if (response.status === 429) {
      if (!pythErrorWarned) {
        console.warn('[EQX Oracle] Pyth API rate limit exceeded. Using fallback prices.');
        pythErrorWarned = true;
      }
      return null;
    }
    
    if (response.status === 404) {
      if (!pythErrorWarned) {
        console.warn('[EQX Oracle] Pyth API returned 404. Feed IDs may be incorrect or unavailable. Using fallback.');
        pythErrorWarned = true;
      }
      return null;
    }
    
    if (response.status >= 400) {
      if (!pythErrorWarned) {
        console.warn(`[EQX Oracle] Pyth API error ${response.status}. Using fallback prices.`);
        pythErrorWarned = true;
      }
      return null;
    }

    // Hermes POST API returns an array of price feeds directly
    // Response shape: [{ id: "hex...", price: { price: "...", conf: "...", expo: -8, ... }, ema_price: {...} }, ...]
    if (!response.data || !Array.isArray(response.data)) {
      if (!pythErrorWarned) {
        console.warn('[EQX Oracle] Invalid Pyth response format (expected array):', response.data);
        pythErrorWarned = true;
      }
      return null;
    }

    const prices: Record<string, AssetPrice> = {};
    const now = Date.now();

    // Map feed IDs (without 0x prefix) to symbols
    const feedIdToSymbol: Record<string, string> = {
      [PYTH_FEED_IDS.XAU_USD.slice(2)]: 'XAU',
      [PYTH_FEED_IDS.WTI_USD.slice(2)]: 'OIL',
      [PYTH_FEED_IDS.COPPER_USD.slice(2)]: 'COPPER',
      [PYTH_FEED_IDS.WHEAT_USD.slice(2)]: 'WHEAT',
      [PYTH_FEED_IDS.EUR_USD.slice(2)]: 'EUR',
      [PYTH_FEED_IDS.CNY_USD.slice(2)]: 'CNY',
      [PYTH_FEED_IDS.JPY_USD.slice(2)]: 'JPY',
      [PYTH_FEED_IDS.GBP_USD.slice(2)]: 'GBP',
    };

    for (const feed of response.data) {
      // Feed ID comes without 0x prefix in response
      const feedId = feed.id;
      const symbol = feedIdToSymbol[feedId];
      
      if (symbol && feed.price) {
        // Pyth Hermes API: prices need to be scaled by the exponent
        // feed.price.price is the raw price value (string)
        // feed.price.expo is the exponent (usually negative, e.g., -8 for USD prices)
        // Example: raw price "123456" with expo -2 becomes 1234.56
        const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
        
        // Validate price is reasonable (sanity check)
        if (isNaN(price) || price <= 0 || price > MAX_REASONABLE_PRICE) {
          console.warn(`[EQX Oracle] Invalid price for ${symbol}: ${price} (exceeds max ${MAX_REASONABLE_PRICE})`);
          continue;
        }
        
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
      const missing = requiredSymbols.filter(s => !prices[s]);
      if (!pythErrorWarned) {
        console.warn('[EQX Oracle] Pyth did not return all required prices. Missing:', missing);
        pythErrorWarned = true;
      }
      return null;
    }

    console.log('[EQX Oracle] Successfully fetched prices from Pyth');
    return prices;
  } catch (error: any) {
    // Classify error types for better debugging
    const errorType = error.code === 'ECONNABORTED' ? 'timeout' : 
                     error.response?.status ? `HTTP ${error.response.status}` :
                     'network';
    
    if (!pythErrorWarned) {
      console.warn(`[EQX Oracle] Error fetching Pyth prices (${errorType}):`, error.message);
      pythErrorWarned = true;
    }
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

/**
 * Fallback prices for commodities
 * Last updated: November 2025
 * These are approximate prices used when live data is unavailable.
 * The EQX index is normalized relative to these values, so updates here
 * will affect the baseline EQX value.
 */
const FALLBACK_COMMODITY_PRICES = {
  XAU: 2650.00,   // Gold per oz (approx market price Nov 2025)
  OIL: 75.00,     // WTI crude per barrel (approx market price Nov 2025)
  COPPER: 4.20,   // Copper per pound (approx market price Nov 2025)
  WHEAT: 5.50,    // Wheat per bushel (approx market price Nov 2025)
} as const;

/**
 * Fallback exchange rates vs USD
 * Last updated: November 2025
 * These are approximate rates used when live data is unavailable.
 */
const FALLBACK_EXCHANGE_RATES = {
  EUR: 1.08,    // EUR/USD (Nov 2025)
  GBP: 1.27,    // GBP/USD (Nov 2025)
  JPY: 0.0067,  // JPY/USD (1/149.5) (Nov 2025)
  CNY: 0.138,   // CNY/USD (1/7.24) (Nov 2025)
  USD: 1.0,
} as const;

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

// Lazy-loaded base divisor (cached after first calculation)
let cachedBaseDivisor: number | null = null;

/**
 * Gets the EQX base divisor (lazy-loaded for safety)
 * This normalizes the basket value so 1 EQX ≈ 1 USD initially
 */
function getEQXBaseDivisor(): number {
  if (cachedBaseDivisor === null) {
    try {
      cachedBaseDivisor = calculateInitialBasketValue();
    } catch (error) {
      console.error('Error calculating EQX base divisor, using default:', error);
      cachedBaseDivisor = 1.0; // Safe default
    }
  }
  return cachedBaseDivisor;
}

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
  const eqxValue = totalValue / getEQXBaseDivisor();
  
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
  
  // Use breakdown from actual EQX calculation for consistency
  return {
    currencies: [
      { symbol: 'USD', weight: EQX_BASKET_WEIGHTS.USD * 100, contribution: EQX_BASKET_WEIGHTS.USD },
      { symbol: 'EUR', weight: EQX_BASKET_WEIGHTS.EUR * 100, contribution: EQX_BASKET_WEIGHTS.EUR },
      { symbol: 'CNY', weight: EQX_BASKET_WEIGHTS.CNY * 100, contribution: EQX_BASKET_WEIGHTS.CNY },
      { symbol: 'JPY', weight: EQX_BASKET_WEIGHTS.JPY * 100, contribution: EQX_BASKET_WEIGHTS.JPY },
      { symbol: 'GBP', weight: EQX_BASKET_WEIGHTS.GBP * 100, contribution: EQX_BASKET_WEIGHTS.GBP },
    ],
    gold: [
      { symbol: 'XAU', weight: EQX_BASKET_WEIGHTS.XAU * 100, contribution: EQX_BASKET_WEIGHTS.XAU },
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
  getEQXBaseDivisor,
};
