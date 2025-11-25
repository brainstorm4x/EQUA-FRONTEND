'use client';

import { FC } from 'react';
import { ReferralState } from '@/types/referral';
import { formatCountdown } from '@/utils/referral';

interface ReferralStatusIndicatorProps {
  status: ReferralState;
  error: string | null;
  expiresInSeconds: number | null;
  referrerPubkey: string | null;
}

/**
 * Component to display the status of referral code validation
 */
export const ReferralStatusIndicator: FC<ReferralStatusIndicatorProps> = ({
  status,
  error,
  expiresInSeconds,
  referrerPubkey,
}) => {
  // Don't show anything for idle or loading states
  if (status === ReferralState.IDLE) {
    return null;
  }

  if (status === ReferralState.LOADING) {
    return (
      <div className="flex items-center gap-2 mt-2 text-purple-300" data-testid="referral-loading">
        <span className="animate-spin">⏳</span>
        <span className="text-sm">Validating...</span>
      </div>
    );
  }

  // Valid code with countdown
  if (status === ReferralState.VALID) {
    return (
      <div className="mt-2" data-testid="referral-valid">
        <div className="flex items-center gap-2 text-green-400">
          <span>✅</span>
          <span className="text-sm">Valid referral code</span>
        </div>
        {expiresInSeconds !== null && expiresInSeconds > 0 && (
          <div className="flex items-center gap-2 mt-1 text-yellow-400" data-testid="referral-countdown">
            <span>⏱️</span>
            <span className="text-sm font-mono">
              Expires in {formatCountdown(expiresInSeconds)}
            </span>
          </div>
        )}
        {referrerPubkey && (
          <p className="text-xs text-purple-300 mt-1 truncate">
            Referrer: {referrerPubkey.slice(0, 8)}...{referrerPubkey.slice(-8)}
          </p>
        )}
      </div>
    );
  }

  // Valid public key
  if (status === ReferralState.PUBLIC_KEY) {
    return (
      <div className="mt-2" data-testid="referral-pubkey">
        <div className="flex items-center gap-2 text-green-400">
          <span>✅</span>
          <span className="text-sm">Valid wallet address</span>
        </div>
        {referrerPubkey && (
          <p className="text-xs text-purple-300 mt-1 truncate">
            Referrer: {referrerPubkey.slice(0, 8)}...{referrerPubkey.slice(-8)}
          </p>
        )}
      </div>
    );
  }

  // Error states
  const errorConfig: Record<string, { icon: string; color: string; testId: string }> = {
    [ReferralState.USED]: { icon: '🚫', color: 'text-red-400', testId: 'referral-used' },
    [ReferralState.EXPIRED]: { icon: '⏰', color: 'text-orange-400', testId: 'referral-expired' },
    [ReferralState.NOT_FOUND]: { icon: '❓', color: 'text-red-400', testId: 'referral-not-found' },
    [ReferralState.MALFORMED]: { icon: '⚠️', color: 'text-red-400', testId: 'referral-error' },
  };

  const config = errorConfig[status];
  if (config && error) {
    return (
      <div className={`flex items-center gap-2 mt-2 ${config.color}`} data-testid={config.testId}>
        <span>{config.icon}</span>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return null;
};
