/**
 * Tests for WalletDashboard Claim Button functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletDashboard } from '@/components/WalletDashboard';
import { PublicKey } from '@solana/web3.js';
import * as referralRewardsUtils from '@/utils/referralRewards';
import * as programUtils from '@/lib/program';
import * as userMetadataUtils from '@/utils/userMetadata';
import { BN } from '@coral-xyz/anchor';

// Mock hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(),
}));

// Mock utilities
jest.mock('@/utils/referralRewards', () => ({
  getReferralStats: jest.fn(),
  claimBonusMint: jest.fn(),
}));

jest.mock('@/lib/program');
jest.mock('@/utils/userMetadata');
jest.mock('@/utils/tokenFormat', () => ({
  formatEquaBalance: jest.fn((amount) => amount.toString()),
  rawToDecimal: jest.fn((amount) => amount / 1_000_000),
  parseDecimalStringToRaw: jest.fn((str) => BigInt(parseFloat(str) * 1_000_000)),
  decimalToRaw: jest.fn((amount) => amount * 1_000_000),
}));

// Mock hooks
jest.mock('@/hooks/useUserAccount', () => ({
  useUserAccount: jest.fn(() => ({ data: null })),
}));

jest.mock('@/hooks/useEquaBalance', () => ({
  useEquaBalance: jest.fn(() => ({ balance: 0, isLoading: false })),
}));

describe('WalletDashboard - Claim Button', () => {
  const mockUseWallet = require('@solana/wallet-adapter-react').useWallet;
  const mockUseConnection = require('@solana/wallet-adapter-react').useConnection;
  
  const mockPublicKey = new PublicKey('GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C');
  const mockConnection = {
    getAccountInfo: jest.fn(),
    getProgramAccounts: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseConnection.mockReturnValue({
      connection: mockConnection,
    });

    // Mock user as registered
    (userMetadataUtils.fetchUserMetadata as jest.Mock).mockResolvedValue({
      authority: mockPublicKey,
      registration_type: 0,
    });

    // Mock getUserAccountPDA
    (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([
      mockPublicKey,
      255
    ]);
  });

  describe('Claim button visibility', () => {
    it('should show claim button when credits >= 5', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Credits');
        expect(claimButton).toBeInTheDocument();
        expect(claimButton).not.toBeDisabled();
      });
    });

    it('should NOT show claim button when credits < 5', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 3,
        referredCount: 2,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        // Should show credits display but NOT claim button
        expect(screen.getByText('3 Credits')).toBeInTheDocument();
      });

      // Claim button should not exist
      expect(screen.queryByText('💰 Claim Credits')).not.toBeInTheDocument();
    });

    it('should NOT show claim button when credits = 0', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        // Credits display should not show when 0
        expect(screen.queryByText(/Credits/)).not.toBeInTheDocument();
      });

      // Claim button should not exist
      expect(screen.queryByText('💰 Claim Credits')).not.toBeInTheDocument();
    });

    it('should show claim button when credits = 10', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 10,
        referredCount: 5,
        referredUsers: [],
        canClaimBonus: true,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Credits');
        expect(claimButton).toBeInTheDocument();
        expect(claimButton).not.toBeDisabled();
      });
    });
  });

  describe('Claim button functionality', () => {
    it('should show loading state when claiming', async () => {
      const mockSignTransaction = jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-serialized-tx'),
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      // Mock claimBonusMint to delay resolution
      (referralRewardsUtils.claimBonusMint as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('mock-signature'), 1000))
      );

      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        owner: mockPublicKey,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('💰 Claim Credits')).toBeInTheDocument();
      });

      const claimButton = screen.getByText('💰 Claim Credits');
      fireEvent.click(claimButton);

      // Should show claiming state
      await waitFor(() => {
        expect(screen.getByText('⏳ Claiming...')).toBeInTheDocument();
      });
    });

    it('should show success message after successful claim', async () => {
      const mockSignTransaction = jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-serialized-tx'),
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      (referralRewardsUtils.claimBonusMint as jest.Mock).mockResolvedValue('mock-signature-123');

      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        owner: mockPublicKey,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('💰 Claim Credits')).toBeInTheDocument();
      });

      const claimButton = screen.getByText('💰 Claim Credits');
      fireEvent.click(claimButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/Successfully claimed 100 EQUA!/)).toBeInTheDocument();
      });
    });

    it('should show error message on claim failure', async () => {
      const mockSignTransaction = jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-serialized-tx'),
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      (referralRewardsUtils.claimBonusMint as jest.Mock).mockRejectedValue(
        new Error('InsufficientReferralCredits')
      );

      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        owner: mockPublicKey,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('💰 Claim Credits')).toBeInTheDocument();
      });

      const claimButton = screen.getByText('💰 Claim Credits');
      fireEvent.click(claimButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/You need at least 5 credits/)).toBeInTheDocument();
      });
    });

    it('should handle monthly cap error', async () => {
      const mockSignTransaction = jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-serialized-tx'),
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      (referralRewardsUtils.claimBonusMint as jest.Mock).mockRejectedValue(
        new Error('MonthlyBonusMintCapReached')
      );

      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        owner: mockPublicKey,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('💰 Claim Credits')).toBeInTheDocument();
      });

      const claimButton = screen.getByText('💰 Claim Credits');
      fireEvent.click(claimButton);

      // Should show monthly cap error
      await waitFor(() => {
        expect(screen.getByText(/monthly limit of 5 bonus mints/)).toBeInTheDocument();
      });
    });
  });

  describe('Claim button UI states', () => {
    it('should show "Ready to claim bonus mint!" message when credits >= 5', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5,
        referredCount: 3,
        referredUsers: [],
        canClaimBonus: true,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('✨ Ready to claim bonus mint!')).toBeInTheDocument();
      });
    });

    it('should NOT show "Ready to claim" message when credits < 5', async () => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 3,
        referredCount: 2,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<WalletDashboard />);

      await waitFor(() => {
        expect(screen.getByText('3 Credits')).toBeInTheDocument();
      });

      expect(screen.queryByText('✨ Ready to claim bonus mint!')).not.toBeInTheDocument();
    });
  });
});
