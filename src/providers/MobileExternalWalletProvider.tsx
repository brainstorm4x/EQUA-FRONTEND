'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { createInMemoryAuthorizationCache } from '@/utils/walletAuthCache';

interface Props {
  children: ReactNode;
}

/**
 * Returns the current page URI for Mobile Wallet Adapter app identity.
 * Uses actual window location so authorization works on all environments
 * (production, Netlify previews, localhost).
 */
function getAppIdentityUri(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * Mobile External Wallet Provider
 * 
 * For mobile external browsers (Chrome, Safari).
 * Uses ONLY Mobile Wallet Adapter with deep linking to installed wallet apps.
 * No browser extension adapters to prevent conflicts.
 * 
 * AUTHORIZATION FIX:
 * - Uses in-memory authorization cache instead of persistent cache
 * - This ensures fresh authorization approval is requested each session
 * - Prevents wallet app from returning immediately without approval dialog
 * - Uses actual window location for app identity URI so the wallet app
 *   can properly identify the requesting dApp on any deployment
 */
export const MobileExternalWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA',
          uri: getAppIdentityUri(),
          icon: 'https://equa.live/icon.png',
        },
        authorizationResultCache: createInMemoryAuthorizationCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ],
    [network]
  );

  console.log('🔗 [MobileExternalProvider] Initializing with Mobile Wallet Adapter ONLY');
  console.log('   - Using in-memory auth cache for fresh authorization each session');
  console.log('   - App identity URI:', getAppIdentityUri());

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
