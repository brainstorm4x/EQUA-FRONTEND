/**
 * Tests for mint instruction builder
 * Verifies correct discriminator and account metas
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { 
  createMintEquaInstruction, 
  createMintTokensInstruction, 
  getGlobalStatePDA,
  getLockedTokenAccountPDA,
  getLockedTokenPdaPDA,
  getMintPDA,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@/lib/program';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

describe('createMintEquaInstruction', () => {
  // Mock public keys for testing (valid base58-encoded addresses)
  const userAccount = new PublicKey('C3r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const authority = new PublicKey('G7r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');

  it('should create instruction with correct discriminator', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units (6 decimals)
    
    const instruction = createMintEquaInstruction(
      userAccount,
      authority,
      amount
    );

    // Verify discriminator bytes match IDL for mint_equa
    const expectedDiscriminator = Buffer.from([151, 97, 251, 10, 45, 109, 190, 115]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should encode amount correctly as u64 little-endian', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units
    
    const instruction = createMintEquaInstruction(
      userAccount,
      authority,
      amount
    );

    // Skip discriminator (8 bytes) and read amount (8 bytes)
    const amountBytes = instruction.data.slice(8, 16);
    
    // Convert to number from little-endian
    const buffer = Buffer.from(amountBytes);
    let decodedAmount = 0;
    for (let i = 0; i < 8; i++) {
      decodedAmount += buffer[i] * Math.pow(256, i);
    }
    
    expect(decodedAmount).toBe(amount);
  });

  it('should have correct account metas in order per IDL', () => {
    const amount = 1_000_000; // 1 EQUA
    
    const instruction = createMintEquaInstruction(
      userAccount,
      authority,
      amount
    );

    // Verify account order and flags match IDL for mint_equa
    expect(instruction.keys).toHaveLength(2);
    
    // 0. user_account - writable, not signer
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. authority - not writable, signer
    expect(instruction.keys[1].pubkey).toEqual(authority);
    expect(instruction.keys[1].isWritable).toBe(false);
    expect(instruction.keys[1].isSigner).toBe(true);
  });

  it('should handle different amount values correctly', () => {
    const testCases = [
      100_000_000, // 100 EQUA (standard user)
      1_000_000_000, // 1,000 EQUA (community builder)
      10_000_000_000, // 10,000 EQUA (pioneer)
      100_000_000_000, // 100,000 EQUA (early adopter)
    ];

    testCases.forEach(amount => {
      const instruction = createMintEquaInstruction(
        userAccount,
        authority,
        amount
      );

      // Verify instruction data length: 8 (discriminator) + 8 (amount u64)
      expect(instruction.data.length).toBe(16);
      
      // Verify amount encoding
      const amountBytes = instruction.data.slice(8, 16);
      const buffer = Buffer.from(amountBytes);
      let decodedAmount = 0;
      for (let i = 0; i < 8; i++) {
        decodedAmount += buffer[i] * Math.pow(256, i);
      }
      expect(decodedAmount).toBe(amount);
    });
  });
});

describe('createMintTokensInstruction', () => {
  // Mock public keys for testing (valid base58-encoded addresses)
  const userAccount = new PublicKey('C3r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const userMetadata = new PublicKey('D4r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const userTokenAccount = new PublicKey('E5r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mint = new PublicKey('F6r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mintAuthority = new PublicKey('H8r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const authority = new PublicKey('G7r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const globalState = new PublicKey('74d8PhX9E93LRzY89YCqRM66M5WxX9HeUZdqCjRiCw1n');
  const lockedTokenAccount = new PublicKey('6R6aov3StAXH5kfZPNwZUd9oB4Aerf5CmxpkLk4NGeTw');
  const lockedTokenAta = new PublicKey('6m5sf1oGCk6Q925rBauTaq68febwPSKVNGbzfvrAKW1C');
  const lockedTokenPda = new PublicKey('Cms7F92swyrAEwZLuRPzPpiRhifsMFJKUaz5cst2NjDz');

  it('should create instruction with correct discriminator for mint_tokens', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units (6 decimals)
    const referrerAccount = PublicKey.default; // No referrer
    
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      amount
    );

    // Verify discriminator bytes match backend IDL for mint_tokens
    const expectedDiscriminator = Buffer.from([59, 132, 24, 246, 122, 39, 8, 243]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should encode amount correctly as u64 little-endian', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units
    const referrerAccount = PublicKey.default; // No referrer
    
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      amount
    );

    // Skip discriminator (8 bytes) and read amount (8 bytes)
    const amountBytes = instruction.data.slice(8, 16);
    
    // Convert to number from little-endian
    const buffer = Buffer.from(amountBytes);
    let decodedAmount = 0;
    for (let i = 0; i < 8; i++) {
      decodedAmount += buffer[i] * Math.pow(256, i);
    }
    
    expect(decodedAmount).toBe(amount);
  });

  it('should have correct 13 account metas in order per backend IDL', () => {
    const amount = 1_000_000; // 1 EQUA
    const referrerAccount = PublicKey.default; // No referrer
    
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      amount
    );

    // Verify account order and flags match backend IDL for mint_tokens (13 accounts)
    expect(instruction.keys).toHaveLength(14); // 14 accounts (0-13)
    
    // 0. user_account - writable, not signer
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. user_metadata - writable, not signer
    expect(instruction.keys[1].pubkey).toEqual(userMetadata);
    expect(instruction.keys[1].isWritable).toBe(true);
    expect(instruction.keys[1].isSigner).toBe(false);
    
    // 2. global_state - not writable, not signer (NEW)
    expect(instruction.keys[2].pubkey).toEqual(globalState);
    expect(instruction.keys[2].isWritable).toBe(false);
    expect(instruction.keys[2].isSigner).toBe(false);
    
    // 3. user_token_account - writable, not signer
    expect(instruction.keys[3].pubkey).toEqual(userTokenAccount);
    expect(instruction.keys[3].isWritable).toBe(true);
    expect(instruction.keys[3].isSigner).toBe(false);
    
    // 4. mint - writable, not signer
    expect(instruction.keys[4].pubkey).toEqual(mint);
    expect(instruction.keys[4].isWritable).toBe(true);
    expect(instruction.keys[4].isSigner).toBe(false);
    
    // 5. mint_authority - not writable, not signer
    expect(instruction.keys[5].pubkey).toEqual(mintAuthority);
    expect(instruction.keys[5].isWritable).toBe(false);
    expect(instruction.keys[5].isSigner).toBe(false);
    
    // 6. referrer_account - writable (ALWAYS writable per IDL), not signer
    expect(instruction.keys[6].pubkey).toEqual(referrerAccount);
    expect(instruction.keys[6].isWritable).toBe(true); // Changed: ALWAYS writable per backend IDL
    expect(instruction.keys[6].isSigner).toBe(false);
    
    // 7. authority - writable (payer for init_if_needed), signer
    expect(instruction.keys[7].pubkey).toEqual(authority);
    expect(instruction.keys[7].isWritable).toBe(true); // Changed: writable as payer
    expect(instruction.keys[7].isSigner).toBe(true);
    
    // 8. locked_token_account - writable, not signer (NEW)
    expect(instruction.keys[8].pubkey).toEqual(lockedTokenAccount);
    expect(instruction.keys[8].isWritable).toBe(true);
    expect(instruction.keys[8].isSigner).toBe(false);
    
    // 9. locked_token_ata - writable, not signer (NEW)
    expect(instruction.keys[9].pubkey).toEqual(lockedTokenAta);
    expect(instruction.keys[9].isWritable).toBe(true);
    expect(instruction.keys[9].isSigner).toBe(false);
    
    // 10. locked_token_pda - not writable, not signer (NEW)
    expect(instruction.keys[10].pubkey).toEqual(lockedTokenPda);
    expect(instruction.keys[10].isWritable).toBe(false);
    expect(instruction.keys[10].isSigner).toBe(false);
    
    // 11. token_program - not writable, not signer
    expect(instruction.keys[11].pubkey).toEqual(TOKEN_PROGRAM_ID);
    expect(instruction.keys[11].isWritable).toBe(false);
    expect(instruction.keys[11].isSigner).toBe(false);
    
    // 12. associated_token_program - not writable, not signer (NEW)
    expect(instruction.keys[12].pubkey).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID);
    expect(instruction.keys[12].isWritable).toBe(false);
    expect(instruction.keys[12].isSigner).toBe(false);
    
    // 13. system_program - not writable, not signer (NEW)
    expect(instruction.keys[13].pubkey).toEqual(SystemProgram.programId);
    expect(instruction.keys[13].isWritable).toBe(false);
    expect(instruction.keys[13].isSigner).toBe(false);
  });

  it('should handle different amount values correctly', () => {
    const testCases = [
      100_000_000, // 100 EQUA (standard user)
      1_000_000_000, // 1,000 EQUA (community builder)
      10_000_000_000, // 10,000 EQUA (pioneer)
      100_000_000_000, // 100,000 EQUA (early adopter)
    ];
    const referrerAccount = PublicKey.default; // No referrer

    testCases.forEach(amount => {
      const instruction = createMintTokensInstruction(
        userAccount,
        userMetadata,
        globalState,
        userTokenAccount,
        mint,
        mintAuthority,
        referrerAccount,
        authority,
        lockedTokenAccount,
        lockedTokenAta,
        lockedTokenPda,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        SystemProgram.programId,
        amount
      );

      // Verify instruction data length: 8 (discriminator) + 8 (amount u64)
      expect(instruction.data.length).toBe(16);
      
      // Verify amount encoding
      const amountBytes = instruction.data.slice(8, 16);
      const buffer = Buffer.from(amountBytes);
      let decodedAmount = 0;
      for (let i = 0; i < 8; i++) {
        decodedAmount += buffer[i] * Math.pow(256, i);
      }
      expect(decodedAmount).toBe(amount);
    });
  });
});
