/**
 * Integration test to verify @solana/spl-token imports work correctly
 * 
 * This test ensures that getAssociatedTokenAddressSync and other SPL token
 * functions are properly imported and available for use after adding
 * transpilePackages configuration to next.config.js.
 * 
 * Related issue: "getAssociatedTokenAddressSync is not a function" error
 * Fix: Added @solana/spl-token to transpilePackages in next.config.js
 */

import { PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

describe('SPL Token Imports', () => {
  it('should successfully import getAssociatedTokenAddressSync', () => {
    expect(getAssociatedTokenAddressSync).toBeDefined();
    expect(typeof getAssociatedTokenAddressSync).toBe('function');
  });

  it('should successfully import TOKEN_PROGRAM_ID', () => {
    expect(TOKEN_PROGRAM_ID).toBeDefined();
    expect(TOKEN_PROGRAM_ID).toBeInstanceOf(PublicKey);
  });

  it('should successfully import ASSOCIATED_TOKEN_PROGRAM_ID', () => {
    expect(ASSOCIATED_TOKEN_PROGRAM_ID).toBeDefined();
    expect(ASSOCIATED_TOKEN_PROGRAM_ID).toBeInstanceOf(PublicKey);
  });

  it('should have correct function signature for getAssociatedTokenAddressSync', () => {
    // Verify the function has the expected signature by checking its length
    // The function takes 2 required parameters (mint, owner) and 3 optional parameters
    // Function.length only counts required parameters (those without defaults)
    expect(getAssociatedTokenAddressSync.length).toBe(2);
  });

  it('should export TOKEN_PROGRAM_ID with correct address', () => {
    // Standard SPL Token program ID
    expect(TOKEN_PROGRAM_ID.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  });

  it('should export ASSOCIATED_TOKEN_PROGRAM_ID with correct address', () => {
    // Associated Token program ID
    expect(ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()).toBe('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  });
});
