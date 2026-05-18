/**
 * Tests for Mint Page - No Redirect for Unconnected Wallets
 * Validates that users without connected wallets see the wallet connection screen
 * instead of being redirected back to the homepage.
 * 
 * This test addresses the fix for the redirect loop issue where clicking
 * "Get Started" would appear to refresh the page instead of showing the
 * wallet connection screen.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the router to track navigation calls
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  })),
}));

// Mock all the dependencies
jest.mock('@/hooks/useProgram', () => ({
  useProgram: () => ({
    program: null,
    connection: {
      getAccountInfo: jest.fn(() => Promise.resolve(null)),
      getBalance: jest.fn(() => Promise.resolve(0)),
    },
    wallet: { connected: false },
    publicKey: null,
    userAccountKeypair: null,
    userAccountPDA: null,
    isReady: true,
    isProgramLoading: false,
    programError: null,
    retryProgramInit: jest.fn(),
    globalStatePDA: null,
    mintPDA: null,
    mintAuthority: null,
    checkRegistration: jest.fn(),
    getBalance: jest.fn(),
    getTokenBalance: jest.fn(),
    fetchGlobalState: jest.fn(),
  }),
}));

// Mock userMetadata utility
jest.mock('@/utils/userMetadata', () => ({
  fetchUserMetadata: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/ui/WalletButton', () => ({
  WalletButton: ({ testId }: any) => (
    <button data-testid={testId || 'wallet-button'}>Select Wallet</button>
  ),
}));

jest.mock('@/components/Logo', () => ({
  Logo: ({ size }: any) => <div data-testid="logo" style={{ width: size, height: size }}>UNIYAA</div>,
}));

// Import after mocks
import MintPage from '../../app/mint/page';

describe('Mint Page - No Redirect for Unconnected Wallets', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    mockPush.mockClear();
    mockReplace.mockClear();
    
    // Mock console.log to verify logging
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock window for client-side rendering
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unconnected Wallet - No Redirect', () => {
    it('should NOT redirect to homepage when wallet is not connected', async () => {
      render(<MintPage />);
      
      // Wait for component to mount and effect to run
      await waitFor(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // ✅ CRITICAL: Verify no redirect occurs
      expect(mockPush).not.toHaveBeenCalledWith('/');
      expect(mockReplace).not.toHaveBeenCalledWith('/');
    });

    it('should display wallet connection screen when wallet is not connected', async () => {
      render(<MintPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText('Please connect your wallet to get started')).toBeInTheDocument();
      expect(screen.getByTestId('select-wallet-button')).toBeInTheDocument();
    });

    it('should log correct message for unconnected wallet', async () => {
      render(<MintPage />);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('💡 No wallet connected, showing wallet connect screen');
      }, { timeout: 3000 });
      
      // ❌ Should NOT log redirect message
      expect(console.log).not.toHaveBeenCalledWith('💡 No wallet connected, redirecting to home');
    });

    it('should render the wallet connection UI without loading state', async () => {
      render(<MintPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Should not show "Checking Registration Status" loading screen
      expect(screen.queryByText('Checking Registration Status')).not.toBeInTheDocument();
      expect(screen.queryByText('Verifying on-chain account...')).not.toBeInTheDocument();
    });

    it('should maintain the /mint route without navigation', async () => {
      render(<MintPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Verify no navigation calls were made
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('User Flow - Get Started to Wallet Connection', () => {
    it('simulates user clicking Get Started and landing on /mint without redirect', async () => {
      // Simulate the user landing on /mint page after clicking "Get Started"
      render(<MintPage />);
      
      // User should see the wallet connection screen
      await waitFor(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // No redirect should occur - user stays on /mint
      expect(mockPush).not.toHaveBeenCalled();
      
      // Wallet button is available to connect
      const walletButton = screen.getByTestId('select-wallet-button');
      expect(walletButton).toBeInTheDocument();
      expect(walletButton).toHaveTextContent('Select Wallet');
    });
  });
});
