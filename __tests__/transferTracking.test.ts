/**
 * Tests for transferTracking.ts
 * 
 * Verifies that:
 * 1. Transfer counting only includes actual user-to-user transfers
 * 2. Mint operations (mintTo, mintToChecked) are excluded
 * 3. Only transfers matching the token account's mint are counted
 * 4. Already processed signatures are not double-counted
 * 5. Null/missing parsed transactions don't increment counts
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  syncTransfersFromChain,
  getTransferStats,
  resetTransferStats,
} from '@/utils/transferTracking';

// Mock Solana connection
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn(),
  };
});

// Generate valid public keys for testing
const mockTokenAccount = Keypair.generate().publicKey;
const mockMint = new PublicKey('DkY7ARHqXJ9F23XmJGMLFdPdraPHoE7N3ghZqCqBb1pi'); // Real EQUA mint PDA
const otherMint = Keypair.generate().publicKey;
const token2022Program = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const legacyTokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

describe('transferTracking', () => {
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    // Reset localStorage before each test
    resetTransferStats();
    
    // Create mock connection
    mockConnection = {
      getSignaturesForAddress: jest.fn(),
      getParsedAccountInfo: jest.fn(),
      getParsedTransaction: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncTransfersFromChain', () => {
    it('should fetch mint address from token account', async () => {
      // Mock token account info with mint
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([]);

      await syncTransfersFromChain(mockConnection, mockTokenAccount);

      expect(mockConnection.getParsedAccountInfo).toHaveBeenCalledWith(mockTokenAccount);
    });

    it('should count only transfer instructions, not mint instructions', async () => {
      // Mock token account info
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      // Mock signatures: one mint, one transfer
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_sig_1', slot: 100, err: null, memo: null, blockTime: 1000 },
        { signature: 'transfer_sig_1', slot: 101, err: null, memo: null, blockTime: 1001 },
      ] as any);

      // Mock parsed transactions
      mockConnection.getParsedTransaction.mockImplementation((sig: string) => {
        if (sig === 'mint_sig_1') {
          // MintTo instruction - should be excluded
          return Promise.resolve({
            transaction: {
              message: {
                instructions: [
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'mintTo',
                      info: {
                        mint: mockMint.toBase58(),
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        } else if (sig === 'transfer_sig_1') {
          // Transfer instruction - should be counted
          return Promise.resolve({
            transaction: {
              message: {
                instructions: [
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'transfer',
                      info: {
                        mint: mockMint.toBase58(),
                        source: 'SourceAddr1',
                        destination: 'DestAddr1',
                        amount: '1000000',
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        }
        return Promise.resolve(null);
      });

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Only the transfer should be counted (not the mint)
      expect(count).toBe(1);
      expect(getTransferStats().totalTransfers).toBe(1);
    });

    it('should count transferChecked instructions', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'transfer_checked_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                parsed: {
                  type: 'transferChecked',
                  info: {
                    mint: mockMint.toBase58(),
                    source: 'SourceAddr1',
                    destination: 'DestAddr1',
                    tokenAmount: {
                      amount: '1000000',
                      decimals: 6,
                    },
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      expect(count).toBe(1);
    });

    it('should exclude mintToChecked instructions', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_to_checked_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                parsed: {
                  type: 'mintToChecked',
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // MintToChecked should be excluded
      expect(count).toBe(0);
    });

    it('should only count transfers with matching mint', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'wrong_mint_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
        { signature: 'correct_mint_sig', slot: 101, err: null, memo: null, blockTime: 1001 },
      ] as any);

      mockConnection.getParsedTransaction.mockImplementation((sig: string) => {
        if (sig === 'wrong_mint_sig') {
          // Transfer with different mint - should be excluded
          return Promise.resolve({
            transaction: {
              message: {
                instructions: [
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'transfer',
                      info: {
                        mint: otherMint.toBase58(), // Different mint!
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        } else {
          // Transfer with correct mint - should be counted
          return Promise.resolve({
            transaction: {
              message: {
                instructions: [
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'transfer',
                      info: {
                        mint: mockMint.toBase58(),
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        }
      });

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Only the transfer with matching mint should be counted
      expect(count).toBe(1);
    });

    it('should support legacy Token Program in addition to Token-2022', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'legacy_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: legacyTokenProgram, // Legacy token program
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      expect(count).toBe(1);
    });

    it('should skip already processed signatures', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      // First sync with one signature
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'sig_1', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const firstCount = await syncTransfersFromChain(mockConnection, mockTokenAccount);
      expect(firstCount).toBe(1);

      // Second sync with same signature - should not increment
      const secondCount = await syncTransfersFromChain(mockConnection, mockTokenAccount);
      expect(secondCount).toBe(1); // Still 1, not 2
    });

    it('should handle null parsed transactions gracefully', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'null_tx_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Return null transaction (can happen for very old or failed transactions)
      mockConnection.getParsedTransaction.mockResolvedValue(null);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Null transaction should not be counted
      expect(count).toBe(0);
    });

    it('should handle transactions without instructions', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'no_instructions_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [], // No instructions
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      expect(count).toBe(0);
    });

    it('should handle errors gracefully and return current count', async () => {
      mockConnection.getParsedAccountInfo.mockRejectedValue(new Error('RPC Error'));

      const stats = getTransferStats();
      const currentCount = stats.totalTransfers;

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should return current count on error
      expect(count).toBe(currentCount);
    });

    it('should respect 100 signature limit', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([]);

      await syncTransfersFromChain(mockConnection, mockTokenAccount);

      expect(mockConnection.getSignaturesForAddress).toHaveBeenCalledWith(
        mockTokenAccount,
        { limit: 100 }
      );
    });

    it('should handle mixed instruction types in single transaction', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mixed_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with multiple instructions: mint + transfer
      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                parsed: {
                  type: 'mintTo', // Should be ignored
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer', // Should be counted
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
              {
                // System program instruction - should be ignored
                programId: new PublicKey('11111111111111111111111111111111'),
                parsed: {
                  type: 'createAccount',
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count the transaction once (it has at least one valid transfer)
      expect(count).toBe(1);
    });

    it('should ignore unparsed instructions', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({
        context: { slot: 123 },
        value: {
          data: {
            parsed: {
              info: {
                mint: mockMint.toBase58(),
              },
            },
          },
        },
      } as any);

      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'unparsed_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with unparsed instruction (no 'parsed' field)
      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                // No 'parsed' field - raw instruction data
                data: 'base58encodeddata',
                accounts: [],
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Unparsed instruction should be ignored
      expect(count).toBe(0);
    });
  });
});
