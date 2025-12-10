import { Connection, PublicKey, Keypair, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  GLOBAL_STATE_SEED,
  MINT_SEED,
  MINT_AUTHORITY_SEED,
  USER_ACCOUNT_SEED,
  USER_META_SEED,
} from "./constants";

// Debug flag for instruction building logs (only enabled in development)
const DEBUG_INSTRUCTIONS = process.env.NODE_ENV === 'development';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Memoized PDA Calculations
// PDAs are deterministic - cache them to avoid repeated computation
// ============================================================================

// Cache for PDA computations
const pdaCache = new Map<string, [PublicKey, number]>();

/**
 * Get cached PDA or compute and cache it
 * @param key - Cache key identifier
 * @param seeds - Seeds for PDA derivation
 * @returns Cached or newly computed [PublicKey, bump] tuple
 */
function getCachedPDA(key: string, seeds: Buffer[]): [PublicKey, number] {
  if (pdaCache.has(key)) {
    return pdaCache.get(key)!;
  }
  const pda = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  pdaCache.set(key, pda);
  return pda;
}

// PDA Helper Functions with memoization
export function getGlobalStatePDA(): [PublicKey, number] {
  return getCachedPDA('global_state', [Buffer.from(GLOBAL_STATE_SEED)]);
}

export function getMintPDA(): [PublicKey, number] {
  return getCachedPDA('mint', [Buffer.from(MINT_SEED)]);
}

export function getMintAuthorityPDA(): [PublicKey, number] {
  return getCachedPDA('mint_authority', [Buffer.from(MINT_AUTHORITY_SEED)]);
}

/**
 * Get user account PDA derived from authority (wallet public key)
 * @param authority - The wallet's public key
 * @returns PDA and bump seed
 */
export function getUserAccountPDA(authority: PublicKey): [PublicKey, number] {
  const cacheKey = `user_account:${authority.toBase58()}`;
  return getCachedPDA(cacheKey, [Buffer.from(USER_ACCOUNT_SEED), authority.toBuffer()]);
}

/**
 * Get user metadata PDA derived from authority (wallet public key)
 * @param authority - The wallet's public key
 * @returns PDA and bump seed
 */
export function getUserMetadataPDA(authority: PublicKey): [PublicKey, number] {
  const cacheKey = `user_metadata:${authority.toBase58()}`;
  return getCachedPDA(cacheKey, [Buffer.from(USER_META_SEED), authority.toBuffer()]);
}

// Create Anchor Program Instance
export async function createProgram(
  connection: Connection,
  wallet: any
): Promise<Program> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });

  try {
    const response = await fetch("/idl/equa_token.json");
    if (!response.ok) {
      throw new Error("Failed to load IDL: " + response.statusText);
    }

    let idlData = await response.json();

    // ✅ DON'T DELETE - Just log that we have the IDL
    console.log(
      "✅ IDL loaded, creating program with ID:",
      PROGRAM_ID.toBase58()
    );

    // Create program with 2-parameter constructor (IDL contains the program ID)
    return new Program(idlData, provider);
  } catch (error) {
    console.error("❌ Error creating program:", error);
    throw error;
  }
}

