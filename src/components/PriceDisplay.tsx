'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { EquaPriceCalculator, PricePhase } from '@/utils/priceCalculator';
import { PROGRAM_ID } from '@/lib/constants';
import { safeParseUserCount } from '@/utils/safeAccountParsing';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import * as anchor from '@coral-xyz/anchor';

interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  const { connection } = useConnection();
  const [currentPrice, setCurrentPrice] = useState<number>(0.01);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<PricePhase>('phase1');
  const [isLoading, setIsLoading] = useState(true);
  const [mintingRate, setMintingRate] = useState<string>('1,000 - 100,000');

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        // Get global state PDA
        const [globalStatePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('global-state')],
          PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(globalStatePDA);
        
        if (accountInfo) {
          // Parse global state data
          // Structure: 8 discriminator + 4 user_count + 8 total_transactions + 8 current_epoch + 1 compounding_complete
          const users = safeParseUserCount(accountInfo.data);
          setTotalUsers(users);
          
          // Parse total_transactions at offset 12 (8 discriminator + 4 user_count)
          const transactions = new anchor.BN(
            accountInfo.data.slice(12, 20),
            'le'
          ).toNumber();
          setTotalTransactions(transactions);
          
          // Calculate price using the new three-phase model
          const price = EquaPriceCalculator.calculatePrice(transactions);
          const phase = EquaPriceCalculator.getPhase(transactions);
          const epoch = EquaPriceCalculator.getCurrentEpoch(transactions);
          
          setCurrentPrice(price);
          setCurrentEpoch(epoch);
          setCurrentPhase(phase);
          
          // Calculate minting rate based on total users and tier configuration
          const nextUserNumber = users + 1;
          const currentTier = ELEVATED_MINT_TIERS.find(
            tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
          );
          
          if (currentTier) {
            if (users === 0) {
              // First user gets 100,000
              setMintingRate('100,000');
            } else if (users < 10) {
              // Next users get 10,000-100,000 range
              setMintingRate('10,000 - 100,000');
            } else if (users < 100) {
              // Users 11-100 get 1,000-10,000 range
              setMintingRate('1,000 - 10,000');
            } else {
              // All other users get 100
              setMintingRate('100');
            }
          } else {
            setMintingRate('100');
          }
        } else {
          // Default values if global state doesn't exist yet
          setCurrentPrice(0.01);
          setCurrentEpoch(0);
          setTotalTransactions(0);
          setTotalUsers(0);
          setCurrentPhase('phase1');
          setMintingRate('100,000');
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Use default values on error
        setCurrentPrice(0.01);
        setCurrentEpoch(0);
        setTotalTransactions(0);
        setTotalUsers(0);
        setCurrentPhase('phase1');
        setMintingRate('1,000 - 100,000');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, [connection]);

  const getPhaseLabel = (phase: PricePhase): string => {
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
  };

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
            ${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-purple-300 text-xs mt-1" data-testid="current-phase">{getPhaseLabel(currentPhase)}</p>
        </div>
        
        <div>
          <p className="text-purple-200 text-sm mb-2">Minting Rate</p>
          <p className="text-white text-3xl font-bold" data-testid="mint-rate">{mintingRate}</p>
          <p className="text-purple-300 text-xs mt-1">EQUA/day</p>
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
              <p className="text-purple-200 text-sm mb-2">Transactions</p>
              <p className="text-white text-3xl font-bold" data-testid="total-transactions">
                {totalTransactions.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">Epoch {currentEpoch.toLocaleString()}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
