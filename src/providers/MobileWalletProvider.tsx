'use client';

import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_ENDPOINT } from '@/lib/constants';
import '@solana/wallet-adapter-react-ui/styles.css';

interface MobileWalletProviderProps {
  children: ReactNode;
}

const getExpectedNetwork = (): 'devnet' | 'testnet' | 'mainnet-beta' => {
  const endpoint = RPC_ENDPOINT.toLowerCase();
  if (endpoint.includes('mainnet')) return 'mainnet-beta';
  if (endpoint.includes('testnet')) return 'testnet';
  if (endpoint.includes('devnet')) return 'devnet';
  return 'devnet';
};

const FALLBACK_APP_URL = 'https://equa-frontend.netlify.app';

export const MobileWalletProvider: FC<MobileWalletProviderProps> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  const wallets = useMemo(() => {
    const network = getExpectedNetwork();
    
    console.log('[MobileWalletProvider] Initializing Mobile Wallet Adapter');
    
    const appUri = typeof window !== 'undefined' ? window.location.origin : FALLBACK_APP_URL;
    const appIcon = `${appUri}/branding/equa-logo.svg`;
    
    return [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA Token',
          uri: appUri,
          icon: appIcon,
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ];
  }, []);

  const onError = useCallback((error: WalletError) => {
    console.error('[MobileWallet Error]', error.name, error.message);
    
    const expectedNetwork = getExpectedNetwork();
    
    if (error.name === 'WalletConnectionError') {
      setWalletWarning(
        `Failed to connect to wallet. Please ensure your wallet app is open and set to ${expectedNetwork}.`
      );
    } else if (error.name === 'WalletNotReadyError') {
      setWalletWarning('Wallet not ready. Please ensure Phantom or Solflare mobile app is installed and unlocked.');
    } else {
      setWalletWarning(error.message || 'Unexpected wallet error. Please try again.');
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
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
