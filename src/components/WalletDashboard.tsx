'use client';

import { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, SendTransactionError } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { 
  getMintPDA, 
  getSPLTokenBalance, 
  getUserAccountPDA, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getEquaMintDecimals,
  getMintAuthorityPDA,
  getGlobalStatePDA,
  verifyMintOwner,
  createTransferTokensInstruction,
  clearRpcCache
} from '@/lib/program';
import { Logo } from './Logo';
import Image from 'next/image';
import { formatEquaBalance, rawToDecimal, parseDecimalStringToRaw, decimalToRaw } from '@/utils/tokenFormat';
import { getUserLocaleCurrency, formatLocalCurrency, DEFAULT_RATES } from '@/utils/localeCurrency';
import { getEquaPriceMultiFormat } from '@/utils/eqxOracle';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useEquaBalance } from '@/hooks/useEquaBalance';
import { NetworkDiagnosticsBanner } from './NetworkDiagnosticsBanner';
import { claimBonusMint, getReferralStats } from '@/utils/referralRewards';
import { useRegistrationStatus, RegistrationStatus } from '@/contexts/RegistrationContext';

interface WalletDashboardProps {
  className?: string;
}

// EQUA Token decimals will be fetched from on-chain mint
// Default to 6 decimals as per the on-chain mint configuration

// Default EQUA price in USD per 1 EQUA token (used as fallback if price fetch fails)
const DEFAULT_EQUA_PRICE_USD = 1.00;

// Shared constants for referral messages
const EQUA_SHARE_BASE_URL = 'https://equa.live/mint';

/**
 * Generates a referral message for sharing
 * @param pubkeyBase58 - The public key in base58 format
 * @returns The formatted referral message
 */
function generateReferralMessage(pubkeyBase58: string): string {
  return `Join EQUA Token - A revolutionary token system on Solana with price appreciation! Use my referral: ${pubkeyBase58}\n\nGet started: ${EQUA_SHARE_BASE_URL}`;
}

/**
 * Generates a referral URL for sharing
 * @param pubkeyBase58 - The public key in base58 format
 * @returns The referral URL with ref parameter
 */
function generateReferralUrl(pubkeyBase58: string): string {
  return `${EQUA_SHARE_BASE_URL}?ref=${pubkeyBase58}`;
}

