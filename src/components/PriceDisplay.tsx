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
import { getUserLocaleCurrency, formatLocalCurrency, DEFAULT_RATES } from '@/utils/localeCurrency';
import { getEquaPriceMultiFormat, formatEQXPrice, MultiFormatEquaPrice } from '@/utils/eqxOracle';
import { db } from '@/lib/db/client';
import { resetForNewProgramId } from '@/utils/programIdMigration';

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
  // EQX-related fields
  eqxPrice: number;
  eqxValue: number;
  priceSource: 'pyth' | 'coingecko' | 'fallback';
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
  eqxPrice: 0.01,
  eqxValue: 1.0,
  priceSource: 'fallback',
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
        
        // Get transfers from database (more accurate than localStorage)
        let totalTransfers = 0;
        try {
          totalTransfers = await db.adapter.getTotalTransfers();
          console.log('✓ Transfers from database:', totalTransfers);
        } catch (dbError) {
          console.warn('Failed to get transfers from database, using localStorage fallback:', dbError);
          // Fallback to localStorage tracking
          const localTransfers = getTotalTransfers();
          
          // Also parse on-chain total_transactions as fallback
          const onChainTx = new anchor.BN(
            accountInfo.data.slice(12, 20),
            'le'
          ).toNumber();
          
          // Estimate on-chain transfers (subtract registrations + mints)
          const estimatedOnChainTransfers = Math.max(0, onChainTx - users * 2);
          
          // Use the higher of local tracking or on-chain estimate
          totalTransfers = Math.max(localTransfers, estimatedOnChainTransfers);
        }
        
        // Calculate price based on transfers
        const price = EquaPriceCalculator.calculatePrice(totalTransfers);
        const phase = EquaPriceCalculator.getPhase(totalTransfers);
        const epoch = EquaPriceCalculator.getCurrentEpoch(totalTransfers);
        
        // Get registration stats from database (preferred) or localStorage (fallback)
        let individualCount = 0;
        let businessCount = 0;
        try {
          const dbStats = await db.adapter.getRegistrationStats();
          individualCount = dbStats.individualCount;
          businessCount = dbStats.businessCount;
          console.log('✓ Registration stats from database:', { individualCount, businessCount });
        } catch (dbError) {
          console.warn('Failed to get stats from database, using localStorage fallback:', dbError);
          // Fallback to localStorage
          const localStats = getRegistrationStats();
          individualCount = localStats.individualCount;
          businessCount = localStats.businessCount;
        }
        
        // Calculate minting rate based on total users
        const nextUserNumber = users + 1;
        const currentTier = ELEVATED_MINT_TIERS.find(
          tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
        );
        
        const mintingRate = currentTier 
          ? currentTier.equaPerAttempt.toLocaleString() 
          : '100';
        
        // Get EQX price data (from Pyth Network with fallback)
        const currencyCode = getUserLocaleCurrency();
        const exchangeRate = DEFAULT_RATES[currencyCode]?.rate || 1;
        let eqxPriceData: MultiFormatEquaPrice;
        try {
          eqxPriceData = await getEquaPriceMultiFormat(price, currencyCode, exchangeRate);
        } catch (eqxError) {
          console.warn('Error fetching EQX price, using defaults:', eqxError);
          eqxPriceData = {
            eqx: price,
            usd: price,
            localCurrency: price * exchangeRate,
            localCurrencyCode: currencyCode,
            eqxValue: 1.0,
            source: 'fallback',
          };
        }
        
        if (isMountedRef.current) {
          setPriceData({
            totalUsers: users,
            totalTransactions: totalTransfers,
            currentPrice: price,
            currentPhase: phase,
            currentEpoch: epoch,
            individualUsers: individualCount,
            businessUsers: businessCount,
            mintingRate,
            eqxPrice: eqxPriceData.eqx,
            eqxValue: eqxPriceData.eqxValue,
            priceSource: eqxPriceData.source,
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
    
    // Reset local state if program ID has changed
    resetForNewProgramId(PROGRAM_ID.toBase58());
    
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
          {/* EQX Price (Primary) */}
          <p className="text-yellow-300 text-2xl font-bold" data-testid="eqx-price">
            {formatEQXPrice(priceData.eqxPrice)}
          </p>
          {/* USD Price */}
          <p className="text-white text-lg font-semibold mt-1" data-testid="current-price">
            {formatEquaPrice(priceData.currentPrice)}
          </p>
          {/* Local currency equivalent */}
          {localCurrency !== 'USD' && (
            <p className="text-green-300 text-sm mt-1" data-testid="local-currency-price">
              ≈ {formatLocalCurrency(priceData.currentPrice, localCurrency)}
            </p>
          )}
          <p className="text-purple-300 text-xs mt-1" data-testid="current-phase">
            {getPhaseLabel(priceData.currentPhase)}
            <span className="ml-2 text-purple-400">
              ({priceData.priceSource === 'pyth' ? '🟢 Live' : priceData.priceSource === 'coingecko' ? '🟡 API' : '⚪ Fallback'})
            </span>
          </p>
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
