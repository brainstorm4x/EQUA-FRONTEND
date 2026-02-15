'use client';

import { FC, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet,
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
import { WalletDebugLogger } from '@/components/WalletDebugLogger';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Component to log wallet connection state changes
 */
const WalletConnectionLogger: FC = () => {
  const { wallet, connected, connecting, disconnecting, publicKey } = useWallet();

  useEffect(() => {
    console.log('📊 [WalletState] Connection state changed:', {
      walletName: wallet?.adapter?.name || 'None',
      connected,
      connecting,
      disconnecting,
      publicKey: publicKey?.toBase58() || 'None',
      hasSignTransaction: wallet?.adapter && 'signTransaction' in wallet.adapter && typeof wallet.adapter.signTransaction === 'function',
      hasSendTransaction: wallet?.adapter && 'sendTransaction' in wallet.adapter && typeof wallet.adapter.sendTransaction === 'function',
    });
  }, [wallet, connected, connecting, disconnecting, publicKey]);

  return null;
};

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

  console.log('🔧 [WalletProvider] Initializing wallet provider...');
  console.log('  📍 Network:', network);
  console.log('  📍 RPC Endpoint:', endpoint);
  console.log('  📍 User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
  console.log('  📍 Is Mobile:', typeof navigator !== 'undefined' ? /Mobile|Android|iPhone/i.test(navigator.userAgent) : false);

  const wallets = useMemo(() => {
    console.log('🔧 [WalletProvider] Creating wallet adapters...');
    
    const mobileAdapter = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: {
        name: 'EQUA',
        uri: 'https://equa.app',
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      chain: network,  // ✅ Modern API (not deprecated 'cluster')
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
    console.log('  ✅ Mobile adapter created:', mobileAdapter.name);

    const phantomAdapter = new PhantomWalletAdapter();
    console.log('  ✅ Phantom adapter created:', phantomAdapter.name);

    const solflareAdapter = new SolflareWalletAdapter({ network });
    console.log('  ✅ Solflare adapter created:', solflareAdapter.name);

    console.log('🔧 [WalletProvider] Total adapters:', [mobileAdapter, phantomAdapter, solflareAdapter].length);

    return [mobileAdapter, phantomAdapter, solflareAdapter];
  }, [network]);

  const onError = useCallback((error: WalletError) => {
    console.error('❌ [WalletProvider] Wallet error:', {
      name: error.name,
      message: error.message,
      error: error,
    });
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError} 
        autoConnect={false}  // Disable autoConnect to prevent mobile re-connection issues
      >
        <WalletModalProvider>
          <WalletDebugLogger />
          <WalletConnectionLogger />
          <ProgramIdMigration />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
