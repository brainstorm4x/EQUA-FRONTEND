/**
 * Tests for Transaction Sender Utility
 *
 * Validates the mobile-first transaction sending logic:
 * - Mobile browsers: Use signTransaction() + sendRawTransaction()
 * - Desktop browsers: Use sendTransaction() for convenience
 * - Desktop fallback: signTransaction() on signature errors
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
    // Mock connection (sendRawTransaction used in fallback path)
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
    it('should use sendTransaction by default', async () => {
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
    
    it('should re-throw error for user rejection', async () => {
      const rejectError = new Error('User rejected the request');
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(rejectError),
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('User rejected the request');
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

  describe('signTransaction fallback', () => {
    it('should use signTransaction when sendTransaction is not available', async () => {
      // Create a properly serializable signed transaction
      const mockSignedTx = new Transaction();
      mockSignedTx.feePayer = MOCK_PUBLIC_KEY;
      mockSignedTx.recentBlockhash = MOCK_BLOCKHASH;
      mockSignedTx.add({
        keys: [],
        programId: MOCK_PUBLIC_KEY,
        data: Buffer.from([]),
      });
      
      // Mock the serialize method to return a valid buffer
      const mockSerializedTx = Buffer.from('mock-serialized-transaction');
      mockSignedTx.serialize = jest.fn().mockReturnValue(mockSerializedTx);

      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        // No sendTransaction method - only signTransaction available
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      };

      mockConnection = {
        sendRawTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      } as any;

      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );

      expect(mockWallet.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(
        mockSerializedTx,
        expect.objectContaining({
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        })
      );
      expect(result.method).toBe('signTransaction');
      expect(result.signature).toBe(MOCK_SIGNATURE);
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
    
    it('should throw error if wallet does not support any signing method', async () => {
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        // No sendTransaction or signTransaction methods
      };
      
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Wallet does not support transaction signing');
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

  describe('mobile browser detection', () => {
    let originalNavigator: Navigator;
    
    beforeEach(() => {
      // Save original navigator
      originalNavigator = global.navigator;
    });
    
    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });
    
    it('should use signTransaction on mobile browsers', async () => {
      // Mock mobile user agent (complete iOS Safari user agent)
      Object.defineProperty(global, 'navigator', {
        value: { 
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        },
        writable: true,
      });
      
      const mockSignedTx = new Transaction();
      mockSignedTx.feePayer = MOCK_PUBLIC_KEY;
      mockSignedTx.recentBlockhash = MOCK_BLOCKHASH;
      mockSignedTx.add({
        keys: [],
        programId: MOCK_PUBLIC_KEY,
        data: Buffer.from([]),
      });
      
      const mockSerializedTx = Buffer.from('mock-serialized-transaction');
      mockSignedTx.serialize = jest.fn().mockReturnValue(mockSerializedTx);
      
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      };
      
      mockConnection = {
        sendRawTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      } as any;
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      // On mobile, should use signTransaction even though sendTransaction is available
      expect(mockWallet.signTransaction).toHaveBeenCalledWith(mockTransaction);
      expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
      expect(mockWallet.sendTransaction).not.toHaveBeenCalled();
      expect(result.method).toBe('signTransaction');
    });
    
    it('should use sendTransaction on desktop browsers', async () => {
      // Mock desktop user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
      });
      
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
        signTransaction: jest.fn(),
      };
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      // On desktop, should use sendTransaction
      expect(mockWallet.sendTransaction).toHaveBeenCalled();
      expect(mockWallet.signTransaction).not.toHaveBeenCalled();
      expect(result.method).toBe('sendTransaction');
    });
    
    it('should handle Android mobile browsers', async () => {
      // Mock Android user agent (complete Chrome on Android user agent)
      Object.defineProperty(global, 'navigator', {
        value: { 
          userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
        },
        writable: true,
      });
      
      const mockSignedTx = new Transaction();
      mockSignedTx.feePayer = MOCK_PUBLIC_KEY;
      mockSignedTx.recentBlockhash = MOCK_BLOCKHASH;
      mockSignedTx.add({
        keys: [],
        programId: MOCK_PUBLIC_KEY,
        data: Buffer.from([]),
      });
      
      const mockSerializedTx = Buffer.from('mock-serialized-transaction');
      mockSignedTx.serialize = jest.fn().mockReturnValue(mockSerializedTx);
      
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      };
      
      mockConnection = {
        sendRawTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      } as any;
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      // On Android mobile, should use signTransaction
      expect(mockWallet.signTransaction).toHaveBeenCalled();
      expect(result.method).toBe('signTransaction');
    });
    
    it('should fallback to signTransaction on desktop signature errors', async () => {
      // Mock desktop user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        writable: true,
      });
      
      const signatureError = new Error('Signature verification failed');
      
      const mockSignedTx = new Transaction();
      mockSignedTx.feePayer = MOCK_PUBLIC_KEY;
      mockSignedTx.recentBlockhash = MOCK_BLOCKHASH;
      mockSignedTx.add({
        keys: [],
        programId: MOCK_PUBLIC_KEY,
        data: Buffer.from([]),
      });
      
      const mockSerializedTx = Buffer.from('mock-serialized-transaction');
      mockSignedTx.serialize = jest.fn().mockReturnValue(mockSerializedTx);
      
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn().mockRejectedValue(signatureError),
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      };
      
      mockConnection = {
        sendRawTransaction: jest.fn().mockResolvedValue(MOCK_SIGNATURE),
      } as any;
      
      const result = await sendTransactionWithSign(
        mockWallet,
        mockTransaction,
        mockConnection
      );
      
      // Should try sendTransaction first, then fallback to signTransaction on error
      expect(mockWallet.sendTransaction).toHaveBeenCalled();
      expect(mockWallet.signTransaction).toHaveBeenCalled();
      expect(result.method).toBe('signTransaction');
    });
    
    it('should not fallback on mobile signature errors (avoid infinite loop)', async () => {
      // Mock mobile user agent (complete iOS Safari user agent)
      Object.defineProperty(global, 'navigator', {
        value: { 
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        },
        writable: true,
      });
      
      const signatureError = new Error('Signature verification failed');
      
      mockWallet = {
        connected: true,
        publicKey: MOCK_PUBLIC_KEY,
        sendTransaction: jest.fn(),
        signTransaction: jest.fn().mockRejectedValue(signatureError),
      };
      
      mockConnection = {
        sendRawTransaction: jest.fn(),
      } as any;
      
      // Should throw error instead of falling back (already using signTransaction on mobile)
      await expect(
        sendTransactionWithSign(mockWallet, mockTransaction, mockConnection)
      ).rejects.toThrow('Signature verification failed');
      
      // Should only call signTransaction once (no fallback attempt)
      expect(mockWallet.signTransaction).toHaveBeenCalledTimes(1);
      expect(mockWallet.sendTransaction).not.toHaveBeenCalled();
    });
  });
});
