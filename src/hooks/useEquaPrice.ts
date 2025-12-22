/**
 * useEquaPrice Hook
 * 
 * Provides reactive EQUA price that updates automatically when global state changes.
 * This is the shared source for current EQUA price across the application.
 * 
 * Price is calculated based on totalTransactions from GlobalState (authoritative),
 * and converted to local currency using the EQX oracle.
 */

import { useState, useEffect } from 'react';
import { useGlobalStateStats } from './useGlobalStateStats';
import { EquaPriceCalculator } from '@/utils/priceCalculator';
import { getUserLocaleCurrency, DEFAULT_RATES } from '@/utils/localeCurrency';
import { getEquaPriceMultiFormat, MultiFormatEquaPrice } from '@/utils/eqxOracle';

export interface UseEquaPriceResult {
  /** EQUA price in USD */
  priceUSD: number;
  /** EQUA price in user's local currency */
  priceLocal: number;
  /** Local currency code (e.g., 'USD', 'INR', 'EUR') */
  localCurrency: string;
  /** Whether price is currently loading */
  isLoading: boolean;
  /** EQX oracle data (for display purposes) */
  eqxValue: number;
  /** Source of price data: 'pyth' | 'coingecko' | 'fallback' */
  priceSource: 'pyth' | 'coingecko' | 'fallback';
}

/**
 * Hook to get reactive EQUA price that updates with global state
 * 
 * @returns Current EQUA price in USD and local currency
 */
export function useEquaPrice(): UseEquaPriceResult {
  // Get real-time transaction count from blockchain
  const { totalTransactions, isLoading: isStatsLoading } = useGlobalStateStats();
  
  const [priceUSD, setPriceUSD] = useState<number>(0.01);
  const [priceLocal, setPriceLocal] = useState<number>(0.01);
  const [eqxValue, setEqxValue] = useState<number>(1.0);
  const [priceSource, setPriceSource] = useState<'pyth' | 'coingecko' | 'fallback'>('fallback');
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  // Calculate and fetch price when totalTransactions changes
  useEffect(() => {
    const updatePrice = async () => {
      setIsLoadingPrice(true);
      
      try {
        // Calculate base USD price from transaction count (authoritative)
        const calculatedPriceUSD = EquaPriceCalculator.calculatePrice(totalTransactions);
        setPriceUSD(calculatedPriceUSD);
        
        // Get local currency and exchange rate (call every time to detect currency changes)
        const currencyCode = getUserLocaleCurrency();
        const exchangeRate = DEFAULT_RATES[currencyCode]?.rate || 1;
        
        // Fetch EQX price data for conversion to local currency
        let eqxPriceData: MultiFormatEquaPrice;
        try {
          eqxPriceData = await getEquaPriceMultiFormat(calculatedPriceUSD, currencyCode, exchangeRate);
        } catch (eqxError) {
          console.warn('Error fetching EQX price in useEquaPrice, using defaults:', eqxError);
          // Fallback to simple conversion if EQX fetch fails
          eqxPriceData = {
            eqx: calculatedPriceUSD,
            usd: calculatedPriceUSD,
            localCurrency: calculatedPriceUSD * exchangeRate,
            localCurrencyCode: currencyCode,
            eqxValue: 1.0,
            source: 'fallback',
          };
        }
        
        // Update state with fetched data
        setPriceLocal(eqxPriceData.localCurrency);
        setEqxValue(eqxPriceData.eqxValue);
        setPriceSource(eqxPriceData.source);
      } catch (error) {
        console.error('Error updating EQUA price:', error);
        // Keep existing values on error
      } finally {
        setIsLoadingPrice(false);
      }
    };
    
    updatePrice();
  }, [totalTransactions]);

  // Get localCurrency from getUserLocaleCurrency (reactive to ensure consistency)
  const localCurrency = getUserLocaleCurrency();

  return {
    priceUSD,
    priceLocal,
    localCurrency,
    isLoading: isStatsLoading || isLoadingPrice,
    eqxValue,
    priceSource,
  };
}
