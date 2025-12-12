'use client';

import { FC, ReactNode, useMemo, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_ENDPOINT } from '@/lib/constants';

import '@solana/wallet-adapter-react-ui/styles.css';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Detects if the user is on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Gets the app store URL for Phantom wallet based on the platform
 */
function getPhantomStoreUrl(): string {
  if (typeof window === 'undefined') return 'https://phantom.app/download';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/i.test(userAgent)) {
    return 'https://play.google.com/store/apps/details?id=app.phantom';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977';
  }
  return 'https://phantom.app/download';
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors
  const onError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error);
    
    // On mobile, if Phantom is not detected, redirect to app store
    if (isMobileDevice() && error.name === 'WalletNotReadyError') {
      const walletName = error.message?.toLowerCase() || '';
      if (walletName.includes('phantom')) {
        // Check if we should redirect to the app store
        const shouldRedirect = window.confirm(
          'Phantom wallet is not installed. Would you like to download it from the app store?'
        );
        if (shouldRedirect) {
          window.location.href = getPhantomStoreUrl();
        }
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          <ProgramIdMigration />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
