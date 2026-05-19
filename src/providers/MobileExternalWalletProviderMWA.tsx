'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Cluster } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
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
 * Experimental MWA-wired provider for mobile external browsers.
 *
 * Mounted only on /signup-mobile-test (see WalletProvider route check).
 * Registers SolanaMobileWalletAdapter v2, which uses Android intents instead
 * of the v1 WebSocket transport — the WebSocket dying on tab background was
 * the root cause MWA v1 was removed (commit d4b7769).
 *
 * MWA is Android-only; on iOS the adapter is harmless but cannot complete a
 * connection — the page-level UI handles iOS messaging separately.
 */
export const MobileExternalWalletProviderMWA: FC<Props> = ({ children }) => {
  const network = useMemo(() => resolveNetwork(NETWORK), []);
  const endpoint = useMemo(() => {
    if (RPC_ENDPOINT && RPC_ENDPOINT.length > 0) return RPC_ENDPOINT;
    return clusterApiUrl(network as Cluster);
  }, [network]);

  const wallets = useMemo(() => {
    const appUri =
      typeof window !== 'undefined' ? window.location.origin : 'https://uniyaa.app';
    return [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'UNIYAA',
          uri: appUri,
          icon: '/icon.png',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ];
  }, [network]);

  console.log('📱 [MobileExternalProviderMWA] Initializing with SolanaMobileWalletAdapter v2');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
