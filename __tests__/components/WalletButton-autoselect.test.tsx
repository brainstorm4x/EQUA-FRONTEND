/**
 * Tests for WalletButton auto-select functionality
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock the wallet adapter hooks and components
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: ({ 'data-testid': testId }: { 'data-testid'?: string }) => 
    <button data-testid={testId}>Mock WalletMultiButton</button>,
}));

describe('WalletButton Auto-Select', () => {
  let mockSelect: jest.Mock;

  beforeEach(() => {
    mockSelect = jest.fn();
    jest.clearAllMocks();
  });

  it('should auto-select wallet when only one adapter is available', () => {
    const mockWallet = {
      adapter: {
        name: 'Mobile Wallet Adapter',
      },
    };

    (useWallet as jest.Mock).mockReturnValue({
      wallets: [mockWallet],
      wallet: null,
      select: mockSelect,
      connected: false,
    });

    render(<WalletButton />);

    // Should auto-select the single wallet adapter
    expect(mockSelect).toHaveBeenCalledWith('Mobile Wallet Adapter');
  });

  it('should NOT auto-select when wallet is already selected', () => {
    const mockWallet = {
      adapter: {
        name: 'Mobile Wallet Adapter',
      },
    };

    (useWallet as jest.Mock).mockReturnValue({
      wallets: [mockWallet],
      wallet: mockWallet,
      select: mockSelect,
      connected: false,
    });

    render(<WalletButton />);

    // Should NOT call select because wallet is already selected
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should NOT auto-select when already connected', () => {
    const mockWallet = {
      adapter: {
        name: 'Mobile Wallet Adapter',
      },
    };

    (useWallet as jest.Mock).mockReturnValue({
      wallets: [mockWallet],
      wallet: null,
      select: mockSelect,
      connected: true,
    });

    render(<WalletButton />);

    // Should NOT call select because already connected
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should NOT auto-select when multiple wallets are available', () => {
    const mockWallet1 = {
      adapter: {
        name: 'Phantom',
      },
    };
    const mockWallet2 = {
      adapter: {
        name: 'Solflare',
      },
    };

    (useWallet as jest.Mock).mockReturnValue({
      wallets: [mockWallet1, mockWallet2],
      wallet: null,
      select: mockSelect,
      connected: false,
    });

    render(<WalletButton />);

    // Should NOT auto-select when there are multiple adapters
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should render WalletMultiButton component', () => {
    (useWallet as jest.Mock).mockReturnValue({
      wallets: [],
      wallet: null,
      select: mockSelect,
      connected: false,
    });

    const { getByText } = render(<WalletButton testId="test-wallet-button" />);
    
    expect(getByText('Mock WalletMultiButton')).toBeInTheDocument();
  });
});
