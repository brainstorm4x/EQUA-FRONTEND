/**
 * Local Currency Utilities
 * 
 * Provides utilities for detecting user's local currency based on browser locale
 * and formatting prices in local currencies.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // Rate relative to USD
}

// Default exchange rates (fallback if API fails)
// Note: These are approximate rates for display purposes only.
// For actual transactions, always use real-time exchange rates.
export const DEFAULT_RATES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', rate: 1 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79 },
  JPY: { code: 'JPY', symbol: '¥', rate: 149.5 },
  INR: { code: 'INR', symbol: '₹', rate: 83.5 },
  CNY: { code: 'CNY', symbol: '¥', rate: 7.24 },
  KRW: { code: 'KRW', symbol: '₩', rate: 1320 },
  BRL: { code: 'BRL', symbol: 'R$', rate: 4.97 },
  MXN: { code: 'MXN', symbol: '$', rate: 17.15 },
  AUD: { code: 'AUD', symbol: 'A$', rate: 1.53 },
  CAD: { code: 'CAD', symbol: 'C$', rate: 1.36 },
  CHF: { code: 'CHF', symbol: 'CHF', rate: 0.88 },
  NGN: { code: 'NGN', symbol: '₦', rate: 1550 },
  ZAR: { code: 'ZAR', symbol: 'R', rate: 18.5 },
  AED: { code: 'AED', symbol: 'د.إ', rate: 3.67 },
  SGD: { code: 'SGD', symbol: 'S$', rate: 1.34 },
  HKD: { code: 'HKD', symbol: 'HK$', rate: 7.82 },
  PHP: { code: 'PHP', symbol: '₱', rate: 56 },
  THB: { code: 'THB', symbol: '฿', rate: 35.5 },
  IDR: { code: 'IDR', symbol: 'Rp', rate: 15700 },
  TWD: { code: 'TWD', symbol: 'NT$', rate: 32 },
  MYR: { code: 'MYR', symbol: 'RM', rate: 4.7 },
  VND: { code: 'VND', symbol: '₫', rate: 24500 },
  PKR: { code: 'PKR', symbol: '₨', rate: 280 },
  BDT: { code: 'BDT', symbol: '৳', rate: 110 },
  EGP: { code: 'EGP', symbol: 'E£', rate: 31 },
  SAR: { code: 'SAR', symbol: 'ر.س', rate: 3.75 },
  KWD: { code: 'KWD', symbol: 'د.ك', rate: 0.31 },
  QAR: { code: 'QAR', symbol: 'ر.ق', rate: 3.64 },
  NZD: { code: 'NZD', symbol: 'NZ$', rate: 1.64 },
  SEK: { code: 'SEK', symbol: 'kr', rate: 10.5 },
  NOK: { code: 'NOK', symbol: 'kr', rate: 10.8 },
  DKK: { code: 'DKK', symbol: 'kr', rate: 6.9 },
  PLN: { code: 'PLN', symbol: 'zł', rate: 4.0 },
  CZK: { code: 'CZK', symbol: 'Kč', rate: 23.0 },
  HUF: { code: 'HUF', symbol: 'Ft', rate: 360 },
  RON: { code: 'RON', symbol: 'lei', rate: 4.6 },
  RUB: { code: 'RUB', symbol: '₽', rate: 92 },
  UAH: { code: 'UAH', symbol: '₴', rate: 37 },
  TRY: { code: 'TRY', symbol: '₺', rate: 29 },
  ILS: { code: 'ILS', symbol: '₪', rate: 3.7 },
  ARS: { code: 'ARS', symbol: '$', rate: 870 },
  CLP: { code: 'CLP', symbol: '$', rate: 900 },
  COP: { code: 'COP', symbol: '$', rate: 4000 },
  PEN: { code: 'PEN', symbol: 'S/', rate: 3.8 },
  KES: { code: 'KES', symbol: 'KSh', rate: 155 },
  GHS: { code: 'GHS', symbol: 'GH₵', rate: 12 },
  TZS: { code: 'TZS', symbol: 'TSh', rate: 2500 },
};

/**
 * Maps country codes (ISO 3166-1 alpha-2) to their primary currency
 * This ensures correct currency regardless of language preference
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Americas
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL',
  AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  // Europe
  GB: 'GBP', CH: 'CHF',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', RU: 'RUB', UA: 'UAH', TR: 'TRY',
  // Asia Pacific
  JP: 'JPY', KR: 'KRW', CN: 'CNY', TW: 'TWD', HK: 'HKD',
  IN: 'INR', PK: 'PKR', BD: 'BDT',
  SG: 'SGD', MY: 'MYR', TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND',
  // Middle East
  AE: 'AED', SA: 'SAR', KW: 'KWD', QA: 'QAR', IL: 'ILS', EG: 'EGP',
  // Africa
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', TZ: 'TZS',
  // Oceania
  AU: 'AUD', NZ: 'NZD',
};

/**
 * Language-only locale fallback mapping
 * Used when locale has no country code (e.g., 'en' instead of 'en-US')
 */
