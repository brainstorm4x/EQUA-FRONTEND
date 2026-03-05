/**
 * Tests for FX Rate Client - Cache TTL Behavior
 * 
 * Tests cache expiration with 2-hour TTL and Netlify function response format.
 */

import {
  getFxRate,
  clearFxCache,
  isCacheValid,
  getRateAge,
} from '@/utils/fxRateClient';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

describe('FX Rate Client - Cache TTL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('Cache TTL is 2 hours', () => {
    it('should cache data for 2 hours', async () => {
      // Mock successful fetch with Netlify get-fx-rates response format
      const mockApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.92, INR: 90.2979 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      // First call - should fetch from API
      await getFxRate('EUR');
      
      // Verify cache is valid
      expect(isCacheValid()).toBe(true);
      
      // Verify fetch was called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Second call within 6 hours - should use cache
      await getFxRate('EUR');
      
      // Verify fetch was NOT called again
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after 2 hours', async () => {
      const mockApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.92, INR: 90.2979 },
        source: 'exchangerate-api',
      };

      // Mock initial fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      // First call
      await getFxRate('EUR');
      
      // Get the cache and manipulate timestamp to be 3 hours old
      const cacheKey = 'equa_fx_rates_cache_v2';
      const cached = JSON.parse(mockLocalStorage.getItem(cacheKey)!);
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      cached.cachedAt = Date.now() - THREE_HOURS_MS;
      mockLocalStorage.setItem(cacheKey, JSON.stringify(cached));
      
      // Cache should now be invalid
      expect(isCacheValid()).toBe(false);
      
      // Mock second fetch with updated data
      const updatedApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.93, INR: 91.5 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedApiResponse,
      });
      
      // Second call - should fetch fresh data
      const result = await getFxRate('EUR');
      
      // Verify fetch was called again
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Verify we got the new rate
      expect(result.rate).toBe(0.93);
    });

    it('should not expire cache before 2 hours', async () => {
      const mockApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.92, INR: 90.2979 },
        source: 'exchangerate-api',
      };

      // Mock initial fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      // First call
      await getFxRate('EUR');
      
      // Get the cache and manipulate timestamp to be 1 hour old (still valid within 2h TTL)
      const cacheKey = 'equa_fx_rates_cache_v2';
      const cached = JSON.parse(mockLocalStorage.getItem(cacheKey)!);
      const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
      cached.cachedAt = Date.now() - ONE_HOUR_MS;
      mockLocalStorage.setItem(cacheKey, JSON.stringify(cached));
      
      // Cache should still be valid
      expect(isCacheValid()).toBe(true);
      
      // Second call - should use cache
      const result = await getFxRate('EUR');
      
      // Verify fetch was NOT called again
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Verify we got the cached rate
      expect(result.rate).toBe(0.92);
    });
  });

  describe('Staleness threshold remains 24 hours', () => {
    it('should not mark data as stale if less than 24 hours old', async () => {
      const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
      
      const mockApiResponse = {
        timestamp: Date.now() - TWENTY_THREE_HOURS_MS, // milliseconds (Netlify format)
        date: '2026-01-05',
        rates: { EUR: 0.92, INR: 90.2979 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getFxRate('EUR');
      
      // Should not be marked as stale (< 24h)
      expect(result.isStale).toBe(false);
    });

    it('should mark data as stale if 24+ hours old', async () => {
      const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;
      
      const mockApiResponse = {
        timestamp: Date.now() - TWENTY_FIVE_HOURS_MS, // milliseconds (Netlify format)
        date: '2026-01-05',
        rates: { EUR: 0.92, INR: 83.5 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getFxRate('EUR');
      
      // Should be marked as stale (> 24h)
      expect(result.isStale).toBe(true);
    });
  });

  describe('Cache utility functions', () => {
    it('should clear cache', async () => {
      // Setup cache
      const mockApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.92 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await getFxRate('EUR');
      expect(isCacheValid()).toBe(true);
      
      // Clear cache
      clearFxCache();
      
      // Cache should be invalid
      expect(isCacheValid()).toBe(false);
    });

    it('should get cache age in hours', async () => {
      // Setup cache
      const mockApiResponse = {
        timestamp: Date.now(), // milliseconds (Netlify format)
        date: '2026-01-06',
        rates: { EUR: 0.92 },
        source: 'exchangerate-api',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await getFxRate('EUR');
      
      // Manipulate cache to be 3 hours old
      const cacheKey = 'equa_fx_rates_cache_v2';
      const cached = JSON.parse(mockLocalStorage.getItem(cacheKey)!);
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      cached.cachedAt = Date.now() - THREE_HOURS_MS;
      mockLocalStorage.setItem(cacheKey, JSON.stringify(cached));
      
      const age = getRateAge();
      
      // Age should be approximately 3 hours
      expect(age).toBeGreaterThan(2.9);
      expect(age).toBeLessThan(3.1);
    });
  });

  describe('Netlify Function Integration', () => {
    it('should use timestamp (milliseconds) directly from Netlify response', async () => {
      const timestampMs = Date.now() - 500; // 500ms ago
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          timestamp: timestampMs, // already milliseconds (Netlify format)
          date: '2026-01-06',
          rates: { EUR: 0.92 },
          source: 'exchangerate-api',
        }),
      });
  
      const result = await getFxRate('EUR');
      
      // Verify timestamp used directly (no * 1000 conversion)
      expect(result.age).toBeLessThan(1000); // Should be very recent
      expect(result.age).toBeGreaterThanOrEqual(0);
    });
  
    it('should handle malformed Netlify response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing timestamp (required Netlify format field)
          date: '2026-01-06',
          rates: { EUR: 0.92 },
        }),
      });
  
      const result = await getFxRate('EUR');
      
      // Should fall back to DEFAULT_RATES
      expect(result.source).toBe('fallback');
      expect(result.rate).toBe(0.92); // From DEFAULT_RATES
    });
  });
});
