/**
 * Pyth Hermes API Integration
 *
 * Fetches real-time price data for UNX basket components from Pyth Network's
 * Hermes API. Returns per-component readings with freshness/quality status so
 * the writer can decide what to publish versus carry forward.
 *
 * Notes on stability rules:
 *  - `publish_time` older than MAX_FEED_AGE_SECONDS → component is treated as
 *    missing (Pyth has gone quiet for that feed).
 *  - `conf / |price|` > MAX_CONF_RATIO → component is treated as missing
 *    (Pyth is publishing but flagging the value as low-confidence).
 *  - HTTP failure / parse failure / NaN → component is treated as missing.
 *
 * FALLBACK_PRICES are retained as a *boot-only* last resort so the very first
 * snapshot (when Turso is empty) can write something — they are NEVER
 * silently substituted into a normal write. Use `bootFallbackComponents()`
 * explicitly when needed.
 */

const HERMES_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

/**
 * A Pyth feed is considered missing if its last publish is older than this.
 * Set to 30 min (raised from 10 min on 2026-06-01): crypto feeds republish
 * every second, but FX / metals / oil feeds can pause 20+ min on slow news
 * days even during market hours. 30 min lets us tolerate those normal pauses
 * without flipping legitimate feeds into the carry-forward path. Weekend
 * pauses (always >>30 min) still correctly trigger carry-forward.
 */
export const MAX_FEED_AGE_SECONDS = 1800;

/**
 * Maximum confidence-to-price ratio before we treat the reading as missing.
 * 5% is loose enough to admit normal commodities volatility but tight enough
 * to reject Pyth's "I'm not sure" wide-interval publishes.
 */
export const MAX_CONF_RATIO = 0.05;

/**
 * Verified Pyth Hermes Feed IDs (from Pyth Network documentation)
 * These are the ONLY correct feed IDs - do not modify without verification.
 *
 * XCU status (2026-06-01): Pyth has stopped publishing live values for the
 * Metal.XCU/USD spot copper feed (returns price=0, publish_time=0). The feed
 * is kept in this map and in COMPONENT_KEYS so the on-chain component-array
 * layout doesn't shift, but its basket weight in BASKET_COMPONENTS has been
 * set to 0. Every snapshot since 2026-05-23 lists XCUUSD in staleComponents
 * because the freshness gate rejects publish_time=0. That is expected and
 * does NOT make the snapshot a 'fallback' (see FALLBACK_WEIGHT_THRESHOLD in
 * update-unx-price.ts). Other spot metals on Pyth (XAL, XNI) are dead too;
 * XPT/XPD are stale (>24h). If/when Pyth restarts XCU publishing, restore
 * BASKET_COMPONENTS XCUUSD weight to 0.05 and drop XAG back to 0.05.
 */
const PYTH_PRICE_FEEDS = {
  XAUUSD:    '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2', // Metal.XAU/USD (Gold)
  XAGUSD:    '0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e', // Metal.XAG/USD (Silver)
  XCUUSD:    '0x636bedafa14a37912993f265eda22431a2be363ad41a10276424bbe1b7f508c4', // Metal.XCU/USD (Copper) — RETIRED 2026-05-23, see header
  EURUSD:    '0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b', // FX.EUR/USD
  USDCNH:    '0xeef52e09c878ad41f6a81803e3640fe04dceea727de894edd4ea117e2e332e66', // FX.USD/CNH (invert → CNH/USD)
  USDJPY:    '0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52', // FX.USD/JPY (invert → JPY/USD)
  GBPUSD:    '0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1', // FX.GBP/USD
  OILWTI:    '0x925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6', // Commodities.USOILSPOT (WTI)
  OILBRENT:  '0x27f0d5e09a830083e5491795cac9ca521399c8f7fd56240d09484b14e614d57a', // Commodities.UKOILSPOT (Brent)
};

/**
 * Boot-time fallback prices. Used ONLY when Turso has no prior snapshot to
 * carry forward (first-ever deploy). Never silently substituted otherwise.
 * All values in XXX/USD format (USD in denominator).
 */
