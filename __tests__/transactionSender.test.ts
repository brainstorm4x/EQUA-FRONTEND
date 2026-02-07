/**
 * Tests for Transaction Sender Utility
 * 
 * Validates the mobile-compatible transaction sending logic using wallet.sendTransaction().
 */

import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { sendTransactionWithSign, WalletAdapter } from '@/utils/transactionSender';

// Mock data
const MOCK_PUBLIC_KEY = new PublicKey('11111111111111111111111111111111');
const MOCK_BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';
const MOCK_SIGNATURE = 'mock-signature-12345';

describe('sendTransactionWithSign', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockWallet: WalletAdapter;
  let mockTransaction: Transaction;
  
  beforeEach(() => {
    // Mock connection (sendRawTransaction not used in new implementation)
    mockConnection = {} as any;
    
    // Create a valid transaction
    mockTransaction = new Transaction();
    mockTransaction.feePayer = MOCK_PUBLIC_KEY;
    mockTransaction.recentBlockhash = MOCK_BLOCKHASH;
    mockTransaction.add({
      keys: [],
      programId: MOCK_PUBLIC_KEY,
      data: Buffer.from([]),
    });
  });
  
  describe('sendTransaction path (mobile-compatible)', () => {
    it('should use sendTransaction exclusively', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      };
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        mockConnection,
        expect.objectContaining({
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        })
      );
      expect(result.signature).toBe(MOCK_SIGNATURE);
      expect(result.method).toBe('sendTransaction');
    });
    
    it('should pass correct options to sendTransaction', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      };
      
      await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection,
        {
          skipPreflight: true,
          maxRetries: 5,
          preflightCommitment: 'finalized',
        }
      );
      
      // Note: preflightCommitment is always overridden to 'confirmed' for reliability
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        mockConnection,
        {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
          maxRetries: 5,
        }
      );
    });
    
    it('should throw enhanced error for user rejection', async () => {
      const rejectError = new Error('User rejected the request');
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(rejectError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction rejected by user in wallet');
    });
    
    it('should throw enhanced error for insufficient funds', async () => {
      const fundsError = new Error('insufficient funds for transaction');
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(fundsError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Insufficient SOL balance for transaction fees');
    });
    
    it('should throw enhanced error for blockhash expiration', async () => {
      const blockhashError = new Error('blockhash not found');
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(blockhashError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction expired - please try again');
    });
    
    it('should re-throw original error for other cases', async () => {
      const genericError = new Error('Network timeout');
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(genericError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Network timeout');
    });
  });
  
  describe('validation', () => {
    it('should throw error if wallet is not connected', async () => {
      mockWallet = {
        connected: false,
        publicKey: null,
        sendTransaction: jest.fn(),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Wallet not connected');
    });
    
    it('should throw error if wallet does not support sendTransaction', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        // No sendTransaction method
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Wallet does not support sendTransaction');
    });
    
    it('should throw error if feePayer is not set', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn(),
      };
      mockTransaction.feePayer = undefined as any;
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction fee payer not set');
    });
    
    it('should throw error if recentBlockhash is not set', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn(),
      };
      mockTransaction.recentBlockhash = undefined as any;
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction recent blockhash not set');
    });
  });
  
  describe('default options', () => {
    it('should use default options when none provided', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      };
      
      await sendTransactionWithSign(mockWallet, mockTransaction, mockConnection);
      
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        mockConnection,
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );
    });
  });
});
