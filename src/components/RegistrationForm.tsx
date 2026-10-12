'use client';

import { FC } from 'react';
import {
  MIN_SOL_BALANCE,
  hasMinimumSolBalance,
  formatSolBalance
} from '@/utils/registration';
import { createFingerprintMetadata, FingerprintMetadata } from '@/utils/deviceFingerprint';

interface RegistrationFormProps {
  totalUsers: number;
  walletBalance: number; // in lamports
  onRegister: (metadata?: RegistrationMetadata) => void;
  isLoading: boolean;
}

export interface RegistrationMetadata {
  fingerprint: FingerprintMetadata;
}

export const RegistrationForm: FC<RegistrationFormProps> = ({
  totalUsers,
  walletBalance,
  onRegister,
  isLoading,
}) => {
  const hasSufficientBalance = hasMinimumSolBalance(walletBalance);
  const balanceSOL = formatSolBalance(walletBalance);

  const handleSubmit = () => {
    if (!hasSufficientBalance) return;

    const metadata: RegistrationMetadata = {
      fingerprint: createFingerprintMetadata(),
    };

    onRegister(metadata);
  };

  const canSubmit = hasSufficientBalance && !isLoading;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-2xl font-bold text-white mb-2">Register Account</h3>
        <p className="text-purple-200">
          Create your on-chain user account to start minting UNIYAA tokens
        </p>
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
        </p>
      </div>
    </div>
  );
};
