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
 * - Desktop / Mobile In-App: renders DesktopWalletConnect (standard wallet adapter flow)
 * - Mobile External Browser: renders a "Select Wallet" button that redirects to /mobile
 *   when clicked. Mobile users can browse the site freely; the redirect only fires on
 *   explicit wallet interaction.
 */
export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const [environment, setEnvironment] = useState<ReturnType<typeof detectWalletEnvironment> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEnvironment(detectWalletEnvironment());
    }
  }, []);

  // SSR/hydration guard
  if (!environment) return null;

  // Mobile external browser: show a button that redirects to /mobile on click
  if (environment === 'mobile-browser') {
    return (
      <button
        data-testid={testId}
        onClick={() => router.push('/mobile')}
        className="wallet-adapter-button wallet-adapter-button-trigger"
        type="button"
      >
        Select Wallet
      </button>
    );
  }

  // Desktop or mobile in-app: standard wallet adapter flow
  return <DesktopWalletConnect testId={testId} />;
};
