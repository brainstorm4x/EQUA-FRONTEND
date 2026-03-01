'use client';

import { FC, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { detectWalletEnvironment } from '@/utils/walletEnvironment';

interface WalletButtonProps {
  testId?: string;
}

// Dynamically import MobileWalletConnect (avoids SSR issues)
const MobileWalletConnect = dynamic(
  () => import('@/components/ui/MobileWalletConnect').then((mod) => ({ default: mod.MobileWalletConnect })),
  { ssr: false }
);

/**
 * Environment-aware wallet button.
 *
 * - Desktop / Mobile In-App: renders WalletMultiButton (extension or injected wallet)
 * - Mobile External Browser (Chrome/Safari): renders MobileWalletConnect (compact mode)
 *   which calls select() + connect() directly, bypassing readyState checks that would
 *   otherwise redirect to the wallet download page.
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const [isMobileExternal, setIsMobileExternal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsMobileExternal(detectWalletEnvironment() === 'mobile-browser');
    }
  }, []);

  // Avoid SSR/hydration mismatch
  if (!mounted) return null;

  if (isMobileExternal) {
    // Use compact MobileWalletConnect for header use on mobile external browser
    return <MobileWalletConnect compact />;
  }

  return <WalletMultiButton data-testid={testId} />;
};
