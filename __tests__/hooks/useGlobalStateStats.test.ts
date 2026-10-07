/**
 * Tests for useGlobalStateStats hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Mock wallet adapter hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: jest.fn(),
}));

// Mock constants and PDA derivation - must be done before importing the hook
const mockGlobalStatePDA = new PublicKey('7Z8vCjHAXJ4zzHvZePTn6bfuRoSZVCcv4uWKh3XGdp9Z');

jest.mock('@/lib/constants', () => {
  const { PublicKey } = require('@solana/web3.js');
  return {
    PROGRAM_ID: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    GLOBAL_STATE_SEED: 'global-state',
  };
});

// Mock PublicKey.findProgramAddressSync to return a deterministic PDA
const originalFindProgramAddressSync = PublicKey.findProgramAddressSync;
PublicKey.findProgramAddressSync = jest.fn((seeds: any[], programId: PublicKey) => {
  // Return mock PDA for global state
  return [mockGlobalStatePDA, 255];
});

import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';
import { useConnection } from '@solana/wallet-adapter-react';

describe('useGlobalStateStats', () => {
  const mockConnection = {
    getAccountInfo: jest.fn(),
    onAccountChange: jest.fn(() => 1),
    removeAccountChangeListener: jest.fn(),
  } as unknown as Connection;

  beforeEach(() => {
    jest.clearAllMocks();
    // Cached endpoint unavailable by default, so tests exercise the RPC path
    global.fetch = jest.fn().mockRejectedValue(new Error('endpoint unavailable')) as any;
    
    (useConnection as jest.Mock).mockReturnValue({
      connection: mockConnection,
    });
  });

  it('should return zero values when global state account does not exist', async () => {
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalUsers).toBe(0);
    expect(result.current.totalTransactions).toBe(0);
    expect(result.current.currentEpoch).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should parse and return global state data correctly', async () => {
    // Create mock GlobalState account data
    // Layout: discriminator (8) + user_count (4) + total_transactions (8) + current_epoch (8) + ...
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator (8 bytes)
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]).copy(mockAccountData, 0);
    
    // Write user_count (u32 at offset 8) = 1500
    const userCountBN = new anchor.BN(1500);
    userCountBN.toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write total_transactions (u64 at offset 12) = 25000
    const totalTxBN = new anchor.BN(25000);
    totalTxBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    // Write current_epoch (u64 at offset 20) = 5
    const currentEpochBN = new anchor.BN(5);
    currentEpochBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 20);

    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 5000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    });

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalUsers).toBe(1500);
    expect(result.current.totalTransactions).toBe(25000);
    expect(result.current.currentEpoch).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('should handle large u64 values correctly', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]).copy(mockAccountData, 0);
    
    // Write user_count (u32 at offset 8) = 1,000,000
    const userCountBN = new anchor.BN(1_000_000);
    userCountBN.toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write total_transactions (u64 at offset 12) = 10,000,000,000 (10 billion)
    const totalTxBN = new anchor.BN(10_000_000_000);
    totalTxBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    // Write current_epoch (u64 at offset 20) = 100
    const currentEpochBN = new anchor.BN(100);
    currentEpochBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 20);

    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 5000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    });

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalUsers).toBe(1_000_000);
    expect(result.current.totalTransactions).toBe(10_000_000_000);
    expect(result.current.currentEpoch).toBe(100);
  });

  it('should handle max u32 values correctly', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]).copy(mockAccountData, 0);
    
    // Write max u32 value (4,294,967,295)
    // This is a valid value, just very large
    const userCountBN = new anchor.BN(4_294_967_295);
    userCountBN.toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);

    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 5000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    });

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Max u32 value is still within reasonable range (<10 billion)
    expect(result.current.totalUsers).toBe(4_294_967_295);
  });

  it('should handle errors gracefully', async () => {
    mockConnection.getAccountInfo = jest.fn().mockRejectedValue(
      new Error('RPC connection failed')
    );

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalUsers).toBe(0);
    expect(result.current.totalTransactions).toBe(0);
    expect(result.current.currentEpoch).toBe(0);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toContain('RPC connection failed');
  });

  it('should provide a refresh function', async () => {
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');

    // Call refresh
    await result.current.refresh();

    expect(mockConnection.getAccountInfo).toHaveBeenCalled();
  });

  it('should read the cached endpoint and skip RPC when it responds', async () => {
    const accountData = Buffer.alloc(85);
    new anchor.BN(42).toArrayLike(Buffer, 'le', 4).copy(accountData, 8);
    new anchor.BN(1234).toArrayLike(Buffer, 'le', 8).copy(accountData, 12);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: accountData.toString('base64') }),
    }) as any;
    mockConnection.getAccountInfo = jest.fn();

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/.netlify/functions/get-global-state');
    expect(result.current.totalUsers).toBe(42);
    expect(result.current.totalTransactions).toBe(1234);
    expect(mockConnection.getAccountInfo).not.toHaveBeenCalled();
  });

  it('should read the on-chain price and today\'s payers from a migrated account', async () => {
    const accountData = Buffer.alloc(149);
    new anchor.BN(10).toArrayLike(Buffer, 'le', 4).copy(accountData, 8);
    new anchor.BN(4).toArrayLike(Buffer, 'le', 8).copy(accountData, 133); // payers_today
    new anchor.BN(12_345_678).toArrayLike(Buffer, 'le', 8).copy(accountData, 141); // $0.012345678
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: accountData.toString('base64') }),
    }) as any;

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceUsd).toBeCloseTo(0.012345678, 9);
    expect(result.current.payersToday).toBe(4);
  });

  it('should show the initial price for an account not yet migrated', async () => {
    const accountData = Buffer.alloc(125);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: accountData.toString('base64') }),
    }) as any;

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceUsd).toBe(0.01);
    expect(result.current.payersToday).toBe(0);
  });

  it('should fall back to RPC when the cached endpoint returns an error', async () => {
    const accountData = Buffer.alloc(85);
    new anchor.BN(7).toArrayLike(Buffer, 'le', 4).copy(accountData, 8);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any;
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({ data: accountData });

    const { result } = renderHook(() => useGlobalStateStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockConnection.getAccountInfo).toHaveBeenCalled();
    expect(result.current.totalUsers).toBe(7);
  });

  it('should re-read on an interval and never subscribe to GlobalState', async () => {
    jest.useFakeTimers();
    try {
      mockConnection.getAccountInfo = jest.fn().mockResolvedValue(null);

      const { unmount } = renderHook(() => useGlobalStateStats());
      expect(global.fetch).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(20_000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockConnection.onAccountChange).not.toHaveBeenCalled();

      unmount();
      await jest.advanceTimersByTimeAsync(20_000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
