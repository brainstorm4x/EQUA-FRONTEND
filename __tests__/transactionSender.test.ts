/**
 * Tests for Transaction Sender Utility
 * 
 * Validates the robust transaction sending logic for mobile and desktop wallets.
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
    // Mock connection
    mockConnection = {
      sendRawTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
    } as any;
    
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
  
  describe('signTransaction path (preferred)', () => {
    it('should use signTransaction when available', async () => {
      const signedTransaction = new Transaction();
      signedTransaction.signatures = [
        { 
          publicKey: MOCK_PUBLIC_KEY, 
          signature: Buffer.from([1, 2, 3, 4, 5]), // Non-zero signature
          // Ensure the mock matches the actual structure
        }
      ];
      signedTransaction.serialize = jest.fn().mockReturnValue(Buffer.from('serialized'));
      
      mockWallet = {
        signTransaction: jest.fn().mockResolvedValue(signedTransaction),
        sendTransaction: jest.fn(), // Available but should not be used
      };
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      expect(mockWallet.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockWallet.sendTransaction).not.toHaveBeenCalled();
      expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
      expect(result.signature).toBe(MOCK_SIGNATURE);
      expect(result.method).toBe('sign');
    });
    
    it('should pass correct options to sendRawTransaction', async () => {
      const signedTransaction = new Transaction();
      signedTransaction.signatures = [
        { 
          publicKey: MOCK_PUBLIC_KEY, 
          signature: Buffer.from([1, 2, 3, 4, 5]), // Non-zero signature
        }
      ];
      signedTransaction.serialize = jest.fn().mockReturnValue(Buffer.from('serialized'));
      
      mockWallet = {
        signTransaction: jest.fn().mockResolvedValue(signedTransaction),
      };
      
      await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection,
        {
          skipPreflight: true,
          maxRetries: 5,
          preflightCommitment: 'confirmed',
        }
      );
      
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Buffer),
        {
          skipPreflight: true,
          maxRetries: 5,
          preflightCommitment: 'confirmed',
        }
      );
    });
    
    it('should throw error with context when signTransaction fails', async () => {
      const signError = new Error('User rejected signature');
      mockWallet = {
        signTransaction: jest.fn().mockRejectedValue(signError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Failed to sign and send transaction: User rejected signature');
      
      expect(mockConnection.sendRawTransaction).not.toHaveBeenCalled();
    });
  });
  
  describe('sendTransaction fallback', () => {
    it('should use sendTransaction when signTransaction is not available', async () => {
      mockWallet = {
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
          maxRetries: 3,
        })
      );
      expect(mockConnection.sendRawTransaction).not.toHaveBeenCalled();
      expect(result.signature).toBe(MOCK_SIGNATURE);
      expect(result.method).toBe('send');
    });
    
    it('should pass custom options to sendTransaction', async () => {
      mockWallet = {
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      };
      
      await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection,
        {
          skipPreflight: true,
          maxRetries: 10,
        }
      );
      
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        mockConnection,
        expect.objectContaining({
          skipPreflight: true,
          maxRetries: 10,
        })
      );
    });
    
    it('should throw error with context when sendTransaction fails', async () => {
      const sendError = new Error('Network timeout');
      mockWallet = {
        sendTransaction: jest.fn().mockRejectedValue(sendError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Failed to send transaction: Network timeout');
    });
  });
  
  describe('validation', () => {
    beforeEach(() => {
      mockWallet = {
        signTransaction: jest.fn(),
      };
    });
    
    it('should throw error if feePayer is not set', async () => {
      mockTransaction.feePayer = undefined as any;
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction validation failed: feePayer not set');
    });
    
    it('should throw error if recentBlockhash is not set', async () => {
      mockTransaction.recentBlockhash = undefined as any;
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Transaction validation failed: recentBlockhash not set');
    });
    
    it('should throw error if wallet supports neither method', async () => {
      mockWallet = {}; // No methods available
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Wallet does not support transaction signing');
    });
  });
  
  describe('default options', () => {
    it('should use default options when none provided (signTransaction path)', async () => {
      const signedTransaction = new Transaction();
      signedTransaction.serialize = jest.fn().mockReturnValue(Buffer.from('serialized'));
      
      mockWallet = {
        signTransaction: jest.fn().mockResolvedValue(signedTransaction),
      };
      
      await sendTransactionWithSign(mockWallet, mockTransaction, mockConnection);
      
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          skipPreflight: false,
          maxRetries: 3,
        })
      );
    });
    
    it('should use default options when none provided (sendTransaction path)', async () => {
      mockWallet = {
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      };
      
      await sendTransactionWithSign(mockWallet, mockTransaction, mockConnection);
      
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        mockConnection,
        expect.objectContaining({
          skipPreflight: false,
          maxRetries: 3,
        })
      );
    });
  });
});
