/**
 * Multi-currency UNIYAA price display helper.
 *
 * Replaces the previous `getUniyaaPriceMultiFormat` in unxOracle.ts after
 * the UNX basket was removed (2026-06-01). UNIYAA is now priced in USD
 * directly by `UniyaaPriceCalculator.calculatePrice(totalTransactions)`;
 * this helper just adds an FX conversion for the user's local currency.
 *
 * FX rates still come from the off-chain `getFxRate()` (ExchangeRate-API
 * via the Netlify Function `get-fx-rates`). A future phase will replace
 * that with client-side Pyth VAA verification for trustless display.
 */

import { getFxRate } from './fxRateClient';

/** Multi-currency UNIYAA price data. */
export interface MultiFormatUniyaaPrice {
  /** UNIYAA price in USD (the authoritative number). */
  usd: number;
  /** UNIYAA price in the requested local currency. */
  localCurrency: number;
  /** ISO-4217 code of the local currency (e.g. 'INR'). */
  localCurrencyCode: string;
  /** FX rate used for the local-currency conversion (USD → local). */
  fxRate: number;
  /** Source of the FX rate (e.g. 'exchangerate-api', 'cache', 'fallback'). */
  fxSource?: string;
  /** Age of the FX rate in milliseconds. */
  fxAge?: number;
  /** True when the FX rate is older than the staleness threshold. */
  fxIsStale?: boolean;
}

/**
 * Convert a USD UNIYAA price into the requested local currency.
 *
 * USD requests short-circuit without an FX lookup. All other currencies
 * call `getFxRate()` and return a default 1:1 rate if the lookup fails
 * (matches the pre-2026-06-01 fallback behaviour so the UI never goes
 * blank on an FX outage).
 */
export async function getUniyaaPriceMultiFormat(
  uniyaaPriceUSD: number,
  localCurrencyCode: string,
): Promise<MultiFormatUniyaaPrice> {
  if (localCurrencyCode === 'USD') {
    return {
      usd: uniyaaPriceUSD,
      localCurrency: uniyaaPriceUSD,
      localCurrencyCode: 'USD',
      fxRate: 1,
      fxSource: 'static',
      fxAge: 0,
      fxIsStale: false,
    };
  }

  try {
    const fxData = await getFxRate(localCurrencyCode);
    return {
      usd: uniyaaPriceUSD,
      localCurrency: uniyaaPriceUSD * fxData.rate,
      localCurrencyCode,
      fxRate: fxData.rate,
      fxSource: fxData.source,
      fxAge: fxData.age,
      fxIsStale: fxData.isStale,
    };
  } catch (err) {
    console.warn(`FX lookup failed for ${localCurrencyCode}, defaulting to 1:1`, err);
    return {
      usd: uniyaaPriceUSD,
      localCurrency: uniyaaPriceUSD,
      localCurrencyCode,
      fxRate: 1,
      fxSource: 'fallback',
      fxAge: 0,
      fxIsStale: true,
    };
  }
}
