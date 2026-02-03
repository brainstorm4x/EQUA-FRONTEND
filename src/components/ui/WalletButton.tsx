'use client';

import { FC } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

/**
 * Standard Solana Wallet Button
 * 
 * Uses WalletMultiButton from @solana/wallet-adapter-react-ui which provides:
 * - Built-in dropdown menu when connected (Copy Address, Change Wallet, Disconnect)
 * - Automatic wallet.connect() after modal selection (triggers deep links on mobile)
 * - Proper connection lifecycle handling
 * - Accessibility and loading states
 * 
 * Why this works now (after desktop/mobile provider separation):
 * - Desktop: DesktopWalletProvider has ONLY desktop adapters (no mobile interference)
 * - Mobile: MobileWalletProvider has ONLY Mobile Wallet Adapter (no desktop interference)
 * - No more "fighting" between adapter types
 * - Standard button works correctly on both platforms
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  return (
    <div data-testid={testId} className="wallet-button-wrapper">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !px-6 !py-3 !text-white !font-semibold !transition-all !duration-200" />
    </div>
  );
};