/**
 * EQX Oracle - EQUA Index (EQX) Price Feed Implementation
 * 
 * The EQX (EQUA Index) is a weighted basket of currencies, gold, and oil
 * designed to hedge against USD value erosion. This utility fetches prices
 * from on-chain oracle first, with Hermes API fallback.
 * 
 * Basket Composition (7 components):
 * - USDUSD: 23% (always 1.0)
 * - USDEUR: 17% (1 / EURUSD)
 * - USDCNY: 9% (USDCNH direct)
 * - USDJPY: 5% (USDJPY direct)
 * - USDGBP: 3% (1 / GBPUSD)
 * - XAUUSD: 35% (gold)
 * - OIL: 8% (USOILSPOT)
 * 
 * Features:
 * - On-chain EQX oracle as primary source
 * - Hermes API fallback when oracle is stale (>8 hours) or missing
 * - 5-minute TTL cache for performance
 * - Strict failure mode: throws if both sources fail
 */

import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/lib/constants';
import equaIdl from '../../public/idl/equa_token.json';

// ============================================================================
// Configuration
// ============================================================================

// EQX Oracle PDA seed (must match backend exactly)
const EQX_ORACLE_SEED = 'eqx-oracle';

// Staleness threshold: 8 hours in milliseconds
const STALENESS_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours

// On-chain oracle price is stored as u64 with 1e8 fixed-point precision
const ONCHAIN_PRICE_DECIMALS = 100_000_000; // 1e8

// Track if we've already warned about errors (warn only once per session)
let onchainErrorWarned = false;
let hermesErrorWarned = false;

// Maximum reasonable price for sanity checks (prevents parsing errors)
// Prevents accepting corrupted data or overflow values
const MAX_REASONABLE_PRICE = 1_000_000; // $1M per unit - beyond any realistic commodity/currency price

// ============================================================================
// Hermes Feed IDs (without 0x prefix as required by Hermes API)
// ============================================================================
// These are the correct Hermes API feed IDs for mainnet/devnet
// Source: https://pyth.network/developers/price-feed-ids
export const HERMES_FEED_IDS = {
  EURUSD: '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
  USDCNH: 'ef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52',
  USDJPY: '4a134870158ad1ea98bc4e4eb8e4ca824a32e69d4f3da380377c09936ba23954',
  GBPUSD: 'a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b',
  XAUUSD: '84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1',
  USOILSPOT: '925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6',
} as const;

// ============================================================================
// EQX Basket Weights (7-Component Basket)
// ============================================================================
export const EQX_BASKET_WEIGHTS = {
  // Currency basket (57% total)
  USDUSD: 0.23,  // 23% - Base USD
  USDEUR: 0.17,  // 17% - Euro (inverted from EURUSD)
  USDCNY: 0.09,  // 9% - Chinese Yuan
  USDJPY: 0.05,  // 5% - Japanese Yen
  USDGBP: 0.03,  // 3% - British Pound (inverted from GBPUSD)
  
  // Gold (35%)
  XAUUSD: 0.35,  // 35% - Gold
  
  // Oil (8%)
  OIL: 0.08,     // 8% - WTI Crude Oil
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
  source: 'onchain' | 'hermes' | 'fallback';
}

export interface EQXPriceData {
  eqxValue: number;  // 1 EQX = this many USD
  assetPrices: Record<string, AssetPrice>;
  lastUpdated: number;
  source: 'onchain' | 'hermes' | 'fallback';
  breakdown: {
    currencyContribution: number;
    goldContribution: number;
    oilContribution: number;
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
// On-Chain EQX Oracle Integration (Using Anchor/IDL)
// ============================================================================

/**
 * Derives the EQX Oracle PDA
 * Seeds: ["eqx-oracle"]
 */
function getEqxOraclePDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(EQX_ORACLE_SEED) as Buffer],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Reads the EQX Oracle account from on-chain using Anchor/IDL
 * Returns the EQX value in USD and last updated timestamp
 */
async function fetchOnChainEqxOracle(): Promise<{
  eqxValue: number;
  lastUpdated: number;
} | null> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const oraclePDA = getEqxOraclePDA();
    
    // Create a minimal provider for Anchor (no wallet needed for read-only)
    const provider = new AnchorProvider(
      connection,
      // @ts-ignore - We don't need a wallet for read-only operations
      { publicKey: PublicKey.default },
      { commitment: 'confirmed' }
    );
    
    // Create program instance with IDL
    const program = new Program(equaIdl as any, provider);
    
