/**
 * Tests for mint instruction builder
 * Verifies correct discriminator and account metas
 */

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { createMintEquaInstruction, createMintTokensInstruction, TOKEN_PROGRAM_ID, PROGRAM_ID } from '@/lib/program';
import { getLockedTokenAccountPda, getLockedTokenPda, getLockedTokenAta } from '@/utils/pda-helpers';

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
  const globalState = new PublicKey('E5r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const userTokenAccount = new PublicKey('F6r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mint = new PublicKey('G7r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mintAuthority = new PublicKey('H8r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const businessRegistry = new PublicKey('B9r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const authority = new PublicKey('A9r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const lockedTokenAccount = new PublicKey('4awfvNMTVwDq5czmfh5h6Ps9cam7Pa8UfuDircmoRPt9');
  const lockedTokenAta = new PublicKey('FKwqPEXfav7cvC5qe1jLQqQYWmAfpkrcegczYmnGWPTj');
  const lockedTokenPda = new PublicKey('CTa1SBopWCdhHmgDSKgm4PnVxsZEgfvTnmcaSGtrx6Jz');
  const associatedTokenProgram = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const systemProgram = new PublicKey('11111111111111111111111111111111');

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
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
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
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
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

  it('should have correct 15 account metas in order per backend IDL', () => {
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
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
      amount
    );

    // Verify account order and flags match backend IDL for mint_tokens (15 accounts)
    expect(instruction.keys).toHaveLength(15);
    
    // 0. user_account - writable, not signer
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. user_metadata - writable, not signer
    expect(instruction.keys[1].pubkey).toEqual(userMetadata);
    expect(instruction.keys[1].isWritable).toBe(true);
    expect(instruction.keys[1].isSigner).toBe(false);
    
    // 2. global_state - read-only, not signer
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
    
    // 6. referrer_account - writable (ALWAYS per IDL), not signer
    expect(instruction.keys[6].pubkey).toEqual(referrerAccount);
    expect(instruction.keys[6].isWritable).toBe(true); // ALWAYS writable per IDL
    expect(instruction.keys[6].isSigner).toBe(false);
    
    // 7. business_registry - not writable, not signer
    expect(instruction.keys[7].pubkey).toEqual(businessRegistry);
    expect(instruction.keys[7].isWritable).toBe(false);
    expect(instruction.keys[7].isSigner).toBe(false);
    
    // 8. authority - writable (for rent), signer
    expect(instruction.keys[8].pubkey).toEqual(authority);
    expect(instruction.keys[8].isWritable).toBe(true);
    expect(instruction.keys[8].isSigner).toBe(true);
    
    // 9. locked_token_account - writable, not signer
    expect(instruction.keys[9].pubkey).toEqual(lockedTokenAccount);
    expect(instruction.keys[9].isWritable).toBe(true);
    expect(instruction.keys[9].isSigner).toBe(false);
    
    // 10. locked_token_ata - writable, not signer
    expect(instruction.keys[10].pubkey).toEqual(lockedTokenAta);
    expect(instruction.keys[10].isWritable).toBe(true);
    expect(instruction.keys[10].isSigner).toBe(false);
    
    // 11. locked_token_pda - not writable, not signer
    expect(instruction.keys[11].pubkey).toEqual(lockedTokenPda);
    expect(instruction.keys[11].isWritable).toBe(false);
    expect(instruction.keys[11].isSigner).toBe(false);
    
    // 12. token_program - not writable, not signer
    expect(instruction.keys[12].pubkey).toEqual(TOKEN_PROGRAM_ID);
    expect(instruction.keys[12].isWritable).toBe(false);
    expect(instruction.keys[12].isSigner).toBe(false);
    
    // 13. associated_token_program - not writable, not signer
    expect(instruction.keys[13].pubkey).toEqual(associatedTokenProgram);
    expect(instruction.keys[13].isWritable).toBe(false);
    expect(instruction.keys[13].isSigner).toBe(false);
    
    // 14. system_program - not writable, not signer
    expect(instruction.keys[14].pubkey).toEqual(systemProgram);
    expect(instruction.keys[14].isWritable).toBe(false);
    expect(instruction.keys[14].isSigner).toBe(false);
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
        businessRegistry,
        authority,
        lockedTokenAccount,
        lockedTokenAta,
        lockedTokenPda,
        TOKEN_PROGRAM_ID,
        associatedTokenProgram,
        systemProgram,
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

  it('should handle large amounts passed as strings', () => {
    const largeAmount = '100000000000'; // 100,000 EQUA with 6 decimals (user #1 tier)
    const referrerAccount = PublicKey.default;
    
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
      largeAmount
    );
    
    // Verify instruction data length: 8 (discriminator) + 8 (amount u64)
    expect(instruction.data.length).toBe(16);
    
    // Decode and verify amount using BN
    const amountBytes = instruction.data.slice(8, 16);
    const decodedBN = new BN(amountBytes, 'le');
    expect(decodedBN.toString()).toBe(largeAmount);
  });

  it('should handle extremely large amounts that exceed MAX_SAFE_INTEGER', () => {
    // Test with a value larger than Number.MAX_SAFE_INTEGER
    const veryLargeAmount = '10000000000000000'; // Way beyond MAX_SAFE_INTEGER
    const referrerAccount = PublicKey.default;
    
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
      veryLargeAmount
    );
    
    // Verify instruction data length: 8 (discriminator) + 8 (amount u64)
    expect(instruction.data.length).toBe(16);
    
    // Decode and verify amount using BN
    const amountBytes = instruction.data.slice(8, 16);
    const decodedBN = new BN(amountBytes, 'le');
    expect(decodedBN.toString()).toBe(veryLargeAmount);
  });

  it('should convert numbers exceeding MAX_SAFE_INTEGER to strings automatically', () => {
    // Create a number that exceeds MAX_SAFE_INTEGER
    // Note: In practice, this would come from mathematical operations
    const exceedingNumber = Number.MAX_SAFE_INTEGER + 1000;
    const referrerAccount = PublicKey.default;
    
    // This should work because the function converts to string internally
    const instruction = createMintTokensInstruction(
      userAccount,
      userMetadata,
      globalState,
      userTokenAccount,
      mint,
      mintAuthority,
      referrerAccount,
      businessRegistry,
      authority,
      lockedTokenAccount,
      lockedTokenAta,
      lockedTokenPda,
      TOKEN_PROGRAM_ID,
      associatedTokenProgram,
      systemProgram,
      exceedingNumber
    );
    
    // Verify instruction was created successfully
    expect(instruction.data.length).toBe(16);
  });
});
