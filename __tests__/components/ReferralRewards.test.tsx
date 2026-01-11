/**
 * Tests for ReferralRewards Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferralRewards } from '@/components/ReferralRewards';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import * as referralRewardsUtils from '@/utils/referralRewards';
import * as programUtils from '@/lib/program';

// Mock hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(),
}));

// Mock utilities
jest.mock('@/utils/referralRewards', () => ({
  getReferralStats: jest.fn(),
  claimBonusMint: jest.fn(),
  formatReferralRewards: jest.fn((bn) => {
    // Simple mock implementation for testing
    const val = bn.toNumber();
    const DECIMALS = 6;
    const divisor = Math.pow(10, DECIMALS);
    const whole = Math.floor(val / divisor);
    const remainder = val % divisor;
    const remainderStr = remainder.toString().padStart(DECIMALS, '0');
    return `${whole}.${remainderStr}`;
  }),
}));
jest.mock('@/lib/program');
jest.mock('@/utils/registration');
jest.mock('@/utils/tokenFormat', () => ({
  decimalToRaw: jest.fn((amount) => amount * 1_000_000), // 6 decimals
}));

describe('ReferralRewards Component', () => {
  const mockUseWallet = require('@solana/wallet-adapter-react').useWallet;
  const mockUseConnection = require('@solana/wallet-adapter-react').useConnection;
  
  const mockPublicKey = new PublicKey('2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4');
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
  });

  describe('When wallet is not connected', () => {
    beforeEach(() => {
      mockUseWallet.mockReturnValue({
        publicKey: null,
        connected: false,
      });
    });

    it('should display "Connect wallet" message', () => {
      render(<ReferralRewards />);
      
      expect(screen.getByText('Referral Rewards')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to view referral rewards')).toBeInTheDocument();
    });

    it('should show referral icon', () => {
      render(<ReferralRewards />);
      
      expect(screen.getByText('🔗')).toBeInTheDocument();
    });
  });

  describe('When wallet is connected', () => {
    beforeEach(() => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
      });
    });

    it('should display loading state initially', () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([
        mockPublicKey,
        255
      ]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ReferralRewards />);
      
      expect(screen.getByText('Loading referral data...')).toBeInTheDocument();
    });

    it('should display referral statistics when loaded', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([
        mockPublicKey,
        255
      ]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 5, // 5 credits
        referredCount: 3,
        referredUsers: [
          new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL'),
          new PublicKey('2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4'),
          new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL'),
        ],
        canClaimBonus: true,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('✨ 1 bonus mint available')).toBeInTheDocument();
    });

    it('should display zero rewards when no rewards earned', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });

      // Should show 0 count in both cards
      const zeroTexts = screen.getAllByText('0');
      expect(zeroTexts.length).toBeGreaterThanOrEqual(2);
    });

    it('should enable claim button when credits >= 5', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 10,
        referredCount: 5,
        referredUsers: [new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL')],
        canClaimBonus: true,
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Credits');
        expect(claimButton).not.toBeDisabled();
      });
    });

    it('should disable claim button when no rewards', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('⏳ Need 5 Credits');
        expect(claimButton).toBeDisabled();
      });
    });

    it('should show/hide referred users details on button click', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      const referredUser1 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 2,
        referredCount: 1,
        referredUsers: [referredUser1],
        canClaimBonus: false,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('View details')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByText('View details');
      fireEvent.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Referred Users')).toBeInTheDocument();
        expect(screen.getByText('Hide details')).toBeInTheDocument();
      });

      // Check if user pubkey is displayed (truncated)
      const pubkeyShort = referredUser1.toBase58();
      expect(screen.getByText(new RegExp(pubkeyShort.slice(0, 8)))).toBeInTheDocument();
    });

    it('should display error when getReferralStats fails', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue(null);

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('Could not load referral data.')).toBeInTheDocument();
      });
    });

    it('should handle claim button click', async () => {
      const mockSignTransaction = jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-serialized-tx'),
      });
      
      const mockClaimBonusMint = jest.fn().mockResolvedValue('mock-signature-123');
      
      // Properly mock the claimBonusMint function
      jest.spyOn(referralRewardsUtils, 'claimBonusMint').mockImplementation(mockClaimBonusMint);

      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);
      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 10, // 10 credits = 2 possible bonus mints
        referredCount: 5,
        referredUsers: [],
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Credits');
        expect(claimButton).toBeInTheDocument();
        expect(claimButton).not.toBeDisabled();
      });

      const claimButton = screen.getByText('💰 Claim Credits');
      fireEvent.click(claimButton);

      // Should show claiming state
      await waitFor(() => {
        expect(screen.getByText('⏳ Claiming...')).toBeInTheDocument();
      });
    });

    it('should disable claim button when less than 5 credits', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 3, // Only 3 credits, need 5 to claim
        referredCount: 3,
        referredUsers: [],
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: jest.fn(),
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('⏳ Need 5 Credits');
        expect(claimButton).toBeDisabled();
      });
    });

    it('should show updated info banner about redemption', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
      });

      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('About Referral Credits')).toBeInTheDocument();
      });

      expect(screen.getByText(/Redeem 5 credits for 1 bonus minting attempt/)).toBeInTheDocument();
      expect(screen.getByText(/Maximum 5 bonus mints per calendar month/)).toBeInTheDocument();
    });

    it('should allow refreshing data', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      const getReferralStatsMock = referralRewardsUtils.getReferralStats as jest.Mock;
      getReferralStatsMock.mockResolvedValue({
        credits: 2,
        referredCount: 1,
        referredUsers: [new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL')],
        canClaimBonus: false,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      // Click refresh
      const refreshButton = screen.getByText('🔄 Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(getReferralStatsMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should display info banner about referral rewards', async () => {
      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
        canClaimBonus: false,
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('About Referral Credits')).toBeInTheDocument();
      });

      expect(screen.getByText(/Earn 1 credit per individual referral/)).toBeInTheDocument();
      expect(screen.getByText(/Redeem 5 credits for 1 bonus minting attempt/)).toBeInTheDocument();
    });
  });

  describe('CSS and Layout', () => {
    beforeEach(() => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
      });

      (programUtils.getUserAccountPDA as jest.Mock).mockReturnValue([mockPublicKey, 255]);

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        credits: 0,
        referredCount: 0,
        referredUsers: [],
        canClaimBonus: false,
      });
    });

    it('should apply custom className prop', () => {
      const { container } = render(<ReferralRewards className="custom-class" />);
      
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('custom-class');
    });

    it('should have proper styling classes', async () => {
      const { container } = render(<ReferralRewards />);
      
      await waitFor(() => {
        const mainDiv = container.firstChild;
        expect(mainDiv).toHaveClass('bg-white/10');
        expect(mainDiv).toHaveClass('backdrop-blur-md');
        expect(mainDiv).toHaveClass('rounded-2xl');
        expect(mainDiv).toHaveClass('border');
        expect(mainDiv).toHaveClass('border-purple-500/30');
      });
    });
  });
});
