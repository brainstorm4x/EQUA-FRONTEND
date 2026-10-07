'use client';

import { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, SendTransactionError } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@/lib/spl-token-inline';
import { BN } from '@coral-xyz/anchor';
import { 
  getMintPDA, 
  getSPLTokenBalance, 
  getUserAccountPDA, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getMintAuthorityPDA,
  getGlobalStatePDA,
  verifyMintOwner,
  createTransferTokensInstruction,
  clearRpcCache
} from '@/lib/program';
import { UNIYAA_DECIMALS } from '@/lib/constants';
import { Logo } from './Logo';
import Image from 'next/image';
import { formatUniyaaBalance, rawToDecimal, parseDecimalStringToRaw, decimalToRaw } from '@/utils/tokenFormat';
import { getUserLocaleCurrency, getPreferredCurrency, setPreferredCurrency, getSavedPreferredCurrency, formatLocalCurrency, DEFAULT_RATES } from '@/utils/localeCurrency';
import { fetchFxRates } from '@/utils/fxRateClient';
import { getUniyaaPriceMultiFormat } from '@/utils/multiFormatPrice';
import { UniyaaPriceCalculator } from '@/utils/priceCalculator';
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';
import { useUniyaaBalance } from '@/hooks/useUniyaaBalance';
import { NetworkDiagnosticsBanner } from './NetworkDiagnosticsBanner';
import { isUserRegistered } from '@/utils/registrationCheck';
import { claimBonusMint, getReferralStats } from '@/utils/referralRewards';
import { fetchUserMetadata } from '@/utils/userMetadata';
import { decodeGlobalState } from '@/utils/safeAccountParsing';
import { calculateTierLimit, describeTierCalculation } from '@/utils/tierLimits';

interface WalletDashboardProps {
  className?: string;
}


// Shared constants for referral messages
const UNIYAA_SHARE_BASE_URL = 'https://uniyaa.live/mint';

/**
 * Generates a referral message for sharing
 * @param pubkeyBase58 - The public key in base58 format
 * @returns The formatted referral message
 */
function generateReferralMessage(pubkeyBase58: string): string {
  return `Join UNIYAA Token - A revolutionary token system on Solana with price appreciation! Use my referral: ${pubkeyBase58}\n\nGet started: ${UNIYAA_SHARE_BASE_URL}`;
}

/**
 * Generates a referral URL for sharing
 * @param pubkeyBase58 - The public key in base58 format
 * @returns The referral URL with ref parameter
 */
function generateReferralUrl(pubkeyBase58: string): string {
  return `${UNIYAA_SHARE_BASE_URL}?ref=${pubkeyBase58}`;
}

