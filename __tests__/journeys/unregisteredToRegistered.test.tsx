/**
 * End-to-End User Journey Tests
 * Models complete user flows from unregistered to registered state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ReferralState } from '@/types/referral';

// Mock the referral resolution hook
let mockReferralState: any = {};

jest.mock('@/hooks/useReferralResolution', () => ({
  useReferralResolution: jest.fn((input: string) => {
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
    
    // Return controlled state for testing
    if (mockReferralState[trimmed]) {
      return mockReferralState[trimmed];
    }
    
    // Default to valid for any 10-char alphanumeric
    if (/^[A-Za-z0-9]{10}$/.test(trimmed)) {
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

describe('End-to-End User Journeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReferralState = {};
  });

  describe('Journey 1: Unregistered → Business Type → Valid Referral → Registered', () => {
    it('should complete full registration flow with business type and referral', async () => {
      const mockOnRegister = jest.fn();
      
      // User arrives unregistered
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      // Step 1: User sees registration form
      expect(screen.getByText('Register Account')).toBeInTheDocument();

      // Step 2: User selects Business type
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      expect(businessButton).toHaveAttribute('aria-checked', 'true');

      // Step 3: User enters valid referral code
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      // Wait for validation
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Step 4: User clicks register
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
      
      fireEvent.click(registerButton);

      // Step 5: Registration completes
      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('business');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Journey 2: Unregistered → Individual → No Referral → Registered (Below Threshold)', () => {
    it('should complete registration without referral when below threshold', async () => {
      const mockOnRegister = jest.fn();
      
      // User arrives unregistered, threshold below 100
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      // Individual is selected by default
      const individualButton = screen.getByTestId('user-type-individual');
      expect(individualButton).toHaveAttribute('aria-checked', 'true');

      // Referral is optional
      expect(screen.getByText(/optional/i)).toBeInTheDocument();

      // User can register without referral
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();

      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe(null);
      });
    });

    it('should show remaining spots indicator', () => {
      render(
        <RegistrationForm
          totalUsers={95}
          walletBalance={100_000_000}
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByText(/5 spots left without referral/i)).toBeInTheDocument();
    });
  });

  describe('Journey 3: Unregistered → At Threshold → No Referral → Blocked → Referral → Registered', () => {
    it('should require referral at threshold and enable after entering valid code', async () => {
      const mockOnRegister = jest.fn();
      
      // User arrives when totalUsers = 100
      render(
        <RegistrationForm
          totalUsers={100}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      // Referral is required
      expect(screen.getByText(/required/i)).toBeInTheDocument();

      // Button is disabled without referral
      let registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();

      // User enters valid referral
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      // Wait for validation
      await waitFor(() => {
        registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });

      // User can now register
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Journey 4: Error Recovery → Malformed → Valid', () => {
    it('should recover from malformed input to valid code', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      const referralInput = screen.getByTestId('referral-input');

      // User enters malformed input
      mockReferralState['invalid!!!'] = {
        status: ReferralState.MALFORMED,
        referrerPubkey: null,
        error: 'Invalid referral code or wallet address format',
        expiresInSeconds: null,
        isLoading: false,
        isValid: false,
      };

      fireEvent.change(referralInput, { target: { value: 'invalid!!!' } });

      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });

      // Button should be disabled due to malformed input error
      let registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();

      // User corrects to valid code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // User registers with valid code
      registerButton = screen.getByTestId('register-button');
      
      await waitFor(() => {
        expect(registerButton).not.toBeDisabled();
      });
      
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Journey 5: Multiple User Type Changes', () => {
    it('should maintain form state through user type changes', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      // Enter referral first
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Toggle between user types
      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      fireEvent.click(businessButton);
      expect(businessButton).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(individualButton);
      expect(individualButton).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(businessButton);
      expect(businessButton).toHaveAttribute('aria-checked', 'true');

      // Referral should still be valid
      expect(referralInput).toHaveClass('border-green-500');
      expect(referralInput).toHaveValue('ValidCode1');

      // Registration should work with final selected type
      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('business');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Journey 6: Insufficient Balance Recovery', () => {
    it('should prevent registration with insufficient balance', () => {
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={10_000_000} // 0.01 SOL - insufficient
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      // Should show warning with alert role
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Button should be disabled
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });

    it('should enable registration after balance increase', () => {
      const { rerender } = render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={10_000_000} // Insufficient
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      let registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();

      // Simulate balance increase
      rerender(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000} // Sufficient
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
    });
  });

  describe('Journey 7: Loading State Handling', () => {
    it('should disable registration during loading', () => {
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={jest.fn()}
          isLoading={true}
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
      expect(screen.getByText(/registering/i)).toBeInTheDocument();
    });

    it('should show loading indicator during registration', () => {
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={jest.fn()}
          isLoading={true}
        />
      );

      // Loading spinner should be visible
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });
  });

  describe('Journey 8: Complete Flow with All Features', () => {
    it('should handle complete flow with user type, referral, and validation', async () => {
      const mockOnRegister = jest.fn();
      const { rerender } = render(
        <RegistrationForm
          totalUsers={99} // Just below threshold
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      // Step 1: Check initial state
      expect(screen.getByText(/1 spot.*left without referral/i)).toBeInTheDocument();
      
      // Step 2: Select business type
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);
      
      // Step 3: Enter referral (optional but provided)
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
      
      // Step 4: Register
      let registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);
      
      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('business');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });

      // Step 5: Simulate post-registration state
      rerender(
        <RegistrationForm
          totalUsers={100} // Now at threshold after registration
          walletBalance={100_000_000}
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      // Verify threshold is now reached
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe('Journey 9: Clear and Retry', () => {
    it('should allow clearing and re-entering referral code', async () => {
      const mockOnRegister = jest.fn();
      
      render(
        <RegistrationForm
          totalUsers={50}
          walletBalance={100_000_000}
          onRegister={mockOnRegister}
          isLoading={false}
        />
      );

      const referralInput = screen.getByTestId('referral-input');

      // Enter first code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Clear
      fireEvent.change(referralInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(referralInput).not.toHaveClass('border-green-500');
      });

      // Enter different code
      fireEvent.change(referralInput, { target: { value: 'ValidCode2' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Register with second code
      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
      });
    });
  });
});
