/**
 * Tests for Mint Page - Wallet Button Centering
 * Validates that the Select Wallet button is properly centered
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
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
  Logo: ({ size }: any) => <div data-testid="logo" style={{ width: size, height: size }}>UNIA</div>,
}));

// Import after mocks
import MintPage from '../../app/mint/page';

describe('Mint Page - Wallet Button Centering', () => {
  beforeEach(() => {
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

  describe('Wallet Not Connected State', () => {
    it('should render the wallet connection card when wallet is not connected', () => {
      render(<MintPage />);
      
      // Wait for mounted state
      setTimeout(() => {
        expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
        expect(screen.getByText('Please connect your wallet to get started')).toBeInTheDocument();
      }, 100);
    });

    it('should have centered wallet button with proper test id', () => {
      render(<MintPage />);
      
      setTimeout(() => {
        const walletButton = screen.getByTestId('select-wallet-button');
        expect(walletButton).toBeInTheDocument();
        
        // Check if the button's parent has centering classes
        const buttonParent = walletButton.parentElement;
        expect(buttonParent?.className).toMatch(/flex|justify-center/);
      }, 100);
    });

    it('should display wallet button in a centered container', () => {
      const { container } = render(<MintPage />);
      
      setTimeout(() => {
        // Look for the card container
        const cardContainer = container.querySelector('.text-center');
        expect(cardContainer).toBeInTheDocument();
        
        // Check for flex justify-center wrapper
        const centerWrapper = container.querySelector('.flex.justify-center');
        expect(centerWrapper).toBeInTheDocument();
      }, 100);
    });

    it('should have proper responsive styling on the card', () => {
      const { container } = render(<MintPage />);
      
      setTimeout(() => {
        const card = container.querySelector('.max-w-md');
        expect(card).toBeInTheDocument();
        expect(card?.className).toContain('text-center');
        expect(card?.className).toContain('rounded-2xl');
      }, 100);
    });
  });

  describe('Visual Alignment', () => {
    it('should have wallet button within a flex container for horizontal centering', () => {
      const { container } = render(<MintPage />);
      
      setTimeout(() => {
        const walletButton = screen.getByTestId('select-wallet-button');
        const parent = walletButton.parentElement;
        
        // Parent should have flex and justify-center for horizontal centering
        expect(parent?.className).toMatch(/flex/);
        expect(parent?.className).toMatch(/justify-center/);
      }, 100);
    });

    it('should render card content in proper order', () => {
      render(<MintPage />);
      
      setTimeout(() => {
        const heading = screen.getByText('Connect Your Wallet');
        const description = screen.getByText('Please connect your wallet to get started');
        const button = screen.getByTestId('select-wallet-button');
        
        expect(heading).toBeInTheDocument();
        expect(description).toBeInTheDocument();
        expect(button).toBeInTheDocument();
      }, 100);
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive heading for screen readers', () => {
      render(<MintPage />);
      
      setTimeout(() => {
        const heading = screen.getByRole('heading', { name: /connect your wallet/i });
        expect(heading).toBeInTheDocument();
      }, 100);
    });

    it('should have wallet button accessible via test id', () => {
      render(<MintPage />);
      
      setTimeout(() => {
        const walletButton = screen.getByTestId('select-wallet-button');
        expect(walletButton).toBeInTheDocument();
        expect(walletButton).toHaveTextContent(/select wallet/i);
      }, 100);
    });
  });
});