export const WalletDashboard: FC<WalletDashboardProps> = ({ className = '' }) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  // Use real-time balance hook instead of manual fetching
  const { balance, isLoading: isBalanceLoading } = useUniyaaBalance();
  
  const mintDecimals = UNIYAA_DECIMALS; // Fixed by the on-chain mint; never changes
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
  
  // ✅ Registration check state
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // Get user account PDA derived from connected wallet (memoized to prevent repeated calls)
  const userAccountPDA = useMemo(() => {
    return publicKey ? getUserAccountPDA(publicKey)[0] : null;
  }, [publicKey]); // Recompute when wallet changes

  // ✅ Check registration status
  useEffect(() => {
    async function checkRegistration() {
      if (!publicKey) {
        setIsRegistered(false);
        setIsCheckingRegistration(false);
        return;
      }
      
      setIsCheckingRegistration(true);
      
      try {
        const registered = await isUserRegistered(connection, publicKey);
        setIsRegistered(registered);
        
        if (registered) {
          console.log('✅ [WalletDashboard] User is registered, showing Send/Receive');
        } else {
          console.log('💡 [WalletDashboard] User not registered, hiding Send/Receive');
        }
      } catch (error) {
        console.error('❌ [WalletDashboard] Error checking registration:', error);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    }
    
    checkRegistration();
  }, [publicKey, connection]);

  // Fetch referral data from onchain once per wallet. Credits only change
  // when this user claims (handleClaimCredits refreshes them) or a referee
  // registers, so polling would re-run getProgramAccounts for nothing.
  useEffect(() => {
    if (!publicKey || !connected) {
      setReferralCount(0);
      setReferralCredits(null);
      return;
    }

    const fetchData = async () => {
      try {
        // Get referral credits from on-chain (integer count, not UNIYAA amounts)
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

    // ✅ ADDED: Prevent duplicate submissions
    if (isClaiming) {
      console.warn('⚠️ Claim already in progress, ignoring duplicate request');
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
      // 1. Fetch UserMetadata to get user_index and elevated_mint_attempts_used
      const userMetadata = await fetchUserMetadata(connection, publicKey);
      
      if (!userMetadata) {
        throw new Error('User metadata not found. Please register first.');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 UserMetadata fetched:', {
          userIndex: userMetadata.user_index,
          elevatedAttemptsUsed: userMetadata.elevated_mint_attempts_used,
        });
      }
      
      // 2. Fetch GlobalState to get total user count
      const [globalStatePDA] = getGlobalStatePDA();
      const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
      
      if (!globalStateInfo) {
        throw new Error('Global state not found.');
      }
      
      const globalState = decodeGlobalState(globalStateInfo.data);
      
      if (!globalState) {
        throw new Error('Failed to decode global state.');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 GlobalState fetched:', {
          userCount: globalState.userCount,
        });
      }
      
      // 3. Calculate tier-based mint amount
      const tierLimitBaseUnits = calculateTierLimit(
        userMetadata.user_index,
        userMetadata.elevated_mint_attempts_used,
        globalState.userCount
      );
      
      // Convert to number for transaction (safe for reasonable tier limits)
      const amountInBaseUnits = Number(tierLimitBaseUnits);
      const tierLimitUniyaa = rawToDecimal(amountInBaseUnits, 6);

      if (process.env.NODE_ENV === 'development') {
        // Get detailed tier calculation for logging
        const tierDetails = describeTierCalculation(
          userMetadata.user_index,
          userMetadata.elevated_mint_attempts_used,
          globalState.userCount
        );
        
        console.log(`📊 Tier Calculation:
  - User Index: ${userMetadata.user_index}
  - Elevated Attempts Used: ${userMetadata.elevated_mint_attempts_used}
  - Total Users: ${globalState.userCount}
  - Tier: ${tierDetails.tierName}
  - Is Elevated: ${tierDetails.isElevated}
  - User Tier Rate: ${Number(tierDetails.userTierRate) / 1_000_000} UNIYAA
  - Prevailing Rate: ${Number(tierDetails.prevailingRate) / 1_000_000} UNIYAA
  - Limited By: ${tierDetails.limitedBy}
  - Final Tier Limit: ${tierLimitUniyaa} UNIYAA (${amountInBaseUnits} base units)`);
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
        `✅ Successfully claimed ${tierLimitUniyaa} UNIYAA! ` +
        `${creditsRemaining} credits remaining. You can claim another bonus mint immediately if you have 5+ credits.`
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
      
      // ✅ NEW: Check if transaction actually succeeded (credits deducted)
      if (err.message?.includes('already been processed')) {
        // Verify credits were deducted
        const [userPDA] = getUserAccountPDA(publicKey);
        const stats = await getReferralStats(connection, userPDA);
        
        if (stats && stats.credits < referralCredits) {
          // Transaction succeeded on-chain despite error
          setClaimSuccess(
            `✅ Bonus mint claimed successfully! ` +
            `${stats.credits} credits remaining.`
          );
          
          // Refresh data
          setReferralCredits(stats.credits);
          setReferralCount(stats.referredCount);
          
          // Auto-dismiss success message
          setTimeout(() => setClaimSuccess(''), 5000);
          setIsClaiming(false);
          return; // Exit early
        }
      }
      
      // Parse specific error messages
      let errorMessage = 'Failed to claim bonus mint. ';
      
      if (err.message?.includes('InsufficientReferralCredits')) {
        errorMessage += 'You need at least 5 credits.';
      } else if (err.message?.includes('MonthlyBonusMintCapReached')) {
        errorMessage += 'You have reached the monthly limit of 5 bonus mints.';
      } else if (err.message?.includes('MintAmountExceedsTierLimit')) {
        errorMessage += 'Amount exceeds your tier limit.';
      } else if (err.message?.includes('MintingCooldownNotExpired')) {
        errorMessage += 'Unexpected cooldown error. Bonus mints should bypass cooldowns. Please contact support.';
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

  if (!connected || !publicKey) {
    return null;
  }

  // ✅ Show loading state while checking (silent - no flicker)
  if (isCheckingRegistration) {
    return null;
  }

  // ✅ Hide Send/Receive for unregistered users
  if (!isRegistered) {
    return null;
  }

  // ✅ Only registered users reach here
  return (
    <div className={`${className}`}>
      {/* Network Diagnostics Banner */}
      <NetworkDiagnosticsBanner />
      
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/30 backdrop-blur-md rounded-2xl p-6 border border-purple-400/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-200 text-lg font-medium">Your UNIYAA Balance</h3>
          <Logo size={32} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white text-4xl font-bold" data-testid="uniyaa-balance">
            {balance > 0 ? formatUniyaaBalance(balance) : '--'}
          </span>
          <span className="text-purple-300 text-xl">UNIYAA</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">📤</span>
          Send UNIYAA
        </button>
        <button
          onClick={() => setShowReceiveModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">📥</span>
          Receive UNIYAA
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
              <p className="text-purple-300 text-xs mt-2">
                💡 Bonus mints bypass the 24-hour cooldown that applies to regular minting
              </p>
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
            // Balance will be updated automatically via useUniyaaBalance subscription
            // No manual refresh needed
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
};

// Send Modal Component
interface SendModalProps {
  publicKey: PublicKey;
  balance: number;
  mintDecimals: number;
  connection: any;
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

const SendModal: FC<SendModalProps> = ({ 
  publicKey, 
  balance, 
  mintDecimals,
  connection, 
  signTransaction,
  onClose, 
  onSuccess 
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [localCurrencyAmount, setLocalCurrencyAmount] = useState('');
  const [uniyaaPrice, setUniyaaPrice] = useState<number>(0.01);
  const [localCurrency, setLocalCurrency] = useState(() => {
    // Detect currency on initialization (runs once, synchronously on first render)
    if (typeof window !== 'undefined') {
      return getPreferredCurrency();
    }
    return 'USD'; // SSR fallback
  });
  const [allCurrencies, setAllCurrencies] = useState<string[]>([]);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const jsQRRef = useRef<typeof import('jsqr').default | null>(null);

  // Fetch totalTransactions + tier9StartTimestamp from GlobalState for the
  // capped Tier 9 price calculation.
  const { totalTransactions, tier9StartTimestamp } = useGlobalStateStats();

  // Resolve currency symbol dynamically for any currency code
  const getCurrencySymbol = (code: string): string => {
    if (DEFAULT_RATES[code]) return DEFAULT_RATES[code].symbol;
    try {
      const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code }).formatToParts(0);
      const symbolPart = parts.find(p => p.type === 'currency');
      return symbolPart?.value || code;
    } catch {
      return code;
    }
  };

  // Fetch all available currencies from FX rates API
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const fxData = await fetchFxRates();
        const detected = getUserLocaleCurrency();
        const codes = Object.keys(fxData.rates).sort();
        // Pin detected currency at top, followed by alphabetically sorted rest
        const pinned = codes.filter(c => c === detected);
        const rest = codes.filter(c => c !== detected);
        setAllCurrencies([...pinned, ...rest]);
      } catch {
        // Fallback to DEFAULT_RATES keys
        setAllCurrencies(Object.keys(DEFAULT_RATES).sort());
      }
    };
    loadCurrencies();
  }, []);

  // Fetch UNIYAA price based on current transaction count (re-runs when localCurrency changes)
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      // Compute price from on-chain transaction count + Tier 9 start timestamp
      // (matches PriceDisplay.tsx pattern). The timestamp engages the
      // $25k/30-day cap once Tier 9 is reached; ignored otherwise.
      const uniyaaPriceUsd = UniyaaPriceCalculator.calculatePrice(totalTransactions, tier9StartTimestamp);
      try {
        // Use the already-initialized localCurrency state
        const currencyCode = localCurrency;
        
        const priceData = await getUniyaaPriceMultiFormat(uniyaaPriceUsd, currencyCode);
        setUniyaaPrice(priceData.localCurrency);
        
        // Log FX metadata for debugging
        console.log(`FX Rate Info: ${currencyCode} = ${priceData.fxRate} (source: ${priceData.fxSource}, age: ${Math.floor((priceData.fxAge || 0) / 3600000)}h)`);
        
        // Warn if stale
        if (priceData.fxIsStale) {
          console.warn(`⚠️ FX rate for ${currencyCode} is stale (${Math.floor((priceData.fxAge || 0) / 3600000)} hours old)`);
        }
      } catch (err) {
        console.warn('Failed to fetch UNIYAA price:', err);
        setUniyaaPrice(uniyaaPriceUsd);
      } finally {
        setIsLoadingPrice(false);
      }
    };
    fetchPrice();
  }, [connection, localCurrency, totalTransactions, tier9StartTimestamp]);

  // Handle local currency amount change
  const handleLocalCurrencyChange = (value: string) => {
    setLocalCurrencyAmount(value);
    
    // Convert to UNIYAA
    if (value && !isNaN(parseFloat(value)) && uniyaaPrice > 0) {
      const localAmount = parseFloat(value);
      const uniyaaAmount = localAmount / uniyaaPrice;
      setAmount(uniyaaAmount.toFixed(6));
    } else {
      setAmount('');
    }
  };

  // Handle UNIYAA amount change
  const handleUniyaaAmountChange = (value: string) => {
    setAmount(value);
    
    // Convert to local currency
    if (value && !isNaN(parseFloat(value)) && uniyaaPrice > 0) {
      const uniyaaAmount = parseFloat(value);
      const localAmount = uniyaaAmount * uniyaaPrice;
      setLocalCurrencyAmount(localAmount.toFixed(6));
    } else {
      setLocalCurrencyAmount('');
    }
  };

  // Lazy load jsQR library once
  const getJsQR = async () => {
    if (!jsQRRef.current) {
      jsQRRef.current = (await import('jsqr')).default;
    }
    return jsQRRef.current;
  };

  // Handle QR code image upload using jsQR
  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const jsQR = await getJsQR();
      
      // Create an image element to read the file
      const img = document.createElement('img');
      const reader = new FileReader();
      
      reader.onload = () => {
        img.onload = () => {
          // Create a canvas to get image data
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setError('Could not process image');
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Decode QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            // Validate as Solana address
            try {
              new PublicKey(code.data.trim());
              setRecipientAddress(code.data.trim());
              setError('');
            } catch {
              setError('QR code does not contain a valid Solana address');
            }
          } else {
            setError('No QR code found in image');
          }
        };
        
        img.src = reader.result as string;
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('QR upload error:', err);
      setError('Failed to read QR code from image');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start camera for QR scanning
  const startCameraScanner = async () => {
    try {
      setScannerError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setShowQRScanner(true);
        scanQRCode();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setScannerError('Camera permission denied. Please allow camera access to scan QR codes.');
      } else if (err.name === 'NotFoundError') {
        setScannerError('No camera found on this device.');
      } else {
        setScannerError('Could not access camera. Try uploading a QR image instead.');
      }
    }
  };

  // Scan QR code from video stream
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const jsQR = await getJsQR();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          // Validate as Solana address
          try {
            new PublicKey(code.data.trim());
            setRecipientAddress(code.data.trim());
            stopCameraScanner();
            return;
          } catch {
            // Not a valid Solana address, continue scanning
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    
    tick();
  };

  // Stop camera scanner
  const stopCameraScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setShowQRScanner(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Try to validate as Solana address
      try {
        new PublicKey(text.trim());
        setRecipientAddress(text.trim());
        setError('');
      } catch {
        setError('Clipboard does not contain a valid Solana address');
      }
    } catch (err) {
      setError('Could not read from clipboard');
    }
  };

  const handleSend = async () => {
    if (!recipientAddress || !amount || !signTransaction) return;
    
    // ✅ ADDED: Prevent duplicate submissions
    if (isLoading) {
      console.warn('⚠️ Transaction already in progress, ignoring duplicate request');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress);
      } catch {
        throw new Error('Invalid recipient address');
      }

      const [mintPDA] = getMintPDA();
      const [mintAuthorityPDA] = getMintAuthorityPDA();
      const [globalStatePDA] = getGlobalStatePDA();
      
      // Verify mint owner is Token-2022 (preflight validation)
      await verifyMintOwner(connection, mintPDA);
      
      // Get sender's token account
      const senderTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Re-fetch current balance to ensure we have the latest value
      const currentBalance = await getSPLTokenBalance(connection, senderTokenAccount);
      
      // Parse amount using BigInt to avoid float issues
      const amountInBaseUnits = parseDecimalStringToRaw(amount, mintDecimals);
      
      if (amountInBaseUnits === null) {
        throw new Error('Invalid amount format');
      }

      if (amountInBaseUnits <= 0n) {
        throw new Error('Amount must be greater than zero');
      }

      // Validate against current balance
      if (amountInBaseUnits > BigInt(currentBalance)) {
        const balanceInUniyaa = rawToDecimal(currentBalance, mintDecimals);
        throw new Error(`Insufficient balance. You have ${balanceInUniyaa.toFixed(6)} UNIYAA available.`);
      }

      // Get recipient's token account
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        recipientPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get sender and recipient UserAccount PDAs (required for transfer_tokens)
      const [senderUserAccount] = getUserAccountPDA(publicKey);
      const [recipientUserAccount] = getUserAccountPDA(recipientPubkey);

      const transaction = new Transaction();

      // Check if recipient token account exists, if not create it
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientTokenAccount, // ata
            recipientPubkey, // owner
            mintPDA, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Add Anchor transfer_tokens instruction (uses Token-2022 transfer_checked via CPI)
      // Pass bigint directly - createTransferTokensInstruction handles the conversion
      transaction.add(
        createTransferTokensInstruction(
          senderUserAccount,
          senderTokenAccount,
          recipientUserAccount,
          recipientTokenAccount,
          mintPDA,
          mintAuthorityPDA,
          globalStatePDA,
          publicKey,
          TOKEN_PROGRAM_ID,
          amountInBaseUnits
        )
      );

      transaction.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      const signed = await signTransaction(transaction);

      // ✅ CHANGED: Skip preflight only if creating recipient ATA in same tx
      // This prevents false simulation failures when ATA creation is included
      const shouldSkipPreflight = !recipientAccountInfo; // Skip if we're creating ATA

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 Send transaction: skipPreflight=${shouldSkipPreflight}, creatingATA=${!recipientAccountInfo}`);
      }

      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: shouldSkipPreflight,
        maxRetries: 3
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      setTxSignature(signature);
      
      // Clear RPC cache to force fresh balance fetch
      clearRpcCache();
      
      // Note: GlobalState.total_transactions is already incremented by the
      // transfer_tokens instruction on-chain. Transfer count is tracked on-chain only.
      // UI components should use useGlobalStateStats() to display transaction counts.
      
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      console.error('Send error:', err);
      
      // Extract detailed error message from SendTransactionError
      let errorMessage = 'Failed to send UNIYAA';
      
      if (err instanceof SendTransactionError) {
        const logs = await err.getLogs(connection);
        console.error('Transaction logs:', logs);
        
        // Check for common error patterns in logs
        if (logs) {
          const logsString = logs.join('\n');
          if (logsString.includes('insufficient funds') || logsString.includes('0x1')) {
            errorMessage = 'Insufficient funds. Please check your balance and try again.';
          } else if (logsString.includes('custom program error')) {
            // Extract error code if available
            const errorMatch = logsString.match(/custom program error: (0x[0-9a-fA-F]+)/);
            if (errorMatch) {
              errorMessage = `Transaction failed with error code ${errorMatch[1]}. ${
                errorMatch[1] === '0x1' ? 'This usually means insufficient funds.' : ''
              }`;
            } else {
              errorMessage = 'Transaction failed. Please check the console for details.';
            }
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📤</span>
            Send UNIYAA
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {txSignature ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 text-lg font-bold mb-2">Transaction Successful!</p>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:text-white underline text-sm"
            >
              View on Explorer
            </a>
          </div>
        ) : showQRScanner ? (
          <div className="text-center">
            <p className="text-purple-200 text-sm mb-4">Point your camera at a QR code</p>
            <div className="relative bg-black rounded-xl overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full max-h-64 object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-green-400 rounded-lg" />
              </div>
            </div>
            <button
              onClick={stopCameraScanner}
              className="w-full bg-red-500/30 hover:bg-red-500/50 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              ✕ Cancel Scanning
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-purple-200 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana address"
                className="w-full bg-white/10 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:border-purple-500"
              />
              
              {/* Quick actions for address input */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handlePaste}
                  className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                >
                  📋 Paste
                </button>
                <button
                  onClick={startCameraScanner}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/40 text-green-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                >
                  📸 Scan QR
                </button>
                <label className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer">
                  📷 Upload
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Scanner error message */}
              {scannerError && (
                <p className="text-yellow-400 text-xs mt-2">{scannerError}</p>
              )}
            </div>

            <div className="mb-4">
              {/* Currency selector */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-200 text-sm">
                  Amount ({getCurrencySymbol(localCurrency)} {localCurrency})
                </span>
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={showCurrencyDropdown}
                    aria-label="Select currency"
                    onClick={() => { setShowCurrencyDropdown(v => !v); setCurrencySearch(''); }}
                    className="flex items-center gap-1 bg-purple-700/60 hover:bg-purple-600/60 border border-purple-500/50 rounded-lg px-2 py-1 text-white text-xs font-medium transition-colors"
                  >
                    <span>{localCurrency}</span>
                    <span className="text-purple-300">{showCurrencyDropdown ? '▲' : '▼'}</span>
                  </button>
                  {showCurrencyDropdown && (
                    <div
                      role="listbox"
                      aria-label="Currency list"
                      className="absolute right-0 top-full mt-1 w-52 max-h-60 overflow-y-auto bg-purple-900 border border-purple-500 rounded-xl shadow-2xl z-50"
                    >
                      <div className="sticky top-0 bg-purple-900 p-2 border-b border-purple-700">
                        <input
                          type="text"
                          value={currencySearch}
                          onChange={e => setCurrencySearch(e.target.value)}
                          placeholder="Search currency..."
                          aria-label="Search currencies"
                          autoFocus
                          className="w-full bg-purple-800/60 border border-purple-600 rounded-lg px-2 py-1 text-white text-xs placeholder-purple-400 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      {(() => {
                        const detectedCurrency = getUserLocaleCurrency();
                        const savedPref = getSavedPreferredCurrency();
                        const filtered = allCurrencies.length > 0
                          ? allCurrencies.filter(c =>
                              c.toLowerCase().includes(currencySearch.toLowerCase())
                            )
                          : Object.keys(DEFAULT_RATES)
                              .sort()
                              .filter(c => c.toLowerCase().includes(currencySearch.toLowerCase()));
                        if (filtered.length === 0) {
                          return <p className="text-purple-400 text-xs text-center py-3">No currencies found</p>;
                        }
                        return filtered.map(code => {
                          const isSelected = code === localCurrency;
                          const isAutoDetected = code === detectedCurrency && !savedPref;
                          const isSavedDefault = code === savedPref;
                          return (
                            <button
                              key={code}
                              role="option"
                              aria-selected={isSelected}
                              type="button"
                              onClick={() => {
                                setLocalCurrency(code);
                                setShowCurrencyDropdown(false);
                                setCurrencySearch('');
                                // Reset amount fields when currency changes
                                setLocalCurrencyAmount('');
                                setAmount('');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-purple-700/60 transition-colors ${
                                isSelected ? 'bg-purple-700/80 text-white font-bold' : 'text-purple-100'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                <span className="font-mono w-8 shrink-0">{code}</span>
                                <span className="text-purple-400">{getCurrencySymbol(code)}</span>
                                {isAutoDetected && (
                                  <span className="text-purple-400 text-[10px]">(auto)</span>
                                )}
                              </span>
                              {isSavedDefault && (
                                <span title="Saved default" className="text-yellow-400 text-[10px]">★</span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
              {/* "Set as default" link shown when selected currency differs from saved preference */}
              {localCurrency !== getSavedPreferredCurrency() && (
                <button
                  type="button"
                  onClick={() => {
                    setPreferredCurrency(localCurrency);
                    // Force a re-render to update the ★ indicator
                    setLocalCurrency(c => c);
                  }}
                  className="text-purple-400 hover:text-yellow-300 text-xs mb-2 underline transition-colors"
                >
                  ★ Set {localCurrency} as default
                </button>
              )}
              <div className="relative">
                <input
                  type="number"
                  value={localCurrencyAmount}
                  onChange={(e) => handleLocalCurrencyChange(e.target.value)}
                  placeholder="0.000000"
                  min="0"
                  step="0.000001"
                  className="w-full bg-white/10 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:border-purple-500"
                />
              </div>
              <p className="text-purple-400 text-xs mt-1">
                Enter amount in your local currency
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-purple-200 text-sm mb-2">Amount (UNIYAA)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => handleUniyaaAmountChange(e.target.value)}
                  placeholder="0.000000"
                  min="0"
                  step="0.000001"
                  className="w-full bg-white/10 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    const maxUniyaa = rawToDecimal(balance, mintDecimals);
                    setAmount(maxUniyaa.toString());
                    handleUniyaaAmountChange(maxUniyaa.toString());
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white text-sm"
                >
                  MAX
                </button>
              </div>
              <p className="text-purple-400 text-xs mt-1">
                Available: {formatUniyaaBalance(balance, mintDecimals)} UNIYAA
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={isLoading || !recipientAddress || !amount}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-all ${
                isLoading || !recipientAddress || !amount
                  ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isLoading ? '⏳ Sending...' : 'Send UNIYAA'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Receive Modal Component
interface ReceiveModalProps {
  publicKey: PublicKey;
  onClose: () => void;
}

const ReceiveModal: FC<ReceiveModalProps> = ({ publicKey, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(true);

  // Generate QR code for wallet address only
  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsGeneratingQR(true);
        
        // Lazy load QRCode library
        const QRCode = (await import('qrcode')).default;
        
        // Generate QR code with just the wallet address
        const walletAddress = publicKey.toBase58();
        const dataUrl = await QRCode.toDataURL(walletAddress, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      } finally {
        setIsGeneratingQR(false);
      }
    };
    
    generateQR();
  }, [publicKey]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📥</span>
            Receive UNIYAA
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="text-center">
          {/* Wallet Address QR Code */}
          <div className="bg-white rounded-xl p-4 inline-block mb-4">
            {isGeneratingQR ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div className="text-gray-400 text-sm">Generating QR...</div>
              </div>
            ) : qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={qrDataUrl} 
                alt="Wallet Address QR Code"
                width={200}
                height={200}
                className="mx-auto"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div className="text-gray-400 text-sm">QR unavailable</div>
              </div>
            )}
          </div>

          <p className="text-purple-200 text-sm mb-4">
            Scan the QR code or copy your wallet address to receive UNIYAA tokens
          </p>

          {/* Copy Address Button */}
          <button
            onClick={copyAddress}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all mb-4"
          >
            {copied ? '✅ Copied!' : '📋 Copy Address'}
          </button>

          {/* Address display */}
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-purple-300 text-xs mb-2">Your Wallet Address</p>
            <p className="text-white text-xs font-mono break-all">
              {publicKey.toBase58()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Share Modal Component
interface ShareModalProps {
  publicKey: PublicKey;
  onClose: () => void;
}

const ShareModal: FC<ShareModalProps> = ({ publicKey, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  
  const pubkeyBase58 = publicKey.toBase58();
  const referralMessage = generateReferralMessage(pubkeyBase58);
  const referralUrl = generateReferralUrl(pubkeyBase58);
  const encodedMessage = encodeURIComponent(referralMessage);
  const encodedUrl = encodeURIComponent(referralUrl);
  
  // Share via different platforms
  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodedMessage}`,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      name: 'Telegram',
      icon: '✈️',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent('Join UNIYAA Token - A revolutionary token system on Solana! Use my referral: ' + pubkeyBase58)}`,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'Email',
      icon: '📧',
      url: `mailto:?subject=${encodeURIComponent('Join UNIYAA Token')}&body=${encodedMessage}`,
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      name: 'X (Twitter)',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      color: 'bg-slate-700 hover:bg-slate-800',
    },
    {
      name: 'SMS',
      icon: '📱',
      url: `sms:?body=${encodedMessage}`,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralMessage);
      setCopied(true);
      setShareMessage('Message copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareMessage('');
      }, 2000);
    } catch (err) {
      setShareMessage('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join UNIYAA Token',
          text: referralMessage,
          url: referralUrl,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📲</span>
            Share Your Referral
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="text-center">
          <p className="text-purple-200 text-sm mb-6">
            Share your referral link and earn credits: 1 credit per individual referral, 2 credits per business referral!
          </p>

          {/* Referral Link Preview */}
          <div className="bg-black/20 rounded-xl p-4 mb-6">
            <p className="text-purple-300 text-xs mb-2">Your Referral Link</p>
            <p className="text-white text-sm font-mono break-all">
              https://uniyaa.live/mint?ref={publicKey.toBase58().slice(0, 8)}...
            </p>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {shareOptions.map((option) => (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${option.color} text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2`}
              >
                <span className="text-xl">{option.icon}</span>
                {option.name}
              </a>
            ))}
            
            {/* Native Share (if supported) */}
            {typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 col-span-2"
              >
                <span className="text-xl">🔗</span>
                More Options
              </button>
            )}
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all mb-4"
          >
            {copied ? '✅ Copied!' : '📋 Copy Message'}
          </button>

          {shareMessage && (
            <p className="text-green-400 text-sm">{shareMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};
