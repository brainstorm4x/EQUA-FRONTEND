'use client';

import { FC, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { detectWalletEnvironment } from '@/utils/walletEnvironment';

interface WalletButtonProps {
  testId?: string;
}

// Dynamically import environment-specific components (avoids SSR issues)
const DesktopWalletConnect = dynamic(
  () => import('@/components/ui/DesktopWalletConnect').then((mod) => ({ default: mod.DesktopWalletConnect })),
  { ssr: false }
);

const MobileBrowserGate = dynamic(
  () => import('@/components/ui/MobileBrowserGate').then((mod) => ({ default: mod.MobileBrowserGate })),
  { ssr: false }
);

/**
 * Environment-aware wallet button.
 *
 * - Desktop / Mobile In-App: renders DesktopWalletConnect which auto-calls connect()
 *   immediately after the user selects an adapter from the WalletMultiButton modal,
 *   giving a single-click flow (select → extension popup → approve → connected).
 * - Mobile External Browser (Chrome/Safari): renders MobileBrowserGate which guides
 *   users to download the EQUA mobile app or switch to a desktop browser.
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
    return <MobileBrowserGate />;
  }

  return <DesktopWalletConnect testId={testId} />;
};
