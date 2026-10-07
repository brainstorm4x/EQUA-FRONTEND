'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { walletRpcEndpoint } from './walletEndpoint';

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
 *
 * The RPC endpoint comes from walletRpcEndpoint() (see walletEndpoint.ts).
 */
export const DesktopWalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => walletRpcEndpoint(), []);

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
