/**
 * Unified Wallet Adapter
 * 
 * Custom wallet adapter that provides a unified interface for both desktop and mobile
 * wallet connections with better iOS support and broader wallet compatibility.
 */

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  WalletAdapter,
  WalletNotInstalledError,
  WalletConnectionError,
  WalletNotConnectedError,
} from './types';
import {
  detectDeviceType,
  isMobileDevice,
  isPhantomInstalled,
  isSolflareInstalled,
  isBackpackInstalled,
  isCoinbaseInstalled,
  generateMobileDeeplink,
  saveWalletSession,
  clearWalletSession,
} from './utils';

/**
 * Base class for wallet adapters
 */
export abstract class BaseWalletAdapter implements WalletAdapter {
  abstract name: string;
  abstract url: string;
  abstract icon: string;
  
  publicKey: PublicKey | null = null;
  connected: boolean = false;
  connecting: boolean = false;
  disconnecting: boolean = false;
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  abstract signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  abstract signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Phantom Wallet Adapter
 */
export class PhantomWalletAdapter extends BaseWalletAdapter {
  name = 'Phantom';
  url = 'https://phantom.app';
  icon = '/icons/phantom.svg';
  
  private get _provider() {
    if (typeof window === 'undefined') return null;
    
    // Check both window.solana and window.phantom.solana
    const solana = (window as any).solana;
    const phantom = (window as any).phantom?.solana;
    
    if (solana?.isPhantom) return solana;
    if (phantom?.isPhantom) return phantom;
    
    return null;
  }
  
  async connect(): Promise<void> {
    if (this.connecting || this.connected) return;
    
    const provider = this._provider;
    const isMobile = isMobileDevice();
    
    if (!provider && isMobile) {
      // Mobile device without wallet extension → Use deep link
      const appUrl = window.location.origin;
      const deeplink = generateMobileDeeplink(this.name, appUrl);
      
      // Store connection state for callback handling
      sessionStorage.setItem('wallet_connecting', this.name);
      sessionStorage.setItem('wallet_connect_time', Date.now().toString());
      
      console.log(`📱 Opening ${this.name} mobile app via deep link...`);
      
      // Open wallet app via deep link
      window.location.href = deeplink;
      
      // Connection will be completed when wallet app redirects back
      // See WalletContext.tsx for callback handler
      return;
    }
    
    if (!provider) {
      if (isMobile) {
        // On mobile, provide clear guidance instead of cryptic errors
        throw new WalletConnectionError(
          `Phantom browser extension is not available on mobile devices.\n\n` +
          `To connect your wallet:\n` +
          `1. Open the Phantom app on your phone\n` +
          `2. Use the built-in browser (dApp browser)\n` +
          `3. Navigate to ${window.location.origin}\n\n` +
          `Alternatively, use a desktop browser with the Phantom extension installed.`
        );
      } else {
        throw new WalletNotInstalledError('Phantom');
      }
    }
    
    try {
      this.connecting = true;
      
      const resp = await provider.connect();
      this.publicKey = new PublicKey(resp.publicKey.toString());
      this.connected = true;
      
      // Save session
      saveWalletSession(this.name, this.publicKey.toBase58());
      
      // Listen for disconnect
      provider.on('disconnect', () => {
        this.handleDisconnect();
      });
      
      // Listen for account change
      provider.on('accountChanged', (publicKey: any) => {
        if (publicKey) {
          this.publicKey = new PublicKey(publicKey.toString());
          saveWalletSession(this.name, this.publicKey.toBase58());
        } else {
          this.handleDisconnect();
        }
      });
      
    } catch (error: any) {
      this.connecting = false;
      throw new WalletConnectionError(error?.message || 'Failed to connect to Phantom');
    } finally {
      this.connecting = false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.disconnecting) return;
    
    const provider = this._provider;
    if (!provider) return;
    
    try {
      this.disconnecting = true;
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
    } finally {
      this.handleDisconnect();
    }
  }
  
  private handleDisconnect(): void {
    this.publicKey = null;
    this.connected = false;
    this.disconnecting = false;
    clearWalletSession();
  }
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signTransaction(transaction);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transaction');
    }
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signAllTransactions(transactions);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transactions');
    }
  }
  
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const { signature } = await provider.signMessage(message, 'utf8');
      return signature;
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign message');
    }
  }
}

/**
 * Solflare Wallet Adapter
 */
