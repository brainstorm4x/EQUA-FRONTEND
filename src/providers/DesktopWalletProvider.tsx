'use client';

import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { RPC_ENDPOINT } from '@/lib/constants';

interface Props {
  children: ReactNode;
}

/**
 * Detects if any Solana wallet extension is actually available
 */
const isWalletDetected = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasPhantom = !!(
    (window as any).solana?.isPhantom || 
    (window as any).phantom?.solana?.isPhantom
  );
  const hasSolflare = !!((window as any).solflare);
  return hasPhantom || hasSolflare;
};

/**
 * Internal component that shows no-wallet banner on desktop
 * Must be inside WalletModalProvider to use useWallet hook
 */
const NoWalletBanner: FC = () => {
  const walletContext = useWallet();
  if (!walletContext) return null;
  
  const { connected, wallets: availableWallets } = walletContext;
  
  const shouldShowBanner = 
    !connected && 
    availableWallets.length > 0 && 
    !isWalletDetected();
  
  if (!shouldShowBanner) return null;
  
  return (
    <div 
      className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg mb-4"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <p className="font-semibold">No Wallet Extension Detected</p>
          <p className="text-sm mt-1">
            Install{' '}
            <a 
              href="https://phantom.app/download" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-100 font-medium"
            >
              Phantom
            </a>
            {' '}or{' '}
            <a 
              href="https://www.solflare.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-100 font-medium"
            >
              Solflare
            </a>
            {' '}browser extension to connect your wallet
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Desktop Wallet Provider
 * 
 * For desktop browsers with wallet extensions (Phantom, Solflare).
 * Uses standard browser extension adapters via window.solana injection.
 */
export const DesktopWalletProvider: FC<Props> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[Desktop Wallet Error]:', error.name, error.message);

    if (error.name === 'WalletNotReadyError') {
      const walletName = error.message?.toLowerCase() || '';
      const isPhantom = walletName.includes('phantom');
      const isSolflare = walletName.includes('solflare');
      const walletDisplayName = isPhantom ? 'Phantom' : isSolflare ? 'Solflare' : 'This wallet';
      const downloadUrl = isPhantom 
        ? 'https://phantom.app/download' 
        : isSolflare 
        ? 'https://www.solflare.com'
        : 'https://solana.com/ecosystem/explore?categories=wallet';

      setWalletWarning(
        `${walletDisplayName} extension not detected. Install it from ${downloadUrl} and refresh this page.`
      );
    } else if (error.name === 'WalletConnectionError') {
      const expectedNetwork = RPC_ENDPOINT.includes('devnet') ? 'devnet' : 
        RPC_ENDPOINT.includes('testnet') ? 'testnet' : 'mainnet-beta';
      setWalletWarning(
        `Connection error. Please ensure your wallet is connected to ${expectedNetwork} network.`
      );
    } else if (error.name === 'WalletNotConnectedError') {
      setWalletWarning('Wallet not connected. Please connect your wallet to continue.');
    } else {
      setWalletWarning(`Wallet error: ${error.message || 'Unknown error occurred'}. Please try again.`);
    }
  }, []);

  console.log('🖥️ [DesktopProvider] Initializing with browser extension adapters');

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
          <NoWalletBanner />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
