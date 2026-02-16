/**
 * Tests for WalletProvider error logging improvements
 * Verifies that wallet errors are properly serialized and logged
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WalletProvider } from '@/providers/WalletProvider';
import { WalletError } from '@solana/wallet-adapter-base';

// Mock console.error to capture error logs
const originalError = console.error;
let consoleErrorSpy: jest.SpyInstance;

// Mock the wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => {
  let errorCallback: ((error: WalletError) => void) | null = null;
  
  return {
    ConnectionProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="connection-provider">{children}</div>
    ),
    WalletProvider: ({ children, onError }: { children: React.ReactNode; onError?: (error: WalletError) => void }) => {
      // Capture the onError callback
      if (onError) {
        errorCallback = onError;
        // Expose it globally for testing
        (global as any).__walletErrorCallback = errorCallback;
      }
      return <div data-testid="wallet-provider">{children}</div>;
    },
    useConnection: jest.fn(),
    useWallet: jest.fn(() => ({
      connected: false,
      wallets: [],
    })),
  };
});

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

describe('WalletProvider Error Logging', () => {
  beforeEach(() => {
    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const createMockError = (overrides: Partial<WalletError> = {}): WalletError => {
    const error = new Error('Test error message') as WalletError;
    error.name = 'WalletTestError';
    Object.assign(error, overrides);
    return error;
  };

  it('should log error with separate console.error calls for each property', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    expect(callback).toBeDefined();

    const mockError = createMockError({
      name: 'WalletNotFoundError',
      message: 'No available wallet',
    });

    callback(mockError);

    // Verify each property is logged separately (avoiding [object Object])
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ [WalletProvider] Wallet error occurred');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Name:', 'WalletNotFoundError');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Message:', 'No available wallet');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Error code:', 'No code');
  });

  it('should log error stack trace when available', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError({
      stack: 'Error: Test error\n  at TestFunction (test.js:10:5)',
    });

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('  Stack:', expect.stringContaining('Error: Test error'));
  });

  it('should serialize error with JSON.stringify using getOwnPropertyNames', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError();

    callback(mockError);

    // Should attempt JSON.stringify with error details
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Full error details:', expect.any(String));
  });

  it('should handle JSON.stringify failures gracefully', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    
    // Create an error with circular reference
    const mockError = createMockError() as any;
    mockError.circular = mockError;

    callback(mockError);

    // Should catch stringify error and log it
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Could not stringify error:', expect.anything());
  });

  it('should provide user-friendly hint for "No available wallet" error', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError({
      message: 'No available wallet',
    });

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '  💡 User action needed: Install a Solana wallet app (Phantom or Solflare)'
    );
  });

  it('should provide user-friendly hint for "User rejected" error', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError({
      message: 'User rejected the request',
    });

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '  💡 User action: User cancelled the wallet connection'
    );
  });

  it('should provide user-friendly hint for deep link errors', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError({
      message: 'deep link failed to open',
    });

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '  💡 Possible issue: Deep link configuration or wallet app not responding'
    );
  });

  it('should log raw error object for desktop DevTools', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError();

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('  Raw error object:', mockError);
  });

  it('should handle error with no name or message', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = {} as WalletError;

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('  Name:', 'Unknown');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Message:', 'No message');
  });

  it('should log error code if available', () => {
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    const callback = (global as any).__walletErrorCallback;
    const mockError = createMockError() as any;
    mockError.code = -32001;

    callback(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('  Error code:', -32001);
  });
});
