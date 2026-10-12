/**
 * End-to-End User Journey Tests
 * Models complete user flows from unregistered to registered state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistrationForm } from '@/components/RegistrationForm';

describe('User Journey: Unregistered to Registered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with one click: no account type and no referral to choose', async () => {
    const mockOnRegister = jest.fn();

    render(
      <RegistrationForm
        totalUsers={50}
        walletBalance={100_000_000}
        onRegister={mockOnRegister}
        isLoading={false}
      />
    );

    expect(screen.getByText('Register Account')).toBeInTheDocument();
    expect(screen.queryByText('Business')).not.toBeInTheDocument();
    expect(screen.queryByText('Individual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('referral-input')).not.toBeInTheDocument();

    const registerButton = screen.getByTestId('register-button');
    expect(registerButton).not.toBeDisabled();
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(mockOnRegister).toHaveBeenCalledTimes(1);
      expect(mockOnRegister.mock.calls[0][0]).toHaveProperty('fingerprint');
    });
  });
});