    // Fetch account using Anchor
    const oracleAccount = await program.account.eqxOracle.fetch(oraclePDA);
    
    // Extract price and lastUpdated from account
    // price is BN (u64), last_updated is BN (i64)
    const priceBN = oracleAccount.price;
    const lastUpdatedBN = oracleAccount.lastUpdated;
    
    // Convert BN to number
    const price = priceBN.toNumber();
    const lastUpdated = lastUpdatedBN.toNumber();
    
    // Convert price from fixed-point (1e8) to USD
    const eqxValue = price / ONCHAIN_PRICE_DECIMALS;
    
    // Validate price
    if (isNaN(eqxValue) || eqxValue <= 0 || eqxValue > MAX_REASONABLE_PRICE) {
      console.warn(`[EQX Oracle] Invalid on-chain price: ${eqxValue}`);
      return null;
    }
    
    // Validate timestamp
    if (isNaN(lastUpdated) || lastUpdated <= 0) {
      console.warn(`[EQX Oracle] Invalid on-chain timestamp: ${lastUpdated}`);
      return null;
    }
    
    console.log(`[EQX Oracle] On-chain oracle read: ${eqxValue} USD, updated at ${new Date(lastUpdated * 1000).toISOString()}`);
    
    return {
      eqxValue,
      lastUpdated, // Unix timestamp in seconds
    };
  } catch (error: any) {
    if (!onchainErrorWarned) {
      console.warn('[EQX Oracle] Error reading on-chain oracle:', error.message);
      onchainErrorWarned = true;
    }
    return null;
  }
}

/**
 * Checks if oracle data is stale (>8 hours old)
 */
function isOracleStale(lastUpdated: number): boolean {
  const now = Date.now();
  const lastUpdatedMs = lastUpdated * 1000; // Convert seconds to ms
  const age = now - lastUpdatedMs;
  return age > STALENESS_THRESHOLD_MS;
}

// ============================================================================
// Hermes API Fallback
// ============================================================================

// Hermes API endpoint
const HERMES_API = 'https://hermes.pyth.network/api/latest_price_feeds';

/**
 * Fetches prices from Hermes API and computes 7-component EQX basket
 */
