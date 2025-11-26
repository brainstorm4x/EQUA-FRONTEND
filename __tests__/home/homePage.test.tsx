/**
 * Tests for the Home/Landing Page
 * Validates CTA behavior and navigation
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
  });
});