export class SolflareWalletAdapter extends BaseWalletAdapter {
  name = 'Solflare';
  url = 'https://solflare.com';
  icon = '/icons/solflare.svg';
  
  private get _provider() {
    if (typeof window === 'undefined') return null;
    return (window as any).solflare;
  }
  
  async connect(): Promise<void> {
    if (this.connecting || this.connected) return;
    
    const provider = this._provider;
    const isMobile = isMobileDevice();
    
    if (!provider && isMobile) {
      // Mobile device without wallet extension → Use deep link
      const appUrl = window.location.origin;
      const deeplink = generateMobileDeeplink(this.name, appUrl);
      
      // Store connection state for callback handling
      sessionStorage.setItem('wallet_connecting', this.name);
      sessionStorage.setItem('wallet_connect_time', Date.now().toString());
      
      console.log(`📱 Opening ${this.name} mobile app via deep link...`);
      
      // Open wallet app via deep link
      window.location.href = deeplink;
      
      // Connection will be completed when wallet app redirects back
      // See WalletContext.tsx for callback handler
      return;
    }
    
    if (!provider) {
      if (isMobile) {
        // On mobile, provide clear guidance instead of cryptic errors
        throw new WalletConnectionError(
          `Solflare browser extension is not available on mobile devices.\n\n` +
          `To connect your wallet:\n` +
          `1. Open the Solflare app on your phone\n` +
          `2. Use the built-in browser (dApp browser)\n` +
          `3. Navigate to ${window.location.origin}\n\n` +
          `Alternatively, use a desktop browser with the Solflare extension installed.`
        );
      } else {
        throw new WalletNotInstalledError('Solflare');
      }
    }
    
    try {
      this.connecting = true;
      
      await provider.connect();
      this.publicKey = provider.publicKey;
      this.connected = true;
      
      saveWalletSession(this.name, this.publicKey!.toBase58());
      
      provider.on('disconnect', () => {
        this.handleDisconnect();
      });
      
      provider.on('accountChanged', (publicKey: PublicKey | null) => {
        if (publicKey) {
          this.publicKey = publicKey;
          saveWalletSession(this.name, publicKey.toBase58());
        } else {
          this.handleDisconnect();
        }
      });
      
    } catch (error: any) {
      this.connecting = false;
      throw new WalletConnectionError(error?.message || 'Failed to connect to Solflare');
    } finally {
      this.connecting = false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.disconnecting) return;
    
    const provider = this._provider;
    if (!provider) return;
    
    try {
      this.disconnecting = true;
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Solflare:', error);
    } finally {
      this.handleDisconnect();
    }
  }
  
  private handleDisconnect(): void {
    this.publicKey = null;
    this.connected = false;
    this.disconnecting = false;
    clearWalletSession();
  }
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signTransaction(transaction);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transaction');
    }
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signAllTransactions(transactions);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transactions');
    }
  }
  
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const { signature } = await provider.signMessage(message, 'utf8');
      return signature;
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign message');
    }
  }
}

/**
 * Backpack Wallet Adapter
 */
export class BackpackWalletAdapter extends BaseWalletAdapter {
  name = 'Backpack';
  url = 'https://backpack.app';
  icon = '/icons/backpack.svg';
  
  private get _provider() {
    if (typeof window === 'undefined') return null;
    return (window as any).backpack;
  }
  
  async connect(): Promise<void> {
    if (this.connecting || this.connected) return;
    
    const provider = this._provider;
    const isMobile = isMobileDevice();
    
    if (!provider && isMobile) {
      // Mobile device without wallet extension → Use deep link
      const appUrl = window.location.origin;
      const deeplink = generateMobileDeeplink(this.name, appUrl);
      
      // Store connection state for callback handling
      sessionStorage.setItem('wallet_connecting', this.name);
      sessionStorage.setItem('wallet_connect_time', Date.now().toString());
      
      console.log(`📱 Opening ${this.name} mobile app via deep link...`);
      
      // Open wallet app via deep link
      window.location.href = deeplink;
      
      // Connection will be completed when wallet app redirects back
      // See WalletContext.tsx for callback handler
      return;
    }
    
    if (!provider?.isBackpack) {
      if (isMobile) {
        // On mobile, provide clear guidance
        throw new WalletConnectionError(
          `Backpack browser extension is not available on mobile devices.\n\n` +
          `To connect your wallet:\n` +
          `1. Open the Backpack app on your phone\n` +
          `2. Use the built-in browser (dApp browser)\n` +
          `3. Navigate to ${window.location.origin}\n\n` +
          `Alternatively, use a desktop browser with the Backpack extension installed.`
        );
      }
      throw new WalletNotInstalledError('Backpack');
    }
    
    try {
      this.connecting = true;
      
      await provider.connect();
      this.publicKey = provider.publicKey;
      this.connected = true;
      
      saveWalletSession(this.name, this.publicKey!.toBase58());
      
      provider.on('disconnect', () => {
        this.handleDisconnect();
      });
      
    } catch (error: any) {
      this.connecting = false;
      throw new WalletConnectionError(error?.message || 'Failed to connect to Backpack');
    } finally {
      this.connecting = false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.disconnecting) return;
    
    const provider = this._provider;
    if (!provider) return;
    
    try {
      this.disconnecting = true;
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Backpack:', error);
    } finally {
      this.handleDisconnect();
    }
  }
  