async function fetchHermesPrices(): Promise<Record<string, AssetPrice> | null> {
  try {
    // Fetch 6 feeds from Hermes (excludes USDUSD which is always 1.0)
    const feedIds = [
      HERMES_FEED_IDS.EURUSD,
      HERMES_FEED_IDS.USDCNH,
      HERMES_FEED_IDS.USDJPY,
      HERMES_FEED_IDS.GBPUSD,
      HERMES_FEED_IDS.XAUUSD,
      HERMES_FEED_IDS.USOILSPOT,
    ];

    console.log('[EQX Oracle] Fetching Hermes prices via POST to:', HERMES_API);
    
    const response = await axios.post(
      HERMES_API,
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
        validateStatus: (status: number) => status < 500, // Don't throw on 4xx errors
      }
    );

    // Handle rate limiting (429) or client errors (4xx)
    if (response.status === 429) {
      if (!hermesErrorWarned) {
        console.warn('[EQX Oracle] Hermes API rate limit exceeded.');
        hermesErrorWarned = true;
      }
      return null;
    }
    
    if (response.status === 404) {
      if (!hermesErrorWarned) {
        console.warn('[EQX Oracle] Hermes API returned 404. Feed IDs may be incorrect.');
        hermesErrorWarned = true;
      }
      return null;
    }
    
    if (response.status >= 400) {
      if (!hermesErrorWarned) {
        console.warn(`[EQX Oracle] Hermes API error ${response.status}.`);
        hermesErrorWarned = true;
      }
      return null;
    }

    // Hermes POST API returns an array of price feeds directly
    if (!response.data || !Array.isArray(response.data)) {
      if (!hermesErrorWarned) {
        console.warn('[EQX Oracle] Invalid Hermes response format (expected array):', response.data);
        hermesErrorWarned = true;
      }
      return null;
    }

    const prices: Record<string, number> = {};
    const now = Date.now();

    // Map feed IDs to raw prices
    const feedIdToSymbol: Record<string, string> = {
      [HERMES_FEED_IDS.EURUSD]: 'EURUSD',
      [HERMES_FEED_IDS.USDCNH]: 'USDCNH',
      [HERMES_FEED_IDS.USDJPY]: 'USDJPY',
      [HERMES_FEED_IDS.GBPUSD]: 'GBPUSD',
      [HERMES_FEED_IDS.XAUUSD]: 'XAUUSD',
      [HERMES_FEED_IDS.USOILSPOT]: 'USOILSPOT',
    };

    for (const feed of response.data) {
      const feedId = feed.id;
      const symbol = feedIdToSymbol[feedId];
      
      if (symbol && feed.price) {
        // Hermes API: prices need to be scaled by the exponent
        const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
        
        // Validate price is reasonable (sanity check)
        if (isNaN(price) || price <= 0 || price > MAX_REASONABLE_PRICE) {
          console.warn(`[EQX Oracle] Invalid Hermes price for ${symbol}: ${price}`);
          continue;
        }
        
        prices[symbol] = price;
      }
    }

    // Check if we got all required prices
    const requiredSymbols = ['EURUSD', 'USDCNH', 'USDJPY', 'GBPUSD', 'XAUUSD', 'USOILSPOT'];
    const hasAllPrices = requiredSymbols.every(s => prices[s] !== undefined);

    if (!hasAllPrices) {
      const missing = requiredSymbols.filter(s => !prices[s]);
      if (!hermesErrorWarned) {
        console.warn('[EQX Oracle] Hermes did not return all required prices. Missing:', missing);
        hermesErrorWarned = true;
      }
      return null;
    }

    // Compute 7-component basket values (with inversions where needed)
    const assetPrices: Record<string, AssetPrice> = {};
    
    // 1. USDUSD = 1.0
    assetPrices['USDUSD'] = {
      symbol: 'USDUSD',
      price: 1.0,
      timestamp: now,
      source: 'hermes',
    };
    
    // 2. USDEUR = 1 / EURUSD
    assetPrices['USDEUR'] = {
      symbol: 'USDEUR',
      price: 1.0 / prices.EURUSD,
      timestamp: now,
      source: 'hermes',
    };
    
    // 3. USDCNY = USDCNH (direct)
    assetPrices['USDCNY'] = {
      symbol: 'USDCNY',
      price: prices.USDCNH,
      timestamp: now,
      source: 'hermes',
    };
    
    // 4. USDJPY = USDJPY (direct)
    assetPrices['USDJPY'] = {
      symbol: 'USDJPY',
      price: prices.USDJPY,
      timestamp: now,
      source: 'hermes',
    };
    
    // 5. USDGBP = 1 / GBPUSD
    assetPrices['USDGBP'] = {
      symbol: 'USDGBP',
      price: 1.0 / prices.GBPUSD,
      timestamp: now,
      source: 'hermes',
    };
    
    // 6. XAUUSD (direct)
    assetPrices['XAUUSD'] = {
      symbol: 'XAUUSD',
      price: prices.XAUUSD,
      timestamp: now,
      source: 'hermes',
    };
    
    // 7. OIL = USOILSPOT (direct)
    assetPrices['OIL'] = {
      symbol: 'OIL',
      price: prices.USOILSPOT,
      timestamp: now,
      source: 'hermes',
    };

    // Final validation: ensure all computed prices are finite and > 0
    const allValid = Object.values(assetPrices).every(
      ap => isFinite(ap.price) && ap.price > 0
    );
    
    if (!allValid) {
      console.warn('[EQX Oracle] Some Hermes-computed prices are invalid');
      return null;
    }

    console.log('[EQX Oracle] Successfully fetched and computed prices from Hermes');
    return assetPrices;
  } catch (error: any) {
    const errorType = error.code === 'ECONNABORTED' ? 'timeout' : 
                     error.response?.status ? `HTTP ${error.response.status}` :
                     'network';
    
    if (!hermesErrorWarned) {
      console.warn(`[EQX Oracle] Error fetching Hermes prices (${errorType}):`, error.message);
      hermesErrorWarned = true;
    }
    return null;
  }
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
 * Fallback exchange rates vs USD (used for basket normalization)
 * Last updated: December 2025
 */
const FALLBACK_EXCHANGE_RATES = {
  EURUSD: 1.08,    // EUR/USD
  GBPUSD: 1.27,    // GBP/USD
  USDJPY: 149.5,   // USD/JPY
  USDCNH: 7.24,    // USD/CNH (CNY offshore)
  USDUSD: 1.0,
} as const;

/**
 * Fallback commodity prices
 * Last updated: December 2025
 */
const FALLBACK_COMMODITY_PRICES = {
  XAUUSD: 2650.00,   // Gold per oz
  USOILSPOT: 75.00,  // WTI crude per barrel
} as const;

