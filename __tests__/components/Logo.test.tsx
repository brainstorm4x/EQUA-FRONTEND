/**
 * Logo Component Tests
 * Validates UNIA Logo rendering, props, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Logo } from '@/components/Logo';

describe('Logo Component', () => {
  describe('Basic Rendering', () => {
    it('should render the UNIA logo image', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toBeInTheDocument();
    });

    it('should always use SVG format', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveAttribute('src', '/branding/unia-logo-dark.svg');
    });

    it('should use standard img tag, not Next.js Image', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo.tagName).toBe('IMG');
    });

    it('should have accessible alt text', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img');
      expect(logo).toHaveAttribute('alt', 'UNIA Logo');
    });
  });

  describe('Size Prop', () => {
    it('should render with default size of 40px', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('height: 40px');
      expect(logo).toHaveStyle('width: auto');
    });

    it('should render with custom size', () => {
      render(<Logo size={80} />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('height: 80px');
    });

    it('should render with small size', () => {
      render(<Logo size={24} />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('height: 24px');
    });

    it('should render with large size for hero', () => {
      render(<Logo size={120} />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('height: 120px');
    });
  });

  describe('ClassName Prop', () => {
    it('should render without className by default', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveAttribute('class', '');
    });

    it('should apply custom className', () => {
      render(<Logo className="custom-class" />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveClass('custom-class');
    });

    it('should apply multiple custom classes', () => {
      render(<Logo className="class-one class-two" />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveClass('class-one');
      expect(logo).toHaveClass('class-two');
    });
  });

  describe('Combined Props', () => {
    it('should handle size and className together', () => {
      render(<Logo size={60} className="rounded-full shadow-lg" />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('height: 60px');
      expect(logo).toHaveStyle('width: auto');
      expect(logo).toHaveClass('rounded-full');
      expect(logo).toHaveClass('shadow-lg');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible as an image', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });

    it('should have descriptive alt text for screen readers', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img', { name: 'UNIA Logo' });
      expect(logo).toBeInTheDocument();
    });

    it('should not be draggable', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveAttribute('draggable', 'false');
    });
  });

  describe('Performance', () => {
    it('should use native lazy loading by default', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveAttribute('loading', 'lazy');
    });

    it('should use eager loading when priority is true', () => {
      render(<Logo priority={true} />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveAttribute('loading', 'eager');
    });

    it('should maintain aspect ratio with width: auto', () => {
      render(<Logo size={50} />);
      
      const logo = screen.getByAltText('UNIA Logo');
      expect(logo).toHaveStyle('width: auto');
    });
  });
});
