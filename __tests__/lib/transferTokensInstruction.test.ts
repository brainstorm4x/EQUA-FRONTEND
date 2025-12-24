/**
 * Tests for createTransferTokensInstruction - Anchor IDL-driven transfer
 * 
 * These tests verify that the transfer_tokens instruction builder:
 * 1. Generates correct discriminator from IDL
 * 2. Validates Token-2022 requirement
 * 3. Assembles accounts in correct order
 * 4. Handles amount encoding properly
 */

import { PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js';
import { 
  createTransferTokensInstruction, 
  TOKEN_PROGRAM_ID
} from '@/lib/program';
import {
  PROGRAM_ID,
  TOKEN_2022_PROGRAM_ADDRESS,
  STANDARD_TOKEN_PROGRAM_ADDRESS
} from '@/lib/constants';

describe('createTransferTokensInstruction', () => {
  // Mock account addresses (valid Solana public keys generated from keypairs)
  const senderUserAccount = Keypair.generate().publicKey;
  const senderTokenAccount = Keypair.generate().publicKey;
  const recipientUserAccount = Keypair.generate().publicKey;
  const recipientTokenAccount = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const mintAuthority = Keypair.generate().publicKey;
  const globalState = Keypair.generate().publicKey;
  const senderAuthority = Keypair.generate().publicKey;
  
  it('should create instruction with correct discriminator', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      1000000 // 1 EQUA in base units
    );

    expect(instruction).toBeInstanceOf(TransactionInstruction);
    
    // Verify discriminator (first 8 bytes) matches IDL
    const expectedDiscriminator = Buffer.from([54, 180, 238, 175, 74, 85, 126, 188]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should encode amount correctly as u64 little-endian', () => {
    const amount = 1000000; // 1 EQUA
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      amount
    );

    // Amount is encoded after discriminator (8 bytes) as u64 LE (8 bytes)
    const amountBytes = instruction.data.slice(8, 16);
    
    // 1000000 as u64 LE: [64, 66, 15, 0, 0, 0, 0, 0]
    const expectedBytes = Buffer.alloc(8);
    expectedBytes.writeUInt32LE(amount, 0);
    expect(amountBytes).toEqual(expectedBytes);
  });

  it('should have 9 accounts in correct order', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      1000000
    );

    expect(instruction.keys).toHaveLength(9);
    
    // Verify account order matches IDL (9 accounts - includes global_state)
    expect(instruction.keys[0].pubkey).toEqual(senderUserAccount);
    expect(instruction.keys[1].pubkey).toEqual(senderTokenAccount);
    expect(instruction.keys[2].pubkey).toEqual(recipientUserAccount);
    expect(instruction.keys[3].pubkey).toEqual(recipientTokenAccount);
    expect(instruction.keys[4].pubkey).toEqual(mint);
    expect(instruction.keys[5].pubkey).toEqual(mintAuthority);
    expect(instruction.keys[6].pubkey).toEqual(globalState);
    expect(instruction.keys[7].pubkey).toEqual(senderAuthority);
    expect(instruction.keys[8].pubkey).toEqual(TOKEN_PROGRAM_ID);
  });

  it('should mark correct accounts as writable', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      1000000
    );

    // Writable: sender_user_account, sender_token_account, recipient_user_account, recipient_token_account, mint, global_state
    // Read-only: mint_authority, sender_authority, token_program
    expect(instruction.keys[0].isWritable).toBe(true);  // sender_user_account
    expect(instruction.keys[1].isWritable).toBe(true);  // sender_token_account
    expect(instruction.keys[2].isWritable).toBe(true);  // recipient_user_account
    expect(instruction.keys[3].isWritable).toBe(true);  // recipient_token_account
    expect(instruction.keys[4].isWritable).toBe(true);  // mint
    expect(instruction.keys[5].isWritable).toBe(false); // mint_authority
    expect(instruction.keys[6].isWritable).toBe(true);  // global_state
    expect(instruction.keys[7].isWritable).toBe(false); // sender_authority
    expect(instruction.keys[8].isWritable).toBe(false); // token_program
  });

  it('should mark sender_authority as signer', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      1000000
    );

    // Only sender_authority should be signer (index 7)
    expect(instruction.keys[0].isSigner).toBe(false);
    expect(instruction.keys[1].isSigner).toBe(false);
    expect(instruction.keys[2].isSigner).toBe(false);
    expect(instruction.keys[3].isSigner).toBe(false);
    expect(instruction.keys[4].isSigner).toBe(false);
    expect(instruction.keys[5].isSigner).toBe(false);
    expect(instruction.keys[6].isSigner).toBe(false);
    expect(instruction.keys[7].isSigner).toBe(true);  // sender_authority
    expect(instruction.keys[8].isSigner).toBe(false);
  });

  it('should use correct program ID', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      1000000
    );

    expect(instruction.programId).toEqual(PROGRAM_ID);
  });

  it('should throw error if token program is not Token-2022', () => {
    const standardSplToken = new PublicKey(STANDARD_TOKEN_PROGRAM_ADDRESS);
    
    expect(() => {
      createTransferTokensInstruction(
        senderUserAccount,
        senderTokenAccount,
        recipientUserAccount,
        recipientTokenAccount,
        mint,
        mintAuthority,
        globalState,
        senderAuthority,
        standardSplToken, // Wrong token program!
        1000000
      );
    }).toThrow('transfer_tokens requires Token-2022 program');
  });

  it('should throw error if sender_authority is default pubkey', () => {
    expect(() => {
      createTransferTokensInstruction(
        senderUserAccount,
        senderTokenAccount,
        recipientUserAccount,
        recipientTokenAccount,
        mint,
        mintAuthority,
        globalState,
        PublicKey.default, // Invalid authority
        TOKEN_PROGRAM_ID,
        1000000
      );
    }).toThrow('transfer_tokens requires sender_authority');
  });

  it('should handle bigint amounts correctly', () => {
    const bigAmount = 1000000000000n; // 1 million EQUA (1000000000000 base units with 6 decimals) as bigint
    
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      bigAmount
    );

    expect(instruction).toBeInstanceOf(TransactionInstruction);
    expect(instruction.data.length).toBe(16); // 8 bytes discriminator + 8 bytes amount
  });

  it('should handle zero amount (edge case)', () => {
    const instruction = createTransferTokensInstruction(
      senderUserAccount,
      senderTokenAccount,
      recipientUserAccount,
      recipientTokenAccount,
      mint,
      mintAuthority,
      globalState,
      senderAuthority,
      TOKEN_PROGRAM_ID,
      0
    );

    // Should create instruction (validation happens on-chain)
    expect(instruction).toBeInstanceOf(TransactionInstruction);
    
    const amountBytes = instruction.data.slice(8, 16);
    const expectedZero = Buffer.alloc(8);
    expect(amountBytes).toEqual(expectedZero);
  });

  it('should validate Token-2022 program ID matches expected address', () => {
    expect(TOKEN_PROGRAM_ID.toBase58()).toBe(TOKEN_2022_PROGRAM_ADDRESS);
  });
});
