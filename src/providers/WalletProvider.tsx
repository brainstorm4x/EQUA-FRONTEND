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
import { SolanaMobileWalletAdapter, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';
import { WalletDebugLogger } from '@/components/WalletDebugLogger';
import { 
  detectWalletEnvironment, 
  getEnvironmentDescription,
  type WalletEnvironment 
} from '@/utils/walletEnvironment';

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
 * Unified Wallet Provider with Environment-Based Adapter Selection
 * 
 * ARCHITECTURE:
 * - Single ConnectionProvider for all environments
 * - Environment detection determines which adapters to use
 * - Three distinct environments:
 *   1. Desktop → Browser extension adapters (Phantom, Solflare)
 *   2. Mobile In-App Browser → Injected wallet adapters (Phantom, Solflare)
 *   3. Mobile External Browser → Mobile Wallet Adapter with deep linking
 * 
 * CRITICAL:
 * - Desktop and mobile in-app use standard adapters (window.solana injection)
 * - Mobile external browsers MUST use Mobile Wallet Adapter for deep linking
 * - No nested providers (prevents conflicts)
 */
export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  // Detect wallet environment on mount (client-side only)
  const environment = typeof window !== 'undefined' 
    ? detectWalletEnvironment() 
    : 'desktop'; // Default to desktop during SSR

  console.log('🔧 [WalletProvider] Initializing wallet provider...');
  console.log('  📍 Network:', network);
  console.log('  📍 RPC Endpoint:', endpoint);
  console.log('  📍 Environment:', environment);
  console.log('  📍 Description:', getEnvironmentDescription(environment));
  console.log('  📍 User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

  const wallets = useMemo(() => {
    console.log('🔧 [WalletProvider] Creating wallet adapters for environment:', environment);
    
    // Desktop: Use browser extension adapters
    if (environment === 'desktop') {
      console.log('🖥️ [WalletProvider] Desktop environment: Using extension adapters');
      const phantomAdapter = new PhantomWalletAdapter();
      const solflareAdapter = new SolflareWalletAdapter({ network });
      console.log('  ✅ Phantom extension adapter created');
      console.log('  ✅ Solflare extension adapter created');
      return [phantomAdapter, solflareAdapter];
    }
    
    // Mobile In-App Browser: Use injected wallet adapters
    if (environment === 'mobile-inapp') {
      console.log('📱 [WalletProvider] Mobile in-app browser: Using injected wallet adapters');
      const phantomAdapter = new PhantomWalletAdapter();
      const solflareAdapter = new SolflareWalletAdapter({ network });
      console.log('  ✅ Phantom in-app adapter created');
      console.log('  ✅ Solflare in-app adapter created');
      return [phantomAdapter, solflareAdapter];
    }
    
    // Mobile External Browser: Use Mobile Wallet Adapter with deep linking
    console.log('📱 [WalletProvider] Mobile external browser: Using Mobile Wallet Adapter');
    console.log('  🔗 Deep linking enabled for installed wallet apps');
    
    const mobileAdapter = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: {
        name: 'EQUA Token',
        uri: 'https://equa-frontend.netlify.app',
        icon: 'https://equa-frontend.netlify.app/branding/equa-logo.svg',
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      cluster: network,
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
    
    console.log('  ✅ Mobile Wallet Adapter created');
    console.log('  📱 Supports: Phantom, Solflare, and all SMS-compatible wallets');
    
    return [mobileAdapter];
  }, [network, environment]);

  useEffect(() => {
    console.log('✅ [WalletProvider] Wallet provider initialized');
    console.log('  📍 Environment:', environment);
    console.log('  📍 Total adapters:', wallets.length);
    wallets.forEach((wallet, idx) => {
      console.log(`  ${idx + 1}. ${wallet.name}`);
    });
  }, [wallets, environment]);

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
