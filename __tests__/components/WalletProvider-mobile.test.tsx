/**
 * Tests for Wallet Provider mobile wallet adapter configuration
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WalletProvider } from '@/providers/WalletProvider';

// Mock the wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="connection-provider">{children}</div>,
  WalletProvider: ({ children, wallets, autoConnect }: { children: React.ReactNode; wallets: any[]; autoConnect?: boolean }) => {
    // Expose wallets and autoConnect for testing
    return (
      <div data-testid="wallet-provider" data-wallets={JSON.stringify(wallets.map(w => w.name))} data-auto-connect={String(autoConnect)}>
        {children}
      </div>
    );
  },
  useConnection: jest.fn(),
  useWallet: jest.fn(),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-modal-provider">{children}</div>,
}));

const mockPhantomAdapter = { name: 'Phantom' };
const mockSolflareAdapter = { name: 'Solflare' };
const mockMobileAdapter = { name: 'Mobile Wallet Adapter' };

jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn().mockImplementation(() => mockPhantomAdapter),
  SolflareWalletAdapter: jest.fn().mockImplementation(() => mockSolflareAdapter),
}));

jest.mock('@solana-mobile/wallet-adapter-mobile', () => ({
  SolanaMobileWalletAdapter: jest.fn().mockImplementation(() => mockMobileAdapter),
  createDefaultAuthorizationResultCache: jest.fn().mockReturnValue({}),
  createDefaultAddressSelector: jest.fn().mockReturnValue({}),
  createDefaultWalletNotFoundHandler: jest.fn().mockReturnValue(async () => {}),
}));

describe('WalletProvider Mobile Configuration', () => {
  const originalNavigator = global.navigator;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('Desktop Browser', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
        configurable: true,
      });
    });

    it('should NOT include mobile wallet adapter on desktop', () => {
      const { SolanaMobileWalletAdapter } = require('@solana-mobile/wallet-adapter-mobile');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(SolanaMobileWalletAdapter).not.toHaveBeenCalled();
    });

    it('should include Phantom and Solflare adapters on desktop', () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = require('@solana/wallet-adapter-wallets');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('Mobile Browser (Android)', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' },
        writable: true,
        configurable: true,
      });
    });

    it('should include mobile wallet adapter on Android', () => {
      const { SolanaMobileWalletAdapter } = require('@solana-mobile/wallet-adapter-mobile');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(SolanaMobileWalletAdapter).toHaveBeenCalled();
    });

    it('should configure mobile adapter with correct parameters', () => {
      const { 
        SolanaMobileWalletAdapter,
        createDefaultAuthorizationResultCache,
        createDefaultAddressSelector,
        createDefaultWalletNotFoundHandler,
      } = require('@solana-mobile/wallet-adapter-mobile');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(SolanaMobileWalletAdapter).toHaveBeenCalledWith({
        addressSelector: expect.anything(),
        appIdentity: { name: 'EQUA Token' },
        authorizationResultCache: expect.anything(),
        cluster: 'devnet',
        onWalletNotFound: expect.any(Function),
      });
      expect(createDefaultAuthorizationResultCache).toHaveBeenCalled();
      expect(createDefaultAddressSelector).toHaveBeenCalled();
      expect(createDefaultWalletNotFoundHandler).toHaveBeenCalled();
    });

    it('should include Phantom and Solflare adapters on mobile', () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = require('@solana/wallet-adapter-wallets');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('Mobile Browser (iOS)', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
        writable: true,
        configurable: true,
      });
    });

    it('should include mobile wallet adapter on iOS', () => {
      const { SolanaMobileWalletAdapter } = require('@solana-mobile/wallet-adapter-mobile');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      expect(SolanaMobileWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('AutoConnect Configuration', () => {
    it('should have autoConnect disabled', () => {
      const { container } = render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      const walletProvider = container.querySelector('[data-testid="wallet-provider"]');
      expect(walletProvider?.getAttribute('data-auto-connect')).toBe('false');
    });
  });
});
