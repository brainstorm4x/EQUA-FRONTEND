/**
 * Tests for Local Currency Utilities
 * 
 * Validates that users from different locales get the correct
 * local currency for EQUA price display.
 */

import {
  getCurrencyFromLocale,
  formatLocalCurrency,
  DEFAULT_RATES,
  COUNTRY_TO_CURRENCY,
  getCurrencyFromTimezone,
  TIMEZONE_TO_CURRENCY,
} from '@/utils/localeCurrency';

describe('Local Currency Utilities', () => {
  describe('getCurrencyFromLocale', () => {
    describe('India (INR)', () => {
      it('should return INR for en-IN (English - India)', () => {
        expect(getCurrencyFromLocale('en-IN')).toBe('INR');
      });

      it('should return INR for hi-IN (Hindi - India)', () => {
        expect(getCurrencyFromLocale('hi-IN')).toBe('INR');
      });

      it('should return INR for ta-IN (Tamil - India)', () => {
        expect(getCurrencyFromLocale('ta-IN')).toBe('INR');
      });

      it('should return INR for bn-IN (Bengali - India)', () => {
        expect(getCurrencyFromLocale('bn-IN')).toBe('INR');
      });

      it('should return INR for te-IN (Telugu - India)', () => {
        expect(getCurrencyFromLocale('te-IN')).toBe('INR');
      });

      it('should return INR for mr-IN (Marathi - India)', () => {
        expect(getCurrencyFromLocale('mr-IN')).toBe('INR');
      });

      it('should return INR for gu-IN (Gujarati - India)', () => {
        expect(getCurrencyFromLocale('gu-IN')).toBe('INR');
      });

      it('should return INR for kn-IN (Kannada - India)', () => {
        expect(getCurrencyFromLocale('kn-IN')).toBe('INR');
      });
    });

    describe('United Kingdom (GBP)', () => {
      it('should return GBP for en-GB', () => {
        expect(getCurrencyFromLocale('en-GB')).toBe('GBP');
      });
    });

    describe('United States (USD)', () => {
      it('should return USD for en-US', () => {
        expect(getCurrencyFromLocale('en-US')).toBe('USD');
      });
    });

    describe('European Union (EUR)', () => {
      it('should return EUR for de-DE (German - Germany)', () => {
        expect(getCurrencyFromLocale('de-DE')).toBe('EUR');
      });

      it('should return EUR for fr-FR (French - France)', () => {
        expect(getCurrencyFromLocale('fr-FR')).toBe('EUR');
      });

      it('should return EUR for es-ES (Spanish - Spain)', () => {
        expect(getCurrencyFromLocale('es-ES')).toBe('EUR');
      });

      it('should return EUR for it-IT (Italian - Italy)', () => {
        expect(getCurrencyFromLocale('it-IT')).toBe('EUR');
      });

      it('should return EUR for nl-NL (Dutch - Netherlands)', () => {
        expect(getCurrencyFromLocale('nl-NL')).toBe('EUR');
      });

      it('should return EUR for en-IE (English - Ireland)', () => {
        expect(getCurrencyFromLocale('en-IE')).toBe('EUR');
      });
    });

    describe('Asia Pacific', () => {
      it('should return JPY for ja-JP (Japanese)', () => {
        expect(getCurrencyFromLocale('ja-JP')).toBe('JPY');
      });

      it('should return KRW for ko-KR (Korean)', () => {
        expect(getCurrencyFromLocale('ko-KR')).toBe('KRW');
      });

      it('should return CNY for zh-CN (Chinese - China)', () => {
        expect(getCurrencyFromLocale('zh-CN')).toBe('CNY');
      });

      it('should return TWD for zh-TW (Chinese - Taiwan)', () => {
        expect(getCurrencyFromLocale('zh-TW')).toBe('TWD');
      });

      it('should return SGD for en-SG (English - Singapore)', () => {
        expect(getCurrencyFromLocale('en-SG')).toBe('SGD');
      });

      it('should return HKD for en-HK (English - Hong Kong)', () => {
        expect(getCurrencyFromLocale('en-HK')).toBe('HKD');
      });

      it('should return THB for th-TH (Thai)', () => {
        expect(getCurrencyFromLocale('th-TH')).toBe('THB');
      });

      it('should return IDR for id-ID (Indonesian)', () => {
        expect(getCurrencyFromLocale('id-ID')).toBe('IDR');
      });

      it('should return PHP for en-PH (English - Philippines)', () => {
        expect(getCurrencyFromLocale('en-PH')).toBe('PHP');
      });

      it('should return MYR for ms-MY (Malay - Malaysia)', () => {
        expect(getCurrencyFromLocale('ms-MY')).toBe('MYR');
      });

      it('should return VND for vi-VN (Vietnamese)', () => {
        expect(getCurrencyFromLocale('vi-VN')).toBe('VND');
      });
    });

    describe('Americas', () => {
      it('should return CAD for en-CA (English - Canada)', () => {
        expect(getCurrencyFromLocale('en-CA')).toBe('CAD');
      });

      it('should return BRL for pt-BR (Portuguese - Brazil)', () => {
        expect(getCurrencyFromLocale('pt-BR')).toBe('BRL');
      });

      it('should return MXN for es-MX (Spanish - Mexico)', () => {
        expect(getCurrencyFromLocale('es-MX')).toBe('MXN');
      });

      it('should return ARS for es-AR (Spanish - Argentina)', () => {
        expect(getCurrencyFromLocale('es-AR')).toBe('ARS');
      });

      it('should return COP for es-CO (Spanish - Colombia)', () => {
        expect(getCurrencyFromLocale('es-CO')).toBe('COP');
      });
    });

    describe('Middle East and Africa', () => {
      it('should return AED for ar-AE (Arabic - UAE)', () => {
        expect(getCurrencyFromLocale('ar-AE')).toBe('AED');
      });

      it('should return SAR for ar-SA (Arabic - Saudi Arabia)', () => {
        expect(getCurrencyFromLocale('ar-SA')).toBe('SAR');
      });

      it('should return ZAR for en-ZA (English - South Africa)', () => {
        expect(getCurrencyFromLocale('en-ZA')).toBe('ZAR');
      });

      it('should return NGN for en-NG (English - Nigeria)', () => {
        expect(getCurrencyFromLocale('en-NG')).toBe('NGN');
      });

      it('should return KES for en-KE (English - Kenya)', () => {
        expect(getCurrencyFromLocale('en-KE')).toBe('KES');
      });
    });

    describe('Oceania', () => {
      it('should return AUD for en-AU (English - Australia)', () => {
        expect(getCurrencyFromLocale('en-AU')).toBe('AUD');
      });

      it('should return NZD for en-NZ (English - New Zealand)', () => {
        expect(getCurrencyFromLocale('en-NZ')).toBe('NZD');
      });
    });

    describe('Language-only fallback', () => {
      it('should return USD for language-only "en"', () => {
        expect(getCurrencyFromLocale('en')).toBe('USD');
      });

      it('should return INR for language-only "hi"', () => {
        expect(getCurrencyFromLocale('hi')).toBe('INR');
      });

      it('should return EUR for language-only "de"', () => {
        expect(getCurrencyFromLocale('de')).toBe('EUR');
      });

      it('should return JPY for language-only "ja"', () => {
        expect(getCurrencyFromLocale('ja')).toBe('JPY');
      });
    });

    describe('Edge cases', () => {
      it('should return USD for empty string', () => {
        expect(getCurrencyFromLocale('')).toBe('USD');
      });

      it('should return USD for unknown locale', () => {
        expect(getCurrencyFromLocale('xx-XX')).toBe('USD');
      });

      it('should handle case insensitivity for country codes', () => {
        expect(getCurrencyFromLocale('en-in')).toBe('INR');
        expect(getCurrencyFromLocale('EN-IN')).toBe('INR');
        expect(getCurrencyFromLocale('En-In')).toBe('INR');
      });

      it('should handle locale strings with script codes', () => {
        // zh-Hans-CN (Simplified Chinese - China)
        expect(getCurrencyFromLocale('zh-Hans-CN')).toBe('CNY');
        // zh-Hant-TW (Traditional Chinese - Taiwan)
        expect(getCurrencyFromLocale('zh-Hant-TW')).toBe('TWD');
        // sr-Latn-RS (Serbian Latin - Serbia) - unknown country, should fallback
        expect(getCurrencyFromLocale('sr-Latn-RS')).toBe('USD');
      });
    });
  });

  describe('formatLocalCurrency', () => {
    it('should format USD correctly', () => {
      const result = formatLocalCurrency(10, 'USD');
      expect(result).toMatch(/\$10\.00/);
    });

    it('should format INR correctly', () => {
      // $10 * 87.0 = ₹870
      const result = formatLocalCurrency(10, 'INR');
      expect(result).toMatch(/₹870\.00/);
    });

    it('should format small prices with 4 decimal places', () => {
      // $0.01 * 1 = $0.01
      const result = formatLocalCurrency(0.01, 'USD');
      expect(result).toMatch(/\$0\.0100/);
    });

    it('should use USD as fallback for unknown currency', () => {
      const result = formatLocalCurrency(10, 'UNKNOWN');
      expect(result).toMatch(/\$10\.00/);
    });
  });

  describe('DEFAULT_RATES', () => {
    it('should have INR currency with ₹ symbol', () => {
      expect(DEFAULT_RATES.INR).toBeDefined();
      expect(DEFAULT_RATES.INR.symbol).toBe('₹');
      expect(DEFAULT_RATES.INR.code).toBe('INR');
    });

    it('should have GBP currency with £ symbol', () => {
      expect(DEFAULT_RATES.GBP).toBeDefined();
      expect(DEFAULT_RATES.GBP.symbol).toBe('£');
      expect(DEFAULT_RATES.GBP.code).toBe('GBP');
    });

    it('should have USD currency with $ symbol', () => {
      expect(DEFAULT_RATES.USD).toBeDefined();
      expect(DEFAULT_RATES.USD.symbol).toBe('$');
      expect(DEFAULT_RATES.USD.code).toBe('USD');
    });
  });

  describe('COUNTRY_TO_CURRENCY', () => {
    it('should map IN to INR', () => {
      expect(COUNTRY_TO_CURRENCY.IN).toBe('INR');
    });

    it('should map GB to GBP', () => {
      expect(COUNTRY_TO_CURRENCY.GB).toBe('GBP');
    });

    it('should map US to USD', () => {
      expect(COUNTRY_TO_CURRENCY.US).toBe('USD');
    });

    it('should map multiple EU countries to EUR', () => {
      expect(COUNTRY_TO_CURRENCY.DE).toBe('EUR');
      expect(COUNTRY_TO_CURRENCY.FR).toBe('EUR');
      expect(COUNTRY_TO_CURRENCY.ES).toBe('EUR');
      expect(COUNTRY_TO_CURRENCY.IT).toBe('EUR');
      expect(COUNTRY_TO_CURRENCY.NL).toBe('EUR');
    });
  });

  describe('TIMEZONE_TO_CURRENCY', () => {
    it('should map Asia/Kolkata to INR (India)', () => {
      expect(TIMEZONE_TO_CURRENCY['Asia/Kolkata']).toBe('INR');
    });

    it('should map Asia/Calcutta to INR (India legacy)', () => {
      expect(TIMEZONE_TO_CURRENCY['Asia/Calcutta']).toBe('INR');
    });

    it('should map Europe/London to GBP', () => {
      expect(TIMEZONE_TO_CURRENCY['Europe/London']).toBe('GBP');
    });

    it('should map US timezones to USD', () => {
      expect(TIMEZONE_TO_CURRENCY['America/New_York']).toBe('USD');
      expect(TIMEZONE_TO_CURRENCY['America/Los_Angeles']).toBe('USD');
    });

    it('should map Asia/Tokyo to JPY', () => {
      expect(TIMEZONE_TO_CURRENCY['Asia/Tokyo']).toBe('JPY');
    });

    it('should map European timezones to EUR', () => {
      expect(TIMEZONE_TO_CURRENCY['Europe/Paris']).toBe('EUR');
      expect(TIMEZONE_TO_CURRENCY['Europe/Berlin']).toBe('EUR');
    });
  });
});
