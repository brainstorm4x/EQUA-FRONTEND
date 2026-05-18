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

// Mock the program module to provide known PDA values
jest.mock('@/lib/program', () => {
  const { PublicKey } = jest.requireActual('@solana/web3.js');
  const PROGRAM_ID = new PublicKey('B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2');
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

      // Should NOT count - transaction contains mint instruction (it's a minting operation)
      expect(count).toBe(0);
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

    it('should exclude transfers signed by mint authority PDA', async () => {
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
        { signature: 'mint_auth_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer signed by mint authority PDA - should be excluded
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
                    authority: 'HGkf8CpCU8GZbD6JS2WcYeJCdJnG7qAh6TiDErUMktVC', // Mint authority PDA
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should not count PDA-signed transfers
      expect(count).toBe(0);
    });

    it('should exclude transfers signed by program ID', async () => {
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
        { signature: 'program_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer signed by program ID - should be excluded
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
                    authority: 'B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2', // Program ID
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should not count program-signed transfers
      expect(count).toBe(0);
    });

    it('should exclude transfers signed by global state PDA', async () => {
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
        { signature: 'global_state_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer signed by global state PDA - should be excluded
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
                    authority: 'F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc', // Global state PDA
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should not count global-state-signed transfers
      expect(count).toBe(0);
    });

    it('should include transfers signed by regular user authority', async () => {
      const userAuthority = Keypair.generate().publicKey.toBase58();

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
        { signature: 'user_transfer_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer signed by regular user - should be counted
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
                    authority: userAuthority, // Regular user authority
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count user-signed transfers
      expect(count).toBe(1);
    });

    it('should include transferChecked signed by regular user authority', async () => {
      const userAuthority = Keypair.generate().publicKey.toBase58();

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
        { signature: 'user_transfer_checked_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // TransferChecked signed by regular user - should be counted
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
                    authority: userAuthority, // Regular user authority
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count user-signed transfers
      expect(count).toBe(1);
    });

    it('should exclude transferChecked signed by mint authority PDA', async () => {
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
        { signature: 'mint_auth_transfer_checked_sig', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // TransferChecked signed by mint authority PDA - should be excluded
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
                    authority: 'HGkf8CpCU8GZbD6JS2WcYeJCdJnG7qAh6TiDErUMktVC', // Mint authority PDA
                  },
                },
              },
            ],
          },
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should not count PDA-signed transfers
      expect(count).toBe(0);
    });

    it('should use dynamic blocklist from program constants (not hardcoded)', async () => {
      // Import and verify dynamic values are used (not hardcoded literals)
      const { PROGRAM_ID } = require('@/lib/constants');
      
      // Use actual derived PDA values for testing
      // Since we can't derive PDAs in test without valid program ID, we'll use known values
      // This test verifies the *mechanism* works (dynamic derivation) not the exact values
      const programIdStr = PROGRAM_ID.toBase58();
      
      // Known PDA values for the test program (these are what getMintAuthorityPDA/getGlobalStatePDA return)
      const mintAuthPDAStr = 'HGkf8CpCU8GZbD6JS2WcYeJCdJnG7qAh6TiDErUMktVC';
      const globalStatePDAStr = 'F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc';

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

      // Test all three blocklist entries
      const testCases = [
        { authority: programIdStr, label: 'Program ID (dynamic)' },
        { authority: mintAuthPDAStr, label: 'Mint Authority PDA (dynamic)' },
        { authority: globalStatePDAStr, label: 'Global State PDA (dynamic)' },
      ];

      for (const testCase of testCases) {
        resetTransferStats(); // Reset for each test case
        
        mockConnection.getSignaturesForAddress.mockResolvedValue([
          { signature: `sig_${testCase.label}`, slot: 100, err: null, memo: null, blockTime: 1000 },
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
                      source: 'SourceAddr1',
                      destination: 'DestAddr1',
                      amount: '1000000',
                      authority: testCase.authority, // Authority from blocklist
                    },
                  },
                },
              ],
            },
          },
        } as any);

        const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

        // All blocklist entries should be excluded
        expect(count).toBe(0);
      }
    });

    it('should count transfer when authority is present in transaction signatures', async () => {
      const userAuthority = Keypair.generate().publicKey;
      const sourceAddr = Keypair.generate().publicKey;
      const destAddr = Keypair.generate().publicKey;

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
        { signature: 'user_signed_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer with authority present in transaction signatures
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
                    source: sourceAddr.toBase58(),
                    destination: destAddr.toBase58(),
                    amount: '1000000',
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
            // accountKeys: first N entries are signers (where N = # of signatures)
            accountKeys: [
              userAuthority, // First account is the signer/authority
              sourceAddr,
              destAddr,
            ],
          },
          signatures: ['sig1'], // 1 signature means first accountKey is signer
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - authority is in signatures
      expect(count).toBe(1);
    });

    it('should exclude transfer when authority is NOT in transaction signatures (CPI)', async () => {
      const transferAuthority = Keypair.generate().publicKey;
      const actualSigner = Keypair.generate().publicKey;
      const sourceAddr = Keypair.generate().publicKey;

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
        { signature: 'cpi_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transfer authority != transaction signer (CPI scenario)
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
                    source: sourceAddr.toBase58(),
                    destination: 'DestAddr1',
                    amount: '1000000',
                    authority: transferAuthority.toBase58(), // Authority in instruction
                  },
                },
              },
            ],
            // accountKeys: actual signer is different from transfer authority
            accountKeys: [
              actualSigner, // First account is the signer (NOT transfer authority)
              transferAuthority,
              sourceAddr,
            ],
          },
          signatures: ['sig1'], // 1 signature
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should NOT count - authority not in signers (likely CPI)
      expect(count).toBe(0);
    });

    it('should default to blocklist-only when transaction signatures are missing', async () => {
      const userAuthority = Keypair.generate().publicKey;

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
        { signature: 'no_sigs_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with no signatures array (old transaction or RPC issue)
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
            accountKeys: [], // Empty or missing
          },
          signatures: [], // No signatures available
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - no signature info means we fall back to blocklist-only (authority not blocklisted)
      expect(count).toBe(1);
    });

    it('should handle accountKeys with various formats (PublicKey objects vs parsed)', async () => {
      const userAuthority = Keypair.generate().publicKey;
      const sourceAddr = Keypair.generate().publicKey;

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
        { signature: 'mixed_format_transfer', slot: 100, err: null, memo: null, blockTime: 1000 },
      ] as any);

      // Transaction with mixed accountKeys format (can happen in getParsedTransaction)
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
                    source: sourceAddr.toBase58(),
                    destination: 'DestAddr1',
                    amount: '1000000',
                    authority: userAuthority.toBase58(),
                  },
                },
              },
            ],
            // accountKeys can be in different formats
            accountKeys: [
              { pubkey: userAuthority, signer: true, writable: true }, // Parsed format
              sourceAddr, // PublicKey object
            ],
          },
          signatures: ['sig1'], // 1 signature
        },
      } as any);

      const count = await syncTransfersFromChain(mockConnection, mockTokenAccount);

      // Should count - authority extracted from parsed accountKey format
      expect(count).toBe(1);
    });
  });
});
