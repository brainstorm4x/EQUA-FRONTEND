'use client';

import { FC, ReactNode, useMemo, useCallback, useRef } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
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

// Type for wallet adapters
type WalletAdapterList = (PhantomWalletAdapter | SolflareWalletAdapter | TorusWalletAdapter | LedgerWalletAdapter)[];

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // Use Devnet (change to Mainnet when ready for production)
  const network = WalletAdapterNetwork.Devnet;

  // Memoize endpoint to prevent recreation on every render
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Use ref to cache wallets per instance, avoiding shared state across components
  const walletsRef = useRef<WalletAdapterList | null>(null);

  // Memoize wallet adapters with per-instance caching
  const wallets = useMemo(() => {
    if (walletsRef.current) return walletsRef.current;
    
    walletsRef.current = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ];
    
    return walletsRef.current;
  }, []);

  // Memoized error handler with detailed logging
  const onError = useCallback((error: WalletError) => {
    // Structured error logging for better debugging
    const errorDetails = {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    // Add development-only context
    if (process.env.NODE_ENV === 'development') {
      console.error('═══════════════════════════════════════════════════════');
      console.error('🔴 Wallet Connection Error (Development)');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error Details:', errorDetails);
      console.error('Stack:', error.stack);
      
      // Additional debug context (development only)
      if (typeof window !== 'undefined') {
        console.error('Debug Context:', {
          pathname: window.location.pathname,
          isMobile: isMobileDevice(),
          userAgentPrefix: navigator.userAgent.substring(0, 50) + '...',
        });
      }
      console.error('═══════════════════════════════════════════════════════');
    } else {
      // Production: Simple structured logging
      console.error('[Wallet Error]', errorDetails);
    }
    
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
