/**
 * Tests for the Home/Landing Page
 * Validates CTA behavior, navigation, and EQUA Logo display
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock Solana wallet adapter hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(() => ({
    publicKey: null,
    connected: false,
    wallet: null,
  })),
  useConnection: jest.fn(() => ({
    connection: {
      getBalance: jest.fn(),
      getAccountInfo: jest.fn(),
    },
  })),
}));

// Mock userMetadata utility
jest.mock('@/utils/userMetadata', () => ({
  fetchUserMetadata: jest.fn(() => Promise.resolve(null)),
}));

// Mock Next.js components and modules
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/image', () => {
  return function MockImage(props: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  };
});

jest.mock('next/dynamic', () => {
  return (importFn: () => Promise<any>) => {
    // Get the import path to determine which component to mock
    const importStr = importFn.toString();
    
    if (importStr.includes('GetStartedButton')) {
      const MockGetStartedButton = () => (
        <a 
          href="/mint" 
          data-testid="get-started-cta"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
        >
          Get Started →
        </a>
      );
      MockGetStartedButton.displayName = 'GetStartedButton';
      return MockGetStartedButton;
    }
    
    // Default mock for other dynamic components
    const DynamicComponent = () => <div data-testid="dynamic-component">Mocked Component</div>;
    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  };
});

// Import after mocks
import HomePage from '../../app/page';

describe('Home/Landing Page', () => {
  describe('Page Rendering', () => {
    it('should render the page with all essential elements', () => {
      render(<HomePage />);
      
      // Check for main heading
      expect(screen.getByText('Welcome to EQUA Token')).toBeInTheDocument();
      
      // Check for description
      expect(screen.getByText(/A revolutionary token system/i)).toBeInTheDocument();
      
      // Check for CTA button
      expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
    });

    it('should display the logo and title in header', () => {
      render(<HomePage />);
      
      expect(screen.getByText('EQUA Token')).toBeInTheDocument();
    });

    it('should display features section', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Higher-Minting-Rate')).toBeInTheDocument();
      expect(screen.getByText('Price Appreciation')).toBeInTheDocument();
      expect(screen.getByText('Referral Rewards')).toBeInTheDocument();
    });
  });

  describe('EQUA Logo Display', () => {
    it('should display EQUA Logo in hero section above welcome text', () => {
      render(<HomePage />);
      
      // Check for EQUA Logo images (header + hero section)
      const logos = screen.getAllByAltText('EQUA Logo');
      expect(logos.length).toBeGreaterThanOrEqual(2); // At least header and hero
    });

    it('should display EQUA Logo in header', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('EQUA Logo');
      // Header logo should be 40px
      const headerLogo = logos.find(logo => logo.getAttribute('width') === '40');
      expect(headerLogo).toBeInTheDocument();
    });

    it('should display larger EQUA Logo in hero section', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('EQUA Logo');
      // Hero logo should be 120px (larger to cover the outer circle)
      const heroLogo = logos.find(logo => logo.getAttribute('width') === '120');
      expect(heroLogo).toBeInTheDocument();
    });

    it('should not display coin emoji in hero section', () => {
      render(<HomePage />);
      
      // Ensure no coin emoji is rendered
      const heroSection = document.querySelector('.container');
      expect(heroSection?.textContent).not.toContain('🪙');
    });

    it('should use PNG format for logo by default', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('EQUA Logo');
      logos.forEach(logo => {
        expect(logo).toHaveAttribute('src', '/branding/equa-logo.png');
      });
    });
  });

  describe('CTA Button Behavior', () => {
    it('should have "Get Started" CTA that links to mint page', () => {
      render(<HomePage />);
      
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/mint');
    });

    it('should have correct styling for CTA button', () => {
      render(<HomePage />);
      
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton.className).toContain('bg-purple-600');
      expect(ctaButton.className).toContain('hover:bg-purple-700');
    });
  });

  describe('Additional Links', () => {
    it('should have link to Solana Explorer', () => {
      render(<HomePage />);
      
      const explorerLink = screen.getByText('View on Explorer');
      expect(explorerLink).toBeInTheDocument();
      expect(explorerLink).toHaveAttribute('href');
      expect(explorerLink.getAttribute('href')).toContain('explorer.solana.com');
    });
  });

  describe('Informational Content', () => {
    it('should display token standard information', () => {
      render(<HomePage />);
      
      expect(screen.getByText('SPL Token-2022')).toBeInTheDocument();
      expect(screen.getByText('Solana Devnet')).toBeInTheDocument();
    });

    it('should display program ID information', () => {
      render(<HomePage />);
      
      // The program ID is displayed in shortened form
      expect(screen.getByText('7QYUb...MaFdP')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<HomePage />);
      
      // Check for main element
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      
      // Check for header
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have descriptive link text', () => {
      render(<HomePage />);
      
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton).toHaveTextContent(/get started/i);
    });

    it('should have accessible EQUA Logo images', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByRole('img', { name: 'EQUA Logo' });
      expect(logos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Journey - Landing to Mint', () => {
    it('should provide clear path from landing page to mint page', () => {
      render(<HomePage />);
      
      // User lands on home page and sees EQUA branding
      const logos = screen.getAllByAltText('EQUA Logo');
      expect(logos.length).toBeGreaterThan(0);
      
      // User sees welcome message
      expect(screen.getByText('Welcome to EQUA Token')).toBeInTheDocument();
      
      // User can navigate to mint page
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton).toHaveAttribute('href', '/mint');
    });

    it('should display value proposition to new users', () => {
      render(<HomePage />);
      
      // Features should be visible
      expect(screen.getByText('Higher-Minting-Rate')).toBeInTheDocument();
      expect(screen.getByText('Price Appreciation')).toBeInTheDocument();
      expect(screen.getByText('Referral Rewards')).toBeInTheDocument();
      
      // Platform info should be visible
      expect(screen.getByText('Solana Devnet')).toBeInTheDocument();
      expect(screen.getByText('SPL Token-2022')).toBeInTheDocument();
    });
  });

  describe('Registered User Behavior', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    it('should show "Mint EQUA" button for registered users', async () => {
      const { useWallet } = require('@solana/wallet-adapter-react');
      const { fetchUserMetadata } = require('@/utils/userMetadata');
      
      // Mock registered user
      useWallet.mockReturnValue({
        publicKey: { toBase58: () => 'mock-public-key' },
        connected: true,
        wallet: {},
      });
      
      // Mock user metadata returning registered user data
      fetchUserMetadata.mockResolvedValue({
        user_index: 1,
        elevated_mint_attempts_used: 0,
      });
      
      render(<HomePage />);
      
      // Wait for async check to complete
      await screen.findByTestId('mint-equa-cta');
      
      // Should show "Mint EQUA" button
      const mintButton = screen.getByTestId('mint-equa-cta');
      expect(mintButton).toBeInTheDocument();
      expect(mintButton).toHaveTextContent('Mint EQUA');
      expect(mintButton).toHaveAttribute('href', '/mint');
      
      // Should NOT show "Get Started" button
      expect(screen.queryByTestId('get-started-cta')).not.toBeInTheDocument();
    });

    it('should show "Get Started" button for unregistered users', async () => {
      const { useWallet } = require('@solana/wallet-adapter-react');
      const { fetchUserMetadata } = require('@/utils/userMetadata');
      
      // Mock connected but unregistered user
      useWallet.mockReturnValue({
        publicKey: { toBase58: () => 'mock-public-key' },
        connected: true,
        wallet: {},
      });
      
      // Mock user metadata returning null (not registered)
      fetchUserMetadata.mockResolvedValue(null);
      
      render(<HomePage />);
      
      // Wait for state to settle by checking for the Get Started button
      await waitFor(() => {
        expect(screen.getByTestId('get-started-cta')).toBeInTheDocument();
      });
      
      // Should show "Get Started" button
      const getStartedButton = screen.getByTestId('get-started-cta');
      expect(getStartedButton).toHaveTextContent('Get Started');
      
      // Should NOT show "Mint EQUA" button
      expect(screen.queryByTestId('mint-equa-cta')).not.toBeInTheDocument();
    });

    it('should not redirect registered users to mint page', async () => {
      const { useRouter } = require('next/navigation');
      const { useWallet } = require('@solana/wallet-adapter-react');
      const { fetchUserMetadata } = require('@/utils/userMetadata');
      
      const mockPush = jest.fn();
      useRouter.mockReturnValue({
        push: mockPush,
        replace: jest.fn(),
        prefetch: jest.fn(),
      });
      
      // Mock registered user
      useWallet.mockReturnValue({
        publicKey: { toBase58: () => 'mock-public-key' },
        connected: true,
        wallet: {},
      });
      
      fetchUserMetadata.mockResolvedValue({
        user_index: 1,
        elevated_mint_attempts_used: 0,
      });
      
      render(<HomePage />);
      
      // Wait for async check to complete
      await screen.findByTestId('mint-equa-cta');
      
      // Should NOT have called router.push
      expect(mockPush).not.toHaveBeenCalled();
      
      // Page should still be rendered (not redirected)
      expect(screen.getByText('Welcome to EQUA Token')).toBeInTheDocument();
    });

    it('should handle registration check errors gracefully', async () => {
      const { useWallet } = require('@solana/wallet-adapter-react');
      const { fetchUserMetadata } = require('@/utils/userMetadata');
      
      // Mock connected user
      useWallet.mockReturnValue({
        publicKey: { toBase58: () => 'mock-public-key' },
        connected: true,
        wallet: {},
      });
      
      // Mock error during metadata fetch
      fetchUserMetadata.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<HomePage />);
      
      // Wait for error handling and state to settle
      await waitFor(() => {
        expect(screen.getByTestId('get-started-cta')).toBeInTheDocument();
      });
      
      // Should show "Get Started" button as fallback
      const getStartedButton = screen.getByTestId('get-started-cta');
      expect(getStartedButton).toBeInTheDocument();
      
      // Should NOT show "Mint EQUA" button
      expect(screen.queryByTestId('mint-equa-cta')).not.toBeInTheDocument();
      
      // Should have logged error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error checking registration'),
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });
});
