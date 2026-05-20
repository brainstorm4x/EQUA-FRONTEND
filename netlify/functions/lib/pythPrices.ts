/**
 * Pyth Hermes API Integration
 * 
 * Fetches real-time price data for UNX basket components from Pyth Network's Hermes API.
 * Provides fallback to hardcoded prices if API fails.
 */

const HERMES_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

/**
 * Verified Pyth Hermes Feed IDs (from Pyth Network documentation)
 * These are the ONLY correct feed IDs - do not modify without verification
 */
const PYTH_PRICE_FEEDS = {
  XAUUSD:    '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2', // Metal.XAU/USD (Gold)
  XAGUSD:    '0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e', // Metal.XAG/USD (Silver)
  XCUUSD:    '0x636bedafa14a37912993f265eda22431a2be363ad41a10276424bbe1b7f508c4', // Metal.XCU/USD (Copper, spot)
  EURUSD:    '0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b', // FX.EUR/USD
  USDCNH:    '0xeef52e09c878ad41f6a81803e3640fe04dceea727de894edd4ea117e2e332e66', // FX.USD/CNH (invert → CNH/USD)
  USDJPY:    '0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52', // FX.USD/JPY (invert → JPY/USD)
  GBPUSD:    '0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1', // FX.GBP/USD
  OILWTI:    '0x925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6', // Commodities.USOILSPOT (WTI)
  OILBRENT:  '0x27f0d5e09a830083e5491795cac9ca521399c8f7fd56240d09484b14e614d57a', // Commodities.UKOILSPOT (Brent)
};

/**
 * Fallback prices (used if Hermes API fails)
 * All values in XXX/USD format (USD in denominator)
 */
const FALLBACK_PRICES = {
  USDUSD:   1.0,    // Always 1.0
  EURUSD:   1.087,  // EUR/USD
  CNHUSD:   0.14,   // CNH/USD (inverted from USD/CNH ≈ 7.14)
  JPYUSD:   0.0066, // JPY/USD (inverted from USD/JPY ≈ 151)
  GBPUSD:   1.27,   // GBP/USD
  XAUUSD:   2900.0, // Gold spot ($/oz)
  XAGUSD:   30.0,   // Silver spot ($/oz)
  XCUUSD:   4.20,   // Copper spot ($/lb)
  OILWTI:   68.5,   // WTI Crude ($/barrel)
  OILBRENT: 72.0,   // Brent Crude ($/barrel)
};

/**
 * Component prices structure
 * All values in XXX/USD format (USD in denominator — "how many USD to buy 1 unit of X")
 */
export interface ComponentPrices {
  USDUSD: number;
  EURUSD: number;
  CNHUSD: number;
  JPYUSD: number;
  GBPUSD: number;
  XAUUSD: number;
  XAGUSD: number;
  XCUUSD: number;
  OILWTI: number;
  OILBRENT: number;
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
    // All prices stored in XXX/USD format (USD in denominator)
    const prices: ComponentPrices = {
      USDUSD:   1.0, // Always 1.0
      EURUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.EURUSD,   FALLBACK_PRICES.EURUSD,   false),
      CNHUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.USDCNH,   FALLBACK_PRICES.CNHUSD,   true),  // USD/CNH → invert
      JPYUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.USDJPY,   FALLBACK_PRICES.JPYUSD,   true),  // USD/JPY → invert
      GBPUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.GBPUSD,   FALLBACK_PRICES.GBPUSD,   false),
      XAUUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.XAUUSD,   FALLBACK_PRICES.XAUUSD,   false),
      XAGUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.XAGUSD,   FALLBACK_PRICES.XAGUSD,   false),
      XCUUSD:   parsePythPrice(data, PYTH_PRICE_FEEDS.XCUUSD,   FALLBACK_PRICES.XCUUSD,   false),
      OILWTI:   parsePythPrice(data, PYTH_PRICE_FEEDS.OILWTI,   FALLBACK_PRICES.OILWTI,   false),
      OILBRENT: parsePythPrice(data, PYTH_PRICE_FEEDS.OILBRENT, FALLBACK_PRICES.OILBRENT, false),
    };

    // Warn if all feeds returned fallback values despite a successful HTTP response
    const livePriceCount = [
      prices.EURUSD   !== FALLBACK_PRICES.EURUSD,
      prices.CNHUSD   !== FALLBACK_PRICES.CNHUSD,
      prices.JPYUSD   !== FALLBACK_PRICES.JPYUSD,
      prices.GBPUSD   !== FALLBACK_PRICES.GBPUSD,
      prices.XAUUSD   !== FALLBACK_PRICES.XAUUSD,
      prices.XAGUSD   !== FALLBACK_PRICES.XAGUSD,
      prices.XCUUSD   !== FALLBACK_PRICES.XCUUSD,
      prices.OILWTI   !== FALLBACK_PRICES.OILWTI,
      prices.OILBRENT !== FALLBACK_PRICES.OILBRENT,
    ].filter(Boolean).length;

    const totalFeeds = Object.keys(PYTH_PRICE_FEEDS).length;
    if (livePriceCount === 0) {
      console.warn(
        'All Hermes feeds returned fallback values — check feed IDs or Hermes API response shape. ' +
        `Response top-level keys: [${Object.keys(data).join(', ')}]`
      );
    } else {
      console.log(`✓ Fetched ${livePriceCount}/${totalFeeds} live prices from Hermes`);
    }

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
    // Hermes v2 returns IDs without '0x' prefix; our constants include it — normalise both sides
    const normalizedFeedId = feedId.startsWith('0x') ? feedId.slice(2) : feedId;

    const feed = data.parsed?.find((p: any) => {
      const responseId = p.id.startsWith('0x') ? p.id.slice(2) : p.id;
      return responseId.toLowerCase() === normalizedFeedId.toLowerCase();
    });
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
 * Order matches BASKET_COMPONENTS from unxOracle.ts
 * All values in XXX/USD format (USD in denominator)
 *
 * @param prices - Component prices object
 * @returns Array of 10 prices
 *   [USDUSD, EURUSD, CNHUSD, JPYUSD, GBPUSD, XAUUSD, XAGUSD, XCUUSD, OILWTI, OILBRENT]
 */
export function componentPricesToArray(prices: ComponentPrices): number[] {
  return [
    prices.USDUSD,   // [0] USD/USD
    prices.EURUSD,   // [1] EUR/USD
    prices.CNHUSD,   // [2] CNH/USD
    prices.JPYUSD,   // [3] JPY/USD
    prices.GBPUSD,   // [4] GBP/USD
    prices.XAUUSD,   // [5] XAU/USD (Gold)
    prices.XAGUSD,   // [6] XAG/USD (Silver)
    prices.XCUUSD,   // [7] XCU/USD (Copper)
    prices.OILWTI,   // [8] OIL_WTI
    prices.OILBRENT, // [9] OIL_BRENT
  ];
}
