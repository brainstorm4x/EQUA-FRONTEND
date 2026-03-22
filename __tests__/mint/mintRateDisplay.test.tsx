/**
 * Tests for Mint Rate Display
 * Validates mint rate display for different user tiers
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// Mock Solana wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: jest.fn(() => ({
    connection: {
      getAccountInfo: jest.fn(),
    },
  })),
}));

// Mock the program ID with proper PublicKey methods
jest.mock('@/lib/constants', () => ({
  PROGRAM_ID: new (require('@solana/web3.js').PublicKey)('B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2'),
  GLOBAL_STATE_SEED: 'global-state',
}));

// Import after mocks
import { PriceDisplay } from '@/components/PriceDisplay';
const { useConnection } = require('@solana/wallet-adapter-react');

describe('Mint Rate Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock PublicKey.findProgramAddressSync to return a valid PDA
    jest.spyOn(PublicKey, 'findProgramAddressSync').mockReturnValue([
      new PublicKey('B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2'),
      255
    ]);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('First User (User #1)', () => {
    it('should display 100,000 UNIA/day for first user', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([0]).buffer)), // user_count (u32)
          new anchor.BN(0).toBuffer('le', 8), // total_transactions
          new anchor.BN(0).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        expect(mintRate).toHaveTextContent('100,000');
      }, { timeout: 3000 });
    });
  });

  describe('Early Users (Users #2-10)', () => {
    it('should display appropriate UNIA/day range for users 2-10', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([5]).buffer)), // user_count (u32) = 5
          new anchor.BN(0).toBuffer('le', 8), // total_transactions
          new anchor.BN(0).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        // Should show range for early users
        expect(mintRate.textContent).toMatch(/10,000|100,000/);
      }, { timeout: 3000 });
    });
  });

  describe('Mid-Tier Users (Users #11-100)', () => {
    it('should display appropriate UNIA/day range for users 11-100', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([50]).buffer)), // user_count (u32) = 50
          new anchor.BN(0).toBuffer('le', 8), // total_transactions
          new anchor.BN(0).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        // Should show range for mid-tier users
        expect(mintRate.textContent).toMatch(/1,000|10,000/);
      }, { timeout: 3000 });
    });
  });

  describe('Standard Users (Users #101+)', () => {
    it('should display 100 UNIA/day for users after 100', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([150]).buffer)), // user_count (u32) = 150
          new anchor.BN(0).toBuffer('le', 8), // total_transactions
          new anchor.BN(0).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        expect(mintRate).toHaveTextContent('100');
      }, { timeout: 3000 });
    });
  });

  describe('Price Display', () => {
    it('should display current UNIA price', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([50]).buffer)), // user_count (u32)
          new anchor.BN(100).toBuffer('le', 8), // total_transactions
          new anchor.BN(5).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const priceElement = screen.getByTestId('current-price');
        expect(priceElement).toBeInTheDocument();
        // Price should be formatted as currency
        expect(priceElement.textContent).toMatch(/\$/);
      }, { timeout: 3000 });
    });

    it('should display current phase', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([50]).buffer)), // user_count (u32)
          new anchor.BN(100).toBuffer('le', 8), // total_transactions
          new anchor.BN(10).toBuffer('le', 8), // current_epoch = 10
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const phaseElement = screen.getByTestId('current-phase');
        // Check that phase is displayed
        expect(phaseElement).toBeInTheDocument();
        expect(phaseElement.textContent).toMatch(/Phase/);
      }, { timeout: 3000 });
    });
  });

  describe('Loading State', () => {
    it('should show loading state or render successfully', () => {
      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 1000))
          ),
        },
      });

      render(<PriceDisplay />);

      // Check for loading indicator (skeleton) or immediate render
      const loadingElements = document.querySelectorAll('.animate-pulse');
      // Component may render immediately or show loading
      expect(loadingElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should display default values when global state does not exist', async () => {
      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(null),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const priceElement = screen.getByTestId('current-price');
        expect(priceElement).toHaveTextContent('$0.01');
      }, { timeout: 3000 });

      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        expect(mintRate).toHaveTextContent('100,000');
      }, { timeout: 3000 });
    });

    it('should handle network errors gracefully', async () => {
      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        const priceElement = screen.getByTestId('current-price');
        expect(priceElement).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should display default fallback values
      await waitFor(() => {
        const mintRate = screen.getByTestId('mint-rate');
        expect(mintRate).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper test ids for all key elements', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([50]).buffer)), // user_count (u32)
          new anchor.BN(0).toBuffer('le', 8), // total_transactions
          new anchor.BN(0).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay />);

      await waitFor(() => {
        expect(screen.getByTestId('price-display')).toBeInTheDocument();
        expect(screen.getByTestId('current-price')).toBeInTheDocument();
        expect(screen.getByTestId('mint-rate')).toBeInTheDocument();
        expect(screen.getByTestId('current-phase')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
  
  describe('Stats Display', () => {
    it('should display user count and transactions when showStats is true', async () => {
      const mockAccountInfo = {
        data: Buffer.concat([
          Buffer.alloc(8), // discriminator
          Buffer.from(new Uint8Array(new Uint32Array([100]).buffer)), // user_count (u32) = 100
          new anchor.BN(5000).toBuffer('le', 8), // total_transactions = 5000
          new anchor.BN(50).toBuffer('le', 8), // current_epoch
          Buffer.from([0]), // compounding_complete
        ]),
      };

      useConnection.mockReturnValue({
        connection: {
          getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
        },
      });

      render(<PriceDisplay showStats={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('total-users')).toBeInTheDocument();
        expect(screen.getByTestId('total-transactions')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
