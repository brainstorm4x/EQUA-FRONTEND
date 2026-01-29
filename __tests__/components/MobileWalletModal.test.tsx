/**
 * Tests for Mobile Wallet Modal
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileWalletModal } from '@/components/MobileWalletModal';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe('MobileWalletModal', () => {
  const mockOnClose = jest.fn();
  const mockSelect = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue({
      wallets: [
        {
          adapter: {
            name: 'Mobile Wallet Adapter',
            icon: 'https://example.com/icon.png',
          },
        },
      ] as any,
      select: mockSelect,
    } as any);
  });
  
  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      render(
        <MobileWalletModal visible={false} onClose={mockOnClose} />
      );
      
      expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
    });
    
    it('should render when visible is true', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });
  });
  
  describe('Wallet Selection', () => {
    it('should display available wallets', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      expect(screen.getByText('Mobile Wallet Adapter')).toBeInTheDocument();
    });
    
    it('should call select and onClose when wallet is clicked', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const walletButton = screen.getByText('Mobile Wallet Adapter');
      fireEvent.click(walletButton);
      
      expect(mockSelect).toHaveBeenCalledWith('Mobile Wallet Adapter');
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should show enhanced empty state with download buttons when no wallets available', () => {
      mockUseWallet.mockReturnValue({
        wallets: [],
        select: mockSelect,
      } as any);
      
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      // Check for enhanced messaging
      expect(screen.getByText('No Wallet App Detected')).toBeInTheDocument();
      expect(screen.getByText('You need a Solana wallet app to connect')).toBeInTheDocument();
      expect(screen.getByText('After installing, return here and try again')).toBeInTheDocument();
      
      // Check for download buttons
      const phantomLink = screen.getByText('📥 Get Phantom Wallet').closest('a');
      expect(phantomLink).toHaveAttribute('href', 'https://phantom.app/download');
      expect(phantomLink).toHaveAttribute('target', '_blank');
      expect(phantomLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const solflareLink = screen.getByText('📥 Get Solflare Wallet').closest('a');
      expect(solflareLink).toHaveAttribute('href', 'https://solflare.com/download');
      expect(solflareLink).toHaveAttribute('target', '_blank');
      expect(solflareLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
  
  describe('Modal Close Behavior', () => {
    it('should close when clicking backdrop', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should close when clicking X button', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should NOT close when clicking modal content', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const modalContent = screen.getByText('Connect Wallet').closest('div');
      if (modalContent) {
        fireEvent.click(modalContent);
      }
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'mobile-wallet-modal-title');
    });
    
    it('should have accessible close button', () => {
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
    });
  });
  
  describe('Error Handling', () => {
    it('should still close modal when wallet selection fails', () => {
      mockSelect.mockImplementation(() => {
        throw new Error('Selection failed');
      });
      
      // Spy on console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <MobileWalletModal visible={true} onClose={mockOnClose} />
      );
      
      const walletButton = screen.getByText('Mobile Wallet Adapter');
      fireEvent.click(walletButton);
      
      expect(mockOnClose).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to select wallet:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
