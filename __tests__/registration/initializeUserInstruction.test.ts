/**
 * Tests for initialize_user instruction builder
 * Verifies referral_account is always writable per IDL
 */

import { PublicKey } from '@solana/web3.js';
import { createInitializeUserInstruction } from '@/lib/program';
import { TOKEN_PROGRAM_ID } from '@/lib/constants';

describe('createInitializeUserInstruction', () => {
  // Mock public keys for testing (using well-known valid addresses)
  const userAccount = new PublicKey('So11111111111111111111111111111111111111112');
  const authority = new PublicKey('GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp');
  const globalState = new PublicKey('4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA');
  const referralAccount = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const userTokenAccount = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const associatedTokenProgram = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const referrer = new PublicKey('3YMv4QM4dd2gsBJJgKwG3oVpkNE2DezaMADR2m4FMQpZ');

  const now = Math.floor(Date.now() / 1000);
  const lockedUntil = now + 86400; // 24 hours from now

  it('should have referral_account as writable per IDL requirement', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      authority,
      globalState,
      referralAccount,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      lockedUntil,
      referrer
    );

    // According to IDL, referral_account is at index 3 and must be writable
    // This is CRITICAL - even for self-referral, it must be writable
    expect(instruction.keys[3].pubkey).toEqual(referralAccount);
    expect(instruction.keys[3].isWritable).toBe(true);
    expect(instruction.keys[3].isSigner).toBe(false);
  });

  it('should have correct discriminator for initialize_user', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      authority,
      globalState,
      referralAccount,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      lockedUntil,
      referrer
    );

    // Verify discriminator bytes match IDL for initialize_user
    const expectedDiscriminator = Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should have all accounts in correct order per IDL', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      authority,
      globalState,
      referralAccount,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      lockedUntil,
      referrer
    );

    expect(instruction.keys).toHaveLength(9);
    
    // 0. user_account - writable, not signer (PDA)
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. authority - writable, signer
    expect(instruction.keys[1].pubkey).toEqual(authority);
    expect(instruction.keys[1].isWritable).toBe(true);
    expect(instruction.keys[1].isSigner).toBe(true);
    
    // 2. global_state - writable, not signer
    expect(instruction.keys[2].pubkey).toEqual(globalState);
    expect(instruction.keys[2].isWritable).toBe(true);
    expect(instruction.keys[2].isSigner).toBe(false);
    
    // 3. referral_account - writable, not signer (CRITICAL: must be writable)
    expect(instruction.keys[3].pubkey).toEqual(referralAccount);
    expect(instruction.keys[3].isWritable).toBe(true);
    expect(instruction.keys[3].isSigner).toBe(false);
    
    // 4. user_token_account - writable, not signer
    expect(instruction.keys[4].pubkey).toEqual(userTokenAccount);
    expect(instruction.keys[4].isWritable).toBe(true);
    expect(instruction.keys[4].isSigner).toBe(false);
    
    // 5. mint - not writable, not signer
    expect(instruction.keys[5].pubkey).toEqual(mint);
    expect(instruction.keys[5].isWritable).toBe(false);
    expect(instruction.keys[5].isSigner).toBe(false);
    
    // 6. associated_token_program - not writable, not signer
    expect(instruction.keys[6].pubkey).toEqual(associatedTokenProgram);
    expect(instruction.keys[6].isWritable).toBe(false);
    expect(instruction.keys[6].isSigner).toBe(false);
    
    // 7. token_program - not writable, not signer
    expect(instruction.keys[7].pubkey).toEqual(TOKEN_PROGRAM_ID);
    expect(instruction.keys[7].isWritable).toBe(false);
    expect(instruction.keys[7].isSigner).toBe(false);
    
    // 8. system_program - not writable, not signer
    // Note: We don't verify the exact pubkey since SystemProgram.programId is used
    expect(instruction.keys[8].isWritable).toBe(false);
    expect(instruction.keys[8].isSigner).toBe(false);
  });

  it('should work with self-referral (referral_account = user_account)', () => {
    // When user self-refers, referral_account points to their own user account
    // This is a common case and referral_account must still be writable
    const instruction = createInitializeUserInstruction(
      userAccount,
      authority,
      globalState,
      userAccount, // self-referral
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      lockedUntil,
      PublicKey.default // default referrer for self-referral
    );

    // Verify referral_account (index 3) is writable even for self-referral
    expect(instruction.keys[3].pubkey).toEqual(userAccount);
    expect(instruction.keys[3].isWritable).toBe(true);
  });

  it('should encode referral, mint_start, and locked_until correctly', () => {
    const instruction = createInitializeUserInstruction(
      userAccount,
      authority,
      globalState,
      referralAccount,
      userTokenAccount,
      mint,
      associatedTokenProgram,
      TOKEN_PROGRAM_ID,
      now,
      lockedUntil,
      referrer
    );

    // Instruction data structure:
    // 8 bytes: discriminator
    // 32 bytes: referrer (Pubkey)
    // 8 bytes: mint_start (i64)
    // 8 bytes: locked_until (i64)
    
    expect(instruction.data.length).toBe(8 + 32 + 8 + 8);
    
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
    
    // Verify locked_until (i64 little-endian)
    const lockedUntilBytes = instruction.data.slice(48, 56);
    let decodedLockedUntil = 0;
    for (let i = 0; i < 8; i++) {
      decodedLockedUntil += lockedUntilBytes[i] * Math.pow(256, i);
    }
    expect(decodedLockedUntil).toBe(lockedUntil);
  });
});