// Check if user is registered
export async function isUserRegistered(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    return accountInfo !== null && accountInfo.data.length > 0;
  } catch (error) {
    return false;
  }
}
// Get user's minted amount from user account
export async function getUserBalance(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo || accountInfo.data.length === 0) return 0;
    // UserAccount structure:
    // 8 bytes: discriminator
    // 32 bytes: authority (Pubkey)
    // 32 bytes: referral (Pubkey)
    // 32 bytes: token_account (Pubkey)
    // 8 bytes: minted_amount (u64) ← at offset 104
    // ... rest of fields

    // CORRECTED OFFSET for minted_amount
    const MINTED_AMOUNT_OFFSET = 104; // 8 + 32 + 32 + 32
    const balanceRaw = new BN(
      accountInfo.data.slice(MINTED_AMOUNT_OFFSET, MINTED_AMOUNT_OFFSET + 8),
      "le"
    );

    // Return raw balance in base units (smallest unit, called Gajbhiye)
    // Formatting should be handled by tokenFormat.ts utilities
    return balanceRaw.toNumber();
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
}
// Get SPL token balance directly from token account
export async function getSPLTokenBalance(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  try {
    const tokenAccountInfo = await connection.getAccountInfo(
      tokenAccountAddress
    );
    if (!tokenAccountInfo) return 0;
    // SPL Token account: amount is at bytes 64-72 (u64 little-endian)
    const amount = new BN(tokenAccountInfo.data.slice(64, 72), "le");

    // Return raw balance in base units (smallest unit, called Gajbhiye)
    // EQUA token uses 9 decimals (1,000,000,000 base units = 1 EQUA)
    // Formatting should be handled by tokenFormat.ts utilities
    return amount.toNumber();
  } catch (error) {
    console.error("Error getting SPL token balance:", error);
    return 0;
  }
}
// Get global state - NOT AVAILABLE due to incomplete IDL
// Use raw account data reading if needed
export async function getGlobalState(
  connection: Connection,
  globalStatePDA: PublicKey
): Promise<any | null> {
  try {
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    if (!accountInfo) return null;
    // Return basic info - full deserialization not available
    return {
      exists: true,
      dataLength: accountInfo.data.length,
      owner: accountInfo.owner.toBase58(),
    };
  } catch (error) {
    console.error("Error fetching global state:", error);
    return null;
  }
}
// Keypair storage helpers
const KEYPAIR_STORAGE_KEY = "equa_user_keypair";
export function loadKeypair(): Keypair | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(KEYPAIR_STORAGE_KEY);
    if (!stored) return null;
    const secretKey = Uint8Array.from(JSON.parse(stored));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error loading keypair:", error);
    return null;
  }
}
export function saveKeypair(keypair: Keypair): void {
  if (typeof window === "undefined") return;
  try {
    const secretKey = Array.from(keypair.secretKey);
    localStorage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(secretKey));
  } catch (error) {
    console.error("Error saving keypair:", error);
  }
}
export function getOrCreateKeypair(): Keypair {
  let keypair = loadKeypair();
  if (!keypair) {
    keypair = Keypair.generate();
    saveKeypair(keypair);
    console.log(
      "✅ Generated new user account keypair:",
      keypair.publicKey.toBase58()
    );
  } else {
    console.log(
      "✅ Loaded existing user account keypair:",
      keypair.publicKey.toBase58()
    );
  }
  return keypair;
}
// ✅ Create initialize_user instruction (UPDATED for consolidated backend)
// Note: locked_until field removed per EQUA Whitepaper 2025
export function createInitializeUserInstruction(
  userAccount: PublicKey,
  userMetadata: PublicKey,
  authority: PublicKey,
  globalState: PublicKey,
  referralAccount: PublicKey,
  referrerMetadata: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  associatedTokenProgram: PublicKey,
  tokenProgram: PublicKey,
  mintStart: number,
  referrer: PublicKey = PublicKey.default,
  userType: number = 0
): TransactionInstruction {
  const discriminator = Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]);
  
  const mintStartBN = new BN(mintStart);
  
  // Args order per IDL: referral (Pubkey 32 bytes) | mint_start (i64 8 bytes) | user_type (u8 1 byte)
  const data = Buffer.concat([
    discriminator,
    referrer.toBuffer(),
    mintStartBN.toArrayLike(Buffer, 'le', 8),
    Buffer.from([userType]), // u8 user_type
  ]);

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building initialize_user instruction:');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Referrer:', referrer.toBase58());
    console.log('  - Mint start:', mintStart);
    console.log('  - User type:', userType);
  }

  // Account order matches backend IDL exactly (11 accounts)
  // user_account, user_metadata, authority, global_state, referral_account, referrer_metadata,
  // user_token_account, mint, associated_token_program, token_program, system_program
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },        // 0. user_account
      { pubkey: userMetadata, isSigner: false, isWritable: true },       // 1. user_metadata
      { pubkey: authority, isSigner: true, isWritable: true },           // 2. authority
      { pubkey: globalState, isSigner: false, isWritable: true },        // 3. global_state
      { pubkey: referralAccount, isSigner: false, isWritable: true },    // 4. referral_account
      { pubkey: referrerMetadata, isSigner: false, isWritable: true },   // 5. referrer_metadata
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },   // 6. user_token_account
      { pubkey: mint, isSigner: false, isWritable: false },              // 7. mint
      { pubkey: associatedTokenProgram, isSigner: false, isWritable: false }, // 8. associated_token_program
      { pubkey: tokenProgram, isSigner: false, isWritable: false },      // 9. token_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 10. system_program
    ],
    programId: PROGRAM_ID,
    data,
  });

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas:');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

// ✅ Create mint_equa instruction (daily minting with cooldown)
// This is the correct instruction to use for daily EQUA minting
export function createMintEquaInstruction(
  userAccount: PublicKey,
  authority: PublicKey,
  amount: number
): TransactionInstruction {
  const discriminator = Buffer.from([151, 97, 251, 10, 45, 109, 190, 115]);
  const amountBN = new BN(amount);
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// ✅ Create mint_equa_tokens instruction (low-level token minting)
// This is used internally by mint_equa, not for direct daily minting
export function createMintEquaTokensInstruction(
  userAccount: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  authority: PublicKey,
  tokenProgram: PublicKey,
  amount: number
): TransactionInstruction {
  const discriminator = Buffer.from([166, 66, 221, 55, 153, 196, 139, 85]);
  const amountBN = new BN(amount);
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// ✅ Create mint_tokens instruction (7-account version for deployed program)
// This is the correct instruction for daily EQUA minting on the deployed program
export function createMintTokensInstruction(
  userAccount: PublicKey,
  userMetadata: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  authority: PublicKey,
  tokenProgram: PublicKey,
  amount: number
): TransactionInstruction {
  // Discriminator from backend IDL for mint_tokens instruction
  const discriminator = Buffer.from([59, 132, 24, 246, 122, 39, 8, 243]);
  const amountBN = new BN(amount);
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building mint_tokens instruction:');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Amount (raw base units):', amount);
    console.log('  - Amount BN:', amountBN.toString());
  }
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },      // 0. user_account
      { pubkey: userMetadata, isSigner: false, isWritable: true },     // 1. user_metadata
      { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // 2. user_token_account
      { pubkey: mint, isSigner: false, isWritable: true },             // 3. mint
      { pubkey: mintAuthority, isSigner: false, isWritable: false },   // 4. mint_authority
      { pubkey: authority, isSigner: true, isWritable: false },        // 5. authority
      { pubkey: tokenProgram, isSigner: false, isWritable: false },    // 6. token_program
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas:');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
