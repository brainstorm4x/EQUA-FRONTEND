'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Cluster } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { NETWORK, RPC_ENDPOINT } from '@/lib/constants';

interface Props {
  children: ReactNode;
}

function resolveNetwork(value: string): WalletAdapterNetwork {
  switch (value) {
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'testnet':
      return WalletAdapterNetwork.Testnet;
    case 'devnet':
    default:
      return WalletAdapterNetwork.Devnet;
  }
}

/**
 * Desktop Wallet Provider
 *
 * For desktop browsers with wallet extensions (Phantom, Solflare).
 * Modern wallets self-register via the Wallet Standard protocol, so no
 * legacy adapters are needed — passing an empty array lets the provider
 * auto-detect every installed Standard Wallet without conflicts.
 *
 * Reads `NEXT_PUBLIC_NETWORK` and `NEXT_PUBLIC_RPC_ENDPOINT` (or the legacy
 * `NEXT_PUBLIC_SOLANA_*` aliases) via `@/lib/constants` so the desktop
 * connection matches the rest of the app rather than silently using devnet.
 */
export const DesktopWalletProvider: FC<Props> = ({ children }) => {
  const network = useMemo(() => resolveNetwork(NETWORK), []);
  const endpoint = useMemo(() => {
    if (RPC_ENDPOINT && RPC_ENDPOINT.length > 0) return RPC_ENDPOINT;
    return clusterApiUrl(network as Cluster);
  }, [network]);

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
