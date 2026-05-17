/**
 * Inlined subset of @solana/spl-token.
 *
 * Replaces the full package dependency to remove the @solana/buffer-layout-utils
 * → bigint-buffer transitive chain (GHSA-3gc7-fjrx-p6mg). Only the encoder /
 * pubkey-derivation surface this codebase actually uses is reproduced here;
 * none of these helpers touch bigint-buffer.
 *
 * If a future caller needs to *decode* a token account or mint, prefer
 * connection.getParsedAccountInfo() or a hand-rolled buffer parse rather than
 * re-introducing the spl-token decoder API.
 */

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export class TokenOwnerOffCurveError extends Error {
  name = 'TokenOwnerOffCurveError';
}

export function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId: PublicKey = TOKEN_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID,
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new TokenOwnerOffCurveError();
  }
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId,
  );
  return address;
}

export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId: PublicKey = TOKEN_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<PublicKey> {
  return getAssociatedTokenAddressSync(
    mint,
    owner,
    allowOwnerOffCurve,
    programId,
    associatedTokenProgramId,
  );
}

function buildAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  instructionData: Buffer,
  programId: PublicKey,
  tokenProgramId: PublicKey,
): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({ keys, programId, data: instructionData });
}

export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID,
): TransactionInstruction {
  return buildAssociatedTokenAccountInstruction(
    payer,
    associatedToken,
    owner,
    mint,
    Buffer.alloc(0),
    associatedTokenProgramId,
    programId,
  );
}

export function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID,
): TransactionInstruction {
  return buildAssociatedTokenAccountInstruction(
    payer,
    associatedToken,
    owner,
    mint,
    Buffer.from([1]),
    associatedTokenProgramId,
    programId,
  );
}
