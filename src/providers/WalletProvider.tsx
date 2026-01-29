'use client';

import { FC, ReactNode, useMemo, useCallback, useEffect, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_ENDPOINT } from '@/lib/constants';

import '@solana/wallet-adapter-react-ui/styles.css';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

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
 * Detects if Phantom wallet is injected as window.solana or window.phantom
 * Used to avoid double registration
 */
const isPhantomInjected = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for standard injected provider
  const solana = (window as any).solana;
  const phantom = (window as any).phantom;
  
  return !!(solana?.isPhantom || phantom?.solana?.isPhantom);
};



/**
 * Gets the expected network from the RPC endpoint
 */
const getExpectedNetwork = (): string => {
  if (RPC_ENDPOINT.includes('devnet')) return 'devnet';
  if (RPC_ENDPOINT.includes('testnet')) return 'testnet';
  if (RPC_ENDPOINT.includes('mainnet')) return 'mainnet-beta';
  return 'devnet'; // default
};

// Throttle error logging to avoid console spam during Fast Refresh
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 5000; // 5 seconds

const shouldLogError = (): boolean => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_THROTTLE_MS) {
    lastErrorTime = now;
    return true;
  }
  return false;
};

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);
  
  const wallets = useMemo(() => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // ========================================================================
      // MOBILE BROWSERS: ONLY Mobile Wallet Adapter
      // ========================================================================
      // Mobile Wallet Adapter uses deep links to open native wallet apps
      // (Phantom Mobile, Solflare Mobile, etc.)
      // Desktop wallets (browser extensions) don't work on mobile browsers
      return [
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: {
            name: 'EQUA Token',
            uri: typeof window !== 'undefined' ? window.location.origin : 'https://equa-frontend.netlify.app',
            icon: typeof window !== 'undefined' 
              ? `${window.location.origin}/branding/equa-logo.svg`
              : 'https://equa-frontend.netlify.app/branding/equa-logo.svg',
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          cluster: getExpectedNetwork() as 'devnet' | 'testnet' | 'mainnet-beta',
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
      ];
    } else {
      // ========================================================================
      // DESKTOP BROWSERS: Phantom + Solflare
      // ========================================================================
      const adapters: (PhantomWalletAdapter | SolflareWalletAdapter)[] = [];
      
      // Only add Phantom adapter if NOT injected (to avoid double registration)
      // The injected provider will be auto-detected by wallet-adapter
      if (!isPhantomInjected()) {
        adapters.push(new PhantomWalletAdapter());
      }
      
      // Always include Solflare
      adapters.push(new SolflareWalletAdapter());
      
      return adapters;
    }
  }, []);

  // Check wallet readiness on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if Phantom is injected but locked
    const checkPhantomReadiness = () => {
      const phantom = (window as any).solana || (window as any).phantom?.solana;
      
      if (phantom?.isPhantom && !phantom.publicKey) {
        setWalletWarning(
          'Phantom wallet detected but locked. Please unlock your wallet to connect.'
        );
      }
    };
    
    // Check on load and after a short delay (wallet extension may initialize late)
    checkPhantomReadiness();
    const timer = setTimeout(checkPhantomReadiness, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle wallet errors
  const onError = useCallback((error: WalletError) => {
    // Throttle error logging to avoid spam during Fast Refresh
    if (shouldLogError()) {
      console.error('[Wallet Error]:', error.name, error.message);
    }
    
    // Handle specific error cases with user-friendly messages
    if (error.name === 'WalletNotReadyError') {
      const walletName = error.message?.toLowerCase() || '';
      
      if (walletName.includes('phantom')) {
        // Phantom not installed
        if (isMobileDevice()) {
          const shouldRedirect = window.confirm(
            'Phantom wallet is not installed. Would you like to download it from the app store?'
          );
          if (shouldRedirect) {
            window.location.href = getPhantomStoreUrl();
          }
        } else {
          setWalletWarning(
            'Phantom wallet not detected. Please install the Phantom browser extension from phantom.app'
          );
        }
      }
    } else if (error.name === 'WalletConnectionError') {
      // For mobile wallet adapter, connection errors are usually authorization-related, not network
      const isMobile = isMobileDevice();
      
      if (isMobile) {
        // Mobile Wallet Adapter errors are typically:
        // - User rejected authorization
        // - Wallet app not responding
        // - Deep link failed
        const expectedNetwork = getExpectedNetwork();
        
        if (shouldLogError()) {
          console.warn('[Mobile Wallet] Connection failed. Common causes:');
          console.warn('  - User rejected authorization in wallet app');
          console.warn('  - Wallet app not responding');
          console.warn(`  - Network mismatch (check wallet app is on ${expectedNetwork})`);
          console.warn('  - Deep link redirection failed');
        }
        
        setWalletWarning(
          'Failed to connect to wallet. Please ensure your wallet app is open and try again. ' +
          `If the issue persists, check that your wallet is on the correct network (${expectedNetwork}).`
        );
      } else {
        // Desktop wallet connection errors
        const expectedNetwork = getExpectedNetwork();
        
        if (shouldLogError()) {
          console.warn(
            `[Wallet Network] App configured for ${expectedNetwork}. ` +
            'Ensure your wallet is connected to the same network.'
          );
        }
        
        setWalletWarning(
          `Connection error. Please ensure your wallet is connected to ${expectedNetwork} network. ` +
          'You can change the network in your wallet settings.'
        );
      }
    } else if (error.name === 'WalletNotConnectedError') {
      setWalletWarning(
        'Wallet not connected. Please connect your wallet to continue.'
      );
    } else if (error.name === 'WalletAccountError') {
      setWalletWarning(
        'Wallet account error. Please refresh and try reconnecting your wallet.'
      );
    } else {
      // Generic error
      setWalletWarning(
        `Wallet error: ${error.message || 'Unknown error occurred'}. Please try again.`
      );
    }
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          {walletWarning && (
            <div 
              className="fixed top-4 right-4 max-w-md bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded shadow-lg z-50"
              role="alert"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm">{walletWarning}</p>
                <button
                  onClick={() => setWalletWarning(null)}
                  className="ml-4 text-yellow-700 hover:text-yellow-900"
                  aria-label="Dismiss warning"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <ProgramIdMigration />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
