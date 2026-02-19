'use client';

import { FC, ReactNode, useMemo, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
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
 * Mobile In-App Wallet Provider
 * 
 * For mobile in-app browsers (Phantom/Solflare apps).
 * Wallet is pre-injected via window.solana, so we enable autoConnect.
 */
export const MobileInAppWalletProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[Mobile InApp Wallet Error]:', error.name, error.message);
  }, []);

  console.log('📱 [MobileInAppProvider] Initializing with injected wallet adapters');

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect={true} onError={onError}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
