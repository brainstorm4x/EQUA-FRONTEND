'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { EquaPriceCalculator, PriceTier, formatEquaPrice } from '@/utils/priceCalculator';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import { getUserLocaleCurrency, formatLocalCurrency, formatLocalCurrencyDynamic } from '@/utils/localeCurrency';
import { formatEQXPrice } from '@/utils/eqxOracle';
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';
import { useEquaPrice } from '@/hooks/useEquaPrice';


interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  // Use authoritative global state hook for real-time stats
  const { totalUsers, totalTransactions, isLoading: isStatsLoading } = useGlobalStateStats();
  
  // Use shared price hook for consistent pricing across the app
  const priceData = useEquaPrice();
  
  const [localCurrency, setLocalCurrency] = useState<string>('USD');
  const [currentTier, setCurrentTier] = useState<PriceTier>('tier1');
  const [mintingRate, setMintingRate] = useState<string>('100,000');

  // Detect local currency on mount
  useEffect(() => {
    setLocalCurrency(getUserLocaleCurrency());
  }, []);

  // Calculate tier and minting rate based on authoritative totalTransactions
  useEffect(() => {
    const tier = EquaPriceCalculator.getTier(totalTransactions);
    setCurrentTier(tier);
    
    // Calculate minting rate based on total users
    const nextUserNumber = totalUsers + 1;
    const currentTier = ELEVATED_MINT_TIERS.find(
      tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
    );
    
    const rate = currentTier 
      ? currentTier.equaPerAttempt.toLocaleString() 
      : '100';
    setMintingRate(rate);
  }, [totalTransactions, totalUsers]);

  const getTierLabel = (tier: PriceTier): string => {
    switch (tier) {
      case 'tier1':
        return 'Tier 1 ($0.01-$0.1)';
      case 'tier2':
        return 'Tier 2 ($0.1-$1)';
      case 'tier3':
        return 'Tier 3 ($1-$10)';
      case 'tier4':
        return 'Tier 4 ($10-$100)';
      case 'tier5':
        return 'Tier 5 ($100-$1k)';
      case 'tier6':
        return 'Tier 6 ($1k-$10k)';
      case 'tier7':
        return 'Tier 7 ($10k-$100k)';
      case 'tier8':
        return 'Tier 8 ($100k-$500k)';
      case 'tier9':
        return 'Tier 9 (Perpetual)';
      default:
        return 'Unknown';
    }
  };

  if (isStatsLoading || priceData.isLoading) {
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
            {formatEQXPrice(priceData.eqx)}
          </p>
          {/* USD Price */}
          <p className="text-white text-lg font-semibold mt-1" data-testid="current-price">
            {formatEquaPrice(priceData.usd)}
          </p>
          {/* Local currency equivalent */}
          {localCurrency !== 'USD' && (
            <div className="mt-1">
              <p className="text-green-300 text-sm" data-testid="local-currency-price">
                ≈ {formatLocalCurrencyDynamic(priceData.usd, localCurrency, priceData.fxRate || 1)}
                {/* Add subtle cache indicator only when using cached data */}
                {priceData.fxSource === 'cache' && (
                  <span className="text-purple-300 text-xs ml-1" title="Using cached exchange rate">
                    (cached)
                  </span>
                )}
              </p>
              
              {/* Staleness warning - KEEP THIS */}
              {priceData.fxIsStale && (
                <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠️</span>
                  <span>
                    Exchange rate is {Math.floor((priceData.fxAge || 0) / (60 * 60 * 1000))}h old
                    {priceData.fxSource === 'fallback' && ' (using fallback rate)'}
                  </span>
                </p>
              )}
            </div>
          )}
          <p className="text-purple-300 text-xs mt-1" data-testid="price-source">
            <span className="ml-2 text-purple-400">
              ({priceData.source === 'on-chain-oracle' ? '🟢 On-Chain' : '⚪ Fallback'})
            </span>
          </p>
        </div>
        
        <div>
          <p className="text-purple-200 text-sm mb-2">Minting Rate</p>
          <p className="text-white text-3xl font-bold" data-testid="mint-rate">{mintingRate}</p>
          <p className="text-purple-300 text-xs mt-1">EQUA/day</p>
          <p className="text-purple-300 text-xs mt-1" data-testid="current-phase">
            {getTierLabel(currentTier)}</p>
        </div>

        {showStats && (
          <>
            <div>
              <p className="text-purple-200 text-sm mb-2">Registered Users</p>
              <p className="text-white text-3xl font-bold" data-testid="total-users">
                {totalUsers.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">Total users</p>
            </div>

            <div>
              <p className="text-purple-200 text-sm mb-2">Transfers</p>
              <p className="text-white text-3xl font-bold" data-testid="total-transactions">
                {totalTransactions.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">Between users</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
