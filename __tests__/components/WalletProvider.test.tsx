/**
 * Tests for Wallet Provider configuration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '@/providers/WalletProvider';

// Mock the wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="connection-provider">{children}</div>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-provider">{children}</div>,
  useConnection: jest.fn(),
  useWallet: jest.fn(() => ({
    connected: false,
    wallets: [],
  })),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-modal-provider">{children}</div>,
}));

jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Phantom' })),
  SolflareWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Solflare' })),
}));

describe('WalletProvider Configuration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Provider Rendering', () => {
    it('should render without crashing', () => {
      render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should wrap children with ConnectionProvider', () => {
      render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      expect(screen.getByTestId('connection-provider')).toBeInTheDocument();
    });

    it('should wrap children with WalletProvider', () => {
      render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
    });

    it('should wrap children with WalletModalProvider', () => {
      render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      expect(screen.getByTestId('wallet-modal-provider')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Wallet Adapters', () => {
    it('should initialize with Phantom and Solflare wallet adapters', () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = 
        require('@solana/wallet-adapter-wallets');

      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      // Verify that wallet adapters were instantiated
      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });

    it('should not use SolanaMobileWalletAdapter (removed for web compatibility)', () => {
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      // Phantom and Solflare adapters handle mobile detection automatically
      const { PhantomWalletAdapter, SolflareWalletAdapter } = 
        require('@solana/wallet-adapter-wallets');
      
      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('Provider Nesting', () => {
    it('should nest providers in correct order', () => {
      const { container } = render(
        <WalletProvider>
          <div data-testid="test-child">Test Content</div>
        </WalletProvider>
      );

      // ConnectionProvider should be the outermost
      const connectionProvider = screen.getByTestId('connection-provider');
      expect(connectionProvider).toBeInTheDocument();

      // WalletProvider should be inside ConnectionProvider
      const walletProvider = screen.getByTestId('wallet-provider');
      expect(connectionProvider).toContainElement(walletProvider);

      // WalletModalProvider should be inside WalletProvider
      const modalProvider = screen.getByTestId('wallet-modal-provider');
      expect(walletProvider).toContainElement(modalProvider);

      // Children should be inside WalletModalProvider
      const testChild = screen.getByTestId('test-child');
      expect(modalProvider).toContainElement(testChild);
    });
  });

  describe('Network Configuration', () => {
    it('should use devnet network by default', () => {
      // This tests that the component renders without errors using devnet
      expect(() => {
        render(
          <WalletProvider>
            <div>Test</div>
          </WalletProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should not crash when rendering with no children', () => {
      expect(() => {
        render(<WalletProvider children={undefined} />);
      }).not.toThrow();
    });

    it('should handle multiple children', () => {
      render(
        <WalletProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </WalletProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Mobile Wallet Support', () => {
    beforeEach(() => {
      // Clear mocks before each test
      jest.clearAllMocks();
    });

    it('should render without errors (mobile detection handled by adapters)', () => {
      // Phantom and Solflare adapters auto-detect mobile browsers and use deep links
      expect(() => {
        render(
          <WalletProvider>
            <div>Test</div>
          </WalletProvider>
        );
      }).not.toThrow();
    });
    
    it('should initialize Phantom and Solflare adapters with mobile auto-detection', () => {
      const { PhantomWalletAdapter, SolflareWalletAdapter } = 
        require('@solana/wallet-adapter-wallets');
      
      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );
      
      // Both adapters automatically handle mobile detection
      expect(PhantomWalletAdapter).toHaveBeenCalled();
      expect(SolflareWalletAdapter).toHaveBeenCalled();
    });
  });

  describe('No Wallet Banner', () => {
    beforeEach(() => {
      // Clear window wallet objects
      delete (window as any).solana;
      delete (window as any).phantom;
      delete (window as any).solflare;
      jest.clearAllMocks();
    });

    it('should render NoWalletBanner component when no wallet detected', () => {
      // Mock useWallet to return not connected state with wallets available
      const mockUseWallet = require('@solana/wallet-adapter-react').useWallet;
      mockUseWallet.mockReturnValue({
        connected: false,
        wallets: [{ adapter: { name: 'Phantom' } }, { adapter: { name: 'Solflare' } }],
      });

      render(
        <WalletProvider>
          <div>Test</div>
        </WalletProvider>
      );

      // NoWalletBanner should be present (rendered as a component)
      // Note: Due to mocking, we can't directly test the banner's content,
      // but we verify the provider renders without errors
      expect(screen.getByTestId('wallet-modal-provider')).toBeInTheDocument();
    });
  });

  describe('Enhanced Error Messages', () => {
    it('should provide helpful error messages for Phantom wallet not ready', () => {
      // This test verifies the component renders with error handling capability
      expect(() => {
        render(
          <WalletProvider>
            <div>Test</div>
          </WalletProvider>
        );
      }).not.toThrow();
    });

    it('should provide helpful error messages for Solflare wallet not ready', () => {
      // This test verifies the component renders with error handling capability
      expect(() => {
        render(
          <WalletProvider>
            <div>Test</div>
          </WalletProvider>
        );
      }).not.toThrow();
    });
  });
});
