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
  
  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track last fetch time for throttling
  const lastFetchRef = useRef<number>(0);
  const FETCH_THROTTLE_MS = 10000; // Minimum 10 seconds between fetches

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
        
        // Parse total_transactions at offset 12 (8 discriminator + 4 user_count)
        const totalTx = new anchor.BN(
          accountInfo.data.slice(12, 20),
          'le'
        ).toNumber();
        
        // Estimate transfers
        const estimatedTransfers = Math.max(0, totalTx - users * 2);
        
        // Calculate price based on TRANSFERS only
        const price = EquaPriceCalculator.calculatePrice(estimatedTransfers);
        const phase = EquaPriceCalculator.getPhase(estimatedTransfers);
        const epoch = EquaPriceCalculator.getCurrentEpoch(estimatedTransfers);
        
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
            totalTransactions: estimatedTransfers,
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
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
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