export const FALLBACK_PRICES: ComponentPrices = {
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

export type ComponentKey = keyof ComponentPrices;

export type ComponentStatus = 'hermes' | 'missing';

/**
 * A single component reading from Hermes.
 *  - `status: 'hermes'` → value is a fresh, in-confidence price from the API.
 *  - `status: 'missing'` → caller must carry forward (or fall back to boot
 *    defaults if no prior data exists). `reason` explains why.
 */
export interface ComponentReading {
  status: ComponentStatus;
  /** Parsed XXX/USD price, or null when `status === 'missing'`. */
  value: number | null;
  /** Pyth `publish_time` for the feed (Unix ms), if available. */
  publishTimeMs: number | null;
  /** `conf / |price|` ratio reported by Pyth, if available. */
  confRatio: number | null;
  /** Free-form reason for missing readings; absent for hermes readings. */
  reason?: 'http_failure' | 'feed_not_in_response' | 'parse_error' | 'stale_publish' | 'low_confidence';
}

export type ComponentReadings = Record<ComponentKey, ComponentReading>;

/**
 * Fetch per-component readings from Pyth Hermes.
 *
 * On total HTTP/network failure every component is returned with
 * `status: 'missing'` and `reason: 'http_failure'`. On a successful response
 * each component is evaluated independently against the freshness and
 * confidence thresholds, so a partial Hermes outage produces a partial result.
 */
export async function fetchComponentReadings(): Promise<ComponentReadings> {
  let data: unknown;

  try {
    const feedIds = Object.values(PYTH_PRICE_FEEDS);
    const url = `${HERMES_API_URL}?${feedIds.map((id) => `ids[]=${id}`).join('&')}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Hermes API returned ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    console.warn('Pyth Hermes API request failed:', error);
    return allMissing('http_failure');
  }

  const usdReading: ComponentReading = {
    status: 'hermes',
    value: 1.0,
    publishTimeMs: Date.now(),
    confRatio: 0,
  };

  return {
    USDUSD:   usdReading,
    EURUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.EURUSD,   false),
    CNHUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.USDCNH,   true),  // USD/CNH → invert
    JPYUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.USDJPY,   true),  // USD/JPY → invert
    GBPUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.GBPUSD,   false),
    XAUUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.XAUUSD,   false),
    XAGUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.XAGUSD,   false),
    XCUUSD:   readPythComponent(data, PYTH_PRICE_FEEDS.XCUUSD,   false),
    OILWTI:   readPythComponent(data, PYTH_PRICE_FEEDS.OILWTI,   false),
    OILBRENT: readPythComponent(data, PYTH_PRICE_FEEDS.OILBRENT, false),
  };
}

/**
 * Build a fully-missing readings object with the given reason — used both
 * for total HTTP failure and as a starting shape for tests.
 */
function allMissing(reason: ComponentReading['reason']): ComponentReadings {
  const empty: ComponentReading = {
    status: 'missing',
    value: null,
    publishTimeMs: null,
    confRatio: null,
    reason,
  };
  return {
    USDUSD: { ...empty },
    EURUSD: { ...empty },
    CNHUSD: { ...empty },
    JPYUSD: { ...empty },
    GBPUSD: { ...empty },
    XAUUSD: { ...empty },
    XAGUSD: { ...empty },
    XCUUSD: { ...empty },
    OILWTI: { ...empty },
    OILBRENT: { ...empty },
  };
}

/**
 * Parse a single feed entry from the Hermes response with freshness checks.
 */
function readPythComponent(
  data: unknown,
  feedId: string,
  invert: boolean,
): ComponentReading {
  const normalizedFeedId = feedId.startsWith('0x') ? feedId.slice(2) : feedId;

  // Hermes v2 shape: { parsed: [{ id, price: { price, conf, expo, publish_time } }] }
  const parsed = (data as { parsed?: Array<Record<string, unknown>> } | undefined)?.parsed;
  const feed = parsed?.find((p) => {
    const idRaw = String(p['id'] ?? '');
    const responseId = idRaw.startsWith('0x') ? idRaw.slice(2) : idRaw;
    return responseId.toLowerCase() === normalizedFeedId.toLowerCase();
  });

  if (!feed) {
    console.warn(`Feed ${feedId} not found in Hermes response`);
    return {
      status: 'missing',
      value: null,
      publishTimeMs: null,
      confRatio: null,
      reason: 'feed_not_in_response',
    };
  }

  const priceObj = feed['price'] as Record<string, unknown> | undefined;
  const priceRaw = priceObj?.['price'];
  const expoRaw = priceObj?.['expo'];
  const confRaw = priceObj?.['conf'];
  const publishRaw = priceObj?.['publish_time'];

  const priceInt = typeof priceRaw === 'string' ? parseFloat(priceRaw) : Number(priceRaw);
  const expo = typeof expoRaw === 'string' ? parseInt(expoRaw, 10) : Number(expoRaw);
  const confInt = typeof confRaw === 'string' ? parseFloat(confRaw) : Number(confRaw);
  const publishSec =
    typeof publishRaw === 'string' ? parseInt(publishRaw, 10) : Number(publishRaw);

  if (!Number.isFinite(priceInt) || !Number.isFinite(expo)) {
    console.warn(`Invalid price data for feed ${feedId}`);
    return {
      status: 'missing',
      value: null,
      publishTimeMs: null,
      confRatio: null,
      reason: 'parse_error',
    };
  }

  const scale = Math.pow(10, expo);
  let actualPrice = priceInt * scale;
  const actualConf = Number.isFinite(confInt) ? Math.abs(confInt) * scale : null;

  // Confidence ratio is evaluated on the raw quote (before inversion) — the
  // ratio is invariant under inversion since both numerator and denominator
  // scale together.
  const confRatio =
    actualConf != null && actualPrice !== 0 ? actualConf / Math.abs(actualPrice) : null;

  const publishTimeMs = Number.isFinite(publishSec) ? publishSec * 1000 : null;

  if (invert && actualPrice !== 0) {
    actualPrice = 1.0 / actualPrice;
  }

  // Freshness gate.
  if (publishTimeMs != null) {
    const ageSec = (Date.now() - publishTimeMs) / 1000;
    if (ageSec > MAX_FEED_AGE_SECONDS) {
      console.warn(`Feed ${feedId} is stale: age=${ageSec.toFixed(0)}s`);
      return {
        status: 'missing',
        value: null,
        publishTimeMs,
        confRatio,
        reason: 'stale_publish',
      };
    }
  }

  // Confidence gate.
  if (confRatio != null && confRatio > MAX_CONF_RATIO) {
    console.warn(
      `Feed ${feedId} confidence too wide: conf/price=${(confRatio * 100).toFixed(2)}%`,
    );
    return {
      status: 'missing',
      value: null,
      publishTimeMs,
      confRatio,
      reason: 'low_confidence',
    };
  }

  return {
    status: 'hermes',
    value: actualPrice,
    publishTimeMs,
    confRatio,
  };
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

export const COMPONENT_KEYS: readonly ComponentKey[] = [
  'USDUSD', 'EURUSD', 'CNHUSD', 'JPYUSD', 'GBPUSD',
  'XAUUSD', 'XAGUSD', 'XCUUSD', 'OILWTI', 'OILBRENT',
];
