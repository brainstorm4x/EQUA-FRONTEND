/**
 * Tests for WalletProvider initialization logging
 * Verifies that wallet adapters are properly logged on initialization
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WalletProvider } from '@/providers/WalletProvider';

// Mock console.log to capture logs
const originalLog = console.log;
let consoleLogSpy: jest.SpyInstance;

// Mock the wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="connection-provider">{children}</div>
  ),
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-provider">{children}</div>
  ),
  useConnection: jest.fn(),
  useWallet: jest.fn(() => ({
    connected: false,
    wallets: [],
  })),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-modal-provider">{children}</div>
  ),
}));

jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Phantom' })),
  SolflareWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Solflare' })),
}));

jest.mock('@solana-mobile/wallet-adapter-mobile', () => ({
  SolanaMobileWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Mobile Wallet Adapter' })),
  createDefaultAddressSelector: jest.fn(() => ({ select: jest.fn() })),
  createDefaultAuthorizationResultCache: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
  })),
  createDefaultWalletNotFoundHandler: jest.fn(() => jest.fn()),
}));

describe('WalletProvider Initialization Logging', () => {
  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log wallet provider initialization with adapter count', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    // Should log initialization with 3 adapters
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '✅ [WalletProvider] Wallet provider initialized with',
      3,
      'adapters'
    );
  });

  it('should list all wallet adapters by name', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    // Should list each adapter
    expect(consoleLogSpy).toHaveBeenCalledWith('  1. Mobile Wallet Adapter');
    expect(consoleLogSpy).toHaveBeenCalledWith('  2. Phantom');
    expect(consoleLogSpy).toHaveBeenCalledWith('  3. Solflare');
  });

  it('should log initialization only when wallets change', () => {
    const { rerender } = render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const initialCallCount = consoleLogSpy.mock.calls.filter(
      call => call[0] === '✅ [WalletProvider] Wallet provider initialized with'
    ).length;

    // Rerender with same props shouldn't trigger new initialization log
    rerender(
      <WalletProvider>
        <div>Test Updated</div>
      </WalletProvider>
    );

    const finalCallCount = consoleLogSpy.mock.calls.filter(
      call => call[0] === '✅ [WalletProvider] Wallet provider initialized with'
    ).length;

    // Should only be called once (or same number of times)
    expect(finalCallCount).toBe(initialCallCount);
  });
});
