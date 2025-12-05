/**
 * Tests for Referral Threshold Requirements
 * Validates that referral is optional < 100 users, required >= 100 users
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ReferralState } from '@/types/referral';

// Mock the referral resolution hook
let mockReferralHook: any;

jest.mock('@/hooks/useReferralResolution', () => ({
  useReferralResolution: jest.fn((input: string) => {
    if (mockReferralHook) {
      return mockReferralHook(input);
    }
    
    const trimmed = input.trim();
    
    if (!trimmed) {
      return {
        status: ReferralState.IDLE,
        referrerPubkey: null,
        error: null,
        expiresInSeconds: null,
        isLoading: false,
        isValid: false,
      };
    }
    
    if (trimmed === 'ValidCode1') {
      return {
        status: ReferralState.VALID,
        referrerPubkey: '11111111111111111111111111111112',
        error: null,
        expiresInSeconds: 840,
        isLoading: false,
        isValid: true,
      };
    }
    
    return {
      status: ReferralState.MALFORMED,
      referrerPubkey: null,
      error: 'Invalid referral code or wallet address format',
      expiresInSeconds: null,
      isLoading: false,
      isValid: false,
    };
  }),
}));

describe('Threshold Referral Requirement', () => {
  const baseProps = {
    walletBalance: 100_000_000,
    onRegister: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReferralHook = null;
  });

  describe('Below Threshold (< 100 users)', () => {
    it('should show referral as optional when totalUsers < 100', () => {
      render(<RegistrationForm {...baseProps} totalUsers={50} />);

      expect(screen.getByText(/optional/i)).toBeInTheDocument();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });

    it('should allow registration without referral when totalUsers = 0', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          {...baseProps}
          totalUsers={0}
          onRegister={mockOnRegister}
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();

      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should allow registration without referral when totalUsers = 50', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          {...baseProps}
          totalUsers={50}
          onRegister={mockOnRegister}
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();

      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should allow registration without referral when totalUsers = 99', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          {...baseProps}
          totalUsers={99}
          onRegister={mockOnRegister}
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();

      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should show remaining spots without referral', () => {
      render(<RegistrationForm {...baseProps} totalUsers={95} />);

      expect(screen.getByText(/5 spots left without referral/i)).toBeInTheDocument();
    });

    it('should still accept referral when provided below threshold', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          {...baseProps}
          totalUsers={50}
          onRegister={mockOnRegister}
        />
      );

      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('At Threshold (= 100 users)', () => {
    it('should show referral as required when totalUsers = 100', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      expect(screen.getByText(/required/i)).toBeInTheDocument();
      expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
    });

    it('should disable button without referral when totalUsers = 100', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });

    it('should show warning message about referral requirement', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      expect(screen.getByText(/referral is required after the first 100 users/i)).toBeInTheDocument();
    });

    it('should not show remaining spots message at threshold', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      expect(screen.queryByText(/spots left without referral/i)).not.toBeInTheDocument();
    });

    it('should enable button when valid referral is entered', async () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });
    });

    it('should allow registration with valid referral at threshold', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          {...baseProps}
          totalUsers={100}
          onRegister={mockOnRegister}
        />
      );

      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Above Threshold (> 100 users)', () => {
    it('should require referral when totalUsers = 101', () => {
      render(<RegistrationForm {...baseProps} totalUsers={101} />);

      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should require referral when totalUsers = 200', () => {
      render(<RegistrationForm {...baseProps} totalUsers={200} />);

      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should disable button without referral when totalUsers > 100', () => {
      render(<RegistrationForm {...baseProps} totalUsers={150} />);

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });

    it('should enable button with valid referral when totalUsers > 100', async () => {
      render(<RegistrationForm {...baseProps} totalUsers={150} />);

      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should show required indicator with red asterisk at threshold', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      const requiredLabel = screen.getByText('*');
      expect(requiredLabel).toBeInTheDocument();
      expect(requiredLabel.className).toContain('text-red-400');
    });

    it('should show optional indicator below threshold', () => {
      render(<RegistrationForm {...baseProps} totalUsers={50} />);

      const optionalLabel = screen.getByText('(optional)');
      expect(optionalLabel).toBeInTheDocument();
      expect(optionalLabel.className).toContain('text-purple-400');
    });

    it('should display warning box when referral is required', () => {
      render(<RegistrationForm {...baseProps} totalUsers={100} />);

      const warningBox = screen.getByText(/referral is required/i).closest('div');
      expect(warningBox).toHaveClass('bg-yellow-500/20');
      expect(warningBox).toHaveClass('border-yellow-500/50');
    });
  });

  describe('Edge Cases at Boundary', () => {
    it('should handle transition from 99 to 100 users', () => {
      const { rerender } = render(
        <RegistrationForm {...baseProps} totalUsers={99} />
      );

      // Should be optional at 99
      expect(screen.getByText(/optional/i)).toBeInTheDocument();

      // Update to 100
      rerender(<RegistrationForm {...baseProps} totalUsers={100} />);

      // Should now be required
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should update button state when crossing threshold', () => {
      const { rerender } = render(
        <RegistrationForm {...baseProps} totalUsers={99} />
      );

      let registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();

      // Update to 100
      rerender(<RegistrationForm {...baseProps} totalUsers={100} />);

      registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });
  });
});
