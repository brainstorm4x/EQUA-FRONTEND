'use client';

import { FC } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

/**
 * Jupiter-approved wallet button
 *
 * CRITICAL:
 * - Do NOT manually call wallet.connect()
 * - WalletMultiButton already handles:
 *   - Desktop extensions
 *   - Mobile deep links
 *   - Return-from-wallet lifecycle
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  return <WalletMultiButton data-testid={testId} />;
};
