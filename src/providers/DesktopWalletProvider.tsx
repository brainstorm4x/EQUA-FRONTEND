'use client';

import { FC, ReactNode, useMemo, useCallback, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_ENDPOINT } from '@/lib/constants';
import '@solana/wallet-adapter-react-ui/styles.css';

interface DesktopWalletProviderProps {
  children: ReactNode;
}

const getExpectedNetwork = (): 'devnet' | 'testnet' | 'mainnet-beta' => {
  const endpoint = RPC_ENDPOINT.toLowerCase();
  if (endpoint.includes('mainnet')) return 'mainnet-beta';
  if (endpoint.includes('testnet')) return 'testnet';
  if (endpoint.includes('devnet')) return 'devnet';
  return 'devnet';
};

const networkStringToEnum = (network: 'devnet' | 'testnet' | 'mainnet-beta'): WalletAdapterNetwork => {
  return network === 'mainnet-beta' ? WalletAdapterNetwork.Mainnet
    : network === 'testnet' ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;
};

export const DesktopWalletProvider: FC<DesktopWalletProviderProps> = ({ children }) => {
  const [walletWarning, setWalletWarning] = useState<string | null>(null);

  const wallets = useMemo(() => {
    const network = getExpectedNetwork();
    
    console.log('[DesktopWalletProvider] Initializing desktop wallet adapters');
    
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: networkStringToEnum(network) }),
    ];
  }, []);

  const onError = useCallback((error: WalletError) => {
    console.error('[DesktopWallet Error]', error.name, error.message);
    
    const expectedNetwork = getExpectedNetwork();
    
    if (error.name === 'WalletConnectionError') {
      setWalletWarning(
        `Failed to connect to wallet. Please ensure your wallet extension is unlocked and set to ${expectedNetwork}.`
      );
    } else if (error.name === 'WalletNotReadyError') {
      setWalletWarning('Wallet extension not detected. Please install Phantom or Solflare.');
    } else {
      setWalletWarning(error.message || 'Unexpected wallet error. Please try again.');
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
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
