'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  getReferralStats,
  formatReferralRewards,
  getReferredUsersDetails,
  claimBonusMint,
} from '@/utils/referralRewards';
import { getUserAccountPDA, getGlobalStatePDA } from '@/lib/program';
import { decimalToRaw, rawToDecimal } from '@/utils/tokenFormat';
import { fetchUserMetadata } from '@/utils/userMetadata';
import { calculateTierLimit } from '@/utils/tierLimits';
import { decodeGlobalState } from '@/utils/safeAccountParsing';

interface ReferralRewardsProps {
  className?: string;
}

// Credits required to claim one bonus mint (from backend business rules)
const CREDITS_REQUIRED_FOR_BONUS_MINT = 5;

/**
 * ReferralRewards Component
 * 
 * Displays referral rewards information and provides UI for claiming rewards.
 * Users can redeem 5 credits for 1 bonus mint attempt (up to 5 per month).
 */
export const ReferralRewards: FC<ReferralRewardsProps> = ({ className = '' }) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [referredUsers, setReferredUsers] = useState<PublicKey[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected properly');
      return;
    }

    setIsClaiming(true);
    setError('');
    setSuccessMessage('');

    try {
      // Get user account to verify registration
      const [userAccountPDA] = getUserAccountPDA(publicKey);
      const accountInfo = await connection.getAccountInfo(userAccountPDA);
      
      if (!accountInfo) {
        throw new Error('User account not found. Please register first.');
      }

      // Fetch UserMetadata to get user_index and elevated_mint_attempts_used
      const userMetadata = await fetchUserMetadata(connection, publicKey);
      if (!userMetadata) {
        throw new Error('Unable to fetch user metadata. Please try again.');
      }

      // Fetch GlobalState to get total user count
      const [globalStatePDA] = getGlobalStatePDA();
      const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
      if (!globalStateAccount) {
        throw new Error('Unable to fetch global state. Please try again.');
      }

      const globalState = decodeGlobalState(globalStateAccount.data);
      if (!globalState) {
        throw new Error('Unable to decode global state. Please try again.');
      }

      // Calculate tier-based mint limit
      const tierLimitBaseUnits = calculateTierLimit(
        userMetadata.user_index,
        userMetadata.elevated_mint_attempts_used,
        globalState.userCount
      );

      // Convert bigint to number for transaction (safe for tier limits which are well below MAX_SAFE_INTEGER)
      // Largest tier limit is 100,000 UNIA = 100_000_000_000 base units << Number.MAX_SAFE_INTEGER (2^53 - 1)
      const amountInBaseUnits = Number(tierLimitBaseUnits);
      
      // Convert to decimal UNIA for display (rawToDecimal handles the conversion)
      const amountInEqua = rawToDecimal(tierLimitBaseUnits);

      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Tier calculation:', {
          user_index: userMetadata.user_index,
          elevated_attempts_used: userMetadata.elevated_mint_attempts_used,
          total_users: globalState.userCount,
          tier_limit_equa: amountInEqua,
          tier_limit_base_units: amountInBaseUnits,
        });
      }

      // Call claimBonusMint utility with calculated tier amount
      const signature = await claimBonusMint(
        connection,
        { signTransaction, publicKey },
        amountInBaseUnits
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Bonus mint claimed. Signature:', signature);
      }

      // Show success message with actual claimed amount
      // Note: credits is guaranteed non-null because button is only enabled when hasCredits is true
      const creditsRemaining = credits! - CREDITS_REQUIRED_FOR_BONUS_MINT;
      setSuccessMessage(
        `✅ Successfully claimed ${amountInEqua} UNIA! ` +
        `${creditsRemaining} credits remaining. You can claim another bonus mint immediately if you have 5+ credits.`
      );

      // Refresh data after successful claim
      await loadReferralData();

    } catch (err: any) {
      console.error('Error claiming bonus mint:', err);
      
      // Parse specific error messages
      let errorMessage = 'Failed to claim bonus mint. ';
      
      if (err.message?.includes('InsufficientReferralCredits')) {
        errorMessage += 'You need at least 5 credits.';
      } else if (err.message?.includes('MonthlyBonusMintCapReached')) {
        errorMessage += 'You have reached the monthly limit of 5 bonus mints.';
      } else if (err.message?.includes('MintAmountExceedsTierLimit')) {
        errorMessage += 'Amount exceeds your tier limit.';
      } else if (err.message?.includes('MintingCooldownNotExpired')) {
        errorMessage += 'Unexpected: Bonus mints should not have cooldown restrictions. Please try again or contact support.';
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
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

  // Helper to check if user has enough credits to claim
  const hasCredits = credits !== null && credits >= CREDITS_REQUIRED_FOR_BONUS_MINT;

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

      {successMessage && (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-4 mb-4">
          <p className="text-green-200">{successMessage}</p>
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
          disabled={!hasCredits || isClaiming}
          className={`w-full font-bold py-4 px-6 rounded-xl transition-all ${
            hasCredits && !isClaiming
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
          }`}
          title={
            isClaiming 
              ? 'Claiming...' 
              : hasCredits 
                ? 'Claim your referral credits for a bonus mint' 
                : 'Need 5 credits to claim'
          }
        >
          {isClaiming ? '⏳ Claiming...' : hasCredits ? '💰 Claim Credits' : '⏳ Need 5 Credits'}
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
                <li>Maximum 5 bonus mints per calendar month</li>
                <li>✨ Bonus mints bypass the 24-hour cooldown (instant redemption)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadReferralData}
        disabled={isLoading || isClaiming}
        className="w-full mt-4 text-purple-400 hover:text-purple-300 text-sm py-2 transition-colors disabled:opacity-50"
      >
        🔄 Refresh Data
      </button>
    </div>
  );
};
