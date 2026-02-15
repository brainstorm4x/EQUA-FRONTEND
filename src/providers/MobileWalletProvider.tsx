'use client';

import { FC, ReactNode, useMemo, useCallback } from 'react';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

interface Props {
  children: ReactNode;
}

/**
 * Jupiter-style Mobile Wallet Adapter provider
 *
 * RULES:
 * - Network is hard-pinned (no env inference)
 * - Adapter is instantiated ONCE
 * - Never conditionally mounted
 * - Never reconnects after deep link return
 */
export const MobileWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  const wallets = useMemo(() => {
    return [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA',
          uri: 'https://equa.app',
        },
        authorizationResultCache:
          createDefaultAuthorizationResultCache(),
        chain: network,
        onWalletNotFound:
          createDefaultWalletNotFoundHandler(),
      }),
    ];
  }, [network]);

  const onError = useCallback((error: WalletError) => {
    console.error('[MobileWallet]', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} onError={onError} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
