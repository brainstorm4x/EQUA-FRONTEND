/**
 * Custom Wallet Adapter Types
 * 
 * Defines interfaces and types for the unified wallet adapter system
 * that works across desktop and mobile devices.
 */

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Wallet adapter interface that matches Solana wallet adapter expectations
 * This ensures compatibility with existing EQUA program interactions
 */
export interface WalletAdapter {
  name: string;
  url: string;
  icon: string;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Wallet metadata for display and connection
 */
export interface WalletInfo {
  name: string;
  icon: string;
  url: string;
  mobileDeeplink?: string;
  installUrl: {
    desktop: string;
    ios: string;
    android: string;
  };
  detected: boolean;
}

/**
 * Device type detection
 */
export type DeviceType = 'desktop' | 'ios' | 'android' | 'mobile';

/**
 * Wallet connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

/**
 * Wallet error types
 */
export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export class WalletNotInstalledError extends WalletError {
  constructor(walletName: string) {
    super(`${walletName} is not installed`, 'WALLET_NOT_INSTALLED');
    this.name = 'WalletNotInstalledError';
  }
}

export class WalletConnectionError extends WalletError {
  constructor(message: string) {
    super(message, 'WALLET_CONNECTION_ERROR');
    this.name = 'WalletConnectionError';
  }
}

export class WalletNotConnectedError extends WalletError {
  constructor() {
    super('Wallet is not connected', 'WALLET_NOT_CONNECTED');
    this.name = 'WalletNotConnectedError';
  }
}

/**
 * Wallet session data stored in localStorage
 */
export interface WalletSession {
  walletName: string;
  publicKey: string;
  timestamp: number;
}
