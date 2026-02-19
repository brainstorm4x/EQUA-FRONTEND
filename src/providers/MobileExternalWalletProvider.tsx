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
 * For mobile external browsers (Chrome, Safari on Android).
 * 
 * Uses the standard Phantom and Solflare wallet adapters and lets the
 * @solana/wallet-adapter-react WalletProvider handle Mobile Wallet Adapter
 * (MWA) detection and creation automatically. The upstream WalletProvider:
 * - Detects Android mobile browser via user agent
 * - Creates a SolanaMobileWalletAdapter with correct app identity and cache
 * - Adds it to the adapter list alongside Phantom/Solflare
 * - Handles the MWA deep-link lifecycle (beforeunload, autoConnect, etc.)
 * 
 * autoConnect is enabled so that when the user returns from the wallet app
 * after approving a deep-link authorization, the page can silently reconnect
 * using the cached auth token from localStorage.
 * 
 * The mobile registration code (src/utils/mobileRegistration.ts) uses
 * wallet.signTransaction() instead of wallet.sendTransaction() to avoid
 * the "Missing signature" error on mobile wallets.
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

  console.log('📱 [MobileExternalProvider] Initializing with standard adapters + auto MWA detection');

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
