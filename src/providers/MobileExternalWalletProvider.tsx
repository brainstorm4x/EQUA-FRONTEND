'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface Props {
  children: ReactNode;
}

/**
 * Mobile External Wallet Provider
 *
 * For mobile external browsers (Chrome, Safari on Android/iOS).
 *
 * IMPORTANT: SolanaMobileWalletAdapter (MWA v1) CANNOT be used here.
 * MWA v1 uses a local WebSocket server that Android kills when Chrome tabs
 * go to the background during deep-link navigation. This causes the wallet
 * app to open and return without connecting.
 *
 * Instead, we use PhantomWalletAdapter and SolflareWalletAdapter directly.
 * On mobile external browsers, these adapters' connect() method triggers
 * a redirect-based deep link (not WebSocket) that survives tab backgrounding.
 *
 * The MobileWalletConnect component (not WalletMultiButton) is used to
 * initiate connections on mobile, bypassing readyState checks that would
 * otherwise redirect to the wallet's download page.
 *
 * autoConnect={true} silently reconnects when the user returns from the
 * wallet app, using the cached connection state.
 */
export const MobileExternalWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  console.log('📱 [MobileExternalProvider] Initializing with PhantomWalletAdapter + SolflareWalletAdapter (autoConnect)');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
