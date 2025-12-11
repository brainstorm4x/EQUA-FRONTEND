/**
 * Tests for initialize_user instruction builder
 * Verifies 11-account structure with user_metadata and referrer_metadata PDAs
 */

import { PublicKey } from '@solana/web3.js';
import { createInitializeUserInstruction } from '@/lib/program';
import { TOKEN_PROGRAM_ID } from '@/lib/constants';

describe('createInitializeUserInstruction', () => {
  // Mock public keys for testing (using well-known valid addresses)
  const userAccount = new PublicKey('So11111111111111111111111111111111111111112');
  const userMetadata = new PublicKey('2q5QTfWHRvjTDdgTf3yx2rLx8Zv1V7xYzX9bWdB5WBhL');
  const authority = new PublicKey('GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp');
  const globalState = new PublicKey('4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA');
  const referralAccount = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const referrerMetadata = new PublicKey('8kYXqVHNdq4dJ5MZnVKgT8fLqW3rXqF5JvG9wBxP3Qzh');
  const userTokenAccount = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const associatedTokenProgram = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const referrer = new PublicKey('3YMv4QM4dd2gsBJJgKwG3oVpkNE2DezaMADR2m4FMQpZ');

  const now = Math.floor(Date.now() / 1000);

  it('should have referral_account as writable per IDL requirement', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      referralAccount,
      referrerMetadata,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      referrer,
      0  // userType: individual
    );

    // According to IDL, referral_account is at index 4 and must be writable
    // This is CRITICAL - even for self-referral, it must be writable
    expect(instruction.keys[4].pubkey).toEqual(referralAccount);
    expect(instruction.keys[4].isWritable).toBe(true);
    expect(instruction.keys[4].isSigner).toBe(false);
  });

  it('should have correct discriminator for initialize_user', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      referralAccount,
      referrerMetadata,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      referrer,
      0  // userType: individual
    );

    // Verify discriminator bytes match IDL for initialize_user
    const expectedDiscriminator = Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should have all accounts in correct order per IDL', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      referralAccount,
      referrerMetadata,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      referrer,
      0  // userType: individual
    );

    expect(instruction.keys).toHaveLength(11);
    
    // 0. user_account - writable, not signer
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. user_metadata - writable, not signer
    expect(instruction.keys[1].pubkey).toEqual(userMetadata);
    expect(instruction.keys[1].isWritable).toBe(true);
    expect(instruction.keys[1].isSigner).toBe(false);
    
    // 2. authority - writable, signer
    expect(instruction.keys[2].pubkey).toEqual(authority);
    expect(instruction.keys[2].isWritable).toBe(true);
    expect(instruction.keys[2].isSigner).toBe(true);
    
    // 3. global_state - writable, not signer
    expect(instruction.keys[3].pubkey).toEqual(globalState);
    expect(instruction.keys[3].isWritable).toBe(true);
    expect(instruction.keys[3].isSigner).toBe(false);
    
    // 4. referral_account - writable, not signer (CRITICAL: must be writable)
    expect(instruction.keys[4].pubkey).toEqual(referralAccount);
    expect(instruction.keys[4].isWritable).toBe(true);
    expect(instruction.keys[4].isSigner).toBe(false);
    
    // 5. referrer_metadata - writable, not signer
    expect(instruction.keys[5].pubkey).toEqual(referrerMetadata);
    expect(instruction.keys[5].isWritable).toBe(true);
    expect(instruction.keys[5].isSigner).toBe(false);
    
    // 6. user_token_account - writable, not signer
    expect(instruction.keys[6].pubkey).toEqual(userTokenAccount);
    expect(instruction.keys[6].isWritable).toBe(true);
    expect(instruction.keys[6].isSigner).toBe(false);
    
    // 7. mint - not writable, not signer
    expect(instruction.keys[7].pubkey).toEqual(mint);
    expect(instruction.keys[7].isWritable).toBe(false);
    expect(instruction.keys[7].isSigner).toBe(false);
    
    // 8. associated_token_program - not writable, not signer
    expect(instruction.keys[8].pubkey).toEqual(associatedTokenProgram);
    expect(instruction.keys[8].isWritable).toBe(false);
    expect(instruction.keys[8].isSigner).toBe(false);
    
    // 9. token_program - not writable, not signer
    expect(instruction.keys[9].pubkey).toEqual(TOKEN_PROGRAM_ID);
    expect(instruction.keys[9].isWritable).toBe(false);
    expect(instruction.keys[9].isSigner).toBe(false);
    
    // 10. system_program - not writable, not signer
    // Note: We don't verify the exact pubkey since SystemProgram.programId is used
    expect(instruction.keys[10].isWritable).toBe(false);
    expect(instruction.keys[10].isSigner).toBe(false);
  });

  it('should work with self-referral (referral_account = user_account)', () => {
    // When user self-refers, referral_account points to their own user account
    // This is a common case and referral_account must still be writable
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      userAccount, // self-referral
      userMetadata, // self-referral metadata
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      PublicKey.default, // default referrer for self-referral
      0  // userType: individual
    );

    // Verify referral_account (index 4) is writable even for self-referral
    expect(instruction.keys[4].pubkey).toEqual(userAccount);
    expect(instruction.keys[4].isWritable).toBe(true);
    
    // Verify referrer_metadata (index 5) is writable even for self-referral
    expect(instruction.keys[5].pubkey).toEqual(userMetadata);
    expect(instruction.keys[5].isWritable).toBe(true);
  });

  it('should encode referral, mint_start, and user_type correctly', () => {
    const userType = 1; // business
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      referralAccount,
      referrerMetadata,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      referrer,
      userType
    );

    // Instruction data structure per IDL:
    // 8 bytes: discriminator
    // 32 bytes: referrer (Pubkey)
    // 8 bytes: mint_start (i64)
    // 1 byte: user_type (u8)
    
    expect(instruction.data.length).toBe(8 + 32 + 8 + 1);
    
    // Verify referrer pubkey
    const referrerBytes = instruction.data.slice(8, 40);
    expect(new PublicKey(referrerBytes)).toEqual(referrer);
    
    // Verify mint_start (i64 little-endian)
    const mintStartBytes = instruction.data.slice(40, 48);
    let decodedMintStart = 0;
    for (let i = 0; i < 8; i++) {
      decodedMintStart += mintStartBytes[i] * Math.pow(256, i);
    }
    expect(decodedMintStart).toBe(now);
    
    // Verify user_type (u8)
    const userTypeByte = instruction.data.slice(48, 49)[0];
    expect(userTypeByte).toBe(userType);
  });

  it('should default to individual user_type when not specified', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      userMetadata,
      authority,
      globalState,
      referralAccount,
      referrerMetadata,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      referrer
      // userType not specified, should default to 0
    );

    // Verify user_type defaults to 0 (individual)
    const userTypeByte = instruction.data.slice(48, 49)[0];
    expect(userTypeByte).toBe(0);
  });
});