/**
 * Calculates initial basket value for normalization
 * Uses fallback prices to establish baseline
 */
function calculateInitialBasketValue(): number {
  // Currency contribution (7-component basket)
  const currencyValue = 
    EQX_BASKET_WEIGHTS.USDUSD * 1.0 +  // USD/USD = 1
    EQX_BASKET_WEIGHTS.USDEUR * (1.0 / FALLBACK_EXCHANGE_RATES.EURUSD) +
    EQX_BASKET_WEIGHTS.USDCNY * FALLBACK_EXCHANGE_RATES.USDCNH +
    EQX_BASKET_WEIGHTS.USDJPY * FALLBACK_EXCHANGE_RATES.USDJPY +
    EQX_BASKET_WEIGHTS.USDGBP * (1.0 / FALLBACK_EXCHANGE_RATES.GBPUSD);
  
  // Gold contribution (normalized per $1000 of gold)
  const goldValue = EQX_BASKET_WEIGHTS.XAUUSD * (FALLBACK_COMMODITY_PRICES.XAUUSD / 1000);
  
  // Oil contribution (normalized per $100 of oil)
  const oilValue = EQX_BASKET_WEIGHTS.OIL * (FALLBACK_COMMODITY_PRICES.USOILSPOT / 100);
  
  return currencyValue + goldValue + oilValue;
}

/**
 * Calculates EQX value from asset prices
 */
function calculateEQXValue(prices: Record<string, AssetPrice>): {
  eqxValue: number;
  breakdown: { currencyContribution: number; goldContribution: number; oilContribution: number };
} {
  // Currency contribution (value relative to USD)
  const currencyContribution = 
    EQX_BASKET_WEIGHTS.USDUSD * prices.USDUSD.price +
    EQX_BASKET_WEIGHTS.USDEUR * prices.USDEUR.price +
    EQX_BASKET_WEIGHTS.USDCNY * prices.USDCNY.price +
    EQX_BASKET_WEIGHTS.USDJPY * prices.USDJPY.price +
    EQX_BASKET_WEIGHTS.USDGBP * prices.USDGBP.price;
  
  // Gold contribution (normalized per $1000 of gold)
  const goldContribution = EQX_BASKET_WEIGHTS.XAUUSD * (prices.XAUUSD.price / 1000);
  
  // Oil contribution (normalized per $100 of oil)
  const oilContribution = EQX_BASKET_WEIGHTS.OIL * (prices.OIL.price / 100);
  
  const totalValue = currencyContribution + goldContribution + oilContribution;
  
  // Normalize to get EQX value (1 EQX = this many USD)
  // EQX value increases when basket value increases relative to base
  const eqxValue = totalValue / getEQXBaseDivisor();
  
  return {
    eqxValue,
    breakdown: {
      currencyContribution: currencyContribution / totalValue,
      goldContribution: goldContribution / totalValue,
      oilContribution: oilContribution / totalValue,
    },
  };
}

// ============================================================================
// Main EQX Price Fetching
// ============================================================================

/**
 * Fetches the current EQX price data
 * Primary: On-chain oracle (if fresh < 8 hours)
 * Fallback: Hermes API
 * Error: Throws if both fail
 */
export async function getEQXPriceData(): Promise<EQXPriceData> {
  // Check cache first
  const cachedData = getCachedData();
  if (cachedData) {
    return cachedData;
  }

  // Try on-chain oracle first
  try {
    const oracleData = await fetchOnChainEqxOracle();
    
    if (oracleData && !isOracleStale(oracleData.lastUpdated)) {
      // On-chain oracle is fresh - use it
      console.log('[EQX Oracle] Using on-chain oracle (fresh)');
      
      // Return as-is with source 'onchain'
      const priceData: EQXPriceData = {
        eqxValue: oracleData.eqxValue,
        assetPrices: {}, // On-chain oracle provides final EQX value only
        lastUpdated: oracleData.lastUpdated * 1000, // Convert to ms
        source: 'onchain',
        breakdown: {
          currencyContribution: 0.57, // Approximate based on weights
          goldContribution: 0.35,
          oilContribution: 0.08,
        },
      };
      
      // Cache the result
      setCachedData(priceData);
      return priceData;
    } else if (oracleData) {
      console.log(`[EQX Oracle] On-chain oracle is stale (>8 hours old), falling back to Hermes`);
    }
  } catch (error: any) {
    console.warn('[EQX Oracle] On-chain oracle read failed, falling back to Hermes:', error.message);
  }
  
  // Fall back to Hermes
  const assetPrices = await fetchHermesPrices();
  
  if (assetPrices) {
    console.log('[EQX Oracle] Using Hermes fallback');
    const { eqxValue, breakdown } = calculateEQXValue(assetPrices);
  
    const priceData: EQXPriceData = {
      eqxValue,
      assetPrices,
      lastUpdated: Date.now(),
      source: 'hermes',
      breakdown,
    };
    
    // Cache the result
    setCachedData(priceData);
    return priceData;
  }
  
  // Both sources failed - THROW ERROR (strict failure mode)
  throw new Error('EQX price fetch failed: both on-chain oracle and Hermes API unavailable');
}

