import { PublicKey } from '@solana/web3.js';

/**
 * Derives the Locked Token Account PDA for a given authority
 * Seeds: [b"locked-tokens", authority.key()]
 * 
 * @param authority - The user's wallet public key
 * @param programId - The EQUA token program ID
 * @returns [PDA address, bump seed]
 */
export function getLockedTokenAccountPda(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("locked-tokens"), authority.toBuffer()],
    programId
  );
}

/**
 * Derives the Locked Token PDA (used as ATA authority)
 * Seeds: [b"locked-tokens", authority.key()]
 * Same derivation as getLockedTokenAccountPda (they are the same PDA)
 * 
 * @param authority - The user's wallet public key
 * @param programId - The EQUA token program ID
 * @returns PDA address
 */
export function getLockedTokenPda(
  authority: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = getLockedTokenAccountPda(authority, programId);
  return pda;
}

/**
 * Gets the Associated Token Account (ATA) for locked tokens
 * Owner: locked_token_pda (not user wallet)
 * 
 * @param lockedTokenPda - The locked token PDA (from getLockedTokenPda)
 * @param mint - The EQUA mint address
 * @param tokenProgramId - Token-2022 program ID
 * @returns ATA address
 */
export function getLockedTokenAta(
  lockedTokenPda: PublicKey,
  mint: PublicKey,
  tokenProgramId: PublicKey
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      lockedTokenPda.toBuffer(),
      tokenProgramId.toBuffer(),
      mint.toBuffer(),
    ],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") // Associated Token Program
  );
  return ata;
}
