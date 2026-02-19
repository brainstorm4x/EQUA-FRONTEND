/**
 * Tests for WalletProvider initialization logging
 * Verifies that environment detection and routing works properly
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { WalletProvider } from '@/providers/WalletProvider';

// Mock console.log to capture logs
const originalLog = console.log;
let consoleLogSpy: jest.SpyInstance;

// Mock wallet environment detection so tests are deterministic
jest.mock('@/utils/walletEnvironment', () => ({
  detectWalletEnvironment: jest.fn(() => 'desktop'),
}));

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
    wallet: null,
    connecting: false,
    disconnecting: false,
    publicKey: null,
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
  createDefaultAddressSelector: jest.fn(),
  createDefaultAuthorizationResultCache: jest.fn(),
  createDefaultWalletNotFoundHandler: jest.fn(),
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

  it('should detect environment and route to appropriate provider', async () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    // Wait for environment detection to complete
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔀 [WalletProvider] Environment detected:',
        expect.any(String)
      );
    });
  });

  it('should log provider initialization based on detected environment', async () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    // Should log one of the environment-specific provider initializations
    await waitFor(() => {
      const hasProviderLog = consoleLogSpy.mock.calls.some(call => 
        call[0]?.includes('[DesktopProvider]') ||
        call[0]?.includes('[MobileInAppProvider]') ||
        call[0]?.includes('[WalletProvider] Mobile browser detected')
      );
      expect(hasProviderLog).toBe(true);
    });
  });

  it('should render without errors', () => {
    const { container } = render(
      <WalletProvider>
        <div data-testid="test-content">Test</div>
      </WalletProvider>
    );

    // Should render the test content
    expect(container.querySelector('[data-testid="test-content"]')).toBeTruthy();
  });
});