// ============================================================================
// Currency Conversion Utilities
// ============================================================================

/**
 * Converts USD price to EQX amount
 */
export async function convertUSDToEQX(usdAmount: number): Promise<number> {
  const priceData = await getEQXPriceData();
  return usdAmount / priceData.eqxValue;
}

/**
 * Converts EQX amount to USD price
 */
export async function convertEQXToUSD(eqxAmount: number): Promise<number> {
  const priceData = await getEQXPriceData();
  return eqxAmount * priceData.eqxValue;
}

export interface MultiFormatEquaPrice {
  usd: number;               // Price in USD
  eqx: number;               // Price in EQX
  localCurrency: number; // Price in user's local currency
  localCurrencyCode: string;
  eqxValue: number;      // Current EQX index value (1 EQX = this many USD)
  source: 'onchain' | 'hermes' | 'fallback';
}

/**
 * Gets EQUA price in multiple formats (USD, EQX, local currency)
 */
export async function getEquaPriceMultiFormat(
  usdPrice: number,
  localCurrencyCode: string = 'USD',
  localCurrencyExchangeRate: number = 1.0
): Promise<MultiFormatEquaPrice> {
  const priceData = await getEQXPriceData();
  const eqxPrice = usdPrice / priceData.eqxValue;
  const localCurrencyPrice = usdPrice * localCurrencyExchangeRate;
  
  return {
    usd: usdPrice,
    eqx: eqxPrice,
    localCurrency: localCurrencyPrice,
    localCurrencyCode,
    eqxValue: priceData.eqxValue,
    source: priceData.source,
  };
}

/**
 * Formats EQX price for display
 */
export function formatEQXPrice(eqxPrice: number): string {
  return eqxPrice.toFixed(6);
}

/**
 * Gets detailed basket breakdown for UI display
 */
export async function getBasketBreakdown(): Promise<{
  currencies: { symbol: string; weight: number; contribution: number }[];
  gold: { symbol: string; weight: number; contribution: number }[];
  oil: { symbol: string; weight: number; contribution: number }[];
  totalValue: number;
}> {
  const eqxData = await getEQXPriceData();
  
  // Use breakdown from actual EQX calculation for consistency
  return {
    currencies: [
      { symbol: 'USDUSD', weight: EQX_BASKET_WEIGHTS.USDUSD * 100, contribution: EQX_BASKET_WEIGHTS.USDUSD },
      { symbol: 'USDEUR', weight: EQX_BASKET_WEIGHTS.USDEUR * 100, contribution: EQX_BASKET_WEIGHTS.USDEUR },
      { symbol: 'USDCNY', weight: EQX_BASKET_WEIGHTS.USDCNY * 100, contribution: EQX_BASKET_WEIGHTS.USDCNY },
      { symbol: 'USDJPY', weight: EQX_BASKET_WEIGHTS.USDJPY * 100, contribution: EQX_BASKET_WEIGHTS.USDJPY },
      { symbol: 'USDGBP', weight: EQX_BASKET_WEIGHTS.USDGBP * 100, contribution: EQX_BASKET_WEIGHTS.USDGBP },
    ],
    gold: [
      { symbol: 'XAUUSD', weight: EQX_BASKET_WEIGHTS.XAUUSD * 100, contribution: EQX_BASKET_WEIGHTS.XAUUSD },
    ],
    oil: [
      { symbol: 'OIL', weight: EQX_BASKET_WEIGHTS.OIL * 100, contribution: EQX_BASKET_WEIGHTS.OIL },
    ],
    totalValue: eqxData.eqxValue,
  };
}

// ============================================================================
// Export for testing
// ============================================================================
export const _testing = {
  fetchOnChainEqxOracle,
  fetchHermesPrices,
  calculateEQXValue,
  getCachedData,
  setCachedData,
  getEQXBaseDivisor,
  isOracleStale,
  getEqxOraclePDA,
};