export const WalletDashboard: FC<WalletDashboardProps> = ({ className = '' }) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  // ✅ NEW: Use centralized registration context
  const { 
    status: registrationStatus, 
    isLoading: isCheckingRegistration 
  } = useRegistrationStatus();
  
  // Use real-time balance hook instead of manual fetching
  const { balance, isLoading: isBalanceLoading } = useEquaBalance();
  
  const [mintDecimals, setMintDecimals] = useState<number>(6); // Default to 6
  const [isLoading, setIsLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralCredits, setReferralCredits] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Get user account PDA derived from connected wallet (memoized to prevent repeated calls)
  const userAccountPDA = useMemo(() => {
    return publicKey ? getUserAccountPDA(publicKey)[0] : null;
  }, [publicKey]); // Recompute when wallet changes
  
  // Fetch user account data from blockchain (includes referral info)
  const { data: userAccountData } = useUserAccount(
    userAccountPDA,
    { enabled: connected && !!userAccountPDA }
  );

  // Fetch mint decimals and referral data from onchain
  useEffect(() => {
    if (!publicKey || !connected) {
      setMintDecimals(6);
      setReferralCount(0);
      setReferralCredits(null);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch mint decimals from on-chain
        const decimals = await getEquaMintDecimals(connection);
        setMintDecimals(decimals);
        
        // Get referral credits from on-chain (integer count, not EQUA amounts)
        if (userAccountPDA) {
          const stats = await getReferralStats(connection, userAccountPDA);
          
          if (stats) {
            // Use integer credits from backend
            setReferralCredits(stats.credits);
            // Use on-chain referred user count
            setReferralCount(stats.referredCount);
            if (process.env.NODE_ENV === 'development') {
              console.log('✓ Referral credits:', stats.credits);
              console.log('✓ On-chain referral count:', stats.referredCount);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connected, connection, userAccountPDA]);

  // Copy public key to clipboard
  const copyPublicKey = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [publicKey]);

  // Share referral - opens modal
  const shareReferral = useCallback(() => {
    if (!publicKey) return;
    setShowShareModal(true);
  }, [publicKey]);

  // Claim referral credits for bonus mint
  const handleClaimCredits = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setClaimError('Wallet not connected properly');
      return;
    }

    if (!referralCredits || referralCredits < 5) {
      setClaimError('You need at least 5 credits to claim');
      return;
    }

    setIsClaiming(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      // Get user account to verify registration
      const [userAccountPDA] = getUserAccountPDA(publicKey);
      const accountInfo = await connection.getAccountInfo(userAccountPDA);
      
      if (!accountInfo) {
        throw new Error('User account not found. Please register first.');
      }

      // Use conservative default amount (tier 4 limit for users 101-1000)
      const DEFAULT_BONUS_MINT_AMOUNT_EQUA = 100;
      const amountInBaseUnits = decimalToRaw(DEFAULT_BONUS_MINT_AMOUNT_EQUA);

      if (process.env.NODE_ENV === 'development') {
        console.log(`Claiming bonus mint: ${DEFAULT_BONUS_MINT_AMOUNT_EQUA} EQUA (${amountInBaseUnits} base units)`);
      }

      // Call claimBonusMint utility
      const signature = await claimBonusMint(
        connection,
        { signTransaction, publicKey },
        amountInBaseUnits
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Bonus mint claimed. Signature:', signature);
      }

      // Show success message
      const creditsRemaining = referralCredits - 5;
      setClaimSuccess(
        `✅ Successfully claimed ${DEFAULT_BONUS_MINT_AMOUNT_EQUA} EQUA! ${creditsRemaining} credits remaining.`
      );

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setClaimSuccess(''), 5000);

      // Refresh referral data after successful claim
      const [userPDA] = getUserAccountPDA(publicKey);
      const stats = await getReferralStats(connection, userPDA);
      if (stats) {
        setReferralCredits(stats.credits);
        setReferralCount(stats.referredCount);
      }

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
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setClaimError(errorMessage);
      
      // Auto-dismiss error message after 8 seconds
      setTimeout(() => setClaimError(''), 8000);
    } finally {
      setIsClaiming(false);
    }
  }, [publicKey, signTransaction, connection, referralCredits]);

  // ✅ Early return if wallet not connected
  if (!connected || !publicKey) {
    return null;
  }

  // ✅ Show loading state while checking (silent - no flicker)
  if (isCheckingRegistration || registrationStatus === RegistrationStatus.CHECKING) {
    return null;
  }

  // ✅ Hide Send/Receive for unregistered users
  if (registrationStatus === RegistrationStatus.NOT_REGISTERED || 
      registrationStatus === RegistrationStatus.UNKNOWN) {
    console.log('💡 [WalletDashboard] User not registered or status unknown, hiding dashboard');
    return null;
  }

  // ✅ Only registered users reach here
  if (registrationStatus === RegistrationStatus.REGISTERED) {
    return (
      <div className={`${className}`}>
        {/* Network Diagnostics Banner */}
        <NetworkDiagnosticsBanner />
        
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/30 backdrop-blur-md rounded-2xl p-6 border border-purple-400/50 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-purple-200 text-lg font-medium">Your EQUA Balance</h3>
            <Logo size={32} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-4xl font-bold" data-testid="equa-balance">
              {balance > 0 ? formatEquaBalance(balance) : '--'}
            </span>
            <span className="text-purple-300 text-xl">EQUA</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowSendModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">📤</span>
            Send EQUA
          </button>
          <button
            onClick={() => setShowReceiveModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">📥</span>
            Receive EQUA
          </button>
        </div>

        {/* Referral Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              Refer & Earn
            </h3>
            {/* Referral Count Badge */}
            <div className="bg-purple-600/30 px-3 py-1 rounded-full">
              <span className="text-purple-200 text-sm font-medium">
                {referralCount} {referralCount === 1 ? 'referral' : 'referrals'}
              </span>
            </div>
          </div>
          <p className="text-purple-200 text-sm mb-4">
            Earn referral credits: 1 credit per individual referral, 2 credits per business referral. 
            Redeem 5 credits for bonus minting attempts!
          </p>
          
          {/* Referral Credits Display */}
          {referralCredits !== null && referralCredits > 0 && (
            <div className="space-y-3 mb-4">
              {/* Error Message */}
              {claimError && (
                <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-3">
                  <p className="text-red-200 text-xs">{claimError}</p>
                </div>
              )}

              {/* Success Message */}
              {claimSuccess && (
                <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-3">
                  <p className="text-green-200 text-xs">{claimSuccess}</p>
                </div>
              )}

              {/* Credits Display Card */}
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-300 text-xs mb-1">Referral Credits</p>
                <p className="text-white text-lg font-bold">
                  {referralCredits} Credit{referralCredits !== 1 ? 's' : ''}
                </p>
                {referralCredits >= 5 && (
                  <p className="text-yellow-300 text-xs mt-1">
                    ✨ Ready to claim bonus mint!
                  </p>
                )}
              </div>

              {/* Claim Button - Only show when credits >= 5 */}
              {referralCredits >= 5 && (
                <button
                  onClick={handleClaimCredits}
                  disabled={isClaiming}
                  className={`w-full font-bold py-3 px-4 rounded-xl transition-all text-sm ${
                    isClaiming
                      ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  }`}
                  title={isClaiming ? 'Claiming...' : 'Claim your referral credits for a bonus mint'}
                >
                  {isClaiming ? '⏳ Claiming...' : '💰 Claim Credits'}
                </button>
              )}
            </div>
          )}
          
          <div className="bg-black/20 rounded-xl p-3 mb-4">
            <p className="text-purple-300 text-xs mb-1">Your Referral Key</p>
            <p className="text-white text-xs font-mono break-all">
              {publicKey.toBase58()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyPublicKey}
              className="bg-purple-500/30 hover:bg-purple-500/50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              {copied ? '✅ Copied!' : '📋 Copy Key'}
            </button>
            <button
              onClick={shareReferral}
              className="bg-green-500/30 hover:bg-green-500/50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              📲 Share
            </button>
          </div>
          
          {shareMessage && (
            <p className="text-green-400 text-sm text-center mt-3">{shareMessage}</p>
          )}
        </div>

        {/* Send Modal */}
        {showSendModal && (
          <SendModal
            publicKey={publicKey}
            balance={balance}
            mintDecimals={mintDecimals}
            connection={connection}
            signTransaction={signTransaction}
            onClose={() => setShowSendModal(false)}
            onSuccess={() => {
              setShowSendModal(false);
              // Balance will be updated automatically via useEquaBalance subscription
            }}
          />
        )}

        {/* Receive Modal */}
        {showReceiveModal && (
          <ReceiveModal
            publicKey={publicKey}
            onClose={() => setShowReceiveModal(false)}
          />
        )}

        {/* Share Modal */}
        {showShareModal && (
          <ShareModal
            publicKey={publicKey}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    );
  }

  // ✅ Fallback for error state
  if (registrationStatus === RegistrationStatus.ERROR) {
    console.warn('⚠️ [WalletDashboard] Registration status error');
    return null;
  }

  // Should never reach here
  return null;
};

// ... (rest of the SendModal, ReceiveModal, ShareModal components remain unchanged)
// Truncated for brevity - the modal components are identical to the previous version
