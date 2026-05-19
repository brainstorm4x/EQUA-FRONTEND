'use client';

import { FC, ReactNode, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { detectWalletEnvironment, type WalletEnvironment } from '@/utils/walletEnvironment';
import { DesktopWalletProvider } from './DesktopWalletProvider';
import { MobileInAppWalletProvider } from './MobileInAppWalletProvider';
import { MobileExternalWalletProvider } from './MobileExternalWalletProvider';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';
import { WalletDebugLogger } from '@/components/WalletDebugLogger';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Component to log wallet connection state changes
 */
const WalletConnectionLogger: FC = () => {
  const { wallet, connected, connecting, disconnecting, publicKey } = useWallet();

  useEffect(() => {
    console.log('📊 [WalletState] Connection state changed:', {
      walletName: wallet?.adapter?.name || 'None',
      connected,
      connecting,
      disconnecting,
      publicKey: publicKey?.toBase58() || 'None',
      hasSignTransaction: wallet?.adapter && 'signTransaction' in wallet.adapter && typeof wallet.adapter.signTransaction === 'function',
      hasSendTransaction: wallet?.adapter && 'sendTransaction' in wallet.adapter && typeof wallet.adapter.sendTransaction === 'function',
    });
  }, [wallet, connected, connecting, disconnecting, publicKey]);

  return null;
};

/**
 * Wallet Provider Router
 * 
 * ARCHITECTURE:
 * - Detects environment ONCE on client mount
 * - Routes to environment-specific provider BEFORE rendering children
 * - Three isolated provider flows:
 *   1. Desktop → DesktopWalletProvider (Phantom/Solflare extensions)
 *   2. Mobile In-App → MobileInAppWalletProvider (injected wallet)
 *   3. Mobile External → MobileExternalWalletProvider (Mobile Wallet Adapter with deep linking)
 * 
 * CRITICAL:
 * - No adapter mixing - each environment has its own provider tree
 * - Complete flow isolation - separate code paths, no shared state
 * - Preserves existing features: ProgramIdMigration, WalletDebugLogger, WalletConnectionLogger
 */
export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [environment, setEnvironment] = useState<WalletEnvironment | null>(null);

  useEffect(() => {
    // Detect environment ONCE on client mount
    if (typeof window !== 'undefined') {
      const detected = detectWalletEnvironment();
      setEnvironment(detected);
      console.log('🔀 [WalletProvider] Environment detected:', detected);
    }
  }, []);

  // SSR fallback - show loading screen while detecting environment
  if (!environment) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  // Wrap routed provider with migration and debug components
  const ProviderWithExtras: FC<{ children: ReactNode }> = ({ children }) => (
    <>
      <ProgramIdMigration />
      <WalletDebugLogger />
      <WalletConnectionLogger />
      {children}
    </>
  );

  // Route to environment-specific provider
  switch (environment) {
    case 'desktop':
      return (
        <DesktopWalletProvider>
          <ProviderWithExtras>{children}</ProviderWithExtras>
        </DesktopWalletProvider>
      );
    
    case 'mobile-inapp':
      return (
        <MobileInAppWalletProvider>
          <ProviderWithExtras>{children}</ProviderWithExtras>
        </MobileInAppWalletProvider>
      );
    
    case 'mobile-browser':
      return (
        <MobileExternalWalletProvider>
          <ProviderWithExtras>{children}</ProviderWithExtras>
        </MobileExternalWalletProvider>
      );
    
    default:
      // Fallback to desktop provider
      return (
        <DesktopWalletProvider>
          <ProviderWithExtras>{children}</ProviderWithExtras>
        </DesktopWalletProvider>
      );
  }
};
