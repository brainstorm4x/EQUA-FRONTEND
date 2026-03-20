'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface Props {
  children: ReactNode;
}

/**
 * Desktop Wallet Provider
 *
 * For desktop browsers with wallet extensions (Phantom, Solflare).
 * Modern wallets self-register via the Wallet Standard protocol, so no
 * legacy adapters are needed — passing an empty array lets the provider
 * auto-detect every installed Standard Wallet without conflicts.
 */
export const DesktopWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  console.log('🖥️ [DesktopProvider] Initializing with Wallet Standard auto-detection');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
