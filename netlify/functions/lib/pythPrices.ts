/**
 * Pyth Hermes API Integration
 * 
 * Fetches real-time price data for EQX basket components from Pyth Network's Hermes API.
 * Provides fallback to hardcoded prices if API fails.
 * 
 * Note: This uses Pyth Hermes mainnet API which provides price data for all networks.
 * The fetched prices are network-agnostic.
 * 
 * Component mapping:
 * - USDUSD: 1.0 (fixed)
 * - EURUSD: Inverted from USD/JPY
 * - CNHUSD: Inverted from USD/CNH
 * - JPYUSD: Inverted from USD/JPY
 * - GBPUSD: Direct from GBP/USD
 * - XAUUSD: Direct from XAU/USD (Gold)
 * - OIL: Direct from US Oil Spot
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Pyth Hermes API endpoint
 * Note: Hermes API is network-agnostic and provides prices for all networks
 */
const HERMES_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

/**
 * Verified Pyth Hermes Feed IDs
 * Source: brainstorm4x/EQUA/scripts/update-eqx-price.ts
 */
const HERMES_FEED_IDS = {
  XAUUSD: '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
  USDJPY: 'ef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52',
  USDCNH: 'eef52e09c878ad41f6a81803e3640fe04dceea727de894edd4ea117e2e332e66',
  EURUSD: 'a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b',
  GBPUSD: '84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1',
  USOILSPOT: '925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6',
};

/**
 * Fallback prices (used when Hermes API fails)
 * Updated: 2026-01-08 (example values)
 */
const FALLBACK_PRICES = {
  USDUSD: 1.0,
  EURUSD: 1.10,
  CNHUSD: 0.14,
  JPYUSD: 0.0067,
  GBPUSD: 1.27,
  XAUUSD: 2650.00,
  OIL: 73.50,
};

// ============================================================================
// Types
// ============================================================================

/**
 * Pyth Hermes API response structure
 */
interface HermesResponse {
  parsed: Array<{
    id: string;
    price: {
      price: string;      // Price as string (with exponent)
      conf: string;       // Confidence interval
      expo: number;       // Exponent (e.g., -8 means divide by 10^8)
      publish_time: number;
    };
  }>;
}

/**
 * Component prices structure
 */
export interface ComponentPrices {
  USDUSD: number;
  EURUSD: number;
  CNHUSD: number;
  JPYUSD: number;
  GBPUSD: number;
  XAUUSD: number;
  OIL: number;
}

// ============================================================================
// Pyth Hermes API Functions
// ============================================================================

/**
 * Fetch prices from Pyth Hermes API
 * 
 * @returns Component prices or null if fetch fails
 */
async function fetchFromHermes(): Promise<ComponentPrices | null> {
  try {
    // Build query string with URLSearchParams for cleaner parameter handling
    const params = new URLSearchParams();
    params.append('ids[]', HERMES_FEED_IDS.XAUUSD);
    params.append('ids[]', HERMES_FEED_IDS.USDJPY);
    params.append('ids[]', HERMES_FEED_IDS.USDCNH);
    params.append('ids[]', HERMES_FEED_IDS.EURUSD);
    params.append('ids[]', HERMES_FEED_IDS.GBPUSD);
    params.append('ids[]', HERMES_FEED_IDS.USOILSPOT);
    
    const url = `${HERMES_API_URL}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Hermes API fetch failed: ${response.status}`);
      return null;
    }
    
    const data: HermesResponse = await response.json();
    
    // Parse prices from response
    const prices: Record<string, number> = {};
    
    for (const item of data.parsed) {
      const price = parseFloat(item.price.price);
      const expo = item.price.expo;
      const normalizedPrice = price * Math.pow(10, expo);
      
      // Map feed ID to component
      if (item.id === HERMES_FEED_IDS.XAUUSD) {
        prices.XAUUSD = normalizedPrice;
      } else if (item.id === HERMES_FEED_IDS.USDJPY) {
        prices.USDJPY = normalizedPrice;
      } else if (item.id === HERMES_FEED_IDS.USDCNH) {
        prices.USDCNH = normalizedPrice;
      } else if (item.id === HERMES_FEED_IDS.EURUSD) {
        prices.EURUSD = normalizedPrice;
      } else if (item.id === HERMES_FEED_IDS.GBPUSD) {
        prices.GBPUSD = normalizedPrice;
      } else if (item.id === HERMES_FEED_IDS.USOILSPOT) {
        prices.USOILSPOT = normalizedPrice;
      }
    }
    
    // Validate we got all required prices
    if (!prices.XAUUSD || !prices.USDJPY || !prices.USDCNH || 
        !prices.EURUSD || !prices.GBPUSD || !prices.USOILSPOT) {
      console.warn('Incomplete price data from Hermes API');
      return null;
    }
    
    // Calculate component prices
    return {
      USDUSD: 1.0,                           // Fixed
      EURUSD: prices.EURUSD,                 // Direct
      CNHUSD: 1 / prices.USDCNH,             // Inverted
      JPYUSD: 1 / prices.USDJPY,             // Inverted
      GBPUSD: prices.GBPUSD,                 // Direct
      XAUUSD: prices.XAUUSD,                 // Direct
      OIL: prices.USOILSPOT,                 // Direct
    };
  } catch (error) {
    console.error('Error fetching from Hermes API:', error);
    return null;
  }
}

// ============================================================================
// Main API Function
// ============================================================================

/**
 * Fetch component prices with fallback
 * 
 * Tries Pyth Hermes API first, falls back to hardcoded prices if API fails
 * 
 * @returns Component prices and source indicator
 */
export async function fetchComponentPrices(): Promise<{
  prices: ComponentPrices;
  source: 'hermes' | 'fallback';
}> {
  // Try Hermes API
  const hermesPrices = await fetchFromHermes();
  
  if (hermesPrices) {
    console.log('Successfully fetched component prices from Hermes API');
    return {
      prices: hermesPrices,
      source: 'hermes',
    };
  }
  
  // Fallback to hardcoded prices
  console.warn('Using fallback component prices (Hermes API unavailable)');
  return {
    prices: FALLBACK_PRICES,
    source: 'fallback',
  };
}

/**
 * Convert component prices to array format
 * 
 * @param prices - Component prices object
 * @returns Array of 7 component prices [USDUSD, EURUSD, CNHUSD, JPYUSD, GBPUSD, XAUUSD, OIL]
 */
export function componentPricesToArray(prices: ComponentPrices): number[] {
  return [
    prices.USDUSD,
    prices.EURUSD,
    prices.CNHUSD,
    prices.JPYUSD,
    prices.GBPUSD,
    prices.XAUUSD,
    prices.OIL,
  ];
}
