'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Debug component to log wallet adapter selection and state changes
 * Only active in development mode
 */
export function WalletDebugLogger() {
  const { wallet, wallets, connected, connecting, publicKey } = useWallet();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    console.log('🔍 [WalletDebug] Available wallets:', 
      wallets.map(w => ({
        name: w.adapter.name,
        readyState: w.readyState,
        url: w.adapter.url,
      }))
    );
  }, [wallets]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    if (wallet) {
      console.log('🔍 [WalletDebug] Active wallet changed:', {
        name: wallet.adapter.name,
        readyState: wallet.readyState,
        publicKey: publicKey?.toBase58(),
        connected,
        connecting,
        hasSendTransaction: 'sendTransaction' in wallet.adapter && typeof wallet.adapter.sendTransaction === 'function',
        hasSignTransaction: 'signTransaction' in wallet.adapter && typeof wallet.adapter.signTransaction === 'function',
        hasSignAllTransactions: 'signAllTransactions' in wallet.adapter && typeof wallet.adapter.signAllTransactions === 'function',
      });
    }
  }, [wallet, connected, connecting, publicKey]);

  return null;
}
