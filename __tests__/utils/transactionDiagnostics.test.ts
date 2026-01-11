/**
 * Transaction Diagnostics Tests
 * 
 * Tests for transaction validation and error extraction utilities
 */

import {
  validateTransaction,
  extractWalletError,
  validateInstruction,
  TransactionValidationResult,
  WalletErrorDetails,
} from '@/utils/transactionDiagnostics';
import { Transaction, PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';

describe('Transaction Diagnostics', () => {
  describe('validateTransaction', () => {
    it('should detect missing fee payer', () => {
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: PublicKey.default,
          toPubkey: PublicKey.default,
          lamports: 1000,
        })
      );
      
      const result = validateTransaction(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transaction missing fee payer - wallet will reject');
    });
    
    it('should detect missing blockhash', () => {
      const transaction = new Transaction();
      transaction.feePayer = PublicKey.default;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: PublicKey.default,
          toPubkey: PublicKey.default,
          lamports: 1000,
        })
      );
      
      const result = validateTransaction(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transaction missing recent blockhash - will fail to send');
    });
    
    it('should detect empty instructions', () => {
      const transaction = new Transaction();
      transaction.feePayer = PublicKey.default;
      transaction.recentBlockhash = 'DummyBlockhash111111111111111111111111111111';
      
      const result = validateTransaction(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transaction has no instructions');
    });
    
    it('should validate valid transaction', () => {
      const transaction = new Transaction();
      transaction.feePayer = PublicKey.default;
      transaction.recentBlockhash = 'DummyBlockhash111111111111111111111111111111';
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: PublicKey.default,
          toPubkey: PublicKey.default,
          lamports: 1000,
        })
      );
      
      const result = validateTransaction(transaction);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.instructionCount).toBe(1);
      expect(result.details.hasFeePayer).toBe(true);
      expect(result.details.hasRecentBlockhash).toBe(true);
    });
  });
  
  describe('extractWalletError', () => {
    it('should extract basic error message', () => {
      const error = new Error('Test error message');
      
      const details = extractWalletError(error);
      
      expect(details.errorType).toBe('Generic');
      expect(details.message).toBe('Test error message');
      expect(details.rawError).toBe(error);
    });
    
    it('should detect WalletSendTransactionError', () => {
      const error = {
        name: 'WalletSendTransactionError',
        message: 'Transaction failed',
        code: 4001,
      };
      
      const details = extractWalletError(error);
      
      expect(details.errorType).toBe('WalletSendTransactionError');
      expect(details.message).toBe('Transaction failed');
      expect(details.code).toBe(4001);
    });
    
    it('should extract transaction logs', () => {
      const error = {
        name: 'WalletSendTransactionError',
        message: 'Simulation failed',
        logs: ['Program log: Error: Insufficient funds', 'Program failed to complete'],
      };
      
      const details = extractWalletError(error);
      
      expect(details.logs).toEqual([
        'Program log: Error: Insufficient funds',
        'Program failed to complete',
      ]);
    });
    
    it('should extract transaction signature', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
      const error = {
        name: 'WalletSendTransactionError',
        message: 'Transaction failed',
        signature,
      };
      
      const details = extractWalletError(error);
      
      expect(details.signature).toBe(signature);
    });
    
    it('should handle nested errors', () => {
      const error = {
        name: 'WalletError',
        message: 'Outer error',
        error: {
          name: 'WalletSendTransactionError',
          message: 'Inner error',
          code: 4001,
          logs: ['Program log: Test'],
        },
      };
      
      const details = extractWalletError(error);
      
      expect(details.errorType).toBe('WalletSendTransactionError');
      expect(details.message).toBe('Inner error');
      expect(details.code).toBe(4001);
      expect(details.logs).toEqual(['Program log: Test']);
    });
  });
  
  describe('validateInstruction', () => {
    it('should validate correct program ID', () => {
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: PublicKey.default, isSigner: false, isWritable: true },
          { pubkey: PublicKey.default, isSigner: true, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      });
      
      const result = validateInstruction(instruction, 2, PROGRAM_ID);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect program ID mismatch', () => {
      const wrongProgramId = new PublicKey('11111111111111111111111111111111');
      const instruction = new TransactionInstruction({
        keys: [],
        programId: wrongProgramId,
        data: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
      });
      
      const result = validateInstruction(instruction, 0, PROGRAM_ID);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Program ID mismatch');
    });
    
    it('should detect account count mismatch', () => {
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: PublicKey.default, isSigner: false, isWritable: true },
        ],
        programId: PROGRAM_ID,
        data: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
      });
      
      const result = validateInstruction(instruction, 5, PROGRAM_ID);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Account count mismatch'))).toBe(true);
    });
    
    it('should detect short instruction data', () => {
      const instruction = new TransactionInstruction({
        keys: [],
        programId: PROGRAM_ID,
        data: Uint8Array.from([1, 2, 3]), // Only 3 bytes, needs at least 8 for discriminator
      });
      
      const result = validateInstruction(instruction, 0, PROGRAM_ID);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Instruction data too short'))).toBe(true);
    });
  });
});
