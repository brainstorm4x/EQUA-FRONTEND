'use client';

import { FC, useEffect, useState } from 'react';
import { UniyaaPriceCalculator, PriceTier, formatUniyaaPrice } from '@/utils/priceCalculator';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import { getUserLocaleCurrency, formatLocalCurrencyDynamic } from '@/utils/localeCurrency';
import { getUniyaaPriceMultiFormat, MultiFormatUniyaaPrice } from '@/utils/multiFormatPrice';
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';


interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

interface FxState {
  fxRate: number;
  fxSource?: string;
  fxAge?: number;
  fxIsStale?: boolean;
}

const DEFAULT_FX: FxState = {
  fxRate: 1,
  fxSource: 'static',
  fxAge: 0,
  fxIsStale: false,
};

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  // Use authoritative global state hook for real-time stats
  const {
    totalUsers,
    totalTransactions,
    tier9StartTimestamp,
    isLoading: isStatsLoading,
  } = useGlobalStateStats();

  const [localCurrency, setLocalCurrency] = useState<string>('USD');
  const [fxData, setFxData] = useState<FxState>(DEFAULT_FX);
  const [currentPrice, setCurrentPrice] = useState<number>(0.01);
  const [currentTier, setCurrentTier] = useState<PriceTier>('tier1');
  const [mintingRate, setMintingRate] = useState<string>('100,000');

  // Detect local currency on mount
  useEffect(() => {
    setLocalCurrency(getUserLocaleCurrency());
  }, []);

  // Calculate price, tier, and minting rate based on authoritative totalTransactions
  useEffect(() => {
    // Price comes straight out of the tier curve in USD — no oracle read needed.
    // tier9StartTimestamp engages the $25k/30-day cap once Tier 9 is reached;
    // before that it's irrelevant to the math (and ignored).
    const price = UniyaaPriceCalculator.calculatePrice(totalTransactions, tier9StartTimestamp);
    const tier = UniyaaPriceCalculator.getTier(totalTransactions);

    setCurrentPrice(price);
    setCurrentTier(tier);

    // Calculate minting rate based on total users
    const nextUserNumber = totalUsers + 1;
    const elevatedTier = ELEVATED_MINT_TIERS.find(
      t => nextUserNumber >= t.minUser && nextUserNumber <= t.maxUser
    );

    const rate = elevatedTier
      ? elevatedTier.uniyaaPerAttempt.toLocaleString()
      : '100';
    setMintingRate(rate);

    // Fetch FX rate for local currency display only.
    const fetchFx = async () => {
      const currencyCode = getUserLocaleCurrency();
      let data: MultiFormatUniyaaPrice;
      try {
        data = await getUniyaaPriceMultiFormat(price, currencyCode);
      } catch (fxError) {
        console.warn('FX lookup failed, defaulting to 1:1:', fxError);
        data = {
          usd: price,
          localCurrency: price,
          localCurrencyCode: currencyCode,
          fxRate: 1,
          fxSource: 'fallback',
          fxAge: 0,
          fxIsStale: true,
        };
      }

      setFxData({
        fxRate: data.fxRate,
        fxSource: data.fxSource,
        fxAge: data.fxAge,
        fxIsStale: data.fxIsStale,
      });
    };

    fetchFx();
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
        return 'Tier 8 ($100k-$1M)';
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
          {/* USD Price (primary, derived deterministically from on-chain total_transactions) */}
          <p className="text-white text-2xl font-bold" data-testid="current-price">
            {formatUniyaaPrice(currentPrice)}
          </p>
          {/* Local currency equivalent */}
          {localCurrency !== 'USD' && (
            <div className="mt-1">
              <p className="text-green-300 text-sm" data-testid="local-currency-price">
                ≈ {formatLocalCurrencyDynamic(currentPrice, localCurrency, fxData.fxRate || 1)}
                {fxData.fxIsStale && (
                  <span className="text-orange-300 text-xs ml-1" title="Exchange rate may be outdated (>24h old)">
                    (stale)
                  </span>
                )}
              </p>

              {fxData.fxIsStale && (
                <p className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠️</span>
                  <span>
                    Exchange rate is {Math.floor((fxData.fxAge || 0) / (60 * 60 * 1000))}h old
                    {fxData.fxSource === 'fallback' && ' (using fallback rate)'}
                  </span>
                </p>
              )}
            </div>
          )}
          <p className="text-purple-300 text-xs mt-1" data-testid="price-source">
            <span className="text-purple-400">🟢 On-Chain</span>
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
