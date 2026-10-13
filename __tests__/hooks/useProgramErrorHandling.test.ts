/**
 * Tests for useProgram hook error handling and state machine
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProgram } from '@/hooks/useProgram';
import * as programLib from '@/lib/program';
import { createTestWrapper } from '../utils/testProviders';

// Mock the program library
jest.mock('@/lib/program', () => ({
  createProgram: jest.fn(),
  getGlobalStatePDA: jest.fn(() => [{ toBase58: () => 'mock-global-pda' }]),
  getMintPDA: jest.fn(() => [{ toBase58: () => 'mock-mint-pda' }]),
  getMintAuthorityPDA: jest.fn(() => [{ toBase58: () => 'mock-authority-pda' }]),
  getUserAccountPDA: jest.fn((pubkey) => [{ toBase58: () => 'mock-user-pda' }]),
  isUserRegistered: jest.fn(),
  getUserBalance: jest.fn(),
  getSPLTokenBalance: jest.fn(),
  getGlobalState: jest.fn(),
}));

// Mock wallet adapter. The connection must be one stable object, as the real
// ConnectionProvider's is: a new object every render changes initializeProgram,
// which re-runs init after an ERROR and hides the error state.
const mockConnection = { rpcEndpoint: 'https://api.devnet.solana.com' };
jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: () => ({
    connection: mockConnection,
  }),
  useWallet: () => ({
    publicKey: null,
    signTransaction: null,
  }),
}));

describe('useProgram Hook - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('State Machine', () => {
    it('should start in DISCONNECTED state when no wallet is connected', () => {
      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.programState).toBe('DISCONNECTED');
      expect(result.current.isProgramLoading).toBe(false);
      expect(result.current.isReady).toBe(false);
    });
  });

  describe('Error Categorization', () => {
    it('should expose error category for network errors', async () => {
      // Mock network timeout error
      const mockCreateProgram = programLib.createProgram as jest.Mock;
      mockCreateProgram.mockRejectedValueOnce(
        new Error('Program initialization timed out. Please check your network connection and try again.')
      );

      // Need to mock wallet connection for this test
      const useWalletMock = require('@solana/wallet-adapter-react').useWallet;
      jest.spyOn(require('@solana/wallet-adapter-react'), 'useWallet').mockReturnValue({
        publicKey: { toBase58: () => 'mock-pubkey' },
        signTransaction: jest.fn(),
      });

      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      // Wait for error state
      await waitFor(
        () => {
          expect(result.current.programState).toBe('ERROR');
        },
        { timeout: 3000 }
      );

      expect(result.current.errorCategory).toBe('NETWORK');
      expect(result.current.canRetryError).toBe(true);
    });
  });

  describe('Retry Mechanism', () => {
    it('should provide retry function for recoverable errors', async () => {
      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.retryProgramInit).toBeDefined();
      expect(typeof result.current.retryProgramInit).toBe('function');
    });

    it('should indicate when errors can be retried', async () => {
      const mockCreateProgram = programLib.createProgram as jest.Mock;
      mockCreateProgram.mockRejectedValueOnce(new Error('Network error'));

      jest.spyOn(require('@solana/wallet-adapter-react'), 'useWallet').mockReturnValue({
        publicKey: { toBase58: () => 'mock-pubkey' },
        signTransaction: jest.fn(),
      });

      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.programState).toBe('ERROR');
        },
        { timeout: 3000 }
      );

      expect(result.current.canRetryError).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still provide isProgramLoading for backward compatibility', () => {
      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current).toHaveProperty('isProgramLoading');
      expect(typeof result.current.isProgramLoading).toBe('boolean');
    });

    it('should still provide programError for backward compatibility', () => {
      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current).toHaveProperty('programError');
    });

    it('should still provide retryProgramInit for backward compatibility', () => {
      const { result } = renderHook(() => useProgram(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current).toHaveProperty('retryProgramInit');
      expect(typeof result.current.retryProgramInit).toBe('function');
    });
  });
});
