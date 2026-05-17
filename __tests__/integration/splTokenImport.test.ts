/**
 * Integration test for the inlined spl-token module (@/lib/spl-token-inline).
 *
 * After dropping @solana/spl-token entirely (Option 3 from the security
 * review), the encoder / pubkey-derivation surface is reimplemented locally.
 * This test pins the shape of that surface so it stays compatible with the
 * historical @solana/spl-token v0.4 API the codebase was written against.
 */

import { PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@/lib/spl-token-inline';

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
