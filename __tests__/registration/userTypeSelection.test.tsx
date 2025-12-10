/**
 * Tests for user type selection UI in RegistrationForm
 * Verifies Individual/Business toggle behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from '@/components/RegistrationForm';
import { createTestWrapper } from '../utils/testProviders';
import { AccountType } from '@/utils/registration';

// Mock the referral resolution hook
jest.mock('@/hooks/useReferralResolution', () => ({
  useReferralResolution: () => ({
    status: 'IDLE',
    isValid: false,
    isLoading: false,
    error: null,
    expiresInSeconds: null,
    referrerPubkey: null,
  }),
}));

describe('RegistrationForm - User Type Selection', () => {
  const defaultProps = {
    totalUsers: 50,
    walletBalance: 1_000_000_000, // 1 SOL
    onRegister: jest.fn(),
    isLoading: false,
    userWalletAddress: 'TestWallet123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render both Individual and Business options', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      expect(screen.getByTestId('user-type-individual')).toBeInTheDocument();
      expect(screen.getByTestId('user-type-business')).toBeInTheDocument();
      expect(screen.getByText(/👤 Individual/)).toBeInTheDocument();
      expect(screen.getByText(/🏢 Business/)).toBeInTheDocument();
    });

    it('should have proper ARIA roles for accessibility', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toHaveAttribute('role', 'radio');
      expect(businessButton).toHaveAttribute('role', 'radio');

      // Check the container has radiogroup role
      const container = individualButton.closest('[role="radiogroup"]');
      expect(container).toBeInTheDocument();
    });

    it('should display "Register as:" label', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      expect(screen.getByText('Register as:')).toBeInTheDocument();
    });
  });

  describe('Default Selection', () => {
    it('should have Individual selected by default', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Selection Interaction', () => {
    it('should select Business when clicked', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      expect(businessButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should deselect Individual when Business is selected', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      fireEvent.click(businessButton);

      expect(individualButton).toHaveAttribute('aria-checked', 'false');
      expect(businessButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should be able to switch back to Individual from Business', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Select Business
      fireEvent.click(businessButton);
      expect(businessButton).toHaveAttribute('aria-checked', 'true');

      // Switch back to Individual
      fireEvent.click(individualButton);
      expect(individualButton).toHaveAttribute('aria-checked', 'true');
      expect(businessButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Form Submission', () => {
    it('should submit with Individual type by default', () => {
      const onRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={onRegister} />, {
        wrapper: createTestWrapper(),
      });

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      expect(onRegister).toHaveBeenCalledWith(
        'individual',
        null,
        expect.any(Object)
      );
    });

    it('should submit with Business type when selected', () => {
      const onRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={onRegister} />, {
        wrapper: createTestWrapper(),
      });

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      expect(onRegister).toHaveBeenCalledWith(
        'business',
        null,
        expect.any(Object)
      );
    });

    it('should maintain user type selection across multiple interactions', () => {
      const onRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={onRegister} />, {
        wrapper: createTestWrapper(),
      });

      const businessButton = screen.getByTestId('user-type-business');

      // Select Business
      fireEvent.click(businessButton);

      // Try registering
      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      // Verify Business was selected
      expect(onRegister).toHaveBeenCalledWith(
        'business',
        null,
        expect.any(Object)
      );
    });
  });

  describe('Visual State', () => {
    it('should apply selected styling to Individual by default', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');

      expect(individualButton.className).toContain('bg-purple-600');
      expect(individualButton.className).toContain('border-purple-400');
    });

    it('should apply selected styling to Business when clicked', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      expect(businessButton.className).toContain('bg-purple-600');
      expect(businessButton.className).toContain('border-purple-400');
    });

    it('should apply unselected styling to deselected option', () => {
      render(<RegistrationForm {...defaultProps} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      // Business should be unselected by default
      expect(businessButton.className).toContain('bg-white/10');
      expect(businessButton.className).toContain('border-purple-500/30');

      // Click Business
      fireEvent.click(businessButton);

      // Individual should now be unselected
      expect(individualButton.className).toContain('bg-white/10');
      expect(individualButton.className).toContain('border-purple-500/30');
    });
  });

  describe('Integration with Referral', () => {
    it('should work correctly with referral code requirement', () => {
      // After 100 users, referral is required
      render(<RegistrationForm {...defaultProps} totalUsers={150} />, {
        wrapper: createTestWrapper(),
      });

      const individualButton = screen.getByTestId('user-type-individual');
      const businessButton = screen.getByTestId('user-type-business');

      expect(individualButton).toBeInTheDocument();
      expect(businessButton).toBeInTheDocument();

      // Should see referral required message
      expect(screen.getByText(/Referral is required/i)).toBeInTheDocument();
    });

    it('should work correctly with valid referral and selected type', () => {
      const onRegister = jest.fn();
      render(<RegistrationForm {...defaultProps} onRegister={onRegister} />, {
        wrapper: createTestWrapper(),
      });

      // Select Business
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      // Enter referral
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, {
        target: { value: 'ValidCode1' },
      });

      // Submit
      const registerButton = screen.getByTestId('register-button');
      fireEvent.click(registerButton);

      // Should submit with business type and referral
      expect(onRegister).toHaveBeenCalledWith(
        'business',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should be disabled when balance is insufficient regardless of user type', () => {
      render(
        <RegistrationForm
          {...defaultProps}
          walletBalance={0} // Insufficient balance
        />,
        {
          wrapper: createTestWrapper(),
        }
      );

      const registerButton = screen.getByTestId('register-button');

      // Individual by default
      expect(registerButton).toBeDisabled();

      // Switch to Business
      const businessButton = screen.getByTestId('user-type-business');
      fireEvent.click(businessButton);

      // Should still be disabled
      expect(registerButton).toBeDisabled();
    });
  });
});
