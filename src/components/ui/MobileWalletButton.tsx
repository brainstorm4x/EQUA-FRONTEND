'use client';

import { FC, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface MobileWalletButtonProps {
  testId?: string;
}

/**
 * Mobile Wallet Button
 * 
 * Specialized button for mobile external browsers with Mobile Wallet Adapter.
 * 
 * Behavior:
 * - When there's only ONE wallet adapter available (Mobile Wallet Adapter)
 * - Auto-selects the wallet on mount (bypassing modal)
 * - User clicks button once to trigger connection flow
 * - Opens wallet app for authorization approval
 * - Returns to browser after approval
 * 
 * This fixes the issue where users had to:
 * 1. Click "Select Wallet" (opens modal)
 * 2. Select wallet from modal
 * 3. Click "Connect"
 * 4. But authorization didn't work properly
 */
export const MobileWalletButton: FC<MobileWalletButtonProps> = ({ testId }) => {
  const { wallets, wallet, select, connected } = useWallet();

  useEffect(() => {
    // Auto-select the wallet if:
    // 1. Only one wallet adapter is available
    // 2. No wallet is currently selected
    // 3. Not already connected
    if (wallets.length === 1 && !wallet && !connected) {
      console.log('🔗 [MobileWalletButton] Auto-selecting single wallet adapter:', wallets[0].adapter.name);
      select(wallets[0].adapter.name);
    }
  }, [wallets, wallet, select, connected]);

  // Use standard WalletMultiButton which will now show "Connect" immediately
  // since wallet is auto-selected
  return <WalletMultiButton data-testid={testId} />;
};
