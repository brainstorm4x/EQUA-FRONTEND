/**
 * Tests for useNetworkDiagnostics hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { useNetworkDiagnostics } from '@/hooks/useNetworkDiagnostics';
import { createTestWrapper } from '../utils/testProviders';

// Mock the connection
jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: jest.fn(),
}));

// Mock PDA functions to avoid PDA cache issues
// Use valid base58-encoded public keys
jest.mock('@/lib/program', () => ({
  getGlobalStatePDA: jest.fn(() => [
    new PublicKey('11111111111111111111111111111111'),
    255,
  ]),
  getMintPDA: jest.fn(() => [
    new PublicKey('11111111111111111111111111111112'),
    255,
  ]),
}));

const { useConnection } = require('@solana/wallet-adapter-react');

// Mock fetch for IDL loading
global.fetch = jest.fn();

describe('useNetworkDiagnostics', () => {
  const mockConnection = {
    rpcEndpoint: 'https://api.devnet.solana.com',
    getAccountInfo: jest.fn(),
  } as unknown as Connection;

  const mockIdl = {
    address: '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useConnection.mockReturnValue({ connection: mockConnection });
    
    // Mock successful IDL fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockIdl,
    });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isHealthy).toBe(false);
  });

  it('should detect healthy state when all checks pass', async () => {
    // Mock successful account info fetches
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
      data: Buffer.alloc(100),
    } as AccountInfo<Buffer>);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isHealthy).toBe(true);
    expect(result.current.errors).toHaveLength(0);
    expect(result.current.globalStateExists).toBe(true);
    expect(result.current.mintExists).toBe(true);
  });

  it('should detect account issues and report errors', async () => {
    // Mock GlobalState missing (null)
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not be healthy when accounts are missing
    expect(result.current.isHealthy).toBe(false);
    expect(result.current.globalStateExists).toBe(false);
    expect(result.current.mintExists).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it('should detect program ID mismatch', async () => {
    // Mock IDL with different program ID
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        address: 'DifferentProgramId1111111111111111111111111',
      }),
    });

    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
      data: Buffer.alloc(100),
    } as AccountInfo<Buffer>);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.errors.some(e => e.code === 'PROGRAM_ID_MISMATCH')).toBe(true);
  });

  it('should handle RPC connection errors gracefully', async () => {
    mockConnection.getAccountInfo = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.errors.some(e => e.code === 'RPC_CONNECTION_ERROR')).toBe(true);
  });

  it('should provide cluster info', async () => {
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
      data: Buffer.alloc(100),
    } as AccountInfo<Buffer>);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clusterInfo).toBeDefined();
    expect(result.current.clusterInfo?.type).toBe('devnet');
    expect(result.current.clusterInfo?.displayName).toBe('Devnet');
  });

  it('should provide program ID information', async () => {
    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
      data: Buffer.alloc(100),
    } as AccountInfo<Buffer>);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.programId).toBeDefined();
    expect(result.current.tokenProgramId).toBeDefined();
    expect(result.current.idlProgramId).toBe('7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP');
  });

  it('should handle failed IDL fetch', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    mockConnection.getAccountInfo = jest.fn().mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
      data: Buffer.alloc(100),
    } as AccountInfo<Buffer>);

    const { result } = renderHook(() => useNetworkDiagnostics(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still complete diagnostics, just without IDL program ID check
    expect(result.current.idlProgramId).toBeNull();
    // Can still be healthy if other checks pass
    expect(result.current.isLoading).toBe(false);
  });
});
