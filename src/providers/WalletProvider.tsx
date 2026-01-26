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
  createDefaultAuthorizationResultCache,
  createDefaultAddressSelector,
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
    const adapters: any[] = [];
    
    // Add Solana Mobile Wallet Adapter for mobile deep-linking
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        adapters.push(
          new SolanaMobileWalletAdapter({
            addressSelector: createDefaultAddressSelector(),
            appIdentity: { name: 'EQUA Token' },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
            cluster: 'devnet',
            onWalletNotFound: createDefaultWalletNotFoundHandler(),
          })
        );
      }
    }
    
    // Add standard wallet adapters (works for both desktop extensions and mobile deep-links)
    adapters.push(new PhantomWalletAdapter());
    adapters.push(new SolflareWalletAdapter());
    
    return adapters;
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
    if (shouldLogError()) {
      console.error('[Wallet Error]:', error.name, error.message);
    }
    
    // Only show user-facing errors for actual connection failures
    // Don't show errors during initialization or autoConnect attempts
    if (error.name === 'WalletNotReadyError') {
      // User clicked "Connect" but wallet is not installed/available
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        setWalletWarning(
          'To connect your wallet, please open this page in the Phantom or Solflare mobile app. ' +
          'Alternatively, you can install the Phantom mobile app from your app store.'
        );
      } else {
        setWalletWarning(
          'No Solana wallet detected. Please install the Phantom browser extension from phantom.app ' +
          'or use Solflare at solflare.com'
        );
      }
    } else if (error.name === 'WalletConnectionError') {
      setWalletWarning(
        'Failed to connect wallet. Please ensure your wallet is unlocked and try again.'
      );
    } else if (error.name === 'WalletSignTransactionError') {
      setWalletWarning(
        'Transaction signing failed. You may have rejected the transaction in your wallet.'
      );
    } else {
      // Generic error - don't show for passive initialization failures
      if (shouldLogError()) {
        setWalletWarning(
          `Wallet error: ${error.message || 'Unknown error occurred'}. Please try again.`
        );
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false} onError={onError}>
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
