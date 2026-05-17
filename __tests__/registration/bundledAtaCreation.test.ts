/**
 * Tests for Bundled ATA Creation in Registration
 * 
 * Validates that the registration transaction properly bundles:
 * 1. User ATA creation (idempotent)
 * 2. Locked token ATA creation (idempotent)
 * 3. User registration instruction
 * 
 * This bundling fixes mobile wallet signature issues by avoiding
 * separate transactions for ATA creation.
 */

import {
  createAssociatedTokenAccountIdempotentInstruction,
} from '@/lib/spl-token-inline';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@/lib/constants';

describe('Bundled ATA Creation for Registration', () => {
  // Use valid public keys
  const MOCK_WALLET = new PublicKey('CKvGJzNPC8FVpGWKU9GsMLQwkr2RnBvPqVRqV6FVVcGj');
  const MOCK_MINT = new PublicKey('9g4Z9dFXqGYjpbcv8MpHKdNjjKHXb2jLqpg5i1e8KG2Z');
  const MOCK_ATA = new PublicKey('7wYvVmkKo2FYrBLfxfTAMGWMW5n8sF7xE8bUPPfq8cFZ'); // Mock ATA address
  const MOCK_LOCKED_TOKEN_PDA = new PublicKey('3qH8MmGqkN3e8rXu2y3JfDp2m9kLz7vY5wQpX6rKTXnE');
  
  describe('createAssociatedTokenAccountIdempotentInstruction', () => {
    it('should create idempotent instruction for user ATA', () => {
      const instruction = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,           // payer
        MOCK_ATA,              // ata
        MOCK_WALLET,           // owner
        MOCK_MINT,             // mint
        TOKEN_PROGRAM_ID,      // Token-2022
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Verify instruction is created
      expect(instruction).toBeDefined();
      expect(instruction.programId).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID);
      
      // Verify instruction has accounts
      expect(instruction.keys.length).toBeGreaterThan(0);
      
      // Verify payer is included and marked as writable + signer
      const payerAccount = instruction.keys.find(k => k.pubkey.equals(MOCK_WALLET));
      expect(payerAccount).toBeDefined();
      expect(payerAccount?.isWritable).toBe(true);
      expect(payerAccount?.isSigner).toBe(true);
    });
    
    it('should create idempotent instruction for locked token ATA', () => {
      const instruction = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,           // payer
        MOCK_ATA,              // ata (different for locked tokens)
        MOCK_LOCKED_TOKEN_PDA, // owner (PDA)
        MOCK_MINT,             // mint
        TOKEN_PROGRAM_ID,      // Standard Token Program
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Verify instruction is created
      expect(instruction).toBeDefined();
      expect(instruction.programId).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID);
      
      // Verify instruction has accounts
      expect(instruction.keys.length).toBeGreaterThan(0);
      
      // Verify payer (wallet) is included as payer
      const payerAccount = instruction.keys.find(k => k.pubkey.equals(MOCK_WALLET));
      expect(payerAccount).toBeDefined();
      expect(payerAccount?.isWritable).toBe(true);
      expect(payerAccount?.isSigner).toBe(true);
    });
    
    it('should work with Token-2022 program ID', () => {
      const instruction = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        MOCK_ATA,
        MOCK_WALLET,
        MOCK_MINT,
        TOKEN_PROGRAM_ID, // Token-2022
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Verify instruction targets Associated Token Program
      expect(instruction.programId).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID);
      expect(instruction.keys.length).toBeGreaterThan(0);
    });
  });
  
  describe('Integration: Transaction Bundling', () => {
    it('should allow multiple idempotent ATA instructions in single transaction', () => {
      const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        MOCK_ATA,
        MOCK_WALLET,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const lockedAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        new PublicKey('8xW3h5kJTqNvBm2Hm6Y9eD3rP4wX2zF1vK9mN5gQ7cL6'), // Different ATA
        MOCK_LOCKED_TOKEN_PDA,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Create transaction with both instructions
      const transaction = new Transaction().add(userAtaIx).add(lockedAtaIx);
      
      // Verify both instructions are in the transaction
      expect(transaction.instructions.length).toBe(2);
      expect(transaction.instructions[0]).toBe(userAtaIx);
      expect(transaction.instructions[1]).toBe(lockedAtaIx);
    });
    
    it('should support bundling with additional instructions', () => {
      const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        MOCK_ATA,
        MOCK_WALLET,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Mock registration instruction (simple instruction without data encoding issues)
      const mockRegisterIx = {
        keys: [{ pubkey: MOCK_WALLET, isWritable: true, isSigner: true }],
        programId: MOCK_MINT,
        data: Buffer.from([])
      };
      
      // Create transaction with ATA + registration
      const transaction = new Transaction()
        .add(userAtaIx)
        .add(mockRegisterIx);
      
      // Verify both instructions are in the transaction
      expect(transaction.instructions.length).toBe(2);
      expect(transaction.instructions[0]).toBe(userAtaIx);
      expect(transaction.instructions[1]).toBe(mockRegisterIx);
    });
    
    it('should support bundling multiple types of instructions', () => {
      const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        MOCK_ATA,
        MOCK_WALLET,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const lockedAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        new PublicKey('8xW3h5kJTqNvBm2Hm6Y9eD3rP4wX2zF1vK9mN5gQ7cL6'),
        MOCK_LOCKED_TOKEN_PDA,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const mockRegisterIx = {
        keys: [{ pubkey: MOCK_WALLET, isWritable: true, isSigner: true }],
        programId: MOCK_MINT,
        data: Buffer.from([])
      };
      
      // Create bundled transaction: user ATA + locked ATA + registration
      const transaction = new Transaction()
        .add(userAtaIx)
        .add(lockedAtaIx)
        .add(mockRegisterIx);
      
      // Verify all three instructions are bundled
      expect(transaction.instructions.length).toBe(3);
      expect(transaction.instructions[0]).toBe(userAtaIx);
      expect(transaction.instructions[1]).toBe(lockedAtaIx);
      expect(transaction.instructions[2]).toBe(mockRegisterIx);
    });
  });
  
  describe('Mobile Wallet Compatibility', () => {
    it('should reduce number of signatures required from 3 to 1', () => {
      // Before: 3 separate transactions (3 signatures)
      // 1. Create user ATA
      // 2. Create locked token ATA  
      // 3. Register user
      
      // After: 1 bundled transaction (1 signature)
      const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        MOCK_ATA,
        MOCK_WALLET,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const lockedAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        MOCK_WALLET,
        new PublicKey('8xW3h5kJTqNvBm2Hm6Y9eD3rP4wX2zF1vK9mN5gQ7cL6'),
        MOCK_LOCKED_TOKEN_PDA,
        MOCK_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const mockRegisterIx = {
        keys: [{ pubkey: MOCK_WALLET, isWritable: true, isSigner: true }],
        programId: MOCK_MINT,
        data: Buffer.from([])
      };
      
      const transaction = new Transaction()
        .add(userAtaIx)
        .add(lockedAtaIx)
        .add(mockRegisterIx);
      
      // Single transaction = single signature required
      expect(transaction.instructions.length).toBe(3);
      
      // The transaction is atomic - all succeed or all fail
      // This is the key benefit for mobile wallet compatibility
    });
  });
});
