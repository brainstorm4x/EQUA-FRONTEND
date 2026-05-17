'use client';

import { FC, useState, useCallback, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { 
  AccountType,
  DEFAULT_ACCOUNT_TYPE,
  isReferralRequired, 
  MIN_SOL_BALANCE, 
  REFERRAL_FREE_LIMIT,
  hasMinimumSolBalance,
  formatSolBalance 
} from '@/utils/registration';
import { ReferralStatusIndicator } from './ReferralStatusIndicator';
import { useReferralResolution } from '@/hooks/useReferralResolution';
import { ReferralState } from '@/types/referral';
import { createFingerprintMetadata, FingerprintMetadata } from '@/utils/deviceFingerprint';
import { 
  recordReferral, 
  getRateLimitStatus, 
  REFERRAL_RATE_LIMIT,
  REWARD_REDUCTION_PERCENT 
} from '@/utils/referralRateLimit';

interface RegistrationFormProps {
  totalUsers: number;
  walletBalance: number; // in lamports
  onRegister: (accountType: AccountType, referrer: string | null, metadata?: RegistrationMetadata) => void;
  isLoading: boolean;
  validateReferrer?: (referrer: string) => Promise<boolean>;
  userWalletAddress?: string;
}

export interface RegistrationMetadata {
  fingerprint: FingerprintMetadata;
  referrerRateLimited?: boolean;
  adjustedRewardMultiplier?: number;
  /** Callback to record the referral - should be called by parent after successful registration */
  onSuccessfulRegistration?: () => void;
}

export const RegistrationForm: FC<RegistrationFormProps> = ({
  totalUsers,
  walletBalance,
  onRegister,
  isLoading,
  validateReferrer,
  userWalletAddress,
}) => {
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [referrer, setReferrer] = useState('');
  const [referrerError, setReferrerError] = useState('');
  const [isValidatingReferrer, setIsValidatingReferrer] = useState(false);
  const [referrerRateLimited, setReferrerRateLimited] = useState(false);
  
  // Use the referral resolution hook for code validation
  const referralResolution = useReferralResolution(referrer);
  
  const referralRequired = isReferralRequired(totalUsers);
  const hasSufficientBalance = hasMinimumSolBalance(walletBalance);
  const balanceSOL = formatSolBalance(walletBalance);

  // Check referrer rate limit when referrer changes. The status now comes
  // from the server (Netlify Blobs) instead of localStorage, so the fetch is
  // async; we guard against stale resolves with `cancelled` since the
  // referrer can change before this promise settles.
  useEffect(() => {
    const referrerPubkey = referralResolution.referrerPubkey;
    if (!referrerPubkey) {
      setReferrerRateLimited(false);
      return;
    }
    let cancelled = false;
    getRateLimitStatus(referrerPubkey).then((status) => {
      if (!cancelled) setReferrerRateLimited(status.isRateLimited);
    });
    return () => { cancelled = true; };
  }, [referralResolution.referrerPubkey]);

  // Validate referrer when it changes (now uses onchain validation)
  const validateReferrerInput = useCallback(async (value: string) => {
    if (!value.trim()) {
      setReferrerError(referralRequired ? 'Referrer is required' : '');
      return;
    }

    // If it's a valid referral code (10-char), let the referral resolution hook handle it
    if (/^[A-Za-z0-9]{10}$/.test(value.trim())) {
      // The hook will validate the code
      setReferrerError('');
      return;
    }

    // Validate public key format
    try {
      new PublicKey(value);
    } catch {
      setReferrerError('Invalid wallet address format');
      return;
    }

    // Validate referrer exists on-chain (no database check)
    if (validateReferrer) {
      setIsValidatingReferrer(true);
      try {
        const isValid = await validateReferrer(value);
        if (!isValid) {
          setReferrerError('This address is not a registered user on-chain');
        } else {
          setReferrerError('');
        }
      } catch (error) {
        setReferrerError('Failed to validate referrer on-chain');
      } finally {
        setIsValidatingReferrer(false);
      }
    } else {
      setReferrerError('');
    }
  }, [referralRequired, validateReferrer]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (referrer) {
        validateReferrerInput(referrer);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [referrer, validateReferrerInput]);

  const handleSubmit = () => {
    if (!hasSufficientBalance) return;
    if (referralRequired && !referrer.trim()) {
      setReferrerError('Referrer is required');
      return;
    }
    if (referrerError) return;
    
    // Use the resolved referrer public key from the hook if available
    const effectiveReferrer = referralResolution.referrerPubkey || referrer.trim() || null;
    
    // Generate fingerprint metadata
    const fingerprint = createFingerprintMetadata();
    
    // Create registration metadata without geographic data or account type
    // Note: referral recording should be done by the parent component after successful registration
    // The metadata includes a callback for this purpose
    const metadata: RegistrationMetadata = {
      fingerprint,
      referrerRateLimited,
      adjustedRewardMultiplier: referrerRateLimited ? (1 - REWARD_REDUCTION_PERCENT / 100) : 1,
      // Callback for parent to record referral after successful registration.
      // The recordReferral helper now posts to the Netlify counter endpoint;
      // failures are swallowed there so this does not block the user flow.
      onSuccessfulRegistration: effectiveReferrer && userWalletAddress
        ? async () => {
            await recordReferral(effectiveReferrer, userWalletAddress);
          }
        : undefined,
    };
    
    // Register with selected account type
    onRegister(accountType, effectiveReferrer, metadata);
  };

  // Check if referral code validation has an error state
  const hasReferralCodeError = referralResolution.status === ReferralState.USED ||
    referralResolution.status === ReferralState.EXPIRED ||
    referralResolution.status === ReferralState.NOT_FOUND ||
    referralResolution.status === ReferralState.MALFORMED;

  const canSubmit = 
    hasSufficientBalance && 
    !isLoading && 
    !isValidatingReferrer &&
    !referralResolution.isLoading &&
    !referrerError &&
    !hasReferralCodeError &&
    (!referralRequired || referrer.trim());

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-2xl font-bold text-white mb-2">Register Account</h3>
        <p className="text-purple-200">
          Create your on-chain user account to start minting UNIA tokens
        </p>
      </div>

      {/* Account Type Selection */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">
          Select Account Type
        </label>
        <div className="grid grid-cols-2 gap-4">
          {/* Individual Card */}
          <button
            type="button"
            onClick={() => setAccountType('individual')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              accountType === 'individual'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-purple-500/30 bg-white/5 hover:border-purple-500/50'
            }`}
          >
            <div className="text-4xl mb-2">👤</div>
            <div className="text-white font-semibold mb-1">Individual</div>
            <div className="text-purple-300 text-sm">Personal account</div>
            {accountType === 'individual' && (
              <div className="absolute top-2 right-2 text-green-400">✓</div>
            )}
          </button>

          {/* Business Card */}
          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              accountType === 'business'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-purple-500/30 bg-white/5 hover:border-purple-500/50'
            }`}
          >
            <div className="text-4xl mb-2">🏢</div>
            <div className="text-white font-semibold mb-1">Business</div>
            <div className="text-purple-300 text-sm">Company account</div>
            {accountType === 'business' && (
              <div className="absolute top-2 right-2 text-green-400">✓</div>
            )}
          </button>
        </div>
      </div>

      {/* SOL Balance Warning */}
      {!hasSufficientBalance && (
        <div 
          className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 mb-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-200 font-semibold">Insufficient SOL Balance</p>
              <p className="text-red-300 text-sm mt-1">
                You have {balanceSOL} SOL. You need at least {MIN_SOL_BALANCE} SOL to register.
              </p>
              <p className="text-red-300 text-sm mt-2">
                Please fund your wallet before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Field */}
      <div className="mb-6">
        <label 
          htmlFor="referrer-input"
          className="block text-white font-medium mb-2"
        >
          Referral Code or Wallet Address
          {referralRequired && <span className="text-red-400 ml-1">*</span>}
          {!referralRequired && <span className="text-purple-400 ml-1">(optional)</span>}
        </label>
        
        {referralRequired && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 mb-3">
            <p className="text-yellow-200 text-sm">
              ⚠️ Referral is required after the first {REFERRAL_FREE_LIMIT} users. 
              Please enter a referral code or a valid registered user&apos;s wallet address.
            </p>
          </div>
        )}
        
        <div className="relative">
          <input
            id="referrer-input"
            data-testid="referral-input"
            type="text"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            placeholder="Enter referral code or wallet address"
            className={`w-full bg-white/10 border-2 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              referrerError || hasReferralCodeError
                ? 'border-red-500' 
                : referralResolution.isValid
                  ? 'border-green-500'
                  : 'border-purple-500/30 focus:border-purple-500'
            }`}
            aria-invalid={!!referrerError || hasReferralCodeError}
            aria-describedby={referrerError ? 'referrer-error' : undefined}
          />
          {(isValidatingReferrer || referralResolution.isLoading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-purple-400 animate-spin">⏳</span>
            </div>
          )}
        </div>
        
        {/* Referral Status Indicator (for code validation) */}
        <div data-testid="referral-status">
          <ReferralStatusIndicator
            status={referralResolution.status}
            error={referralResolution.error}
            expiresInSeconds={referralResolution.expiresInSeconds}
            referrerPubkey={referralResolution.referrerPubkey}
          />
        </div>
        
        {/* Referrer Rate Limit Warning */}
        {referrerRateLimited && referralResolution.isValid && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 mt-3">
            <p className="text-orange-200 text-sm">
              ⚠️ This referrer has exceeded {REFERRAL_RATE_LIMIT} referrals in the past 24 hours.
              Their referral reward will be reduced by {REWARD_REDUCTION_PERCENT}%.
            </p>
          </div>
        )}
        
        {referrerError && (
          <p id="referrer-error" className="text-red-400 text-sm mt-2" role="alert">
            {referrerError}
          </p>
        )}
      </div>

      {/* Register Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        data-testid="register-button"
        className={`w-full font-bold py-4 px-8 rounded-xl transition-all ${
          canSubmit
            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
            : 'bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-60'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Registering...
          </span>
        ) : !hasSufficientBalance ? (
          '⚠️ Insufficient SOL Balance'
        ) : (
          '✅ Register Now'
        )}
      </button>

      {/* Current Status */}
      <div className="mt-6 text-center" data-testid="user-count-display">
        <p className="text-purple-300 text-sm">
          Current Users: <span className="text-white font-medium">{totalUsers}</span>
          {totalUsers < REFERRAL_FREE_LIMIT && (
            <span className="text-green-400 ml-2">
              ({REFERRAL_FREE_LIMIT - totalUsers} spots left without referral)
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
