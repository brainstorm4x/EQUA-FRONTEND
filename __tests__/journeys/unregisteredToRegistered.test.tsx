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
    return mockReferralState;
  }),
}));

describe('User Journey: Unregistered to Registered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReferralState = {};
  });

  describe('Journey 1: Registration with Valid Referral', () => {
    it('should complete full registration flow with referral', async () => {
      const mockOnRegister = jest.fn();
      
      // Mock valid referral code resolution
      mockReferralState = {
        status: ReferralState.VALID,
        referrerPubkey: '11111111111111111111111111111112',
        error: null,
        expiresInSeconds: 500,
        isLoading: false,
        isValid: true,
      };
      
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

      // Step 2: User enters valid referral code
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });

      // Wait for validation
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });

      // Step 3: User clicks register
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
      
      fireEvent.click(registerButton);

      // Step 4: Registration completes (always as 'individual')
      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBe('11111111111111111111111111111112');
      });
    });
  });

  describe('Journey 2: Registration Without Referral (Below Threshold)', () => {
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

      // Referral is optional
      expect(screen.getByText(/optional/i)).toBeInTheDocument();

      // User can register without referral
      const registerButton = screen.getByTestId('register-button');
      expect(registerButton).not.toBeDisabled();
      
      fireEvent.click(registerButton);

      // Registration completes
      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
        expect(mockOnRegister.mock.calls[0][0]).toBe('individual');
        expect(mockOnRegister.mock.calls[0][1]).toBeNull();
      });
    });
  });
});
