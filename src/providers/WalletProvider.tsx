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

  useEffect(() => {
    console.log('✅ [WalletProvider] Wallet provider initialized with', wallets.length, 'adapters');
    wallets.forEach((wallet, idx) => {
      console.log(`  ${idx + 1}. ${wallet.name}`);
    });
  }, [wallets]);

  const onError = useCallback((error: WalletError) => {
    console.error('❌ [WalletProvider] Wallet error occurred');
    console.error('  Name:', error.name || 'Unknown');
    console.error('  Message:', error.message || 'No message');
    console.error('  Error code:', (error as any).code || 'No code');
    
    // Log stack trace if available
    if (error.stack) {
      console.error('  Stack:', error.stack);
    }
    
    // Try to log additional properties
    try {
      const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
      console.error('  Full error details:', errorDetails);
    } catch (stringifyError) {
      console.error('  Could not stringify error:', stringifyError);
    }
    
    // Provide user-friendly error messages for common issues
    if (error.message?.includes('No available wallet')) {
      console.error('  💡 User action needed: Install a Solana wallet app (Phantom or Solflare)');
    } else if (error.message?.includes('User rejected')) {
      console.error('  💡 User action: User cancelled the wallet connection');
    } else if (error.message?.includes('deep link')) {
      console.error('  💡 Possible issue: Deep link configuration or wallet app not responding');
    }
    
    // Log the raw error object (for desktop DevTools)
    console.error('  Raw error object:', error);
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
