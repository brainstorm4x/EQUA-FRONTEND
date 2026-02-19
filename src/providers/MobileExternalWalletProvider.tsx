'use client';

import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { RPC_ENDPOINT } from '@/lib/constants';

interface Props {
  children: ReactNode;
}

/**
 * Gets the expected network from the RPC endpoint
 */
const getExpectedNetwork = (): 'devnet' | 'testnet' | 'mainnet-beta' => {
  if (RPC_ENDPOINT.includes('devnet')) return 'devnet';
  if (RPC_ENDPOINT.includes('testnet')) return 'testnet';
  if (RPC_ENDPOINT.includes('mainnet')) return 'mainnet-beta';
  return 'devnet';
};

/**
 * Gets the app store URL for Phantom wallet based on the platform
 */
const getPhantomStoreUrl = (): string => {
  if (typeof window === 'undefined') return 'https://phantom.app/download';
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android/.test(userAgent)) {
    return 'https://play.google.com/store/apps/details?id=app.phantom';
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977';
  }
  return 'https://phantom.app/download';
};

/**
 * Mobile External Wallet Provider
 * 
 * For mobile external browsers (Chrome, Safari).
 * Uses ONLY Mobile Wallet Adapter with deep linking to installed wallet apps.
 * No browser extension adapters to prevent conflicts.
 * 
 * CRITICAL: appIdentity.uri MUST use window.location.origin so the wallet app
 * can properly verify the dApp origin and redirect back after authorization.
 * Hardcoding the URI causes wallets to return without approval.
 */
export const MobileExternalWalletProvider: FC<Props> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA Token',
          uri: typeof window !== 'undefined' ? window.location.origin : 'https://equa.live',
          icon: typeof window !== 'undefined' 
            ? `${window.location.origin}/branding/equa-logo.svg`
            : 'https://equa.live/branding/equa-logo.svg',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: getExpectedNetwork(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[Mobile Wallet Error]:', error.name, error.message);

    if (error.name === 'WalletNotReadyError') {
      const walletName = error.message?.toLowerCase() || '';
      const isPhantom = walletName.includes('phantom');
      const walletDisplayName = isPhantom ? 'Phantom' : 'Solana wallet';
      const downloadUrl = isPhantom ? getPhantomStoreUrl() : 'https://solflare.com/download';

      const shouldRedirect = window.confirm(
        `${walletDisplayName} is not installed. Would you like to download it from the app store?`
      );
      if (shouldRedirect) {
        window.location.href = downloadUrl;
      }
    } else if (error.name === 'WalletConnectionError') {
      const expectedNetwork = getExpectedNetwork();
      console.warn('[Mobile Wallet] Connection failed. Common causes:');
      console.warn('  - User rejected authorization in wallet app');
      console.warn('  - Wallet app not responding');
      console.warn(`  - Network mismatch (check wallet app is on ${expectedNetwork})`);
      console.warn('  - Deep link redirection failed');

      setWalletWarning(
        'Failed to connect to wallet. Please ensure your wallet app is open and try again. ' +
        `If the issue persists, check that your wallet is on the correct network (${expectedNetwork}).`
      );
    } else if (error.name === 'WalletNotConnectedError') {
      setWalletWarning('Wallet not connected. Please connect your wallet to continue.');
    } else {
      setWalletWarning(`Wallet error: ${error.message || 'Unknown error occurred'}. Please try again.`);
    }
  }, []);

  console.log('🔗 [MobileExternalProvider] Initializing with Mobile Wallet Adapter ONLY');
  console.log('  - App URI:', typeof window !== 'undefined' ? window.location.origin : '(SSR)');

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>
          {walletWarning && (
            <div 
              className="fixed top-4 right-4 max-w-md bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded shadow-lg z-50"
              role="alert"
              aria-live="assertive"
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
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
