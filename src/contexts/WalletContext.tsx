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
import { getAvailableWallets, loadWalletSession } from '@/lib/wallet/utils';
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
  const [wallets] = useState<WalletInfo[]>(getAvailableWallets());
  const [modalVisible, setModalVisible] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  
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
      await wallet.connect();
      setPublicKey(wallet.publicKey);
      setConnected(true);
      setModalVisible(false);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setConnecting(false);
      throw error;
    } finally {
      setConnecting(false);
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
  
  // Auto-reconnect on mount
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
    
    setAutoConnectAttempted(true);
  }, [autoConnectAttempted]);
  
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
