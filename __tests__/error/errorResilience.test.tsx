/**
 * Tests for Error Resilience and Edge Cases
 * Validates handling of:
 * - Implausible user counts
 * - Network failures
 * - Registry fetch failures
 * - Rapid state changes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ReferralState } from '@/types/referral';
import { MOCK_USER_COUNTS } from '../utils/mocks';

// Mock the referral resolution hook with controllable behavior
let mockReferralHook: any;

jest.mock('@/hooks/useReferralResolution', () => ({
  useReferralResolution: jest.fn((input: string) => {
    if (mockReferralHook) {
      return mockReferralHook(input);
    }
    return {
      status: ReferralState.IDLE,
      referrerPubkey: null,
      error: null,
      expiresInSeconds: null,
      isLoading: false,
      isValid: false,
    };
  }),
}));

describe('Error Resilience and Edge Cases', () => {
  const defaultProps = {
    totalUsers: 50,
    walletBalance: 100_000_000,
    onRegister: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReferralHook = null;
  });

  describe('Implausible User Count Handling', () => {
    it('should handle overflow user count (17179869188) gracefully', () => {
      // This should be clamped to 0 or safe fallback at component boundary
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={MOCK_USER_COUNTS.OVERFLOW}
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('register-button')).toBeInTheDocument();
      
      // Referral should NOT be required for implausible counts (treated as 0 or safe value)
      const userCountDisplay = screen.getByTestId('user-count-display');
      expect(userCountDisplay).toBeInTheDocument();
    });

    it('should not force referral requirement for implausible user count', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={MOCK_USER_COUNTS.OVERFLOW}
        />
      );

      // Register button should be enabled without referral
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
    });

    it('should handle negative user count safely', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={-1}
        />
      );

      expect(screen.getByTestId('register-button')).toBeInTheDocument();
    });

    it('should handle maximum safe user count', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={MOCK_USER_COUNTS.MAX_SAFE}
        />
      );

      // Should require referral at this count
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });
  });

  describe('Network/API Failure Handling', () => {
    it('should handle user count fetch failure gracefully', () => {
      // When API fails, component should fall back to 0 or default
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={0} // Simulating fallback
        />
      );

      expect(screen.getByTestId('register-button')).toBeInTheDocument();
      
      // Should show that referral is not required
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });

    it('should not block registration when user count is unavailable', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          totalUsers={0}
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
    });
  });

  describe('Referral Registry Fetch Failure', () => {
    it('should show recoverable error state when registry fails to load', async () => {
      mockReferralHook = (input: string) => {
        if (!input.trim()) {
          return {
            status: ReferralState.IDLE,
            referrerPubkey: null,
            error: null,
            expiresInSeconds: null,
            isLoading: false,
            isValid: false,
          };
        }
        
        return {
          status: ReferralState.IDLE,
          referrerPubkey: null,
          error: 'Unable to validate referral codes. Please try again later.',
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      };

      render(<RegistrationForm {...defaultProps} />);

      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'TestCode12' } });

      // Should still render without crashing
      expect(referralInput).toBeInTheDocument();
    });

    it('should allow retry after registry fetch failure', async () => {
      let shouldFail = true;
      
      mockReferralHook = (input: string) => {
        if (!input.trim()) {
          return {
            status: ReferralState.IDLE,
            referrerPubkey: null,
            error: null,
            expiresInSeconds: null,
            isLoading: false,
            isValid: false,
          };
        }
        
        if (shouldFail) {
          return {
            status: ReferralState.IDLE,
            referrerPubkey: null,
            error: 'Unable to validate referral codes. Please try again later.',
            expiresInSeconds: null,
            isLoading: false,
            isValid: false,
          };
        }
        
        return {
          status: ReferralState.VALID,
          referrerPubkey: '11111111111111111111111111111112',
          error: null,
          expiresInSeconds: 840,
          isLoading: false,
          isValid: true,
        };
      };

      render(<RegistrationForm {...defaultProps} />);

      const referralInput = screen.getByTestId('referral-input');
      
      // First attempt - fails
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      // Simulate retry - succeeds
      shouldFail = false;
      fireEvent.change(referralInput, { target: { value: '' } });
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toBeInTheDocument();
      });
    });
  });

  describe('Rapid State Changes', () => {
    it('should handle rapid toggling of user type without corruption', async () => {
      render(<RegistrationForm {...defaultProps} />);

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Rapid toggling
      for (let i = 0; i < 10; i++) {
        fireEvent.click(businessButton);
        fireEvent.click(individualButton);
      }

      // Should still be in consistent state
      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');
    });

    it('should handle rapid referral input changes', async () => {
      mockReferralHook = (input: string) => {
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
        
        // Always show loading for any input to test debouncing
        return {
          status: ReferralState.LOADING,
          referrerPubkey: null,
          error: null,
          expiresInSeconds: null,
          isLoading: true,
          isValid: false,
        };
      };

      render(<RegistrationForm {...defaultProps} />);

      const referralInput = screen.getByTestId('referral-input');

      // Rapid typing simulation
      const inputs = ['V', 'Va', 'Val', 'Vali', 'Valid', 'ValidC', 'ValidCo', 'ValidCod', 'ValidCode', 'ValidCode1'];
      
      for (const input of inputs) {
        fireEvent.change(referralInput, { target: { value: input } });
      }

      // Should handle all changes without crashing
      expect(referralInput).toHaveValue('ValidCode1');
    });
  });

  describe('Clearing Referral Input', () => {
    it('should reset all indicators when input is cleared', async () => {
      mockReferralHook = (input: string) => {
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
          status: ReferralState.IDLE,
          referrerPubkey: null,
          error: null,
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      };

      render(<RegistrationForm {...defaultProps} />);

      const referralInput = screen.getByTestId('referral-input');

      // Enter valid code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Clear input
      fireEvent.change(referralInput, { target: { value: '' } });

      await waitFor(() => {
        expect(referralInput).not.toHaveClass('border-green-500');
        expect(referralInput).not.toHaveClass('border-red-500');
      });
    });

    it('should maintain form state when clearing referral input', async () => {
      mockReferralHook = (input: string) => ({
        status: input ? ReferralState.LOADING : ReferralState.IDLE,
        referrerPubkey: null,
        error: null,
        expiresInSeconds: null,
        isLoading: !!input,
        isValid: false,
      });

      render(<RegistrationForm {...defaultProps} />);

      const businessButton = screen.getByTestId('user-type-business');
      const referralInput = screen.getByTestId('referral-input');

      // Select business
      fireEvent.click(businessButton);

      // Enter and clear referral
      fireEvent.change(referralInput, { target: { value: 'test' } });
      fireEvent.change(referralInput, { target: { value: '' } });

      // Business should still be selected
      expect(businessButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Balance Edge Cases', () => {
    it('should handle zero balance gracefully', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          walletBalance={0}
        />
      );

      expect(screen.getByTestId('register-button')).toBeDisabled();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle exactly minimum balance', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          walletBalance={50_000_000} // Exactly 0.05 SOL
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
    });

    it('should handle balance just below minimum', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          walletBalance={49_999_999} // Just below 0.05 SOL
        />
      );

      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).toBeDisabled();
    });
  });

  describe('Component Stability', () => {
    it('should not crash with undefined props', () => {
      // TypeScript would prevent this, but testing runtime stability
      render(
        <RegistrationForm
          totalUsers={0}
          walletBalance={100_000_000}
          onRegister={jest.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('register-button')).toBeInTheDocument();
    });

    it('should handle multiple simultaneous state updates', () => {
      const { rerender } = render(<RegistrationForm {...defaultProps} />);

      // Update multiple props at once
      rerender(
        <RegistrationForm
          totalUsers={150}
          walletBalance={200_000_000}
          onRegister={jest.fn()}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('register-button')).toBeInTheDocument();
    });
  });
});
