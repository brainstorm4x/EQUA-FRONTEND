'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { UniyaaPriceCalculator, PriceTier, formatUniyaaPrice } from '@/utils/priceCalculator';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import { getUserLocaleCurrency, formatLocalCurrency, formatLocalCurrencyDynamic } from '@/utils/localeCurrency';
import { getUniyaaPriceMultiFormat, formatUNXPrice, MultiFormatUniyaaPrice } from '@/utils/unxOracle';
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';


interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

// UNX-related fields for price display
interface UnxPriceData {
  unxPrice: number;
  unxValue: number;
  priceSource: 'on-chain-oracle';
  fxRate?: number;
  fxSource?: string;
  fxAge?: number;
  fxIsStale?: boolean;
}

const DEFAULT_UNX_DATA: UnxPriceData = {
  unxPrice: 0.01,
  unxValue: 1.0,
  priceSource: 'on-chain-oracle',
  fxRate: 1.0,
  fxSource: 'static',
  fxAge: 0,
  fxIsStale: false,
};

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  // Use authoritative global state hook for real-time stats
  const { totalUsers, totalTransactions, isLoading: isStatsLoading } = useGlobalStateStats();
  const { connection } = useConnection();
  
  const [localCurrency, setLocalCurrency] = useState<string>('USD');
  const [unxData, setUnxData] = useState<UnxPriceData>(DEFAULT_UNX_DATA);
  const [currentPrice, setCurrentPrice] = useState<number>(0.01);
  const [currentTier, setCurrentTier] = useState<PriceTier>('tier1');
  const [mintingRate, setMintingRate] = useState<string>('100,000');

  // Detect local currency on mount
  useEffect(() => {
    setLocalCurrency(getUserLocaleCurrency());
  }, []);

  // Calculate price, tier, and minting rate based on authoritative totalTransactions
  useEffect(() => {
    // Calculate price based on total_transactions from GlobalState (authoritative)
    const price = UniyaaPriceCalculator.calculatePrice(totalTransactions);
    const tier = UniyaaPriceCalculator.getTier(totalTransactions);
    
    setCurrentPrice(price);
    setCurrentTier(tier);
    
    // Calculate minting rate based on total users
    const nextUserNumber = totalUsers + 1;
    const currentTier = ELEVATED_MINT_TIERS.find(
      tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
    );
    
    const rate = currentTier 
      ? currentTier.uniyaaPerAttempt.toLocaleString() 
      : '100';
    setMintingRate(rate);
    
    // Fetch UNX price data
    const fetchUnxPrice = async () => {
      const currencyCode = getUserLocaleCurrency();
      let unxPriceData: MultiFormatUniyaaPrice;
      try {
        unxPriceData = await getUniyaaPriceMultiFormat(price, currencyCode, connection);
      } catch (unxError) {
        console.warn('Error fetching UNX price, using defaults:', unxError);
        unxPriceData = {
          unx: price,
          usd: price,
          localCurrency: price,
          localCurrencyCode: currencyCode,
          unxValue: 1.0,
          source: 'on-chain-oracle',
          fxRate: 1.0,
          fxSource: 'static',
          fxAge: 0,
          fxIsStale: false,
        };
      }
      
      setUnxData({
        unxPrice: unxPriceData.unx,
        unxValue: unxPriceData.unxValue,
        priceSource: unxPriceData.source,
        fxRate: unxPriceData.fxRate,
        fxSource: unxPriceData.fxSource,
        fxAge: unxPriceData.fxAge,
        fxIsStale: unxPriceData.fxIsStale,
      });
    };
    
    fetchUnxPrice();
  }, [totalTransactions, totalUsers, connection]);

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

  if (isStatsLoading) {
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
          <p className="text-purple-200 text-sm mb-2">Current UNIYAA Price</p>
          {/* UNX Price (Primary) */}
          <p className="text-yellow-300 text-2xl font-bold" data-testid="unx-price">
            {formatUNXPrice(unxData.unxPrice)}
          </p>
          {/* USD Price */}
          <p className="text-white text-lg font-semibold mt-1" data-testid="current-price">
            {formatUniyaaPrice(currentPrice)}
          </p>
          {/* Local currency equivalent */}
          {localCurrency !== 'USD' && (
            <div className="mt-1">
              <p className="text-green-300 text-sm" data-testid="local-currency-price">
                ≈ {formatLocalCurrencyDynamic(currentPrice, localCurrency, unxData.fxRate || 1)}
                {/* Add stale indicator only when exchange rate data is genuinely outdated */}
                {unxData.fxIsStale && (
                  <span className="text-orange-300 text-xs ml-1" title="Exchange rate may be outdated (>24h old)">
                    (stale)
                  </span>
                )}
              </p>
              
              {/* Staleness warning - KEEP THIS */}
              {unxData.fxIsStale && (
                <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠️</span>
                  <span>
                    Exchange rate is {Math.floor((unxData.fxAge || 0) / (60 * 60 * 1000))}h old
                    {unxData.fxSource === 'fallback' && ' (using fallback rate)'}
                  </span>
                </p>
              )}
            </div>
          )}
          <p className="text-purple-300 text-xs mt-1" data-testid="price-source">
            <span className="ml-2 text-purple-400">
              ({unxData.priceSource === 'on-chain-oracle' ? '🟢 On-Chain' : '⚪ Fallback'})
            </span>
          </p>
        </div>
        
        <div>
          <p className="text-purple-200 text-sm mb-2">Minting Rate</p>
          <p className="text-white text-3xl font-bold" data-testid="mint-rate">{mintingRate}</p>
          <p className="text-purple-300 text-xs mt-1">UNIYAA/day</p>
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
