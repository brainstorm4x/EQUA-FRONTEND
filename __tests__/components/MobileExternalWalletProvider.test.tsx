/**
 * Tests for Mobile External Wallet Provider configuration
 * 
 * Validates the critical appIdentity.uri fix:
 * - Must use window.location.origin (not hardcoded URL) so wallet apps
 *   can properly verify the dApp origin and redirect back after authorization
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Use jest.fn() inside the factory (hoisted before variable declarations)
jest.mock('@solana-mobile/wallet-adapter-mobile', () => {
  const mockAdapter = jest.fn().mockImplementation((config) => ({
    name: 'Mobile Wallet Adapter',
    _config: config,
  }));
  return {
    __mockAdapter: mockAdapter,
    SolanaMobileWalletAdapter: mockAdapter,
    createDefaultAddressSelector: jest.fn(() => ({})),
    createDefaultAuthorizationResultCache: jest.fn(() => ({})),
    createDefaultWalletNotFoundHandler: jest.fn(() => jest.fn()),
  };
});

jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children, endpoint }: { children: React.ReactNode; endpoint: string }) => (
    <div data-testid="connection-provider" data-endpoint={endpoint}>{children}</div>
  ),
  WalletProvider: ({ children, onError }: { children: React.ReactNode; onError?: Function }) => (
    <div data-testid="wallet-provider" data-has-onerror={!!onError}>{children}</div>
  ),
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

jest.mock('@/lib/constants', () => ({
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
}));

import { MobileExternalWalletProvider } from '@/providers/MobileExternalWalletProvider';

// Get reference to the mock adapter after module loading
const getMockAdapter = () => {
  const mod = require('@solana-mobile/wallet-adapter-mobile');
  return mod.__mockAdapter as jest.Mock;
};

describe('MobileExternalWalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(
      <MobileExternalWalletProvider>
        <div data-testid="test-child">Test Content</div>
      </MobileExternalWalletProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should use window.location.origin for appIdentity.uri, not hardcoded URL', () => {
    const mockAdapter = getMockAdapter();
    
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    expect(mockAdapter).toHaveBeenCalledTimes(1);
    
    const config = mockAdapter.mock.calls[0][0];
    
    // CRITICAL: appIdentity.uri must use window.location.origin
    // Hardcoding it causes wallet to return without approval
    expect(config.appIdentity.uri).toBe(window.location.origin);
    expect(config.appIdentity.uri).not.toBe('https://equa.live');
  });

  it('should use dynamic icon path based on window.location.origin', () => {
    const mockAdapter = getMockAdapter();
    
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    const config = mockAdapter.mock.calls[0][0];
    
    expect(config.appIdentity.icon).toBe(`${window.location.origin}/branding/equa-logo.svg`);
    expect(config.appIdentity.icon).not.toBe('https://equa.live/icon.png');
  });

  it('should set app name to EQUA Token', () => {
    const mockAdapter = getMockAdapter();
    
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    const config = mockAdapter.mock.calls[0][0];
    expect(config.appIdentity.name).toBe('EQUA Token');
  });

  it('should use RPC_ENDPOINT from constants', () => {
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    const connectionProvider = screen.getByTestId('connection-provider');
    expect(connectionProvider.getAttribute('data-endpoint')).toBe('https://api.devnet.solana.com');
  });

  it('should have onError handler configured', () => {
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    const walletProvider = screen.getByTestId('wallet-provider');
    expect(walletProvider.getAttribute('data-has-onerror')).toBe('true');
  });

  it('should use ONLY SolanaMobileWalletAdapter (no extension adapters)', () => {
    const mockAdapter = getMockAdapter();
    
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    // Should only use SolanaMobileWalletAdapter
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });

  it('should set cluster based on RPC endpoint', () => {
    const mockAdapter = getMockAdapter();
    
    render(
      <MobileExternalWalletProvider>
        <div>Test</div>
      </MobileExternalWalletProvider>
    );

    const config = mockAdapter.mock.calls[0][0];
    expect(config.cluster).toBe('devnet');
  });
});
