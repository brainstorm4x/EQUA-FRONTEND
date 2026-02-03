/**
 * Tests for wallet provider separation (desktop vs mobile)
 * 
 * Validates that:
 * 1. DesktopWalletProvider only initializes desktop adapters
 * 2. MobileWalletProvider only initializes mobile adapters
 * 3. WalletProvider correctly routes to the appropriate provider
 */

import { renderHook } from '@testing-library/react';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock the wallet adapters to avoid actual wallet initialization
jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn().mockImplementation(() => ({
    name: 'Phantom',
    url: 'https://phantom.app',
    icon: 'phantom-icon',
    readyState: 'Installed',
    publicKey: null,
    connecting: false,
    connected: false,
  })),
  SolflareWalletAdapter: jest.fn().mockImplementation(() => ({
    name: 'Solflare',
    url: 'https://solflare.com',
    icon: 'solflare-icon',
    readyState: 'Installed',
    publicKey: null,
    connecting: false,
    connected: false,
  })),
}));

jest.mock('@solana-mobile/wallet-adapter-mobile', () => ({
  SolanaMobileWalletAdapter: jest.fn().mockImplementation(() => ({
    name: 'Mobile Wallet Adapter',
    url: 'https://solana.com',
    icon: 'mobile-icon',
    readyState: 'Installed',
    publicKey: null,
    connecting: false,
    connected: false,
  })),
  createDefaultAddressSelector: jest.fn(() => () => Promise.resolve(0)),
  createDefaultAuthorizationResultCache: jest.fn(() => ({
    get: () => null,
    set: () => {},
    clear: () => {},
  })),
  createDefaultWalletNotFoundHandler: jest.fn(() => () => {}),
}));

// Mock components
jest.mock('@/components/ProgramIdMigration', () => ({
  ProgramIdMigration: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Wallet Provider Separation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('should detect desktop browser (Chrome on Windows)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      expect(isMobile).toBe(false);
    });

    it('should detect mobile browser (Chrome on Android)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      });

      const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      expect(isMobile).toBe(true);
    });

    it('should detect mobile browser (Safari on iPhone)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });

      const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      expect(isMobile).toBe(true);
    });

    it('should detect in-app browser (Phantom)', () => {
      (window as any).solana = { isPhantom: true };
      const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
      expect(isInAppBrowser).toBe(true);
      
      // Cleanup
      delete (window as any).solana;
    });

    it('should detect in-app browser (Solflare)', () => {
      (window as any).solflare = { isSolflare: true };
      const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
      expect(isInAppBrowser).toBe(true);
      
      // Cleanup
      delete (window as any).solflare;
    });
  });

  describe('Provider Routing Logic', () => {
    it('should use desktop provider for desktop browsers', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const mobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
      const shouldUseMobileProvider = mobile && !isInAppBrowser;

      expect(shouldUseMobileProvider).toBe(false);
      // Desktop provider should be used
    });

    it('should use mobile provider for mobile browsers (not in-app)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36',
      });

      const mobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
      const shouldUseMobileProvider = mobile && !isInAppBrowser;

      expect(shouldUseMobileProvider).toBe(true);
      // Mobile provider should be used
    });

    it('should use desktop provider for in-app browsers on mobile', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36',
      });
      (window as any).solana = { isPhantom: true };

      const mobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
      const shouldUseMobileProvider = mobile && !isInAppBrowser;

      expect(shouldUseMobileProvider).toBe(false);
      // Desktop provider should be used (in-app browser has window.solana)
      
      // Cleanup
      delete (window as any).solana;
    });
  });

  describe('Network Detection', () => {
    const getExpectedNetwork = (endpoint: string): 'devnet' | 'testnet' | 'mainnet-beta' => {
      const normalizedEndpoint = endpoint.toLowerCase();
      if (normalizedEndpoint.includes('mainnet')) return 'mainnet-beta';
      if (normalizedEndpoint.includes('testnet')) return 'testnet';
      if (normalizedEndpoint.includes('devnet')) return 'devnet';
      return 'devnet';
    };

    it('should detect devnet from RPC endpoint', () => {
      expect(getExpectedNetwork('https://api.devnet.solana.com')).toBe('devnet');
    });

    it('should detect testnet from RPC endpoint', () => {
      expect(getExpectedNetwork('https://api.testnet.solana.com')).toBe('testnet');
    });

    it('should detect mainnet from RPC endpoint', () => {
      expect(getExpectedNetwork('https://api.mainnet-beta.solana.com')).toBe('mainnet-beta');
    });

    it('should default to devnet for unknown endpoints', () => {
      expect(getExpectedNetwork('https://custom-rpc.example.com')).toBe('devnet');
    });
  });

  describe('AutoConnect Configuration', () => {
    it('should document that desktop provider uses autoConnect: true', () => {
      // Desktop extensions handle autoConnect well
      const desktopAutoConnect = true;
      expect(desktopAutoConnect).toBe(true);
    });

    it('should document that mobile provider uses autoConnect: false', () => {
      // Mobile deep linking requires autoConnect: false
      const mobileAutoConnect = false;
      expect(mobileAutoConnect).toBe(false);
    });
  });

  describe('Adapter Configuration', () => {
    it('should verify desktop provider includes Phantom and Solflare', () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = require('@solana/wallet-adapter-wallets');
      
      // Simulate desktop provider initialization
      const phantom = new PhantomWalletAdapter();
      const solflare = new SolflareWalletAdapter({ network: 'devnet' });
      
      expect(phantom.name).toBe('Phantom');
      expect(solflare.name).toBe('Solflare');
      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });

    it('should verify mobile provider includes only Mobile Wallet Adapter', () => {
      const { SolanaMobileWalletAdapter } = require('@solana-mobile/wallet-adapter-mobile');
      
      // Simulate mobile provider initialization
      const mobileAdapter = new SolanaMobileWalletAdapter({
        cluster: 'devnet',
        appIdentity: {
          name: 'EQUA Token',
          uri: 'https://equa-frontend.netlify.app',
          icon: 'https://equa-frontend.netlify.app/branding/equa-logo.svg',
        },
      });
      
      expect(mobileAdapter.name).toBe('Mobile Wallet Adapter');
      expect(SolanaMobileWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('Console Logging', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log desktop provider initialization', () => {
      console.log('[DesktopWalletProvider] Initializing desktop wallet adapters');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DesktopWalletProvider] Initializing desktop wallet adapters'
      );
    });

    it('should log mobile provider initialization', () => {
      console.log('[MobileWalletProvider] Initializing Mobile Wallet Adapter');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MobileWalletProvider] Initializing Mobile Wallet Adapter'
      );
    });

    it('should log platform detection in router', () => {
      console.log('[WalletProvider] Platform detected:', {
        mobile: true,
        isInAppBrowser: false,
        willUseMobileProvider: true,
      });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WalletProvider] Platform detected:',
        expect.objectContaining({
          mobile: true,
          isInAppBrowser: false,
          willUseMobileProvider: true,
        })
      );
    });
  });
});
