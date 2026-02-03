'use client';

import { FC, ReactNode, useMemo, useCallback } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
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

interface Props {
  children: ReactNode;
}

/**
 * Desktop wallet provider
 *
 * Uses extension wallets only
 * Shares NOTHING with mobile lifecycle
 */
export const DesktopWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[DesktopWallet]', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
