/**
 * Tests for Referral Input States
 * Validates all referral validation states: VALID, USED, EXPIRED, NOT_FOUND, PUBLIC_KEY, MALFORMED, CLEARED
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ReferralState } from '@/types/referral';
import { MOCK_REFERRAL_REGISTRY } from '../utils/mocks';

// Mock the referral resolution hook
jest.mock('@/hooks/useReferralResolution', () => {
  return {
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
      
      // Check for valid codes in mock registry
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
      
      if (trimmed === 'UsedCode01') {
        return {
          status: ReferralState.USED,
          referrerPubkey: null,
          error: 'This referral code has already been used',
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      }
      
      if (trimmed === 'ExpiredCd1') {
        return {
          status: ReferralState.EXPIRED,
          referrerPubkey: null,
          error: 'This referral code has expired',
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      }
      
      if (trimmed === 'Unknown123') {
        return {
          status: ReferralState.NOT_FOUND,
          referrerPubkey: null,
          error: 'Referral code not found',
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      }
      
      if (trimmed === 'invalid!!!') {
        return {
          status: ReferralState.MALFORMED,
          referrerPubkey: null,
          error: 'Invalid referral code or wallet address format',
          expiresInSeconds: null,
          isLoading: false,
          isValid: false,
        };
      }
      
      // Valid public key format
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
        return {
          status: ReferralState.PUBLIC_KEY,
          referrerPubkey: trimmed,
          error: null,
          expiresInSeconds: null,
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
  };
});

describe('Referral Input States', () => {
  const defaultProps = {
    totalUsers: 50,
    walletBalance: 100_000_000,
    onRegister: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('IDLE State', () => {
    it('should show IDLE state with empty input', () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      expect(referralInput).toHaveValue('');
      
      const statusIndicator = screen.getByTestId('referral-status');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('VALID State', () => {
    it('should show VALID state for a valid referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
    });

    it('should enable register button with valid referral', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });
    });
  });

  describe('USED State', () => {
    it('should show USED state for a used referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'UsedCode01' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
    });

    it('should disable register button with used referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'UsedCode01' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).toBeDisabled();
      });
    });
  });

  describe('EXPIRED State', () => {
    it('should show EXPIRED state for an expired referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ExpiredCd1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
    });

    it('should disable register button with expired referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'ExpiredCd1' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).toBeDisabled();
      });
    });
  });

  describe('NOT_FOUND State', () => {
    it('should show NOT_FOUND state for an unknown referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'Unknown123' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
    });

    it('should disable register button with unknown referral code', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'Unknown123' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).toBeDisabled();
      });
    });
  });

  describe('PUBLIC_KEY State', () => {
    it('should accept a valid public key format', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { 
        target: { value: '11111111111111111111111111111111' } 
      });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
    });

    it('should enable register button with valid public key', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { 
        target: { value: '11111111111111111111111111111111' } 
      });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });
    });
  });

  describe('MALFORMED State', () => {
    it('should show MALFORMED state for invalid input', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'invalid!!!' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
    });

    it('should disable register button with malformed input', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      fireEvent.change(referralInput, { target: { value: 'invalid!!!' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).toBeDisabled();
      });
    });
  });

  describe('CLEARED State', () => {
    it('should reset to IDLE when input is cleared', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      
      // Enter a valid code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
      
      // Clear the input
      fireEvent.change(referralInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(referralInput).not.toHaveClass('border-green-500');
        expect(referralInput).not.toHaveClass('border-red-500');
      });
    });

    it('should allow registration without referral when cleared and not required', async () => {
      render(<RegistrationForm {...defaultProps} totalUsers={50} />);
      
      const referralInput = screen.getByTestId('referral-input');
      
      // Enter then clear
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      fireEvent.change(referralInput, { target: { value: '' } });
      
      await waitFor(() => {
        const registerButton = screen.getByTestId('register-button');
        expect(registerButton).not.toBeDisabled();
      });
    });
  });

  describe('Transition Between States', () => {
    it('should transition from malformed to valid state', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      
      // Enter malformed input
      fireEvent.change(referralInput, { target: { value: 'invalid!!!' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
      
      // Correct to valid code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
    });

    it('should transition from valid to error state', async () => {
      render(<RegistrationForm {...defaultProps} />);
      
      const referralInput = screen.getByTestId('referral-input');
      
      // Enter valid code
      fireEvent.change(referralInput, { target: { value: 'ValidCode1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-green-500');
      });
      
      // Change to expired code
      fireEvent.change(referralInput, { target: { value: 'ExpiredCd1' } });
      
      await waitFor(() => {
        expect(referralInput).toHaveClass('border-red-500');
      });
    });
  });
});
