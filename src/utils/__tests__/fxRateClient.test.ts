/**
 * Tests for FX Rate Client
 * 
 * Validates real-time FX rate fetching, caching, and fallback behavior.
 */

import {
  fetchFxRates,
  getFxRate,
  clearFxCache,
  isCacheValid,
  getRateAge,
  FxRateData,
  FxRateResponse,
} from '../fxRateClient';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_FX_DATA: FxRateData = {
  rates: {
    USD: 1,
    EUR: 0.92,
    INR: 83.51,
    JPY: 149.5,
    CNY: 7.25,
  },
  timestamp: 1736104801000, // 2026-01-05
  date: '2026-01-05',
  source: 'exchangerate-api',
  next_update: 1736191201000,
  api_response_time: 245,
};

const MOCK_FALLBACK_DATA: FxRateData = {
  rates: {
    USD: 1,
    EUR: 0.91,
    INR: 83.0,
    JPY: 150.0,
  },
  timestamp: 1735000000000, // Older timestamp
  date: '2025-12-24',
  source: 'fallback',
};

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('FX Rate Client', () => {
  let mockLocalStorage: { [key: string]: string };
  let originalLocalStorage: Storage | undefined;
  let originalWindow: typeof window | undefined;
  let mockDateNow: jest.SpyInstance;
  let getItemSpy: jest.Mock;
  let setItemSpy: jest.Mock;
  let removeItemSpy: jest.Mock;
  
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn();
    
    // Mock window (required for localStorage checks)
    originalWindow = (global as any).window;
    
    // Mock localStorage - completely replace it
    mockLocalStorage = {};
    originalLocalStorage = (global as any).localStorage;
    
    getItemSpy = jest.fn((key: string) => mockLocalStorage[key] || null);
    setItemSpy = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    removeItemSpy = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });
    
    // Delete existing localStorage and create our own
    delete (global as any).localStorage;
    delete (global as any).window.localStorage;
    
    const mockStorageObj = {
      getItem: getItemSpy,
      setItem: setItemSpy,
      removeItem: removeItemSpy,
      clear: jest.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: jest.fn(),
    };
    
    (global as any).localStorage = mockStorageObj;
    (global as any).window.localStorage = mockStorageObj;
    
    // Mock Date.now() - default to 2026-01-05 12:00:00
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1736160000000);
  });
  
  afterEach(() => {
    (global as any).localStorage = originalLocalStorage;
    (global as any).window = originalWindow;
    mockDateNow.mockRestore();
    jest.clearAllMocks();
  });
  
  // ==========================================================================
  // fetchFxRates() Tests
  // ==========================================================================
  
  describe('fetchFxRates()', () => {
    it('should fetch from GitHub Raw API (primary URL)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FX_DATA);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/brainstorm4x/EQUA/main/data/fx-rates/current.json',
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
        })
      );
    });
    
    it('should cache successful response in localStorage', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      await fetchFxRates();
      
      const cached = JSON.parse(mockLocalStorage['equa_fx_rates_cache']);
      expect(cached.data).toEqual(MOCK_FX_DATA);
      expect(cached.cachedAt).toBe(1736160000000);
    });
    
    it('should return cached data if fresh (<24h)', async () => {
      // Pre-populate cache with fresh data
      const cachedData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 12, // 12 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FX_DATA);
      expect(global.fetch).not.toHaveBeenCalled(); // Should not call API
    });
    
    it('should fall back to fallback URL if primary fails', async () => {
      // Primary URL fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);
      
      // Fallback URL succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FALLBACK_DATA,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FALLBACK_DATA);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://raw.githubusercontent.com/brainstorm4x/EQUA/main/data/fx-rates/fallback.json',
        expect.any(Object)
      );
    });
    
    it('should use stale cache if all API calls fail', async () => {
      // Pre-populate with stale cache (>24h old)
      const staleData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 48, // 48 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(staleData);
      
      // Both API calls fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FX_DATA);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Tried both URLs
    });
    
    it('should fall back to DEFAULT_RATES if all sources fail', async () => {
      // No cache
      mockLocalStorage = {};
      
      // All API calls fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result.source).toBe('fallback');
      expect(result.rates.USD).toBe(1);
      expect(result.rates.EUR).toBeDefined();
      expect(result.rates.INR).toBeDefined();
      expect(result.date).toBe('2026-01-05'); // Mocked date
    });
    
    it('should handle malformed JSON gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);
      
      // Should try fallback
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FALLBACK_DATA,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FALLBACK_DATA);
    });
    
    it('should validate required fields in response', async () => {
      const invalidData = {
        rates: { USD: 1 },
        // Missing timestamp, date, source
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData,
      } as Response);
      
      // Should try fallback
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FALLBACK_DATA,
      } as Response);
      
      const result = await fetchFxRates();
      
      expect(result).toEqual(MOCK_FALLBACK_DATA);
    });
  });
  
  // ==========================================================================
  // getFxRate() Tests
  // ==========================================================================
  
  describe('getFxRate()', () => {
    it('should return rate 1.0 for USD with zero age', async () => {
      const result = await getFxRate('USD');
      
      expect(result).toEqual({
        rate: 1.0,
        source: 'static',
        age: 0,
        isStale: false,
      });
      expect(global.fetch).not.toHaveBeenCalled(); // USD is special case
    });
    
    it('should fetch rate for EUR from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      const result = await getFxRate('EUR');
      
      expect(result.rate).toBe(0.92);
      expect(result.source).toBe('exchangerate-api');
      expect(result.age).toBeGreaterThanOrEqual(0);
      expect(result.isStale).toBe(false);
    });
    
    it('should use cached rate if fresh (<24h)', async () => {
      // Pre-populate cache with fresh data
      const cachedData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 12, // 12 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      const result = await getFxRate('INR');
      
      expect(result.rate).toBe(83.51);
      expect(result.source).toBe('cache');
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should detect stale cache (>24h)', async () => {
      // Pre-populate with stale cache - data timestamp is >24h old
      const oldTimestamp = 1736160000000 - 1000 * 60 * 60 * 48; // 48 hours ago
      const staleData = {
        data: {
          ...MOCK_FX_DATA,
          timestamp: oldTimestamp, // Make the DATA stale, not just the cache
        },
        cachedAt: oldTimestamp,
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(staleData);
      
      // API fails, so use stale cache
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      
      const result = await getFxRate('JPY');
      
      expect(result.rate).toBe(149.5);
      expect(result.isStale).toBe(true);
      expect(result.age).toBeGreaterThan(24 * 60 * 60 * 1000); // >24h in ms
    });
    
    it('should fetch fresh data if cache is stale', async () => {
      // Pre-populate with stale cache (>24h)
      const staleData = {
        data: MOCK_FALLBACK_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 48, // 48 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(staleData);
      
      // API returns fresh data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      const result = await getFxRate('EUR');
      
      expect(result.rate).toBe(0.92); // Fresh data
      expect(result.source).toBe('exchangerate-api');
      expect(global.fetch).toHaveBeenCalled(); // Should fetch fresh
    });
    
    it('should fall back to rate 1.0 for unknown currency', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      const result = await getFxRate('XXX'); // Unknown currency
      
      expect(result).toEqual({
        rate: 1.0,
        source: 'static',
        age: 0,
        isStale: false,
      });
    });
    
    it('should calculate age correctly', async () => {
      // Pre-populate cache with known timestamp
      const oldTimestamp = 1736160000000 - 1000 * 60 * 60 * 6; // 6 hours ago
      const cachedData = {
        data: {
          ...MOCK_FX_DATA,
          timestamp: oldTimestamp,
        },
        cachedAt: oldTimestamp,
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      const result = await getFxRate('EUR');
      
      expect(result.age).toBe(1000 * 60 * 60 * 6); // 6 hours in ms
      expect(result.isStale).toBe(false); // <24h
    });
  });
  
  // ==========================================================================
  // clearFxCache() Tests
  // ==========================================================================
  
  describe('clearFxCache()', () => {
    it('should remove cache from localStorage', () => {
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify({
        data: MOCK_FX_DATA,
        cachedAt: Date.now(),
      });
      
      clearFxCache();
      
      expect(mockLocalStorage['equa_fx_rates_cache']).toBeUndefined();
      expect(removeItemSpy).toHaveBeenCalledWith('equa_fx_rates_cache');
    });
    
    it('should not throw if cache does not exist', () => {
      expect(() => clearFxCache()).not.toThrow();
    });
  });
  
  // ==========================================================================
  // isCacheValid() Tests
  // ==========================================================================
  
  describe('isCacheValid()', () => {
    it('should return true for fresh cache (<24h)', () => {
      const cachedData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 12, // 12 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      expect(isCacheValid()).toBe(true);
    });
    
    it('should return false for stale cache (>24h)', () => {
      const staleData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 48, // 48 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(staleData);
      
      expect(isCacheValid()).toBe(false);
    });
    
    it('should return false if no cache exists', () => {
      mockLocalStorage = {};
      
      expect(isCacheValid()).toBe(false);
    });
    
    it('should return false if cache is exactly at TTL boundary', () => {
      const boundaryData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 24 * 60 * 60 * 1000 - 1, // Just past 24h
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(boundaryData);
      
      expect(isCacheValid()).toBe(false);
    });
  });
  
  // ==========================================================================
  // getRateAge() Tests
  // ==========================================================================
  
  describe('getRateAge()', () => {
    it('should return age in hours for cached data', () => {
      const cachedData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 6, // 6 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      const age = getRateAge();
      
      expect(age).toBe(6);
    });
    
    it('should return null if no cache exists', () => {
      mockLocalStorage = {};
      
      expect(getRateAge()).toBeNull();
    });
    
    it('should return age even for stale cache', () => {
      const staleData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 60 * 48, // 48 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(staleData);
      
      const age = getRateAge();
      
      expect(age).toBe(48);
    });
    
    it('should handle fractional hours correctly', () => {
      const cachedData = {
        data: MOCK_FX_DATA,
        cachedAt: 1736160000000 - 1000 * 60 * 90, // 1.5 hours ago
      };
      mockLocalStorage['equa_fx_rates_cache'] = JSON.stringify(cachedData);
      
      const age = getRateAge();
      
      expect(age).toBeCloseTo(1.5, 1);
    });
  });
  
  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================
  
  describe('Edge cases and error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });
      
      expect(() => isCacheValid()).not.toThrow();
      expect(isCacheValid()).toBe(false);
    });
    
    it('should handle network timeouts gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));
      
      const result = await fetchFxRates();
      
      expect(result.source).toBe('fallback'); // Falls back to DEFAULT_RATES
      expect(result.rates.USD).toBe(1);
    });
    
    it('should handle concurrent fetchFxRates calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => MOCK_FX_DATA,
      } as Response);
      
      const [result1, result2, result3] = await Promise.all([
        fetchFxRates(),
        fetchFxRates(),
        fetchFxRates(),
      ]);
      
      expect(result1).toEqual(MOCK_FX_DATA);
      expect(result2).toEqual(MOCK_FX_DATA);
      expect(result3).toEqual(MOCK_FX_DATA);
    });
  });
});
