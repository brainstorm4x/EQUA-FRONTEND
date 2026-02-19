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
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

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
 * DEEP LINK FLOW:
 * 1. User clicks "Select Wallet" → modal opens
 * 2. User selects wallet app → walletName saved to localStorage
 * 3. User clicks "Connect" → transact() deep links to wallet app
 * 4. Wallet app shows approval → user approves → auth token stored in persistent cache
 * 5. Browser returns (page may reload) → walletName still in localStorage
 * 6. autoConnect uses cached auth token to silently reconnect
 * 
 * IMPORTANT:
 * - Uses DEFAULT persistent authorization cache (localStorage-based)
 *   because the page may be destroyed when deep linking to the wallet app.
 *   On return, the cached auth token allows silent reconnection.
 * - Uses actual window location for app identity URI so the wallet app
 *   can properly identify the requesting dApp on any deployment.
 * - autoConnect MUST be enabled for reconnection after returning from wallet app.
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
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ],
    [network]
  );

  console.log('🔗 [MobileExternalProvider] Initializing with Mobile Wallet Adapter ONLY');
  console.log('   - App identity URI:', getAppIdentityUri());

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
