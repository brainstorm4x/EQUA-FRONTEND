/**
 * Tests for useEquaPrice hook
 * 
 * Validates that the hook provides reactive EQUA price that updates
 * when global state changes (totalTransactions).
 */

import { renderHook, waitFor } from '@testing-library/react';

// Mock dependencies before importing the hook
jest.mock('@/hooks/useGlobalStateStats');
jest.mock('@/utils/priceCalculator');
jest.mock('@/utils/eqxOracle');
jest.mock('@/utils/localeCurrency', () => ({
  getUserLocaleCurrency: jest.fn(),
  DEFAULT_RATES: {
    USD: { rate: 1, symbol: '$' },
    INR: { rate: 83.50, symbol: '₹' },
  },
}));

import { useEquaPrice } from '@/hooks/useEquaPrice';
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';
import { EquaPriceCalculator } from '@/utils/priceCalculator';
import { getUserLocaleCurrency } from '@/utils/localeCurrency';
import { getEquaPriceMultiFormat } from '@/utils/eqxOracle';

describe('useEquaPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for getUserLocaleCurrency
    (getUserLocaleCurrency as jest.Mock).mockReturnValue('USD');
  });

  it('should return initial price values while loading', async () => {
    (useGlobalStateStats as jest.Mock).mockReturnValue({
      totalTransactions: 0,
      totalUsers: 0,
      currentEpoch: 0,
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useEquaPrice());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for initial values to be set
    await waitFor(() => {
      expect(result.current.localCurrency).toBe('USD');
    });
    
    // Should still be loading due to stats loading
    expect(result.current.isLoading).toBe(true);
  });

  it('should calculate price based on totalTransactions', async () => {
    (useGlobalStateStats as jest.Mock).mockReturnValue({
      totalTransactions: 5000,
      totalUsers: 100,
      currentEpoch: 5,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    // Mock price calculation
    (EquaPriceCalculator.calculatePrice as jest.Mock).mockReturnValue(0.05);

    // Mock EQX price fetch
    (getEquaPriceMultiFormat as jest.Mock).mockResolvedValue({
      eqx: 0.05,
      usd: 0.05,
      localCurrency: 0.05,
      localCurrencyCode: 'USD',
      eqxValue: 1.0,
      source: 'fallback',
    });

    const { result } = renderHook(() => useEquaPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(EquaPriceCalculator.calculatePrice).toHaveBeenCalledWith(5000);
    expect(result.current.priceUSD).toBe(0.05);
    expect(result.current.priceLocal).toBe(0.05);
  });

  it('should update price when totalTransactions changes', async () => {
    const mockUseGlobalStateStats = useGlobalStateStats as jest.Mock;
    
    // Start with 1000 transactions
    mockUseGlobalStateStats.mockReturnValue({
      totalTransactions: 1000,
      totalUsers: 50,
      currentEpoch: 1,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    (EquaPriceCalculator.calculatePrice as jest.Mock)
      .mockReturnValueOnce(0.02) // First calculation
      .mockReturnValueOnce(0.10); // Second calculation after update

    (getEquaPriceMultiFormat as jest.Mock)
      .mockResolvedValueOnce({
        eqx: 0.02,
        usd: 0.02,
        localCurrency: 0.02,
        localCurrencyCode: 'USD',
        eqxValue: 1.0,
        source: 'pyth',
      })
      .mockResolvedValueOnce({
        eqx: 0.10,
        usd: 0.10,
        localCurrency: 0.10,
        localCurrencyCode: 'USD',
        eqxValue: 1.0,
        source: 'pyth',
      });

    const { result, rerender } = renderHook(() => useEquaPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceUSD).toBe(0.02);

    // Simulate totalTransactions update
    mockUseGlobalStateStats.mockReturnValue({
      totalTransactions: 10000,
      totalUsers: 100,
      currentEpoch: 10,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(result.current.priceUSD).toBe(0.10);
    });

    expect(EquaPriceCalculator.calculatePrice).toHaveBeenCalledWith(10000);
  });

  it('should convert price to local currency', async () => {
    (useGlobalStateStats as jest.Mock).mockReturnValue({
      totalTransactions: 5000,
      totalUsers: 100,
      currentEpoch: 5,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    (getUserLocaleCurrency as jest.Mock).mockReturnValue('INR');
    (EquaPriceCalculator.calculatePrice as jest.Mock).mockReturnValue(1.00);

    // Mock EQX conversion to INR
    (getEquaPriceMultiFormat as jest.Mock).mockResolvedValue({
      eqx: 1.00,
      usd: 1.00,
      localCurrency: 85.10, // 1 EQUA = 85.10 INR
      localCurrencyCode: 'INR',
      eqxValue: 1.0,
      source: 'pyth',
    });

    const { result } = renderHook(() => useEquaPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceUSD).toBe(1.00);
    expect(result.current.priceLocal).toBe(85.10);
    expect(result.current.localCurrency).toBe('INR');
    expect(result.current.priceSource).toBe('pyth');
  });

  it('should handle EQX fetch errors gracefully', async () => {
    (useGlobalStateStats as jest.Mock).mockReturnValue({
      totalTransactions: 5000,
      totalUsers: 100,
      currentEpoch: 5,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    (EquaPriceCalculator.calculatePrice as jest.Mock).mockReturnValue(1.00);
    (getUserLocaleCurrency as jest.Mock).mockReturnValue('INR');

    // Mock EQX fetch failure
    (getEquaPriceMultiFormat as jest.Mock).mockRejectedValue(
      new Error('EQX API unavailable')
    );

    const { result } = renderHook(() => useEquaPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use fallback conversion
    expect(result.current.priceUSD).toBe(1.00);
    expect(result.current.priceSource).toBe('fallback');
  });

  it('should return EQX value and price source', async () => {
    (useGlobalStateStats as jest.Mock).mockReturnValue({
      totalTransactions: 5000,
      totalUsers: 100,
      currentEpoch: 5,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    (EquaPriceCalculator.calculatePrice as jest.Mock).mockReturnValue(1.00);

    (getEquaPriceMultiFormat as jest.Mock).mockResolvedValue({
      eqx: 1.00,
      usd: 1.00,
      localCurrency: 1.00,
      localCurrencyCode: 'USD',
      eqxValue: 1.05, // EQX index value
      source: 'pyth',
    });

    const { result } = renderHook(() => useEquaPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.eqxValue).toBe(1.05);
    expect(result.current.priceSource).toBe('pyth');
  });
});
