'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { EquaPriceCalculator } from '@/utils/priceCalculator';
import { PROGRAM_ID } from '@/lib/constants';
import { safeParseUserCount } from '@/utils/safeAccountParsing';
import * as anchor from '@coral-xyz/anchor';

interface PriceDisplayProps {
  className?: string;
}

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '' }) => {
  const { connection } = useConnection();
  const [currentPrice, setCurrentPrice] = useState<number>(0.01);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
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
          // Structure: 8 discriminator + 8 total_users + 8 total_transactions + 8 current_epoch + 1 compounding_complete
          const totalUsers = safeParseUserCount(accountInfo.data);
          
          // Parse total_transactions at offset 16
          const totalTransactions = new anchor.BN(
            accountInfo.data.slice(16, 24),
            'le'
          ).toNumber();
          
          // Parse current_epoch at offset 24
          const epoch = new anchor.BN(
            accountInfo.data.slice(24, 32),
            'le'
          ).toNumber();
          
          // Parse compounding_complete at offset 32
          const compoundingComplete = accountInfo.data[32] !== 0;
          
          // Calculate price
          const price = EquaPriceCalculator.calculatePrice(
            totalTransactions,
            epoch,
            compoundingComplete
          );
          
          setCurrentPrice(price);
          setCurrentEpoch(epoch);
          
          // Set minting rate based on user tier
          if (totalUsers === 0) {
            setMintingRate('100,000');
          } else if (totalUsers < 10) {
            setMintingRate('10,000 - 100,000');
          } else if (totalUsers < 100) {
            setMintingRate('1,000 - 10,000');
          } else {
            setMintingRate('100');
          }
        } else {
          // Default values if global state doesn't exist yet
          setCurrentPrice(0.01);
          setCurrentEpoch(0);
          setMintingRate('100,000');
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Use default values on error
        setCurrentPrice(0.01);
        setCurrentEpoch(0);
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
    <div className={`bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-6 border border-purple-400/50 ${className}`}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-purple-200 text-sm mb-2">Current EQUA Price</p>
          <p className="text-white text-3xl font-bold">
            ${currentPrice < 1 ? currentPrice.toFixed(4) : currentPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-purple-300 text-xs mt-1">Epoch {currentEpoch.toLocaleString()}</p>
        </div>
        
        <div>
          <p className="text-purple-200 text-sm mb-2">Minting Rate</p>
          <p className="text-white text-3xl font-bold">{mintingRate}</p>
          <p className="text-purple-300 text-xs mt-1">EQUA/day</p>
        </div>
      </div>
    </div>
  );
};
