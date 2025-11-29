'use client';

import { FC, ReactNode, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Detects if the user is on a mobile device
 * Memoized to avoid repeated regex evaluations
 */
const isMobileDevice = (() => {
  let cached: boolean | null = null;
  return (): boolean => {
    if (cached !== null) return cached;
    if (typeof window === 'undefined') return false;
    cached = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return cached;
  };
})();

/**
 * Gets the app store URL for Phantom wallet based on the platform
 * Memoized for performance
 */
const getPhantomStoreUrl = (() => {
  let cached: string | null = null;
  return (): string => {
    if (cached !== null) return cached;
    if (typeof window === 'undefined') {
      cached = 'https://phantom.app/download';
      return cached;
    }
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/i.test(userAgent)) {
      cached = 'https://play.google.com/store/apps/details?id=app.phantom';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      cached = 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977';
    } else {
      cached = 'https://phantom.app/download';
    }
    return cached;
  };
})();

/**
 * Lazy-load wallet adapters to reduce initial bundle size
 * Only load the adapters when actually needed
 */
async function loadWalletAdapters() {
  const { 
    PhantomWalletAdapter, 
    SolflareWalletAdapter, 
    TorusWalletAdapter, 
    LedgerWalletAdapter 
  } = await import('@solana/wallet-adapter-wallets');
  
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
  ];
}

// Cached wallet adapters to avoid re-creating on each render
let cachedWallets: any[] | null = null;

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // Use Devnet (change to Mainnet when ready for production)
  const network = WalletAdapterNetwork.Devnet;

  // Memoize endpoint to prevent recreation on every render
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Lazy-load and cache wallet adapters
  const wallets = useMemo(() => {
    // Import wallet adapters synchronously for SSR compatibility
    // but tree-shake unused code through the optimizePackageImports config
    const { 
      PhantomWalletAdapter, 
      SolflareWalletAdapter, 
      TorusWalletAdapter, 
      LedgerWalletAdapter 
    } = require('@solana/wallet-adapter-wallets');
    
    if (cachedWallets) return cachedWallets;
    
    cachedWallets = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ];
    
    return cachedWallets;
  }, []);

  // Memoized error handler
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
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
