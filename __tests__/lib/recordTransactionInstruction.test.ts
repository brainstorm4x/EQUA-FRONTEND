/**
 * Tests for createRecordTransactionInstruction
 */

import { PublicKey } from '@solana/web3.js';
import { createRecordTransactionInstruction } from '@/lib/program';
import { PROGRAM_ID } from '@/lib/constants';

describe('createRecordTransactionInstruction', () => {
  const mockAuthority = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  // Use a mock global state PDA for tests (valid base58 public key - system program ID)
  const mockGlobalStatePDA = new PublicKey('11111111111111111111111111111111');
  
  it('should create instruction with correct discriminator', () => {
    const instruction = createRecordTransactionInstruction(mockGlobalStatePDA, mockAuthority);
    
    // Verify discriminator matches IDL: [134, 39, 187, 220, 192, 43, 119, 10]
    const expectedDiscriminator = Buffer.from([134, 39, 187, 220, 192, 43, 119, 10]);
    expect(instruction.data.slice(0, 8)).toEqual(expectedDiscriminator);
  });

  it('should have exactly 2 accounts in correct order', () => {
    const instruction = createRecordTransactionInstruction(mockGlobalStatePDA, mockAuthority);
    
    expect(instruction.keys).toHaveLength(2);
    
    // Account 0: global_state (writable, not signer)
    expect(instruction.keys[0].pubkey).toEqual(mockGlobalStatePDA);
    expect(instruction.keys[0].isWritable).toBe(true);
    expect(instruction.keys[0].isSigner).toBe(false);
    
    // Account 1: authority (signer, not writable)
    expect(instruction.keys[1].pubkey).toEqual(mockAuthority);
    expect(instruction.keys[1].isWritable).toBe(false);
    expect(instruction.keys[1].isSigner).toBe(true);
  });

  it('should use correct program ID', () => {
    const instruction = createRecordTransactionInstruction(mockGlobalStatePDA, mockAuthority);
    
    expect(instruction.programId).toEqual(PROGRAM_ID);
  });

  it('should have no arguments (only discriminator)', () => {
    const instruction = createRecordTransactionInstruction(mockGlobalStatePDA, mockAuthority);
    
    // Data should be exactly 8 bytes (just the discriminator, no args)
    expect(instruction.data.length).toBe(8);
  });

  it('should accept different authority public keys', () => {
    const authority1 = new PublicKey('11111111111111111111111111111111');
    const authority2 = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    const instruction1 = createRecordTransactionInstruction(mockGlobalStatePDA, authority1);
    const instruction2 = createRecordTransactionInstruction(mockGlobalStatePDA, authority2);
    
    expect(instruction1.keys[1].pubkey).toEqual(authority1);
    expect(instruction2.keys[1].pubkey).toEqual(authority2);
  });
});
