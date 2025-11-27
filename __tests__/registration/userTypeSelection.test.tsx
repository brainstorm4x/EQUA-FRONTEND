/**
 * Unit tests for user type selection in RegistrationForm
 * 
 * Tests verify:
 * - Both Individual and Business options render
 * - User can toggle between options
 * - Selected option has aria-checked="true"
 * - State updates correctly when switching options
 * - Selection is persisted through form submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';

describe('User Type Selection', () => {
  const defaultProps = {
    totalUsers: 50,
    walletBalance: 100_000_000, // 0.1 SOL in lamports
    onRegister: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both Individual and Business options', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toBeInTheDocument();
      expect(businessButton).toBeInTheDocument();
    });

    it('should render with proper ARIA roles for accessibility', () => {
      render(<RegistrationForm {...defaultProps} />);

      const container = screen.getByRole('radiogroup');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Account type selection');

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toHaveAttribute('role', 'radio');
      expect(businessButton).toHaveAttribute('role', 'radio');
    });

    it('should display Individual and Business labels', () => {
      render(<RegistrationForm {...defaultProps} />);

      expect(screen.getByText('Individual')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
    });
  });

  describe('Default Selection', () => {
    it('should have Individual selected by default', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Selection Interaction', () => {
    it('should update state when clicking Business option', () => {
      render(<RegistrationForm {...defaultProps} />);

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      expect(businessButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should deselect Individual when selecting Business', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Initially Individual is selected
      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');

      // Click Business
      fireEvent.click(businessButton);

      // Now Business should be selected and Individual deselected
      expect(individualButton).toHaveAttribute('aria-checked', 'false');
      expect(businessButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow switching back to Individual from Business', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Click Business
      fireEvent.click(businessButton);
      expect(businessButton).toHaveAttribute('aria-checked', 'true');

      // Click Individual again
      fireEvent.click(individualButton);
      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Form Submission with User Type', () => {
    it('should submit with Individual type by default', async () => {
      const mockOnRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={mockOnRegister} />);

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should submit with Business type when selected', async () => {
      const mockOnRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={mockOnRegister} />);

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('business');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should maintain selected type across multiple interactions', async () => {
      const mockOnRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={mockOnRegister} />);

      const businessButton = screen.getByTestId('user-type-business');
      
      // Select Business multiple times
      fireEvent.click(businessButton);
      fireEvent.click(businessButton);
      fireEvent.click(businessButton);

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('business');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });
  });

  describe('Visual State', () => {
    it('should apply selected styling to Individual by default', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      
      // Check for selected class (purple background)
      expect(individualButton.className).toContain('bg-purple-600/30');
      expect(individualButton.className).toContain('border-purple-500');
    });

    it('should apply selected styling when Business is clicked', () => {
      render(<RegistrationForm {...defaultProps} />);

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      expect(businessButton.className).toContain('bg-purple-600/30');
      expect(businessButton.className).toContain('border-purple-500');
    });

    it('should remove selected styling from previous selection', () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Initially Individual should have selected styling
      expect(individualButton.className).toContain('bg-purple-600/30');

      // Click Business
      fireEvent.click(businessButton);

      // Individual should lose selected styling
      expect(individualButton.className).toContain('bg-white/5');
      expect(individualButton.className).not.toContain('bg-purple-600/30');
    });
  });

  describe('Integration with Referral Field', () => {
    it('should work correctly with referral code requirement', async () => {
      const mockOnRegister = jest.fn();
      // totalUsers >= 100 requires referral
      render(
        <RegistrationForm 
          {...defaultProps} 
          totalUsers={100} 
          onRegister={mockOnRegister}
        />
      );

      // Select Business type
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      // Try to submit without referral (should not call onRegister due to validation)
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });

    it('should allow submission with valid referral and selected type', async () => {
      const mockOnRegister = jest.fn();
      render(
        <RegistrationForm 
          {...defaultProps} 
          totalUsers={100} 
          onRegister={mockOnRegister}
        />
      );

      // Select Business type
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      // Enter a valid referral code (10 characters)
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ABC123xyz9' } });

      // Wait for validation
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      }, { timeout: 3000 });
    });
  });

  describe('User Type with Insufficient Balance', () => {
    it('should disable registration regardless of user type when balance is insufficient', () => {
      render(
        <RegistrationForm 
          {...defaultProps} 
          walletBalance={1000} // Very low balance
        />
      );

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });
  });
});