export const LANGUAGE_FALLBACK: Record<string, string> = {
  'en': 'USD', 'de': 'EUR', 'fr': 'EUR', 'es': 'EUR', 'it': 'EUR',
  'ja': 'JPY', 'ko': 'KRW', 'zh': 'CNY', 'pt': 'BRL', 'hi': 'INR',
  'ar': 'AED', 'th': 'THB', 'id': 'IDR', 'vi': 'VND', 'ru': 'RUB',
};

/**
 * Gets currency code from a locale string
 * Uses country code to determine currency (e.g., 'en-IN' -> 'INR', 'hi-IN' -> 'INR')
 * Handles locale strings with script codes (e.g., 'zh-Hans-CN' -> 'CNY')
 * 
 * @param locale - The locale string (e.g., 'en-IN', 'hi-IN', 'en-US', 'zh-Hans-CN')
 * @returns The currency code (e.g., 'INR', 'USD', 'CNY')
 */
export function getCurrencyFromLocale(locale: string): string {
  if (!locale) return 'USD';
  
  const parts = locale.split('-');
  
  // Try to find a country code in the locale parts
  // Country codes are 2 uppercase letters (ISO 3166-1 alpha-2)
  // This handles both 'en-IN' and 'zh-Hans-CN' formats
  for (let i = parts.length - 1; i >= 1; i--) {
    const part = parts[i].toUpperCase();
    // Check if this looks like a country code (2 letters) and is in our mapping
    if (part.length === 2 && COUNTRY_TO_CURRENCY[part]) {
      return COUNTRY_TO_CURRENCY[part];
    }
  }
  
  // Fallback: try to map language-only locales to common currencies
  const languageCode = parts[0].toLowerCase();
  return LANGUAGE_FALLBACK[languageCode] || 'USD';
}

/**
 * Map timezones to their typical currency
 * This provides a fallback when browser locale is not specific enough
 */
export const TIMEZONE_TO_CURRENCY: Record<string, string> = {
  // India
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  
  // UK
  'Europe/London': 'GBP',
  
  // US timezones
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD',
  
  // Europe
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Amsterdam': 'EUR',
  
  // Japan
  'Asia/Tokyo': 'JPY',
  
  // China
  'Asia/Shanghai': 'CNY',
  'Asia/Beijing': 'CNY',
  
  // Australia
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  
  // Singapore
  'Asia/Singapore': 'SGD',
  
  // Hong Kong
  'Asia/Hong_Kong': 'HKD',
};

/**
 * Gets currency from timezone
 * Used as a secondary detection method when locale is ambiguous
 */
export function getCurrencyFromTimezone(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_CURRENCY[timezone] || null;
  } catch {
    return null;
  }
}

/**
 * Gets user's local currency based on browser locale
 * Uses the country code from the locale to determine currency
 * Falls back to timezone detection for ambiguous cases
 * 
 * @returns The currency code for the user's locale
 */
export function getUserLocaleCurrency(): string {
  if (typeof window === 'undefined') return 'USD';
  
  try {
    const locale = navigator.language || 'en-US';
    const currencyFromLocale = getCurrencyFromLocale(locale);
    
    // If the locale resolved to USD but might be ambiguous (e.g., just "en"),
    // check the timezone as a secondary signal
    if (currencyFromLocale === 'USD') {
      // Check if the locale is ambiguous (no specific country code)
      const parts = locale.split('-');
      const hasCountryCode = parts.length > 1 && parts[parts.length - 1].length === 2;
      
      if (!hasCountryCode) {
        // Try timezone-based detection
        const currencyFromTimezone = getCurrencyFromTimezone();
        if (currencyFromTimezone && currencyFromTimezone !== 'USD') {
          return currencyFromTimezone;
        }
      }
    }
    
    return currencyFromLocale;
  } catch {
    return 'USD';
  }
}

/**
 * Formats a price in local currency
 * 
 * @param usdPrice - The price in USD
 * @param currencyCode - The target currency code
 * @returns Formatted price string in the target currency
 */
export function formatLocalCurrency(usdPrice: number, currencyCode: string): string {
  const currencyInfo = DEFAULT_RATES[currencyCode] || DEFAULT_RATES.USD;
  const localPrice = usdPrice * currencyInfo.rate;
  
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: localPrice < 1 ? 4 : 2,
      maximumFractionDigits: localPrice < 1 ? 4 : 2,
    }).format(localPrice);
  } catch {
    return `${currencyInfo.symbol}${localPrice.toFixed(localPrice < 1 ? 4 : 2)}`;
  }
}
