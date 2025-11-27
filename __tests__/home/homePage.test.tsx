/**
 * Tests for the Home/Landing Page
 * Validates CTA behavior, navigation, and EQUA Logo display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

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
  return () => {
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

    it('should use SVG format for logo', () => {
      render(<HomePage />);
      
      const logos = screen.getAllByAltText('EQUA Logo');
      logos.forEach(logo => {
        expect(logo).toHaveAttribute('src', '/equa-logo.svg');
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
      
      expect(screen.getByText(/BgNRq.*6aDtL/)).toBeInTheDocument();
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
});
