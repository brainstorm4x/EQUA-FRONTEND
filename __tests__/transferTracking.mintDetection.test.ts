/**
 * Tests for mint detection in transferTracking.ts
 * 
 * Verifies that minting transactions are NOT counted as peer-to-peer transfers.
 * A transaction containing both mint and transfer instructions should be classified
 * as a minting transaction and excluded from the transfer count.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  syncTransfersFromChain,
  getTransferStats,
  resetTransferStats,
} from '@/utils/transferTracking';

// Mock the program module to provide known PDA values
jest.mock('@/lib/program', () => {
  const { PublicKey } = jest.requireActual('@solana/web3.js');
  const PROGRAM_ID = new PublicKey('2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ');
  const MINT_AUTHORITY_PDA = new PublicKey('HGkf8CpCU8GZbD6JS2WcYeJCdJnG7qAh6TiDErUMktVC');
  const GLOBAL_STATE_PDA = new PublicKey('F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc');
  
  return {
    PROGRAM_ID,
    getMintAuthorityPDA: () => [MINT_AUTHORITY_PDA, 255],
    getGlobalStatePDA: () => [GLOBAL_STATE_PDA, 254],
  };
});

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
const mockMint = new PublicKey('DkY7ARHqXJ9F23XmJGMLFdPdraPHoE7N3ghZqCqBb1pi'); // Real UNIYAA mint PDA
const token2022Program = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const userAuthority = Keypair.generate().publicKey;

describe('transferTracking - Mint Detection', () => {
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

    // Mock token account info (consistent across all tests)
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Minting transaction detection', () => {
    it('should NOT count transaction with mintTo + transfer instructions', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_with_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with both mintTo and transfer instructions (minting operation)
      mockConnection.getParsedTransaction.mockResolvedValue({
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
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - transaction contains mintTo instruction
      expect(count).toBe(0);
      expect(getTransferStats().totalTransfers).toBe(0);
    });

    it('should NOT count transaction with mintToChecked + transfer instructions', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_to_checked_with_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with both mintToChecked and transfer instructions
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
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - transaction contains mintToChecked instruction
      expect(count).toBe(0);
    });

    it('should NOT count transaction with mintTo + transferChecked instructions', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_with_transfer_checked', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with mintTo and transferChecked instructions
      mockConnection.getParsedTransaction.mockResolvedValue({
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
              {
                programId: token2022Program,
                parsed: {
                  type: 'transferChecked',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
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

      // Should NOT count - transaction contains mintTo instruction
      expect(count).toBe(0);
    });

    it('should NOT count transaction with only mintTo instruction', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_only_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with only mintTo (no transfer)
      mockConnection.getParsedTransaction.mockResolvedValue({
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

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - no transfer instruction present
      expect(count).toBe(0);
    });

    it('should NOT count transaction with only mintToChecked instruction', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_to_checked_only_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with only mintToChecked (no transfer)
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

      // Should NOT count - no transfer instruction present
      expect(count).toBe(0);
    });
  });

  describe('Pure peer-to-peer transfers', () => {
    it('should count transaction with only transfer instruction (no mint)', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'pure_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with only transfer instruction (peer-to-peer)
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
                    source: 'SourceAddr1',
                    destination: 'DestAddr1',
                    amount: '1000000',
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - pure peer-to-peer transfer
      expect(count).toBe(1);
      expect(getTransferStats().totalTransfers).toBe(1);
    });

    it('should count transaction with only transferChecked instruction (no mint)', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'pure_transfer_checked_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with only transferChecked instruction (peer-to-peer)
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
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - pure peer-to-peer transfer
      expect(count).toBe(1);
    });
  });

  describe('Mixed transaction scenarios', () => {
    it('should handle multiple transactions: mint then transfer', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_tx', slot: 100, err: null, memo: null, blockTime: 1000 },
        { signature: 'transfer_tx', slot: 101, err: null, memo: null, blockTime: 1001 },
      ] as any);

      mockConnection.getParsedTransaction.mockImplementation((sig: string) => {
        if (sig === 'mint_tx') {
          // Minting transaction
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
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'transfer',
                      info: {
                        mint: mockMint.toBase58(),
                        authority: userAuthority.toBase58(),
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        } else {
          // Pure peer-to-peer transfer
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
                        authority: userAuthority.toBase58(),
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

      // Should count only the pure transfer (not the mint transaction)
      expect(count).toBe(1);
      expect(getTransferStats().totalTransfers).toBe(1);
    });

    it('should correctly count multiple pure transfers', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'transfer_1', slot: 100, err: null, memo: null, blockTime: 1000 },
        { signature: 'transfer_2', slot: 101, err: null, memo: null, blockTime: 1001 },
        { signature: 'transfer_3', slot: 102, err: null, memo: null, blockTime: 1002 },
      ] as any);

      // All pure peer-to-peer transfers
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
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count all three transfers
      expect(count).toBe(3);
    });

    it('should correctly filter multiple transactions with mix of mints and transfers', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_1', slot: 100, err: null, memo: null, blockTime: 1000 },
        { signature: 'transfer_1', slot: 101, err: null, memo: null, blockTime: 1001 },
        { signature: 'mint_2', slot: 102, err: null, memo: null, blockTime: 1002 },
        { signature: 'transfer_2', slot: 103, err: null, memo: null, blockTime: 1003 },
      ] as any);

      mockConnection.getParsedTransaction.mockImplementation((sig: string) => {
        if (sig === 'mint_1' || sig === 'mint_2') {
          // Minting transactions
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
                  {
                    programId: token2022Program,
                    parsed: {
                      type: 'transfer',
                      info: {
                        mint: mockMint.toBase58(),
                        authority: userAuthority.toBase58(),
                      },
                    },
                  },
                ],
              },
            },
          } as any);
        } else {
          // Pure peer-to-peer transfers
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
                        authority: userAuthority.toBase58(),
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

      // Should count only the two pure transfers (not the mint transactions)
      expect(count).toBe(2);
    });
  });

  describe('Edge cases with mint detection', () => {
    it('should handle transaction with multiple mint instructions', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'multi_mint_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with multiple mint instructions and a transfer
      mockConnection.getParsedTransaction.mockResolvedValue({
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
              {
                programId: token2022Program,
                parsed: {
                  type: 'mintToChecked',
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - transaction contains mint instructions
      expect(count).toBe(0);
    });

    it('should handle unparsed mint instruction gracefully', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'unparsed_mint_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with unparsed mint instruction (should still allow transfer to be counted)
      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                programId: token2022Program,
                // No 'parsed' field - raw instruction data
                data: 'base58encodedmintdata',
                accounts: [],
              },
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - unparsed instruction is ignored, no parsed mint found
      expect(count).toBe(1);
    });

    it('should handle transaction with mint + non-token instructions', async () => {
      mockConnection.getSignaturesForAddress.mockResolvedValue([
        { signature: 'mint_with_system_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with mint, transfer, and system program instructions
      mockConnection.getParsedTransaction.mockResolvedValue({
        transaction: {
          message: {
            instructions: [
              {
                // System program instruction
                programId: new PublicKey('11111111111111111111111111111111'),
                parsed: {
                  type: 'createAccount',
                },
              },
              {
                programId: token2022Program,
                parsed: {
                  type: 'mintTo',
                  info: {
                    mint: mockMint.toBase58(),
                  },
                },
              },
              {
                programId: token2022Program,
                parsed: {
                  type: 'transfer',
                  info: {
                    mint: mockMint.toBase58(),
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - transaction contains mintTo instruction
      expect(count).toBe(0);
    });
  });
});
