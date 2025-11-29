'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { EquaPriceCalculator, PricePhase, formatEquaPrice } from '@/utils/priceCalculator';
import { PROGRAM_ID, GLOBAL_STATE_SEED } from '@/lib/constants';
import { safeParseUserCount } from '@/utils/safeAccountParsing';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import * as anchor from '@coral-xyz/anchor';
import { getRegistrationStats } from '@/utils/registrationStats';
import { getTotalTransfers } from '@/utils/transferTracking';

interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

// ============================================================================
// PERFORMANCE OPTIMIZATION: Cached PDA computation
// Uses GLOBAL_STATE_SEED from lib/constants.ts (matches Rust backend)
// ============================================================================
let cachedGlobalStatePDA: PublicKey | null = null;

function getGlobalStatePDA(): PublicKey {
  if (!cachedGlobalStatePDA) {
    [cachedGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_STATE_SEED)],
      PROGRAM_ID
    );
  }
  return cachedGlobalStatePDA;
}

// ============================================================================
// Local Currency Conversion
// ============================================================================
interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // Rate relative to USD
}

// Default exchange rates (fallback if API fails)
// These are approximate rates as of late 2024
const DEFAULT_RATES: Record<string, CurrencyInfo> = {
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
};

/**
 * Gets user's local currency based on browser locale
 */
function getUserLocaleCurrency(): string {
  if (typeof window === 'undefined') return 'USD';
  
  try {
    const locale = navigator.language || 'en-US';
    
    // Map common locales to currencies
    const localeToCurrency: Record<string, string> = {
      'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
      'de-DE': 'EUR', 'fr-FR': 'EUR', 'es-ES': 'EUR', 'it-IT': 'EUR',
      'ja-JP': 'JPY', 'ko-KR': 'KRW', 'zh-CN': 'CNY', 'zh-TW': 'USD', // Taiwan - use USD as fallback
      'pt-BR': 'BRL', 'es-MX': 'MXN', 'hi-IN': 'INR', 'ar-AE': 'AED',
      'en-SG': 'SGD', 'en-HK': 'HKD', 'th-TH': 'THB', 'id-ID': 'IDR',
      'en-PH': 'PHP', 'en-ZA': 'ZAR', 'en-NG': 'NGN',
    };
    
    return localeToCurrency[locale] || 'USD';
  } catch {
    return 'USD';
  }
}

/**
 * Formats a price in local currency
 */
