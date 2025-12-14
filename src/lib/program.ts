import { Connection, PublicKey, Keypair, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  GLOBAL_STATE_SEED,
  MINT_SEED,
  MINT_AUTHORITY_SEED,
  USER_ACCOUNT_SEED,
  USER_META_SEED,
} from "./constants";

// Debug flag for instruction building logs
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

// ============================================================================
// PERFORMANCE OPTIMIZATION: Cached Program Instance
// Avoid re-fetching IDL on every call
// ============================================================================

let cachedProgram: Program | null = null;
let cachedIdl: any = null;

// Create Anchor Program Instance with caching
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
    // Use cached IDL if available
    if (!cachedIdl) {
      const response = await fetch("/idl/equa_token.json");
      if (!response.ok) {
        throw new Error("Failed to load IDL: " + response.statusText);
      }
      cachedIdl = await response.json();
      
      // Runtime validation: Ensure configured PROGRAM_ID matches the IDL
      const idlProgramId = cachedIdl.address || cachedIdl.metadata?.address;
      if (idlProgramId) {
        const idlPubkey = new PublicKey(idlProgramId);
        if (!PROGRAM_ID.equals(idlPubkey)) {
          const errorMsg = `❌ CRITICAL: Program ID mismatch!\n` +
            `  Environment/Config PROGRAM_ID: ${PROGRAM_ID.toBase58()}\n` +
            `  IDL Program ID: ${idlPubkey.toBase58()}\n` +
            `  This will cause instruction deserialization failures (0x66).\n` +
            `  Fix: Set NEXT_PUBLIC_PROGRAM_ID=${idlPubkey.toBase58()} in .env.local`;
          console.error(errorMsg);
          throw new Error(`Program ID mismatch: expected ${idlPubkey.toBase58()}, got ${PROGRAM_ID.toBase58()}`);
        }
      }
      
      console.log(
        "✅ IDL loaded, creating program with ID:",
        PROGRAM_ID.toBase58()
      );
    }

    // Create program with 2-parameter constructor (IDL contains the program ID)
    return new Program(cachedIdl, provider);
  } catch (error) {
    console.error("❌ Error creating program:", error);
    throw error;
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION: RPC Response Caching
// Cache frequently accessed data with TTL
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const rpcCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5000; // 5 second TTL for RPC responses

function getCachedRpcResponse<T>(key: string): T | null {
  const entry = rpcCache.get(key);
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rpcCache.delete(key);
    return null;
  }
  
  return entry.value;
}

function setCachedRpcResponse<T>(key: string, value: T): void {
  rpcCache.set(key, { value, timestamp: Date.now() });
}

// Check if user is registered with caching
export async function isUserRegistered(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  const cacheKey = `registered:${userAccountPubkey.toBase58()}`;
  const cached = getCachedRpcResponse<boolean>(cacheKey);
  if (cached !== null) return cached;
  
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    const result = accountInfo !== null && accountInfo.data.length > 0;
    setCachedRpcResponse(cacheKey, result);
    return result;
  } catch (error) {
    return false;
  }
}

