'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { EquaPriceCalculator, PricePhase } from '@/utils/priceCalculator';
import { PROGRAM_ID } from '@/lib/constants';
import { safeParseUserCount } from '@/utils/safeAccountParsing';
import { ELEVATED_MINT_TIERS } from '@/utils/registration';
import * as anchor from '@coral-xyz/anchor';
import { getRegistrationStats } from '@/utils/registrationStats';

interface PriceDisplayProps {
  className?: string;
  showStats?: boolean;
}

export const PriceDisplay: FC<PriceDisplayProps> = ({ className = '', showStats = false }) => {
  const { connection } = useConnection();
  const [currentPrice, setCurrentPrice] = useState<number>(0.01);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [totalTransfers, setTotalTransfers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [individualUsers, setIndividualUsers] = useState<number>(0);
  const [businessUsers, setBusinessUsers] = useState<number>(0);
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
          // Note: This includes minting and registration. For true transfers count,
          // we need to track separately. For now, we estimate transfers = total - registrations
          const totalTx = new anchor.BN(
            accountInfo.data.slice(12, 20),
            'le'
          ).toNumber();
          
          // Estimate transfers: total transactions minus registrations (each user creates 1 registration tx)
          // and minus mints (approximately users * average_mints_per_user)
          // For accurate tracking, this should be stored in the smart contract
          // For now, consider only user-to-user transfers for price calculation
          const estimatedTransfers = Math.max(0, totalTx - users * 2); // Subtract registrations and initial mints
          setTotalTransfers(estimatedTransfers);
          
          // Calculate price based on TRANSFERS only (not all transactions)
          // Price appreciates based on actual economic activity (transfers between users)
          const price = EquaPriceCalculator.calculatePrice(estimatedTransfers);
          const phase = EquaPriceCalculator.getPhase(estimatedTransfers);
          const epoch = EquaPriceCalculator.getCurrentEpoch(estimatedTransfers);
          
          setCurrentPrice(price);
          setCurrentEpoch(epoch);
          setCurrentPhase(phase);
          
          // Get registration stats from localStorage
          const stats = getRegistrationStats();
          setIndividualUsers(stats.individualCount);
          setBusinessUsers(stats.businessCount);
          
          // Calculate minting rate based on total users and tier configuration
          // Show the current tier rate (what the next user will get), not a range
          const nextUserNumber = users + 1;
          const currentTier = ELEVATED_MINT_TIERS.find(
            tier => nextUserNumber >= tier.minUser && nextUserNumber <= tier.maxUser
          );
          
          if (currentTier) {
            // Show the exact EQUA per attempt for the current tier
            setMintingRate(currentTier.equaPerAttempt.toLocaleString());
          } else {
            // Default for standard users
            setMintingRate('100');
          }
        } else {
          // Default values if global state doesn't exist yet
          // First user gets 100,000
          setCurrentPrice(0.01);
          setCurrentEpoch(0);
          setTotalTransfers(0);
          setTotalUsers(0);
          setIndividualUsers(0);
          setBusinessUsers(0);
          setCurrentPhase('phase1');
          setMintingRate('100,000');
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Use default values on error - show current tier for first user
        setCurrentPrice(0.01);
        setCurrentEpoch(0);
        setTotalTransfers(0);
        setTotalUsers(0);
        setIndividualUsers(0);
        setBusinessUsers(0);
        setCurrentPhase('phase1');
        setMintingRate('100,000');
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
            ${currentPrice === 0.01 
              ? '0.01' 
              : currentPrice < 1 
                ? currentPrice.toFixed(4) 
                : currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
            }
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
              <p className="text-purple-300 text-xs mt-1">
                {individualUsers > 0 || businessUsers > 0 
                  ? `👤 ${individualUsers} | 🏢 ${businessUsers}`
                  : 'Total users'}
              </p>
            </div>

            <div>
              <p className="text-purple-200 text-sm mb-2">Transfers</p>
              <p className="text-white text-3xl font-bold" data-testid="total-transactions">
                {totalTransfers.toLocaleString()}
              </p>
              <p className="text-purple-300 text-xs mt-1">Between users</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
