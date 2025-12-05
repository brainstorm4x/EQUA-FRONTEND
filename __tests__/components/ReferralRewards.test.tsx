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

describe('ReferralRewards Component', () => {
  const mockUseWallet = require('@solana/wallet-adapter-react').useWallet;
  const mockUseConnection = require('@solana/wallet-adapter-react').useConnection;
  
  const mockPublicKey = new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');
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
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ReferralRewards />);
      
      expect(screen.getByText('Loading referral data...')).toBeInTheDocument();
    });

    it('should display referral statistics when loaded', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(5000000), // 5 EQUA
        referredUsersCount: 3,
        referredUsers: [
          new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL'),
          new PublicKey('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'),
          new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL'),
        ],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('5.000000')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('✓ Ready to claim')).toBeInTheDocument();
    });

    it('should display zero rewards when no rewards earned', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(0),
        referredUsersCount: 0,
        referredUsers: [],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('0.000000')).toBeInTheDocument();
      });

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.queryByText('✓ Ready to claim')).not.toBeInTheDocument();
    });

    it('should enable claim button when rewards > 0', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(1000000),
        referredUsersCount: 1,
        referredUsers: [new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL')],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Rewards');
        expect(claimButton).not.toBeDisabled();
      });
    });

    it('should disable claim button when no rewards', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(0),
        referredUsersCount: 0,
        referredUsers: [],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('⏳ No Rewards Available');
        expect(claimButton).toBeDisabled();
      });
    });

    it('should show/hide referred users details on button click', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      const referredUser1 = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(1000000),
        referredUsersCount: 1,
        referredUsers: [referredUser1],
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

    it('should display error when user account not found', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue(null);

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('User account not found. Please register first.')).toBeInTheDocument();
      });
    });

    it('should display error when getReferralStats fails', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue(null);

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('Could not load referral data.')).toBeInTheDocument();
      });
    });

    it('should handle claim button click', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(1000000),
        referredUsersCount: 1,
        referredUsers: [new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL')],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        const claimButton = screen.getByText('💰 Claim Rewards');
        expect(claimButton).toBeInTheDocument();
      });

      const claimButton = screen.getByText('💰 Claim Rewards');
      fireEvent.click(claimButton);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claim functionality requires backend program support')
      );

      alertSpy.mockRestore();
    });

    it('should allow refreshing data', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      const getReferralStatsMock = referralRewardsUtils.getReferralStats as jest.Mock;
      getReferralStatsMock.mockResolvedValue({
        referralRewards: new BN(1000000),
        referredUsersCount: 1,
        referredUsers: [new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL')],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('1.000000')).toBeInTheDocument();
      });

      // Click refresh
      const refreshButton = screen.getByText('🔄 Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(getReferralStatsMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should display info banner about referral rewards', async () => {
      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(0),
        referredUsersCount: 0,
        referredUsers: [],
      });

      render(<ReferralRewards />);

      await waitFor(() => {
        expect(screen.getByText('About Referral Rewards')).toBeInTheDocument();
      });

      expect(screen.getByText(/Rewards are tracked on-chain/)).toBeInTheDocument();
      expect(screen.getByText(/Accumulated rewards must be claimed manually/)).toBeInTheDocument();
    });
  });

  describe('CSS and Layout', () => {
    beforeEach(() => {
      mockUseWallet.mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
      });

      (programUtils.loadKeypair as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (referralRewardsUtils.getReferralStats as jest.Mock).mockResolvedValue({
        referralRewards: new BN(0),
        referredUsersCount: 0,
        referredUsers: [],
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