function formatLocalCurrency(usdPrice: number, currencyCode: string): string {
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

// ============================================================================
// PERFORMANCE OPTIMIZATION: Data fetching with caching
// ============================================================================
interface PriceData {
  totalUsers: number;
  totalTransactions: number;
  currentPrice: number;
  currentPhase: PricePhase;
  currentEpoch: number;
  individualUsers: number;
  businessUsers: number;
  mintingRate: string;
}

const DEFAULT_PRICE_DATA: PriceData = {
  totalUsers: 0,
  totalTransactions: 0,
  currentPrice: 0.01,
  currentPhase: 'phase1',
  currentEpoch: 0,
  individualUsers: 0,
  businessUsers: 0,
  mintingRate: '100,000',
};

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  const { connection } = useConnection();
  const [priceData, setPriceData] = useState<PriceData>(DEFAULT_PRICE_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [localCurrency, setLocalCurrency] = useState<string>('USD');
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track last fetch time for throttling
  const lastFetchRef = useRef<number>(0);
  const FETCH_THROTTLE_MS = 10000; // Minimum 10 seconds between fetches

  // Detect local currency on mount
  useEffect(() => {
    setLocalCurrency(getUserLocaleCurrency());
  }, []);

  const fetchPriceData = useCallback(async () => {
    // Throttle fetches to reduce RPC calls
    const now = Date.now();
    if (now - lastFetchRef.current < FETCH_THROTTLE_MS) {
      return;
    }
    lastFetchRef.current = now;
    
    try {
      const globalStatePDA = getGlobalStatePDA();
      const accountInfo = await connection.getAccountInfo(globalStatePDA);
      
      if (!isMountedRef.current) return;
      
      if (accountInfo) {
        // Parse global state data
        const users = safeParseUserCount(accountInfo.data);
        
        // Get locally tracked transfers (more accurate than on-chain estimate)
        const localTransfers = getTotalTransfers();
        
        // Also parse on-chain total_transactions as fallback
        const onChainTx = new anchor.BN(
          accountInfo.data.slice(12, 20),
          'le'
        ).toNumber();
        
        // Estimate on-chain transfers (subtract registrations + mints)
        const estimatedOnChainTransfers = Math.max(0, onChainTx - users * 2);
        
        // Use the higher of local tracking or on-chain estimate
        // (local tracking is more accurate for user transfers)
        const totalTransfers = Math.max(localTransfers, estimatedOnChainTransfers);
        
        // Calculate price based on transfers
        const price = EquaPriceCalculator.calculatePrice(totalTransfers);
        const phase = EquaPriceCalculator.getPhase(totalTransfers);
        const epoch = EquaPriceCalculator.getCurrentEpoch(totalTransfers);
        
        // Get registration stats from localStorage
        const stats = getRegistrationStats();
        
        // Calculate minting rate based on total users
        const nextUserNumber = users + 1;
        const currentTier = ELEVATED_MINT_TIERS.find(
          tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
        );
        
        const mintingRate = currentTier 
          ? currentTier.equaPerAttempt.toLocaleString() 
          : '100';
        
        if (isMountedRef.current) {
          setPriceData({
            totalUsers: users,
            totalTransactions: totalTransfers,
            currentPrice: price,
            currentPhase: phase,
            currentEpoch: epoch,
            individualUsers: stats.individualCount,
            businessUsers: stats.businessCount,
            mintingRate,
          });
        }
      } else if (isMountedRef.current) {
        setPriceData(DEFAULT_PRICE_DATA);
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
      if (isMountedRef.current) {
        setPriceData(DEFAULT_PRICE_DATA);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [connection]);

  useEffect(() => {
    isMountedRef.current = true;
    
    fetchPriceData();
    
    // Refresh every 30 seconds (reduced frequency for performance)
    const interval = setInterval(fetchPriceData, 30000);
    
    // Listen for transfer events to update immediately
    const handleTransferRecorded = () => {
      // Force immediate refresh on transfer
      lastFetchRef.current = 0;
      fetchPriceData();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('equa_transfer_recorded', handleTransferRecorded);
    }
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('equa_transfer_recorded', handleTransferRecorded);
      }
    };
  }, [fetchPriceData]);

  const getPhaseLabel = useCallback((phase: PricePhase): string => {
    switch (phase) {
      case 'phase1':
        return 'Phase 1 ($0.01-$1)';
      case 'phase2':
        return 'Phase 2 ($1-$10)';
      case 'phase3':
        return 'Phase 3 ($10-$100)';
      case 'phase4':
        return 'Phase 4 ($100-$200k)';
      case 'phase5':
        return 'Phase 5 (Perpetual)';
    }
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-purple-500/20 rounded mb-2"></div>
          <div className="h-10 bg-purple-500/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-6 border border-purple-400/50 ${className}`} data-testid="price-display">
      <div className={`grid ${showStats ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-6`}>
        <div>
          <p className="text-purple-200 text-sm mb-2">Current EQUA Price</p>
          <p className="text-white text-3xl font-bold" data-testid="current-price">
            {formatEquaPrice(priceData.currentPrice)}
          </p>
          {/* Local currency equivalent */}
          {localCurrency !== 'USD' && (
            <p className="text-green-300 text-sm mt-1" data-testid="local-currency-price">
              ≈ {formatLocalCurrency(priceData.currentPrice, localCurrency)}
            </p>
          )}
          <p className="text-purple-300 text-xs mt-1" data-testid="current-phase">{getPhaseLabel(priceData.currentPhase)}</p>
        </div>
        
        <div>
          <p className="text-purple-200 text-sm mb-2">Minting Rate</p>
          <p className="text-white text-3xl font-bold" data-testid="mint-rate">{priceData.mintingRate}</p>
          <p className="text-purple-300 text-xs mt-1">EQUA/day</p>
        </div>

        {showStats && (
          <>
            <div>
              <p className="text-purple-200 text-sm mb-2">Registered Users</p>
              <p className="text-white text-3xl font-bold" data-testid="total-users">
                {priceData.totalUsers.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">
                {priceData.individualUsers > 0 || priceData.businessUsers > 0 
                  ? `👤 ${priceData.individualUsers} | 🏢 ${priceData.businessUsers}`
                  : 'Total users'}
              </p>
            </div>

            <div>
              <p className="text-purple-200 text-sm mb-2">Transfers</p>
              <p className="text-white text-3xl font-bold" data-testid="total-transactions">
                {priceData.totalTransactions.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">Between users</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
