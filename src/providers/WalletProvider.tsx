'use client';

import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet,
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
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Detects network from RPC endpoint and returns string for Mobile Wallet Adapter
 * Returns: 'devnet' | 'testnet' | 'mainnet-beta' (string literal - NOT enum)
 * 
 * CRITICAL: Mobile Wallet Adapter requires string literals, not enum values.
 * This ensures proper network validation during wallet connection.
 */
const getExpectedNetwork = (): 'devnet' | 'testnet' | 'mainnet-beta' => {
  const endpoint = RPC_ENDPOINT.toLowerCase();
  if (endpoint.includes('mainnet')) return 'mainnet-beta';
  if (endpoint.includes('testnet')) return 'testnet';
  if (endpoint.includes('devnet')) return 'devnet';
  return 'devnet'; // Safe default
};

/**
 * Converts network string to WalletAdapterNetwork enum for adapters that require it
 * (e.g., SolflareWalletAdapter)
 */
const networkStringToEnum = (network: 'devnet' | 'testnet' | 'mainnet-beta'): WalletAdapterNetwork => {
  return network === 'mainnet-beta' ? WalletAdapterNetwork.Mainnet
    : network === 'testnet' ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;
};

/**
 * Throttle error logging to avoid console spam
 */
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 5000;

/**
 * Fallback URL for app identity when window is undefined (SSR)
 */
const FALLBACK_APP_URL = 'https://equa-frontend.netlify.app';

const shouldLogError = (): boolean => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_THROTTLE_MS) {
    lastErrorTime = now;
    return true;
  }
  return false;
};

/**
 * Banner shown when no desktop wallet extension is detected
 */
const NoWalletBanner: FC = () => {
  const { connected, wallets } = useWallet();

  const isDesktop =
    typeof window !== 'undefined' &&
    !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isWalletInjected =
    typeof window !== 'undefined' &&
    !!((window as any).solana?.isPhantom || (window as any).solflare);

  if (!isDesktop || connected || wallets.length === 0 || isWalletInjected) {
    return null;
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg mb-4">
      <p className="font-semibold">No Wallet Extension Detected</p>
      <p className="text-sm mt-1">
        Install{' '}
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          Phantom
        </a>{' '}
        or{' '}
        <a
          href="https://www.solflare.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          Solflare
        </a>{' '}
        to connect your wallet.
      </p>
    </div>
  );
};

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  /**
   * Get exact current URL for app identity
   * 
   * CRITICAL: This must match EXACTLY the URL the user is accessing.
   * Netlify preview URLs like deploy-preview-246--equa-frontend.netlify.app
   * are different from production equa-frontend.netlify.app
   * 
   * Phantom uses this URI to return after authorization.
   * If it doesn't match, the connection session is lost.
   */
  const getAppIdentityUri = (): string => {
    if (typeof window === 'undefined') {
      return FALLBACK_APP_URL;
    }
    return window.location.origin;
  };

  /**
   * Get app icon URL
   * Tries multiple common locations
   */
  const getAppIconUri = (): string => {
    if (typeof window === 'undefined') {
      return `${FALLBACK_APP_URL}/branding/equa-logo.svg`;
    }
    return `${window.location.origin}/branding/equa-logo.svg`;
  };

  /**
   * CRITICAL FIX: Platform-specific wallet configuration
   * 
   * Mobile browsers:
   * - ONLY show Mobile Wallet Adapter
   * - Desktop wallet adapters (Phantom/Solflare) rely on browser extensions
   * - These extensions don't exist on mobile → silent failures
   * 
   * Desktop browsers:
   * - Show Phantom + Solflare (browser extensions)
   * - Mobile Wallet Adapter not needed (no deep linking on desktop)
   * 
   * In-app browsers (Phantom/Solflare app built-in browsers):
   * - window.solana or window.solflare automatically injected
   * - Desktop adapters work correctly
   */
  const wallets = useMemo(() => {
    const network = getExpectedNetwork();
    
    // Detect platform
    const isMobile = typeof window !== 'undefined' && 
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Check if running in wallet's in-app browser
    const isInAppBrowser = typeof window !== 'undefined' &&
      !!((window as any).solana?.isPhantom || (window as any).solflare);

    // Mobile browser (Chrome, Safari, etc.) - NOT in-app browser
    if (isMobile && !isInAppBrowser) {
      console.log('[WalletProvider] Mobile browser detected - using Mobile Wallet Adapter only');
      return [
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: {
            name: 'EQUA Token',
            uri: getAppIdentityUri(),
            icon: getAppIconUri(),
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          cluster: network, // String literal: 'devnet' | 'testnet' | 'mainnet-beta'
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
      ];
    }

    // Desktop browser OR in-app browser - use extension-based adapters
    console.log('[WalletProvider] Desktop/in-app browser detected - using extension adapters');
    return [
      new PhantomWalletAdapter({
        appIdentity: {
          name: 'EQUA Token',
          uri: getAppIdentityUri(),
          icon: getAppIconUri(),
        },
      }),
      new SolflareWalletAdapter({ network: networkStringToEnum(network) }),
    ];
  }, []); // Empty deps - only runs once on mount

  /**
   * Centralized wallet error handling
   */
  const onError = useCallback((error: WalletError) => {
    if (shouldLogError()) {
      console.error('[Wallet Error]', error.name, error.message);
    }

    const expectedNetwork = getExpectedNetwork();

    if (error.name === 'WalletConnectionError') {
      setWalletWarning(
        `Failed to connect to wallet. Please ensure your wallet app is open and set to ${expectedNetwork}.`
      );
    } else if (error.name === 'WalletNotReadyError') {
      setWalletWarning(
        'Wallet not ready. Please unlock your wallet and try again.'
      );
    } else if (error.name === 'WalletNotConnectedError') {
      setWalletWarning('Wallet not connected. Please connect to continue.');
    } else {
      setWalletWarning(
        error.message || 'Unexpected wallet error. Please try again.'
      );
    }
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={onError}
      >
        <WalletModalProvider>
          {walletWarning && (
            <div className="fixed top-4 right-4 z-50 max-w-md bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded shadow-lg">
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm">{walletWarning}</p>
                <button
                  onClick={() => setWalletWarning(null)}
                  className="font-bold"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <NoWalletBanner />
          <ProgramIdMigration />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};