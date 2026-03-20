'use client';

import { FC, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { detectWalletEnvironment } from '@/utils/walletEnvironment';

interface WalletButtonProps {
  testId?: string;
}

// Dynamically import environment-specific components (avoids SSR issues)
const DesktopWalletConnect = dynamic(
  () => import('@/components/ui/DesktopWalletConnect').then((mod) => ({ default: mod.DesktopWalletConnect })),
  { ssr: false }
);

/**
 * Environment-aware wallet button.
 *
 * - Desktop / Mobile In-App: renders DesktopWalletConnect which auto-calls connect()
 *   immediately after the user selects an adapter from the WalletMultiButton modal,
 *   giving a single-click flow (select → extension popup → approve → connected).
 * - Mobile External Browser (Chrome/Safari): redirects to the dedicated /mobile page
 *   which guides users to download the EQUA mobile app or switch to a desktop browser.
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const [isMobileExternal, setIsMobileExternal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      if (detectWalletEnvironment() === 'mobile-browser') {
        setIsMobileExternal(true);
        router.replace('/mobile');
      }
    }
  }, [router]);

  // Avoid SSR/hydration mismatch
  if (!mounted) return null;

  // While the redirect is in flight, render nothing so the navbar stays clean.
  if (isMobileExternal) return null;

  return <DesktopWalletConnect testId={testId} />;
};
