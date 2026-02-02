'use client';

import { FC, ReactNode, useMemo, useCallback, useEffect, useState } from 'react';
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
 * Detects expected Solana network from RPC endpoint
 */
const getExpectedNetwork = (): WalletAdapterNetwork => {
  if (RPC_ENDPOINT.includes('devnet')) return WalletAdapterNetwork.Devnet;
  if (RPC_ENDPOINT.includes('testnet')) return WalletAdapterNetwork.Testnet;
  if (RPC_ENDPOINT.includes('mainnet')) return WalletAdapterNetwork.Mainnet;
  return WalletAdapterNetwork.Devnet;
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
   * IMPORTANT:
   * - Phantom & Solflare adapters work on desktop extensions and wallet in-app browsers
   * - SolanaMobileWalletAdapter handles Android Chrome (deep links) and iOS detection
   * - This configuration follows official Solana best practices
   * - Used by all major Solana dApps (Jupiter, Marinade, Raydium, etc.)
   */
  const wallets = useMemo(() => {
    const network = getExpectedNetwork();

    return [
      // Mobile Wallet Adapter (handles Android Chrome + iOS in-app browsers)
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA Token',
          uri:
            typeof window !== 'undefined'
              ? window.location.origin
              : FALLBACK_APP_URL,
          icon:
            typeof window !== 'undefined'
              ? `${window.location.origin}/branding/equa-logo.svg`
              : `${FALLBACK_APP_URL}/branding/equa-logo.svg`,
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
      // Desktop wallets (existing)
      new PhantomWalletAdapter({
        appIdentity: {
          name: 'EQUA Token',
          uri:
            typeof window !== 'undefined'
              ? window.location.origin
              : FALLBACK_APP_URL,
          icon:
            typeof window !== 'undefined'
              ? `${window.location.origin}/branding/equa-logo.svg`
              : `${FALLBACK_APP_URL}/branding/equa-logo.svg`,
        },
      }),
      new SolflareWalletAdapter({ network }),
    ];
  }, []);

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
        autoConnect={false}
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
