/**
 * Pyth Hermes API Integration
 * 
 * Fetches real-time price data for EQX basket components from Pyth Network's Hermes API.
 * Provides fallback to hardcoded prices if API fails.
 */

const HERMES_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

/**
 * Verified Pyth Hermes Feed IDs (from Pyth Network documentation)
 * These are the ONLY correct feed IDs - do not modify without verification
 */
const PYTH_PRICE_FEEDS = {
  XAUUSD: '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',  // Metal.XAU/USD (Gold)
  EURUSD: '0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b',  // FX.EUR/USD (NEEDS INVERSION)
  USDCNH: '0xeef52e09c878ad41f6a81803e3640fe04dceea727de894edd4ea117e2e332e66',  // FX.USD/CNH (Yuan)
  USDJPY: '0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52',  // FX.USD/JPY (Yen)
  GBPUSD: '0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1',  // FX.GBP/USD (NEEDS INVERSION)
  OIL: '0x925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6',     // Commodities.USOILSPOT (WTI Crude)
};

/**
 * Fallback prices (used if Hermes API fails)
 * These are reasonable market values as of Jan 2025
 */
const FALLBACK_PRICES = {
  USDUSD: 1.0,        // Always 1.0
  USDEUR: 0.91,       // Inverted from EUR/USD ≈ 1.10
  USDCNY: 0.14,       // USD in Chinese Yuan
  USDJPY: 0.0067,     // USD in Japanese Yen
  USDGBP: 0.79,       // Inverted from GBP/USD ≈ 1.27
  XAUUSD: 2650.0,     // Gold spot price ($/oz)
  OIL: 73.5,          // WTI Crude ($/barrel)
};

/**
 * Component prices structure
 */
export interface ComponentPrices {
  USDUSD: number;
  USDEUR: number;
  USDCNY: number;
  USDJPY: number;
  USDGBP: number;
  XAUUSD: number;
  OIL: number;
}

/**
 * Fetch component prices from Pyth Hermes API
 * 
 * @returns Component prices and source ('hermes' or 'fallback')
 */
export async function fetchComponentPrices(): Promise<{
  prices: ComponentPrices;
  source: 'hermes' | 'fallback';
}> {
  try {
    // Build Hermes API URL with all feed IDs
    const feedIds = Object.values(PYTH_PRICE_FEEDS);
    const url = `${HERMES_API_URL}?${feedIds.map(id => `ids[]=${id}`).join('&')}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Hermes API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse prices from Hermes response
    // Hermes returns: { parsed: [{ id, price: { price, expo, ... } }] }
    const prices: ComponentPrices = {
      USDUSD: 1.0, // Always 1.0
      USDEUR: parsePythPrice(data, PYTH_PRICE_FEEDS.EURUSD, FALLBACK_PRICES.USDEUR, true),  // INVERT
      USDCNY: parsePythPrice(data, PYTH_PRICE_FEEDS.USDCNH, FALLBACK_PRICES.USDCNY, false),
      USDJPY: parsePythPrice(data, PYTH_PRICE_FEEDS.USDJPY, FALLBACK_PRICES.USDJPY, false),
      USDGBP: parsePythPrice(data, PYTH_PRICE_FEEDS.GBPUSD, FALLBACK_PRICES.USDGBP, true),  // INVERT
      XAUUSD: parsePythPrice(data, PYTH_PRICE_FEEDS.XAUUSD, FALLBACK_PRICES.XAUUSD, false),
      OIL: parsePythPrice(data, PYTH_PRICE_FEEDS.OIL, FALLBACK_PRICES.OIL, false),
    };
    
    return { prices, source: 'hermes' };
  } catch (error) {
    console.warn('Pyth Hermes API failed, using fallback prices:', error);
    return { prices: FALLBACK_PRICES, source: 'fallback' };
  }
}

/**
 * Parse a single price from Pyth Hermes response
 * 
 * @param data - Hermes API response
 * @param feedId - Pyth feed ID to look up
 * @param fallback - Fallback value if parsing fails
 * @param invert - Whether to invert the price (for indirect quotes like EUR/USD → USD/EUR)
 * @returns Parsed price
 */
function parsePythPrice(
  data: any,
  feedId: string,
  fallback: number,
  invert: boolean
): number {
  try {
    // Find the feed in the response
    const feed = data.parsed?.find((p: any) => p.id === feedId);
    if (!feed) {
      console.warn(`Feed ${feedId} not found in Hermes response, using fallback`);
      return fallback;
    }
    
    // Extract price and exponent
    // Pyth uses fixed-point: actual_price = price * 10^expo
    const price = parseFloat(feed.price.price);
    const expo = parseInt(feed.price.expo);
    
    if (isNaN(price) || isNaN(expo)) {
      console.warn(`Invalid price data for feed ${feedId}, using fallback`);
      return fallback;
    }
    
    // Calculate actual price
    let actualPrice = price * Math.pow(10, expo);
    
    // Invert if needed (EUR/USD → USD/EUR)
    if (invert && actualPrice !== 0) {
      actualPrice = 1.0 / actualPrice;
    }
    
    return actualPrice;
  } catch (error) {
    console.warn(`Error parsing price for feed ${feedId}:`, error);
    return fallback;
  }
}

/**
 * Convert component prices object to array
 * Order matches BASKET_COMPONENTS from eqxOracle.ts
 * 
 * @param prices - Component prices object
 * @returns Array of 7 prices [USDUSD, USDEUR, USDCNY, USDJPY, USDGBP, XAUUSD, OIL]
 */
export function componentPricesToArray(prices: ComponentPrices): number[] {
  return [
    prices.USDUSD,  // Index 0: USD/USD
    prices.USDEUR,  // Index 1: USD/EUR
    prices.USDCNY,  // Index 2: USD/CNY
    prices.USDJPY,  // Index 3: USD/JPY
    prices.USDGBP,  // Index 4: USD/GBP
    prices.XAUUSD,  // Index 5: XAU/USD (Gold)
    prices.OIL,     // Index 6: OIL
  ];
}
