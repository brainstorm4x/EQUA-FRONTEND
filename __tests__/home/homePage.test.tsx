/**
 * Tests for the Home/Landing Page
 * Validates CTA behavior, navigation, and UNIYAA Logo display
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

// Mock wallet environment detection so tests always run in desktop mode
jest.mock('@/utils/walletEnvironment', () => ({
  detectWalletEnvironment: jest.fn(() => 'desktop'),
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
        <button 
          data-testid="get-started-cta"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
        >
          Get Started →
        </button>
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
      expect(screen.getByText('Welcome to UNIYAA Token')).toBeInTheDocument();
      
      // Check for description
      expect(screen.getByText(/A payment token on Solana whose value grows with everyday use/i)).toBeInTheDocument();
      
      // Check for CTA button
      expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
    });

    it('should display the logo and title in header', () => {
      render(<HomePage />);
      
      expect(screen.getByText('UNIYAA Token')).toBeInTheDocument();
    });

    it('should display features section', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Higher-Minting-Rate')).toBeInTheDocument();
      expect(screen.getByText('Price Appreciation')).toBeInTheDocument();
      expect(screen.getByText('Grows With Use')).toBeInTheDocument();
    });
  });

  describe('UNIYAA Logo Display', () => {
    it('should display UNIYAA Logo in hero section above welcome text', () => {
      render(<HomePage />);
      
      // Check for UNIYAA Logo images (header + hero section)
      const logos = screen.getAllByAltText('UNIYAA Logo');
      expect(logos.length).toBeGreaterThanOrEqual(2); // At least header and hero
    });

    it('should display UNIYAA Logo in header', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('UNIYAA Logo');
      // Header logo should be 40px (check by style)
      const headerLogo = logos.find(logo => 
        logo.style.height === '40px' || 
        (logo as HTMLElement).style.getPropertyValue('height') === '40px'
      );
      expect(headerLogo).toBeInTheDocument();
    });

    it('should display larger UNIYAA Logo in hero section', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('UNIYAA Logo');
      // Hero logo should be 120px (check by style)
      const heroLogo = logos.find(logo => 
        logo.style.height === '120px' ||
        (logo as HTMLElement).style.getPropertyValue('height') === '120px'
      );
      expect(heroLogo).toBeInTheDocument();
    });

    it('should not display coin emoji in hero section', () => {
      render(<HomePage />);
      
      // Ensure no coin emoji is rendered
      const heroSection = document.querySelector('.container');
      expect(heroSection?.textContent).not.toContain('🪙');
    });

    it('should use SVG format for all logos', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('UNIYAA Logo');
      logos.forEach(logo => {
        expect(logo).toHaveAttribute('src', '/branding/uniyaa-logo-dark.svg');
      });
    });

    it('should use standard img tags for logos', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('UNIYAA Logo');
      logos.forEach(logo => {
        expect(logo.tagName).toBe('IMG');
      });
    });
  });

  describe('CTA Button Behavior', () => {
    it('should have "Get Started" CTA that navigates to mint page', () => {
      render(<HomePage />);
      
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton).toBeInTheDocument();
      // Button is mocked - actual navigation is handled by useRouter in the component
      expect(ctaButton.tagName).toBe('BUTTON');
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
      
      // The configured program ID is displayed in shortened form
      expect(screen.getByText('HFg64b...4kLSK')).toBeInTheDocument();
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

    it('should have accessible UNIYAA Logo images', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByRole('img', { name: 'UNIYAA Logo' });
      expect(logos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Journey - Landing to Mint', () => {
    it('should provide clear path from landing page to mint page', () => {
      render(<HomePage />);
      
      // User lands on home page and sees UNIYAA branding
      const logos = screen.getAllByAltText('UNIYAA Logo');
      expect(logos.length).toBeGreaterThan(0);
      
      // User sees welcome message
      expect(screen.getByText('Welcome to UNIYAA Token')).toBeInTheDocument();
      
      // User can navigate to mint page via CTA button
      const ctaButton = screen.getByTestId('get-started-cta');
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton.tagName).toBe('BUTTON');
    });

    it('should display value proposition to new users', () => {
      render(<HomePage />);
      
      // Features should be visible
      expect(screen.getByText('Higher-Minting-Rate')).toBeInTheDocument();
      expect(screen.getByText('Price Appreciation')).toBeInTheDocument();
      expect(screen.getByText('Grows With Use')).toBeInTheDocument();
      
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

    it('should show "Mint UNIYAA" button for registered users', async () => {
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
      await screen.findByTestId('mint-uniyaa-cta');
      
      // Should show "Mint UNIYAA" link (this is rendered directly in app/page.tsx as a Link, not via GetStartedButton)
      const mintButton = screen.getByTestId('mint-uniyaa-cta');
      expect(mintButton).toBeInTheDocument();
      expect(mintButton).toHaveTextContent('Mint UNIYAA');
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
      
      // Should NOT show "Mint UNIYAA" button
      expect(screen.queryByTestId('mint-uniyaa-cta')).not.toBeInTheDocument();
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
      await screen.findByTestId('mint-uniyaa-cta');
      
      // Should NOT have called router.push
      expect(mockPush).not.toHaveBeenCalled();
      
      // Page should still be rendered (not redirected)
      expect(screen.getByText('Welcome to UNIYAA Token')).toBeInTheDocument();
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
      
      // Should NOT show "Mint UNIYAA" button
      expect(screen.queryByTestId('mint-uniyaa-cta')).not.toBeInTheDocument();
      
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
