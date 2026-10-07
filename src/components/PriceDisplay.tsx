'use client';

import { FC, useEffect, useState } from 'react';
import { formatUniyaaPrice, MAX_DAILY_GROWTH, TERMINAL_PRICE_USD } from '@/utils/priceCalculator';
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
    priceUsd,
    payersToday,
    isLoading: isStatsLoading,
  } = useGlobalStateStats();

  const [localCurrency, setLocalCurrency] = useState<string>('USD');
  const [fxData, setFxData] = useState<FxState>(DEFAULT_FX);
  const [mintingRate, setMintingRate] = useState<string>('100,000');

  // Detect local currency on mount
  useEffect(() => {
    setLocalCurrency(getUserLocaleCurrency());
  }, []);

  // The price is read from chain (GlobalState.price_index); only the minting
  // rate and the FX conversion are derived here.
  const currentPrice = priceUsd;
  const participation = totalUsers > 0 ? Math.min(payersToday / totalUsers, 1) : 0;
  const isCompounding = currentPrice < TERMINAL_PRICE_USD;

  useEffect(() => {
    const price = currentPrice;

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
  }, [currentPrice, totalUsers]);

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
          {/* USD Price (primary, read from on-chain GlobalState.price_index) */}
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
          <p className="text-purple-300 text-xs mt-1">UNIYAA per mint, once every 30 days</p>
          <p className="text-purple-300 text-xs mt-1" data-testid="current-phase">
            {isCompounding
              ? `Growing up to ${(MAX_DAILY_GROWTH * 100).toFixed(1)}% a day`
              : 'Linear phase: up to $25,000 per 30 days'}
          </p>
          <p className="text-purple-300 text-xs mt-1" data-testid="participation-today">
            Today: {payersToday.toLocaleString()} paid ({(participation * 100).toFixed(1)}% of users)
          </p>
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
              <p className="text-purple-300 text-xs mt-1">Counted payments (once per person per day)</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