// Get user's minted amount from user account (returns RAW amount in base units)
export async function getUserBalance(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<number> {
  const cacheKey = `balance:${userAccountPubkey.toBase58()}`;
  const cached = getCachedRpcResponse<number>(cacheKey);
  if (cached !== null) return cached;
  
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

    // Return RAW amount (not divided by decimals)
    // Formatting should be done in the UI layer
    const result = balanceRaw.toNumber();
    setCachedRpcResponse(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
}

// Get SPL token balance directly from token account (returns RAW amount in base units)
export async function getSPLTokenBalance(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  const cacheKey = `splBalance:${tokenAccountAddress.toBase58()}`;
  const cached = getCachedRpcResponse<number>(cacheKey);
  if (cached !== null) return cached;
  
  try {
    const tokenAccountInfo = await connection.getAccountInfo(
      tokenAccountAddress
    );
    if (!tokenAccountInfo) return 0;
    // SPL Token account: amount is at bytes 64-72 (u64 little-endian)
    const amount = new BN(tokenAccountInfo.data.slice(64, 72), "le");

    // Return RAW amount (not divided by decimals)
    // Formatting should be done in the UI layer
    const result = amount.toNumber();
    setCachedRpcResponse(cacheKey, result);
    return result;
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
  const cacheKey = `globalState:${globalStatePDA.toBase58()}`;
  const cached = getCachedRpcResponse<any>(cacheKey);
  if (cached !== null) return cached;
  
  try {
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    if (!accountInfo) return null;
    // Return basic info - full deserialization not available
    const result = {
      exists: true,
      dataLength: accountInfo.data.length,
      owner: accountInfo.owner.toBase58(),
    };
    setCachedRpcResponse(cacheKey, result);
    return result;
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

// Cached keypair for performance
let cachedKeypair: Keypair | null = null;

export function getOrCreateKeypair(): Keypair {
  // Return cached keypair if available
  if (cachedKeypair) {
    return cachedKeypair;
  }
  
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
  
  // Cache the keypair
  cachedKeypair = keypair;
  return keypair;
}

// Token program addresses for validation and error messages
const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const STANDARD_TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/**
 * Verify that the mint account owner matches the configured TOKEN_PROGRAM_ID
 * This prevents InvalidProgramId errors when the mint is owned by a different program
 * @param connection - Solana connection
 * @param mintPubkey - Mint account public key
 * @returns true if mint owner matches TOKEN_PROGRAM_ID, false otherwise
 * @throws Error with actionable message if mint doesn't exist or owner mismatch
 */
export async function verifyMintOwner(
  connection: Connection,
  mintPubkey: PublicKey
): Promise<boolean> {
  try {
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
    
    if (!mintAccountInfo) {
      throw new Error(
        `Mint account ${mintPubkey.toBase58()} does not exist. ` +
        'The EQUA token mint needs to be created first.'
      );
    }
    
    const mintOwner = mintAccountInfo.owner.toBase58();
    const expectedOwner = TOKEN_PROGRAM_ID.toBase58();
    
    // Token program IDs for helpful error messages
    const STANDARD_TOKEN_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
    
    if (mintOwner !== expectedOwner) {
      // Identify which programs are involved
      const mintProgramType = mintOwner === TOKEN_2022_PROGRAM_ADDRESS 
        ? 'Token-2022' 
        : mintOwner === STANDARD_TOKEN_ADDRESS 
          ? 'Standard SPL Token'
          : 'Unknown token program';
      
      const expectedProgramType = expectedOwner === TOKEN_2022_PROGRAM_ADDRESS
        ? 'Token-2022'
        : expectedOwner === STANDARD_TOKEN_ADDRESS
          ? 'Standard SPL Token'
          : 'Unknown token program';
      
      const errorMsg = 
        `❌ Mint owner mismatch - this will cause InvalidProgramId errors!\n` +
        `  Mint address: ${mintPubkey.toBase58()}\n` +
        `  Mint owner: ${mintOwner} (${mintProgramType})\n` +
        `  Expected (TOKEN_PROGRAM_ID): ${expectedOwner} (${expectedProgramType})\n` +
        `  \n` +
        `  The mint was created with a different token program than configured.\n` +
        `  \n` +
        `  Fix: Update TOKEN_PROGRAM_ID in src/lib/constants.ts to match the mint owner,\n` +
        `  or set NEXT_PUBLIC_TOKEN_STANDARD environment variable,\n` +
        `  or recreate the mint with the correct token program.`;
      
      console.error(errorMsg);
      throw new Error(`Mint owner mismatch: expected ${expectedOwner}, got ${mintOwner}`);
    }
    
    // Identify which program is being used for success message
    const programType = mintOwner === TOKEN_2022_PROGRAM_ADDRESS ? 'Token-2022' : 'Standard SPL Token';
    console.log(`✅ Mint owner verified: ${mintOwner} (${programType})`);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Mint owner mismatch')) {
      throw error;
    }
    console.error('Error verifying mint owner:', error);
    throw new Error(`Failed to verify mint owner: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ✅ Create initialize_user instruction (UPDATED for 11 accounts + user_type)
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
    Buffer.from([userType]),
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
    console.log('🔧 Instruction account metas (11 accounts):');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  // ✅ PREFLIGHT VALIDATION: Ensure correct program IDs at correct indices
  // This prevents InvalidProgramId errors from parameter order mistakes
  // Runs in ALL environments to catch configuration issues before they reach the blockchain
  const atpIndex = 8;
  const tokenProgramIndex = 9;
  
  const actualAtpAddress = instruction.keys[atpIndex].pubkey.toBase58();
  const actualTokenProgramAddress = instruction.keys[tokenProgramIndex].pubkey.toBase58();
  
  const expectedAtpAddress = ASSOCIATED_TOKEN_PROGRAM_ID.toBase58();
  const expectedTokenProgramAddress = TOKEN_PROGRAM_ID.toBase58();
  
  if (actualAtpAddress !== expectedAtpAddress) {
    const errorMsg = 
      `❌ PREFLIGHT CHECK FAILED: associated_token_program at wrong index!\n` +
      `  Index ${atpIndex} should be ASSOCIATED_TOKEN_PROGRAM_ID: ${expectedAtpAddress}\n` +
      `  But got: ${actualAtpAddress}\n` +
      `  This will cause "InvalidProgramId" error on associated_token_program account.\n` +
      `  Fix: Check parameter order in createInitializeUserInstruction call site.`;
    console.error(errorMsg);
    throw new Error('Preflight validation failed: associated_token_program at incorrect index');
  }
  
  if (actualTokenProgramAddress !== expectedTokenProgramAddress) {
    const errorMsg = 
      `❌ PREFLIGHT CHECK FAILED: token_program at wrong index!\n` +
      `  Index ${tokenProgramIndex} should be TOKEN_PROGRAM_ID: ${expectedTokenProgramAddress}\n` +
      `  But got: ${actualTokenProgramAddress}\n` +
      `  This will cause "InvalidProgramId" error on token_program account.\n` +
      `  Fix: Check parameter order in createInitializeUserInstruction call site.`;
    console.error(errorMsg);
    throw new Error('Preflight validation failed: token_program at incorrect index');
  }
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('✅ Preflight validation passed:');
    console.log(`  - Index ${atpIndex} = ASSOCIATED_TOKEN_PROGRAM_ID (${expectedAtpAddress})`);
    console.log(`  - Index ${tokenProgramIndex} = TOKEN_PROGRAM_ID (${expectedTokenProgramAddress})`);
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

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building mint_equa instruction:');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Amount (raw base units):', amount);
    console.log('  - Amount BN:', amountBN.toString());
  }
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
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

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building mint_equa_tokens instruction:');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Amount (raw base units):', amount);
    console.log('  - Amount BN:', amountBN.toString());
  }
  
  const instruction = new TransactionInstruction({
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
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas:');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
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

/**
 * Clear all cached RPC responses
 * Call this after mutations (registration, minting, transfers)
 */
export function clearRpcCache(): void {
  rpcCache.clear();
}

/**
 * Invalidate specific cache entries
 * @param userPubkey - User's public key to invalidate
 */
export function invalidateUserCache(userPubkey: PublicKey): void {
  const base58 = userPubkey.toBase58();
  rpcCache.delete(`registered:${base58}`);
  rpcCache.delete(`balance:${base58}`);
  rpcCache.delete(`splBalance:${base58}`);
}

// Re-export token program constants for convenience
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
