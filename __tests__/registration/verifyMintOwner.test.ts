/**
 * Tests for verifyMintOwner function
 * Ensures runtime validation catches TOKEN_PROGRAM_ID mismatches
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { verifyMintOwner } from '@/lib/program';

// Mock the connection
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn()
  };
});

describe('verifyMintOwner', () => {
  let mockConnection: any;
  const mintPubkey = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const standardTokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const token2022Program = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn()
    };
  });

  it('should pass when mint owner matches TOKEN_PROGRAM_ID (Token-2022)', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({
      owner: token2022Program, // Now expecting Token-2022
      data: Buffer.alloc(82), // Standard mint account size
      lamports: 1000000
    });

    // Returns the token program to build instructions with (0208c85)
    await expect(verifyMintOwner(mockConnection, mintPubkey)).resolves.toEqual(token2022Program);
  });

  it('should throw error when mint does not exist', async () => {
    mockConnection.getAccountInfo.mockResolvedValue(null);

    await expect(verifyMintOwner(mockConnection, mintPubkey))
      .rejects
      .toThrow('does not exist');
  });

  it('should throw error when mint owner is standard SPL instead of Token-2022', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({
      owner: standardTokenProgram, // Wrong token program (we expect Token-2022)
      data: Buffer.alloc(82),
      lamports: 1000000
    });

    await expect(verifyMintOwner(mockConnection, mintPubkey))
      .rejects
      .toThrow('Mint owner mismatch');
  });

  it('should provide actionable error message for standard SPL mismatch', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({
      owner: standardTokenProgram, // Wrong token program (we expect Token-2022)
      data: Buffer.alloc(82),
      lamports: 1000000
    });

    try {
      await verifyMintOwner(mockConnection, mintPubkey);
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Mint owner mismatch');
      expect(error.message).toContain('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(error.message).toContain('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    }
  });

  it('should propagate RPC errors instead of passing the check', async () => {
    mockConnection.getAccountInfo.mockRejectedValue(new Error('RPC connection failed'));

    await expect(verifyMintOwner(mockConnection, mintPubkey))
      .rejects
      .toThrow('RPC connection failed');
  });
});
