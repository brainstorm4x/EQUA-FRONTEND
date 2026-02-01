/**
 * Wallet Context
 * 
 * React context provider for unified wallet adapter
 * Provides wallet connection state and methods to child components
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { BaseWalletAdapter, getWalletAdapter } from '@/lib/wallet/UnifiedWalletAdapter';
import { WalletInfo, WalletNotConnectedError } from '@/lib/wallet/types';
import { getAvailableWallets, loadWalletSession, recheckWalletAvailability, saveWalletSession } from '@/lib/wallet/utils';
import { RPC_ENDPOINT } from '@/lib/constants';

interface WalletContextValue {
  // Connection
  connection: Connection;
  
  // Wallet state
  wallet: BaseWalletAdapter | null;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  
  // Available wallets
  wallets: WalletInfo[];
  refreshWallets: () => void;
  
  // Methods
  select: (walletName: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  
  // UI state
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [connection] = useState(() => new Connection(RPC_ENDPOINT, 'confirmed'));
  const [wallet, setWallet] = useState<BaseWalletAdapter | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [wallets, setWallets] = useState<WalletInfo[]>(getAvailableWallets());
  const [modalVisible, setModalVisible] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  
  // Function to refresh wallet detection
  const refreshWallets = useCallback(() => {
    setWallets(recheckWalletAvailability());
  }, []);
  
  // Select a wallet
  const select = useCallback((walletName: string) => {
    try {
      const adapter = getWalletAdapter(walletName);
      setWallet(adapter);
    } catch (error) {
      console.error('Failed to select wallet:', error);
    }
  }, []);
  
  // Connect to selected wallet
  const connect = useCallback(async () => {
    if (!wallet || connecting || connected) return;
    
    try {
      setConnecting(true);
      
      // Add 30-second timeout protection to prevent infinite waiting
      const connectPromise = wallet.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wallet connection timeout. Please try again.')), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      setPublicKey(wallet.publicKey);
      setConnected(true);
      
      // Small delay to allow state to propagate before closing modal
      await new Promise(resolve => setTimeout(resolve, 300));
      setModalVisible(false);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw error; // Re-throw for UI error handling
    } finally {
      setConnecting(false); // ✅ ALWAYS runs, even after throw
    }
  }, [wallet, connecting, connected]);
  
  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    if (!wallet || disconnecting) return;
    
    try {
      setDisconnecting(true);
      await wallet.disconnect();
      setPublicKey(null);
      setConnected(false);
      setWallet(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setDisconnecting(false);
    }
  }, [wallet, disconnecting]);
  
  // Sign transaction
  const signTransaction = useCallback(async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
    if (!wallet || !connected) {
      throw new WalletNotConnectedError();
    }
    return wallet.signTransaction(transaction);
  }, [wallet, connected]);
  
  // Sign all transactions
  const signAllTransactions = useCallback(async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
    if (!wallet || !connected) {
      throw new WalletNotConnectedError();
    }
    return wallet.signAllTransactions(transactions);
  }, [wallet, connected]);
  
  // Sign message
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!wallet || !connected) {
      throw new WalletNotConnectedError();
    }
    return wallet.signMessage(message);
  }, [wallet, connected]);
  
  // Auto-reconnect on mount and delayed wallet detection
  useEffect(() => {
    if (autoConnectAttempted) return;
    
    const session = loadWalletSession();
    if (session) {
      try {
        const adapter = getWalletAdapter(session.walletName);
        setWallet(adapter);
        
        // Try to auto-connect in the background
        (async () => {
          try {
            await adapter.connect();
            setPublicKey(adapter.publicKey);
            setConnected(true);
          } catch (error) {
            console.log('Auto-connect failed:', error);
            // Clear invalid session
            adapter.disconnect().catch(() => {});
          }
        })();
      } catch (error) {
        console.error('Failed to restore wallet session:', error);
      }
    }
    
    // Re-check wallet availability after window fully loads
    // This helps detect wallets that inject themselves after initial load
    const handleLoad = () => {
      const updatedWallets = recheckWalletAvailability();
      setWallets(updatedWallets);
      
      // Log wallet detection in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Wallet detection updated:', {
          phantom: updatedWallets.find(w => w.name === 'Phantom')?.detected,
          solflare: updatedWallets.find(w => w.name === 'Solflare')?.detected,
          backpack: updatedWallets.find(w => w.name === 'Backpack')?.detected,
          coinbase: updatedWallets.find(w => w.name === 'Coinbase Wallet')?.detected,
        });
      }
    };
    
    if (document.readyState === 'loading') {
      window.addEventListener('load', handleLoad);
    } else {
      // If already loaded, re-check after a short delay
      setTimeout(handleLoad, 500);
    }
    
    setAutoConnectAttempted(true);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [autoConnectAttempted, refreshWallets]);
  
  // Handle mobile wallet connection callbacks
  useEffect(() => {
    // Check if returning from wallet app (URL params present)
    const urlParams = new URLSearchParams(window.location.search);
    const phantomPubkey = urlParams.get('phantom_encryption_public_key');
    const solflarePubkey = urlParams.get('solflare_public_key');
    const backpackPubkey = urlParams.get('backpack_public_key');
    
    const publicKeyString = phantomPubkey || solflarePubkey || backpackPubkey;
    
    if (publicKeyString) {
      const walletName = sessionStorage.getItem('wallet_connecting');
      
      if (walletName) {
        try {
          console.log(`🔗 Mobile wallet callback detected for ${walletName}`);
          
          const adapter = getWalletAdapter(walletName);
          setWallet(adapter);
          
          // Manually set connected state (mobile flow)
          adapter.publicKey = new PublicKey(publicKeyString);
          adapter.connected = true;
          adapter.connecting = false;
          
          setPublicKey(adapter.publicKey);
          setConnected(true);
          setConnecting(false);
          
          // Save session
          saveWalletSession(walletName, publicKeyString);
          
          // Clean up
          sessionStorage.removeItem('wallet_connecting');
          sessionStorage.removeItem('wallet_connect_time');
          
          // Remove URL params without triggering navigation
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
          
          console.log('✅ Mobile wallet connected:', publicKeyString);
        } catch (error) {
          console.error('Failed to complete mobile wallet connection:', error);
          sessionStorage.removeItem('wallet_connecting');
          sessionStorage.removeItem('wallet_connect_time');
        }
      }
    }
  }, []); // Run once on mount
  
  // Update state when wallet changes
  useEffect(() => {
    if (!wallet) {
      setPublicKey(null);
      setConnected(false);
      return;
    }
    
    setPublicKey(wallet.publicKey);
    setConnected(wallet.connected);
    setConnecting(wallet.connecting);
    setDisconnecting(wallet.disconnecting);
  }, [wallet]);
  
  const value: WalletContextValue = {
    connection,
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    wallets,
    refreshWallets,
    select,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    signMessage,
    modalVisible,
    setModalVisible,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

/**
 * Hook to access connection
 */
export function useConnection() {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useConnection must be used within a WalletProvider');
  }
  
  return { connection: context.connection };
}