  private handleDisconnect(): void {
    this.publicKey = null;
    this.connected = false;
    this.disconnecting = false;
    clearWalletSession();
  }
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signTransaction(transaction);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transaction');
    }
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signAllTransactions(transactions);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transactions');
    }
  }
  
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const { signature } = await provider.signMessage(message);
      return signature;
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign message');
    }
  }
}

/**
 * Coinbase Wallet Adapter
 */
export class CoinbaseWalletAdapter extends BaseWalletAdapter {
  name = 'Coinbase Wallet';
  url = 'https://www.coinbase.com/wallet';
  icon = '/icons/coinbase.svg';
  
  private get _provider() {
    if (typeof window === 'undefined') return null;
    return (window as any).coinbaseSolana;
  }
  
  async connect(): Promise<void> {
    if (this.connecting || this.connected) return;
    
    const provider = this._provider;
    
    if (!provider?.isCoinbaseWallet) {
      if (isMobileDevice()) {
        // On mobile, provide clear guidance
        throw new WalletConnectionError(
          `Coinbase Wallet browser extension is not available on mobile devices.\n\n` +
          `To connect your wallet:\n` +
          `1. Open the Coinbase Wallet app on your phone\n` +
          `2. Use the built-in browser (dApp browser)\n` +
          `3. Navigate to ${window.location.origin}\n\n` +
          `Alternatively, use a desktop browser with the Coinbase Wallet extension installed.`
        );
      }
      throw new WalletNotInstalledError('Coinbase Wallet');
    }
    
    try {
      this.connecting = true;
      
      await provider.connect();
      this.publicKey = provider.publicKey;
      this.connected = true;
      
      saveWalletSession(this.name, this.publicKey!.toBase58());
      
      provider.on('disconnect', () => {
        this.handleDisconnect();
      });
      
    } catch (error: any) {
      this.connecting = false;
      throw new WalletConnectionError(error?.message || 'Failed to connect to Coinbase Wallet');
    } finally {
      this.connecting = false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.disconnecting) return;
    
    const provider = this._provider;
    if (!provider) return;
    
    try {
      this.disconnecting = true;
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Coinbase Wallet:', error);
    } finally {
      this.handleDisconnect();
    }
  }
  
  private handleDisconnect(): void {
    this.publicKey = null;
    this.connected = false;
    this.disconnecting = false;
    clearWalletSession();
  }
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signTransaction(transaction);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transaction');
    }
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      return await provider.signAllTransactions(transactions);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign transactions');
    }
  }
  
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const provider = this._provider;
    if (!provider || !this.connected) {
      throw new WalletNotConnectedError();
    }
    
    try {
      const { signature } = await provider.signMessage(message);
      return signature;
    } catch (error: any) {
      throw new WalletConnectionError(error?.message || 'Failed to sign message');
    }
  }
}

/**
 * Get the appropriate wallet adapter for a given wallet name
 */
export function getWalletAdapter(walletName: string): BaseWalletAdapter {
  switch (walletName) {
    case 'Phantom':
      return new PhantomWalletAdapter();
    case 'Solflare':
      return new SolflareWalletAdapter();
    case 'Backpack':
      return new BackpackWalletAdapter();
    case 'Coinbase Wallet':
      return new CoinbaseWalletAdapter();
    default:
      throw new Error(`Unsupported wallet: ${walletName}`);
  }
}
