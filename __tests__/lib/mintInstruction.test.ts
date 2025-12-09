/**
 * Tests for mint instruction builder
 * Verifies correct discriminator and account metas
 */

import { PublicKey } from '@solana/web3.js';
import { createMintEquaInstruction } from '@/lib/program';
import { TOKEN_PROGRAM_ID } from '@/lib/constants';

describe('createMintEquaInstruction', () => {
  // Mock public keys for testing (valid base58-encoded addresses)
  const userAccount = new PublicKey('C3r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const userTokenAccount = new PublicKey('D4r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mint = new PublicKey('E5r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const mintAuthority = new PublicKey('F6r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');
  const authority = new PublicKey('G7r8mGG3KqZEqKt6jWE5nN2Y4sLGsZqN5j8qK2wY5Yzz');

  it('should create instruction with correct discriminator', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units (6 decimals)
    
    const instruction = createMintEquaInstruction(
      userAccount,
      userTokenAccount,
      mint,
      mintAuthority,
      authority,
      TOKEN_PROGRAM_ID,
      amount
    );

    // Verify discriminator bytes match IDL for mint_equa_tokens
    const expectedDiscriminator = Buffer.from([166, 66, 221, 55, 153, 196, 139, 85]);
    const actualDiscriminator = instruction.data.slice(0, 8);
    
    expect(actualDiscriminator).toEqual(expectedDiscriminator);
  });

  it('should encode amount correctly as u64 little-endian', () => {
    const amount = 10_000_000_000; // 10,000 EQUA in base units
    
    const instruction = createMintEquaInstruction(
      userAccount,
      userTokenAccount,
      mint,
      mintAuthority,
      authority,
      TOKEN_PROGRAM_ID,
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
      userTokenAccount,
      mint,
      mintAuthority,
      authority,
      TOKEN_PROGRAM_ID,
      amount
    );

    // Verify account order and flags match IDL for mint_equa_tokens
    expect(instruction.keys).toHaveLength(6);
    
    // 0. user_account - writable, not signer
    expect(instruction.keys[0].pubkey).toEqual(userAccount);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // 1. user_token_account - writable, not signer
    expect(instruction.keys[1].pubkey).toEqual(userTokenAccount);
    expect(instruction.keys[1].isWritable).toBe(true);
    expect(instruction.keys[1].isSigner).toBe(false);
    
    // 2. mint - writable, not signer
    expect(instruction.keys[2].pubkey).toEqual(mint);
    expect(instruction.keys[2].isWritable).toBe(true);
    expect(instruction.keys[2].isSigner).toBe(false);
    
    // 3. mint_authority - not writable, not signer (PDA)
    expect(instruction.keys[3].pubkey).toEqual(mintAuthority);
    expect(instruction.keys[3].isWritable).toBe(false);
    expect(instruction.keys[3].isSigner).toBe(false);
    
    // 4. authority - not writable, signer
    expect(instruction.keys[4].pubkey).toEqual(authority);
    expect(instruction.keys[4].isWritable).toBe(false);
    expect(instruction.keys[4].isSigner).toBe(true);
    
    // 5. token_program - not writable, not signer
    expect(instruction.keys[5].pubkey).toEqual(TOKEN_PROGRAM_ID);
    expect(instruction.keys[5].isWritable).toBe(false);
    expect(instruction.keys[5].isSigner).toBe(false);
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
        userTokenAccount,
        mint,
        mintAuthority,
        authority,
        TOKEN_PROGRAM_ID,
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
