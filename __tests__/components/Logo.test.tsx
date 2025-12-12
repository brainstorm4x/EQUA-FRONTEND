/**
 * Logo Component Tests
 * Validates EQUA Logo rendering, props, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Logo } from '@/components/Logo';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage(props: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  };
});

describe('Logo Component', () => {
  describe('Basic Rendering', () => {
    it('should render the EQUA logo image', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toBeInTheDocument();
    });

    it('should use the correct logo source path', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('src', '/branding/equa-logo.svg');
    });

    it('should have accessible alt text', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img');
      expect(logo).toHaveAttribute('alt', 'EQUA Logo');
    });
  });

  describe('Size Prop', () => {
    it('should render with default size of 40', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('width', '40');
      expect(logo).toHaveAttribute('height', '40');
    });

    it('should render with custom size', () => {
      render(<Logo size={80} />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('width', '80');
      expect(logo).toHaveAttribute('height', '80');
    });

    it('should render with small size', () => {
      render(<Logo size={24} />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('width', '24');
      expect(logo).toHaveAttribute('height', '24');
    });

    it('should render with large size', () => {
      render(<Logo size={120} />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('width', '120');
      expect(logo).toHaveAttribute('height', '120');
    });
  });

  describe('ClassName Prop', () => {
    it('should render without className by default', () => {
      render(<Logo />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('class', '');
    });

    it('should apply custom className', () => {
      render(<Logo className="custom-class" />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveClass('custom-class');
    });

    it('should apply multiple custom classes', () => {
      render(<Logo className="class-one class-two" />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveClass('class-one');
      expect(logo).toHaveClass('class-two');
    });
  });

  describe('Combined Props', () => {
    it('should handle size and className together', () => {
      render(<Logo size={60} className="rounded-full shadow-lg" />);
      
      const logo = screen.getByAltText('EQUA Logo');
      expect(logo).toHaveAttribute('width', '60');
      expect(logo).toHaveAttribute('height', '60');
      expect(logo).toHaveClass('rounded-full');
      expect(logo).toHaveClass('shadow-lg');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via role img', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });

    it('should have descriptive alt text for screen readers', () => {
      render(<Logo />);
      
      const logo = screen.getByRole('img', { name: 'EQUA Logo' });
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Image Dimensions', () => {
    it('should maintain square aspect ratio', () => {
      render(<Logo size={50} />);
      
      const logo = screen.getByAltText('EQUA Logo');
      const width = logo.getAttribute('width');
      const height = logo.getAttribute('height');
      
      expect(width).toBe(height);
    });
  });
});
