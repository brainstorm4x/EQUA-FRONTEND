'use client';

import { FC, ReactNode, useMemo, useCallback } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletError, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Unified Wallet Provider (Mobile + Desktop)
 * 
 * ARCHITECTURE:
 * - Single ConnectionProvider for all environments
 * - Single WalletProvider with all adapters
 * - Wallet adapter library auto-detects environment
 * - Mobile browsers → SolanaMobileWalletAdapter
 * - Desktop browsers → PhantomWalletAdapter or SolflareWalletAdapter
 * 
 * CRITICAL:
 * - No nested providers (prevents conflicts)
 * - All adapters available simultaneously
 * - Adapter selection happens internally by wallet-adapter library
 */
export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  const wallets = useMemo(() => {
    return [
      // Mobile wallet adapter (for mobile browsers)
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'EQUA',
          uri: 'https://equa.app',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: network,  // ✅ Modern API (not deprecated 'cluster')
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
      // Desktop wallet adapters (for desktop browsers)
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ];
  }, [network]);

  const onError = useCallback((error: WalletError) => {
    console.error('[WalletProvider]', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError} 
        autoConnect={false}  // Disable autoConnect to prevent mobile re-connection issues
      >
        <WalletModalProvider>
          <ProgramIdMigration />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
