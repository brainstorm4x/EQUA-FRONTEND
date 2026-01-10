/**
 * useEquaPrice Hook
 * 
 * Provides a single source of truth for EQUA pricing across the application.
 * This hook ensures SendModal and PriceDisplay show consistent prices.
 * 
 * Flow:
 * 1. Fetch totalTransactions from GlobalState (authoritative on-chain source)
 * 2. Calculate USD price using EquaPriceCalculator.calculatePrice()
 * 3. Convert to EQX and local currency using getEquaPriceMultiFormat()
 */

import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { EquaPriceCalculator } from '@/utils/priceCalculator';
import { getEquaPriceMultiFormat, MultiFormatEquaPrice } from '@/utils/eqxOracle';
import { getUserLocaleCurrency } from '@/utils/localeCurrency';
import { useGlobalStateStats } from './useGlobalStateStats';

export interface EquaPriceData extends MultiFormatEquaPrice {
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get current EQUA price in multiple formats
 * 
 * @returns Price data with USD, EQX, and local currency values
 */
export function useEquaPrice(): EquaPriceData {
  const { connection } = useConnection();
  const { totalTransactions, isLoading: isStatsLoading } = useGlobalStateStats();
  const [priceData, setPriceData] = useState<MultiFormatEquaPrice | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      if (isStatsLoading) {
        return; // Wait for stats to load first
      }

      try {
        setIsLoadingPrice(true);
        setError(null);

        // Calculate USD price from transaction count (authoritative source)
        const usdPrice = EquaPriceCalculator.calculatePrice(totalTransactions);

        // Get local currency code
        const localCurrencyCode = getUserLocaleCurrency();

        // Convert to all formats (EQX, USD, local currency)
        const multiFormatPrice = await getEquaPriceMultiFormat(
          usdPrice,
          localCurrencyCode,
          connection
        );

        setPriceData(multiFormatPrice);
      } catch (err) {
        console.error('Error fetching EQUA price:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        
        // Set fallback price data
        const localCurrencyCode = getUserLocaleCurrency();
        setPriceData({
          eqx: 0.01,
          usd: 0.01,
          localCurrency: 0.01,
          localCurrencyCode,
          eqxValue: 1.0,
          source: 'on-chain-oracle',
          fxRate: 1.0,
          fxSource: 'static',
          fxAge: 0,
          fxIsStale: false,
        });
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [connection, totalTransactions, isStatsLoading]);

  // Return combined loading state and price data
  return {
    ...(priceData || {
      eqx: 0.01,
      usd: 0.01,
      localCurrency: 0.01,
      localCurrencyCode: 'USD',
      eqxValue: 1.0,
      source: 'on-chain-oracle' as const,
      fxRate: 1.0,
      fxSource: 'static',
      fxAge: 0,
      fxIsStale: false,
    }),
    isLoading: isStatsLoading || isLoadingPrice,
    error,
  };
}
