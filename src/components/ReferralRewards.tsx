'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  getReferralStats,
  formatReferralRewards,
  getReferredUsersDetails,
} from '@/utils/referralRewards';
import { getUserAccountPDA } from '@/lib/program';

interface ReferralRewardsProps {
  className?: string;
}

/**
 * ReferralRewards Component
 * 
 * Displays referral rewards information and provides UI for claiming rewards.
 * 
 * Note: Claiming functionality requires backend program support.
 * Currently displays accumulated rewards and referred users.
 */
export const ReferralRewards: FC<ReferralRewardsProps> = ({ className = '' }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [referredUsers, setReferredUsers] = useState<PublicKey[]>([]);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const loadReferralData = useCallback(async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError('');

    try {
      // Derive the user account PDA from the connected wallet's public key
      const [userAccountPDA] = getUserAccountPDA(publicKey);
      
      console.log(`✓ Fetching referral stats for PDA: ${userAccountPDA.toBase58()}`);

      // Fetch referral statistics
      const stats = await getReferralStats(connection, userAccountPDA);
      
      if (stats) {
        setCredits(stats.credits);
        setReferredCount(stats.referredCount);
        setReferredUsers(stats.referredUsers);
      } else {
        setError('Could not load referral data.');
      }
    } catch (err) {
      console.error('Error loading referral data:', err);
      setError('Failed to load referral information.');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setCredits(null);
      setReferredCount(0);
      setReferredUsers([]);
      return;
    }

    loadReferralData();
  }, [connected, publicKey, loadReferralData]);

  const handleClaimRewards = async () => {
    // TODO: Implement claim functionality when backend supports it
    alert(
      'Claim functionality requires backend program support.\n\n' +
      'To implement:\n' +
      '1. Add claim_referral_rewards instruction to the Solana program\n' +
      '2. Update this component to call the instruction\n\n' +
      'See docs/REFERRAL_REWARDS_IMPLEMENTATION.md for details.'
    );
  };

  if (!connected) {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h3 className="text-xl font-bold text-white mb-2">Referral Rewards</h3>
          <p className="text-purple-300">Connect your wallet to view referral rewards</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p className="text-purple-300">Loading referral data...</p>
        </div>
      </div>
    );
  }

  const hasCredits = credits !== null && credits > 0;

  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          🔗 Referral Rewards
        </h3>
      </div>

      {error && (
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 mb-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Rewards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Accumulated Credits */}
        <div className="bg-purple-600/20 border border-purple-500/50 rounded-xl p-4">
          <div className="text-purple-300 text-sm mb-1">Accumulated Credits</div>
          <div className="text-3xl font-bold text-white flex items-baseline gap-2">
            {credits !== null ? credits : 0}
            <span className="text-lg text-purple-300">
              {(credits !== null ? credits : 0) !== 1 ? 'Credits' : 'Credit'}
            </span>
          </div>
          {credits !== null && credits >= 5 && (
            <div className="text-yellow-300 text-sm mt-2">
              ✨ {Math.floor(credits / 5)} bonus mint{Math.floor(credits / 5) !== 1 ? 's' : ''} available
            </div>
          )}
        </div>

        {/* Referred Users */}
        <div className="bg-blue-600/20 border border-blue-500/50 rounded-xl p-4">
          <div className="text-blue-300 text-sm mb-1">Users Referred</div>
          <div className="text-3xl font-bold text-white">
            {referredCount}
          </div>
          {referredCount > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-400 text-sm mt-2 hover:underline"
            >
              {showDetails ? 'Hide details' : 'View details'}
            </button>
          )}
        </div>
      </div>

      {/* Referred Users Details */}
      {showDetails && referredUsers.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h4 className="text-white font-semibold mb-3">Referred Users</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {referredUsers.map((userPubkey, index) => (
              <div
                key={userPubkey.toBase58()}
                className="bg-white/10 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-purple-400 font-mono text-sm">
                    #{index + 1}
                  </span>
                  <span className="text-white font-mono text-xs break-all">
                    {userPubkey.toBase58().slice(0, 8)}...{userPubkey.toBase58().slice(-8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim Button */}
      <div className="space-y-3">
        <button
          onClick={handleClaimRewards}
          disabled={!hasCredits}
          className={`w-full font-bold py-4 px-6 rounded-xl transition-all ${
            hasCredits
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
          }`}
          title={hasCredits ? 'Claim your referral credits' : 'No credits to claim'}
        >
          {hasCredits ? '💰 Claim Credits' : '⏳ No Credits Available'}
        </button>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">About Referral Credits</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Earn 1 credit per individual referral, 2 credits per business referral</li>
                <li>Credits are awarded on successful registration</li>
                <li>Redeem 5 credits for 1 bonus minting attempt</li>
                <li>Claiming requires backend program support (coming soon)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadReferralData}
        disabled={isLoading}
        className="w-full mt-4 text-purple-400 hover:text-purple-300 text-sm py-2 transition-colors"
      >
        🔄 Refresh Data
      </button>
    </div>
  );
};
