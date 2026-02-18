'use client';

import { FC, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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
 * 
 * MOBILE WALLET ADAPTER FIX:
 * - When there's only ONE wallet adapter (Mobile Wallet Adapter)
 * - Auto-selects it to bypass the modal selection step
 * - User clicks once to trigger connection and authorization
 * - This ensures the wallet app opens with approval request
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { wallets, wallet, select, connected } = useWallet();

  useEffect(() => {
    // Auto-select the wallet if:
    // 1. Only one wallet adapter is available
    // 2. No wallet is currently selected
    // 3. Not already connected
    if (wallets.length === 1 && !wallet && !connected) {
      console.log('🔗 [WalletButton] Auto-selecting single wallet adapter:', wallets[0].adapter.name);
      select(wallets[0].adapter.name);
    }
  }, [wallets, wallet, select, connected]);

  return <WalletMultiButton data-testid={testId} />;
};
