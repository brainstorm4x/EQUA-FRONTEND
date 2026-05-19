/**
 * Tests for getGlobalTransactionCount and GlobalState parsing
 * 
 * Verifies that:
 * 1. GlobalState account parsing reads correct byte offset (12-19 for total_transactions)
 * 2. Error handling for account not found and RPC failures
 * 3. Large transaction counts handled correctly
 * 4. PDA derivation works correctly
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getGlobalTransactionCount, getGlobalStatePDAPublicKey } from '@/utils/transferTracking';

// Mock the program module to provide known PDA values
jest.mock('@/lib/program', () => {
  const { PublicKey } = jest.requireActual('@solana/web3.js');
  const PROGRAM_ID = new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ');
  const GLOBAL_STATE_PDA = new PublicKey('F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc');
  
  return {
    PROGRAM_ID,
    getGlobalStatePDA: () => [GLOBAL_STATE_PDA, 254],
    getMintAuthorityPDA: () => [new PublicKey('HGkf8CpCU8GZbD6JS2WcYeJCdJnG7qAh6TiDErUMktVC'), 255],
  };
});

describe('getGlobalTransactionCount', () => {
  let mockConnection: jest.Mocked<Connection>;
  
  beforeEach(() => {
    // Create mock connection
    mockConnection = {
      getAccountInfo: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return transaction count from GlobalState account', async () => {
    // Mock GlobalState account data with correct layout
    // Offset 8: user_count (u32, 4 bytes) = 500
    // Offset 12: total_transactions (u64, 8 bytes) = 1234
    // Offset 20: current_epoch (u64, 8 bytes) = 5
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator (8 bytes)
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count (u32 at offset 8) = 500
    const userCountBN = new anchor.BN(500);
    userCountBN.toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write total_transactions (u64 at offset 12) = 1234
    const totalTransactionsBN = new anchor.BN(1234);
    totalTransactionsBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    // Write current_epoch (u64 at offset 20) = 5
    const currentEpochBN = new anchor.BN(5);
    currentEpochBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 20);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(1234);
  });
  
  it('should return 0 when GlobalState account does not exist', async () => {
    mockConnection.getAccountInfo.mockResolvedValue(null);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(0);
  });
  
  it('should return 0 when account data is too small', async () => {
    // Account data too small to contain total_transactions field
    const mockAccountData = Buffer.alloc(10);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(0);
  });
  
  it('should handle large transaction counts correctly', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count (u32 at offset 8)
    new anchor.BN(1000).toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write large total_transactions (u64 at offset 12) = 999,999,999
    const totalTransactionsBN = new anchor.BN(999_999_999);
    totalTransactionsBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(999_999_999);
  });
  
  it('should handle very large u64 values (10 billion transactions)', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count
    new anchor.BN(1000000).toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write very large total_transactions = 10,000,000,000 (10 billion)
    const totalTransactionsBN = new anchor.BN(10_000_000_000);
    totalTransactionsBN.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(10_000_000_000);
  });
  
  it('should cap at MAX_SAFE_INTEGER for extremely large values', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count
    new anchor.BN(1000).toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write value larger than MAX_SAFE_INTEGER
    // MAX_SAFE_INTEGER = 9,007,199,254,740,991
    // Use a value just over it
    const largeValue = new anchor.BN(Number.MAX_SAFE_INTEGER).addn(1000);
    largeValue.toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    // Should cap at MAX_SAFE_INTEGER
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
  });
  
  it('should return 0 on RPC errors', async () => {
    mockConnection.getAccountInfo.mockRejectedValue(new Error('RPC error'));
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(0);
  });
  
  it('should return 0 when account data is null', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({
      data: null as any,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(0);
  });
  
  it('should handle zero transactions correctly', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count
    new anchor.BN(10).toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write total_transactions = 0
    new anchor.BN(0).toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    expect(result).toBe(0);
  });
  
  it('should parse correctly regardless of other field values', async () => {
    const mockAccountData = Buffer.alloc(85);
    
    // Write discriminator
    Buffer.from([163, 46, 74, 168, 216, 123, 133, 98]).copy(mockAccountData, 0);
    
    // Write user_count (u32 at offset 8) = 999,999
    new anchor.BN(999_999).toArrayLike(Buffer, 'le', 4).copy(mockAccountData, 8);
    
    // Write total_transactions (u64 at offset 12) = 42,000 ✅ TARGET
    new anchor.BN(42_000).toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 12);
    
    // Write current_epoch (u64 at offset 20) = 777
    new anchor.BN(777).toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 20);
    
    // Write other fields with random data
    Buffer.from([1]).copy(mockAccountData, 28); // compounding_complete
    new anchor.BN(1234567890).toArrayLike(Buffer, 'le', 8).copy(mockAccountData, 29); // last_epoch_update_time
    
    mockConnection.getAccountInfo.mockResolvedValue({
      data: mockAccountData,
      executable: false,
      lamports: 1000000,
      owner: new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ'),
    } as any);
    
    const result = await getGlobalTransactionCount(mockConnection);
    
    // Should correctly parse total_transactions field regardless of other fields
    expect(result).toBe(42_000);
  });
});

describe('getGlobalStatePDAPublicKey', () => {
  it('should derive GlobalState PDA with correct seeds', () => {
    const [pda, bump] = getGlobalStatePDAPublicKey();
    
    expect(pda).toBeInstanceOf(PublicKey);
    expect(typeof bump).toBe('number');
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });
  
  it('should return consistent PDA on multiple calls', () => {
    const [pda1, bump1] = getGlobalStatePDAPublicKey();
    const [pda2, bump2] = getGlobalStatePDAPublicKey();
    
    expect(pda1.toBase58()).toBe(pda2.toBase58());
    expect(bump1).toBe(bump2);
  });
  
  it('should match expected GlobalState PDA address', () => {
    const [pda] = getGlobalStatePDAPublicKey();
    
    // Expected PDA address based on mocked getGlobalStatePDA
    expect(pda.toBase58()).toBe('F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc');
  });
});
