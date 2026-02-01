/**
 * Wallet Utility Functions
 * 
 * Helper functions for device detection, wallet detection, and deeplink generation
 */

import { DeviceType, WalletInfo } from './types';

const SESSION_KEY = 'equa_wallet_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Detect device type
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  // Check for touch capability
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Check if device is mobile (any mobile type)
 */
export function isMobileDevice(): boolean {
  const deviceType = detectDeviceType();
  return deviceType !== 'desktop';
}

/**
 * Detect if Phantom wallet is installed
 */
export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const solana = (window as any).solana;
  const phantom = (window as any).phantom;
  
  return !!(solana?.isPhantom || phantom?.solana?.isPhantom);
}

/**
 * Detect if Solflare wallet is installed
 */
export function isSolflareInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!((window as any).solflare);
}

/**
 * Detect if Backpack wallet is installed
 */
export function isBackpackInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!((window as any).backpack?.isBackpack);
}

/**
 * Detect if Coinbase Wallet is installed
 */
export function isCoinbaseInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const coinbase = (window as any).coinbaseSolana;
  return !!(coinbase?.isCoinbaseWallet);
}

/**
 * Get available wallet information
 */
export function getAvailableWallets(): WalletInfo[] {
  const wallets: WalletInfo[] = [
    {
      name: 'Phantom',
      icon: 'https://phantom.app/img/logo.png',
      url: 'https://phantom.app',
      mobileDeeplink: 'phantom://',
      installUrl: {
        desktop: 'https://phantom.app/download',
        ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
        android: 'https://play.google.com/store/apps/details?id=app.phantom',
      },
      detected: isPhantomInstalled(),
    },
    {
      name: 'Solflare',
      icon: 'https://solflare.com/assets/logo.svg',
      url: 'https://solflare.com',
      mobileDeeplink: 'solflare://',
      installUrl: {
        desktop: 'https://solflare.com/download',
        ios: 'https://apps.apple.com/app/solflare/id1580902717',
        android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
      },
      detected: isSolflareInstalled(),
    },
    {
      name: 'Backpack',
      icon: 'https://backpack.app/favicon.ico',
      url: 'https://backpack.app',
      installUrl: {
        desktop: 'https://backpack.app/downloads',
        ios: 'https://apps.apple.com/app/backpack-crypto-wallet/id6448458624',
        android: 'https://play.google.com/store/apps/details?id=app.backpack.mobile',
      },
      detected: isBackpackInstalled(),
    },
    {
      name: 'Coinbase Wallet',
      icon: 'https://www.coinbase.com/favicon.ico',
      url: 'https://www.coinbase.com/wallet',
      installUrl: {
        desktop: 'https://www.coinbase.com/wallet/downloads',
        ios: 'https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455',
        android: 'https://play.google.com/store/apps/details?id=org.toshi',
      },
      detected: isCoinbaseInstalled(),
    },
  ];
  
  return wallets;
}

/**
 * Generate deeplink for mobile wallet connection
 */
export function generateMobileDeeplink(
  walletName: string,
  appUrl: string,
  cluster: string = 'devnet'
): string {
  const wallet = getAvailableWallets().find(w => w.name === walletName);
  if (!wallet?.mobileDeeplink) {
    throw new Error(`No mobile deeplink available for ${walletName}`);
  }
  
  const params = new URLSearchParams({
    cluster,
    app_url: appUrl,
    redirect: appUrl,
  });
  
  return `${wallet.mobileDeeplink}v1/connect?${params.toString()}`;
}

/**
 * Save wallet session to localStorage
 */
export function saveWalletSession(walletName: string, publicKey: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const session = {
      walletName,
      publicKey,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save wallet session:', error);
  }
}

/**
 * Load wallet session from localStorage
 */
export function loadWalletSession(): { walletName: string; publicKey: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    
    const session = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (Date.now() - session.timestamp > SESSION_TTL) {
      clearWalletSession();
      return null;
    }
    
    return {
      walletName: session.walletName,
      publicKey: session.publicKey,
    };
  } catch (error) {
    console.error('Failed to load wallet session:', error);
    return null;
  }
}

/**
 * Clear wallet session from localStorage
 */
export function clearWalletSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear wallet session:', error);
  }
}

/**
 * Format wallet address for display
 * Consistent with EQUA-MOBILE-APP format
 */
export function formatAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get Solana explorer URL for address
 */
export function getExplorerUrl(address: string, cluster: string = 'devnet'): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${clusterParam}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }
}
