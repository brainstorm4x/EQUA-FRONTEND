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
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';

interface Props {
  children: ReactNode;
}

/**
 * Mobile External Wallet Provider
 *
 * For mobile external browsers (Chrome, Safari on Android).
 *
 * Explicitly instantiates SolanaMobileWalletAdapter as the first adapter so
 * that Android Chrome can deep-link into an installed wallet app (Phantom,
 * Solflare, etc.) via the `solana-wallet://` MWA intent. Without explicit
 * instantiation, adapters report `readyState = NotDetected` on Android Chrome
 * and the modal navigates to the wallet's download page instead.
 *
 * PhantomWalletAdapter and SolflareWalletAdapter are kept as fallbacks for
 * in-app browser environments where they can inject `window.phantom` /
 * `window.solflare`.
 *
 * autoConnect is enabled so that when the user returns from the wallet app
 * after approving a deep-link authorization, the page can silently reconnect
 * using the cached auth token from localStorage.
 */
const PRODUCTION_URL = 'https://equa-frontend.netlify.app';

export const MobileExternalWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA Token',
          uri: typeof window !== 'undefined' ? window.location.origin : PRODUCTION_URL,
          icon: typeof window !== 'undefined'
            ? `${window.location.origin}/branding/equa-logo.png`
            : `${PRODUCTION_URL}/branding/equa-logo.png`,
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'devnet',
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  console.log('📱 [MobileExternalProvider] Initializing with SolanaMobileWalletAdapter (MWA) + Phantom + Solflare');

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
