import { Connection, PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from './spl-token-inline';
import {
  PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  GLOBAL_STATE_SEED,
  MINT_SEED,
  MINT_AUTHORITY_SEED,
  USER_ACCOUNT_SEED,
  USER_META_SEED,
  BUSINESS_REGISTRY_SEED,
  TOKEN_2022_PROGRAM_ADDRESS,
  STANDARD_TOKEN_PROGRAM_ADDRESS,
} from "./constants";
import { getLockedTokenAccountPda, getLockedTokenPda, getLockedTokenAta } from '@/utils/pda-helpers';

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

/**
 * Get business registry PDA (global account for business registrations)
 * @returns PDA and bump seed
 */
export function getBusinessRegistryPDA(): [PublicKey, number] {
  return getCachedPDA('business_registry', [Buffer.from(BUSINESS_REGISTRY_SEED)]);
}

/**
 * Get referrer account PDA from referrer's wallet public key
 * Used to derive the UserAccount PDA for a referrer during minting
 * @param referrerPubkey - The referrer's wallet public key
 * @returns PDA and bump seed
 */
export function getReferrerAccountPDA(referrerPubkey: PublicKey): [PublicKey, number] {
  const cacheKey = `referrer_account:${referrerPubkey.toBase58()}`;
  return getCachedPDA(cacheKey, [Buffer.from(USER_ACCOUNT_SEED), referrerPubkey.toBuffer()]);
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
      const response = await fetch("/idl/uniyaa_token.json");
      if (!response.ok) {
        throw new Error("Failed to load IDL: " + response.statusText);
      }
      cachedIdl = await response.json();
      
      // Runtime validation: Ensure IDL has program ID and matches configured PROGRAM_ID
      const idlProgramId = cachedIdl.address || cachedIdl.metadata?.address;
      if (!idlProgramId) {
        const errorMsg = `❌ CRITICAL: IDL is missing program ID!\n` +
          `  The loaded IDL file does not contain an 'address' field.\n` +
          `  This indicates a malformed or outdated IDL file.\n` +
          `  Fix: Ensure the IDL is properly generated and includes the program address.`;
        console.error(errorMsg);
        throw new Error('IDL is missing program ID (address field)');
      }
      
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
      
      console.log(
        "✅ IDL loaded and validated, creating program with ID:",
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

// ============================================================================
// Mint Metadata Fetching
// ============================================================================

export interface MintMetadata {
  address: PublicKey;
  decimals: number;
  supply: bigint;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

/**
 * Fetches mint metadata from on-chain account
 * Uses getParsedAccountInfo for easy parsing of mint data
 * @param connection - Solana RPC connection
 * @param mintAddress - Mint account public key
 * @returns Mint metadata or null if not found
 */
export async function getMintMetadata(
  connection: Connection,
  mintAddress: PublicKey
): Promise<MintMetadata | null> {
  const cacheKey = `mintMetadata:${mintAddress.toBase58()}`;
  const cached = getCachedRpcResponse<MintMetadata>(cacheKey);
  if (cached !== null) return cached;

  try {
    const accountInfo = await connection.getParsedAccountInfo(mintAddress);
    
    if (!accountInfo.value) {
      console.warn('❌ Mint account not found:', mintAddress.toBase58());
      return null;
    }

    const data = accountInfo.value.data;
    if (!data || typeof data === 'string' || !('parsed' in data)) {
      console.error('❌ Unexpected mint account data format');
      return null;
    }

    const parsedData = data.parsed;
    if (parsedData.type !== 'mint') {
      console.error('❌ Account is not a mint account');
      return null;
    }

    const info = parsedData.info;
    const metadata: MintMetadata = {
      address: mintAddress,
      decimals: info.decimals,
      supply: BigInt(info.supply),
      mintAuthority: info.mintAuthority ? new PublicKey(info.mintAuthority) : null,
      freezeAuthority: info.freezeAuthority ? new PublicKey(info.freezeAuthority) : null,
    };

    // Cache for 1 hour (mint metadata rarely changes)
    setCachedRpcResponse(cacheKey, metadata);
    
    return metadata;
  } catch (error) {
    console.error('❌ Error fetching mint metadata:', error);
    return null;
  }
}

/**
 * Fetches UNIYAA mint decimals from on-chain
 * Returns the expected value (6) as fallback if fetch fails
 * @param connection - Solana RPC connection
 * @returns Decimals value
 */
export async function getUniyaaMintDecimals(connection: Connection): Promise<number> {
  const [mintPDA] = getMintPDA();
  const metadata = await getMintMetadata(connection, mintPDA);
  
  if (!metadata) {
    console.warn('⚠️ Could not fetch UNIYAA mint decimals, using default (6)');
    return 6; // Default to 6 decimals
  }

  // Validate decimals match expected value
  if (metadata.decimals !== 6) {
    console.warn(
      `⚠️ DECIMALS MISMATCH: Expected 6, got ${metadata.decimals} from on-chain mint. ` +
      `This may indicate a configuration issue or wrong mint address.`
    );
  } else {
    console.log('✅ UNIYAA mint decimals verified:', metadata.decimals);
  }

  return metadata.decimals;
}

// Token program addresses imported from constants
// (Used for validation and error messages)

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
): Promise<PublicKey> {
  const mintAccountInfo = await connection.getAccountInfo(mintPubkey);

  if (!mintAccountInfo) {
    throw new Error(
      `Mint account ${mintPubkey.toBase58()} does not exist. ` +
      'The UNIYAA token mint needs to be created first.'
    );
  }

  const mintOwner = mintAccountInfo.owner;

  const token2022PubKey = new PublicKey(TOKEN_2022_PROGRAM_ADDRESS);
  const standardTokenPubKey = new PublicKey(STANDARD_TOKEN_PROGRAM_ADDRESS);

  if (
    !mintOwner.equals(token2022PubKey) &&
    !mintOwner.equals(standardTokenPubKey)
  ) {
    throw new Error(
      `Unsupported token program for mint ${mintPubkey.toBase58()}: ${mintOwner.toBase58()}`
    );
  }

  if (!mintOwner.equals(token2022PubKey)) {
    throw new Error(
      `❌ Mint owner mismatch.\n` +
      `UNIYAA requires Token-2022.\n` +
      `Found: ${mintOwner.toBase58()}`
    );
  }

  console.log(`✅ Mint owner verified: ${mintOwner.toBase58()} (Token-2022)`);

  // ✅ CRITICAL: return the actual token program to use
  return mintOwner;
}


// ✅ Create initialize_user instruction (UPDATED for 12 accounts + user_type)
// Note: locked_until field removed per UNIYAA Whitepaper 2025
export function createInitializeUserInstruction(
  userAccount: PublicKey,
  userMetadata: PublicKey,
  authority: PublicKey,
  globalState: PublicKey,
  referralAccount: PublicKey,
  referrerMetadata: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  businessRegistry: PublicKey,
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

  // Account order matches backend IDL exactly (12 accounts)
  // user_account, user_metadata, authority, global_state, referral_account, referrer_metadata,
  // user_token_account, mint, business_registry, associated_token_program, token_program, system_program
  const keys = [
    { pubkey: userAccount, isSigner: false, isWritable: true },        // 0. user_account
    { pubkey: userMetadata, isSigner: false, isWritable: true },       // 1. user_metadata
    { pubkey: authority, isSigner: true, isWritable: true },           // 2. authority
    { pubkey: globalState, isSigner: false, isWritable: true },        // 3. global_state
    { pubkey: referralAccount, isSigner: false, isWritable: true },    // 4. referral_account
    { pubkey: referrerMetadata, isSigner: false, isWritable: true },   // 5. referrer_metadata
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },   // 6. user_token_account
    { pubkey: mint, isSigner: false, isWritable: false },              // 7. mint
    { pubkey: businessRegistry, isSigner: false, isWritable: true },  // 8. business_registry
    { pubkey: associatedTokenProgram, isSigner: false, isWritable: false }, // 9. associated_token_program
    { pubkey: tokenProgram, isSigner: false, isWritable: false },      // 10. token_program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 11. system_program
  ];

  // Preflight validation: Assert critical program IDs are at correct indices
  // Use .equals() for performance (avoids string conversions)
  if (!keys[9].pubkey.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
    const errorMsg = 
      `❌ CRITICAL: Program ID mismatch at index 9 (associated_token_program)!\n` +
      `  Expected: ${ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()} (ATokenGP...)\n` +
      `  Got: ${keys[9].pubkey.toBase58()}\n` +
      `  This will cause InvalidProgramId errors during instruction execution.\n` +
      `  Fix: Ensure businessRegistry is passed as the 9th parameter (index 8) before associatedTokenProgram.`;
    console.error(errorMsg);
    throw new Error('InitializeUser instruction builder: associated_token_program at wrong index');
  }

  if (!keys[10].pubkey.equals(TOKEN_PROGRAM_ID)) {
    const errorMsg = 
      `❌ CRITICAL: Program ID mismatch at index 10 (token_program)!\n` +
      `  Expected: ${TOKEN_PROGRAM_ID.toBase58()} (TokenkegQ... or TokenzQdB...)\n` +
      `  Got: ${keys[10].pubkey.toBase58()}\n` +
      `  This will cause InvalidProgramId errors during instruction execution.\n` +
      `  Fix: Verify TOKEN_PROGRAM_ID in constants.ts matches the mint owner.`;
    console.error(errorMsg);
    throw new Error('InitializeUser instruction builder: token_program at wrong index');
  }

  if (DEBUG_INSTRUCTIONS) {
    console.log('✅ Preflight validation passed:');
    console.log(`  - Index 9 = ${ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()} (associated_token_program)`);
    console.log(`  - Index 10 = ${TOKEN_PROGRAM_ID.toBase58()} (token_program)`);
  }

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas (12 accounts):');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

// ✅ Create mint_uniyaa instruction (daily minting with cooldown)
// This is the correct instruction to use for daily UNIYAA minting
export function createMintUniyaaInstruction(
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
    console.log('🔧 Building mint_uniyaa instruction:');
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

// ✅ Create mint_uniyaa_tokens instruction (low-level token minting)
// This is used internally by mint_uniyaa, not for direct daily minting
export function createMintUniyaaTokensInstruction(
  userAccount: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  authority: PublicKey,
  tokenProgram: PublicKey,
  amount: number | string
): TransactionInstruction {
  const discriminator = Buffer.from([166, 66, 221, 55, 153, 196, 139, 85]);
  
  // Safe BN construction: convert to string for large numbers
  const amountBN = new BN(
    typeof amount === 'number' && amount > Number.MAX_SAFE_INTEGER
      ? amount.toString()
      : amount
  );
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building mint_uniyaa_tokens instruction:');
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

// ✅ Create mint_tokens instruction (15-account version aligned with backend IDL)
// This is the correct instruction for daily UNIYAA minting on the deployed program
// Account order: user_account, user_metadata, global_state, user_token_account, mint, mint_authority, 
// referrer_account, business_registry, authority, locked_token_account, locked_token_ata, locked_token_pda, 
// token_program, associated_token_program, system_program
export function createMintTokensInstruction(
  userAccount: PublicKey,
  userMetadata: PublicKey,
  globalState: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  referrerAccount: PublicKey,
  businessRegistry: PublicKey,
  authority: PublicKey,
  lockedTokenAccount: PublicKey,
  lockedTokenAta: PublicKey,
  lockedTokenPda: PublicKey,
  tokenProgram: PublicKey,
  associatedTokenProgram: PublicKey,
  systemProgram: PublicKey,
  amount: number | string
): TransactionInstruction {
  // Discriminator from backend IDL for mint_tokens instruction
  const discriminator = Buffer.from([59, 132, 24, 246, 122, 39, 8, 243]);
  
  // Safe BN construction: convert to string for large numbers
  const amountBN = new BN(
    typeof amount === 'number' && amount > Number.MAX_SAFE_INTEGER
      ? amount.toString()
      : amount
  );
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  // ============================================================================
  // PREFLIGHT ASSERTIONS
  // Validate critical parameters before building instruction
  // ============================================================================
  
  // Validate token program is Token-2022 (UNIYAA requires Token-2022 only)
  const isToken2022 = tokenProgram.toBase58() === TOKEN_2022_PROGRAM_ADDRESS;
  
  if (!isToken2022) {
    const errorMsg = 
      `❌ CRITICAL: Invalid token program - UNIYAA requires Token-2022!\n` +
      `  Expected: ${TOKEN_2022_PROGRAM_ADDRESS} (Token-2022)\n` +
      `  Got: ${tokenProgram.toBase58()}\n` +
      `  This indicates a configuration error. Check TOKEN_PROGRAM_ID in constants.ts.`;
    console.error(errorMsg);
    throw new Error('mint_tokens requires Token-2022 program');
  }

  // Assert authority is provided (required signer)
  if (!authority || authority.equals(PublicKey.default)) {
    throw new Error('mint_tokens requires authority (wallet public key) to be provided');
  }

  // Log referrer account handling
  const isReferrerProvided = !referrerAccount.equals(PublicKey.default);
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building mint_tokens instruction (15 accounts):');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Amount (raw base units):', amount);
    console.log('  - Amount BN:', amountBN.toString());
    console.log(`  - Token Program: ${tokenProgram.toBase58()} (Token-2022 ✅)`);
    console.log('  - Referrer:', isReferrerProvided ? referrerAccount.toBase58() : `Self-referral (${referrerAccount.toBase58()})`);
    console.log('  - User Account:', userAccount.toBase58());
    console.log('  - User Metadata:', userMetadata.toBase58());
    console.log('  - Global State:', globalState.toBase58());
    console.log('  - User Token Account:', userTokenAccount.toBase58());
    console.log('  - Mint:', mint.toBase58());
    console.log('  - Mint Authority:', mintAuthority.toBase58());
    console.log('  - Referrer Account:', referrerAccount.toBase58());
    console.log('  - Business Registry:', businessRegistry.toBase58());
    console.log('  - Authority:', authority.toBase58());
    console.log('  - Locked Token Account:', lockedTokenAccount.toBase58());
    console.log('  - Locked Token ATA:', lockedTokenAta.toBase58());
    console.log('  - Locked Token PDA:', lockedTokenPda.toBase58());
    console.log('  - Token Program:', tokenProgram.toBase58());
    console.log('  - Associated Token Program:', associatedTokenProgram.toBase58());
    console.log('  - System Program:', systemProgram.toBase58());
  }
  
  // Build keys in exact order matching backend IDL
  // Note: referrer_account MUST ALWAYS be writable per IDL, even when user self-refers
  // This allows the backend to update referral rewards when a referred user mints
  const keys = [
    { pubkey: userAccount, isSigner: false, isWritable: true },      // 0. user_account
    { pubkey: userMetadata, isSigner: false, isWritable: true },     // 1. user_metadata
    { pubkey: globalState, isSigner: false, isWritable: false },     // 2. global_state (read-only)
    { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // 3. user_token_account
    { pubkey: mint, isSigner: false, isWritable: true },             // 4. mint
    { pubkey: mintAuthority, isSigner: false, isWritable: false },   // 5. mint_authority
    { pubkey: referrerAccount, isSigner: false, isWritable: true },  // 6. referrer_account (ALWAYS writable per IDL)
    { pubkey: businessRegistry, isSigner: false, isWritable: false }, // 7. business_registry
    { pubkey: authority, isSigner: true, isWritable: true },         // 8. authority (MUST be signer, writable for rent)
    { pubkey: lockedTokenAccount, isSigner: false, isWritable: true }, // 9. locked_token_account
    { pubkey: lockedTokenAta, isSigner: false, isWritable: true },   // 10. locked_token_ata
    { pubkey: lockedTokenPda, isSigner: false, isWritable: false },  // 11. locked_token_pda
    { pubkey: tokenProgram, isSigner: false, isWritable: false },    // 12. token_program
    { pubkey: associatedTokenProgram, isSigner: false, isWritable: false }, // 13. associated_token_program
    { pubkey: systemProgram, isSigner: false, isWritable: false },   // 14. system_program
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas (15 accounts):');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

// ✅ Create record_transaction instruction (for post-transfer transaction counting)
/**
 * Creates a record_transaction instruction to increment GlobalState.total_transactions
 * Should be called after successful SPL token transfers to track transaction count
 * 
 * @param globalState - GlobalState PDA (derived from GLOBAL_STATE_SEED)
 * @param authority - Wallet public key (must be signer)
 * @returns TransactionInstruction for record_transaction
 */
export function createRecordTransactionInstruction(
  globalState: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  // Discriminator from IDL for record_transaction instruction
  const discriminator = Buffer.from([134, 39, 187, 220, 192, 43, 119, 10]);
  
  // No arguments for this instruction (per IDL)
  const data = discriminator;

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building record_transaction instruction:');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Global State:', globalState.toBase58());
    console.log('  - Authority:', authority.toBase58());
  }
  
  // Account order matches backend IDL: global_state (writable), authority (signer)
  const keys = [
    { pubkey: globalState, isSigner: false, isWritable: true },  // 0. global_state
    { pubkey: authority, isSigner: true, isWritable: false },    // 1. authority
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas (2 accounts):');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

// ✅ Create transfer_tokens instruction (Anchor IDL-driven for Token-2022)
// Uses the UNIYAA program's CPI to transfer_checked, ensuring proper Token-2022 handling
export function createTransferTokensInstruction(
  senderUserAccount: PublicKey,
  senderTokenAccount: PublicKey,
  recipientUserAccount: PublicKey,
  recipientTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  globalState: PublicKey,
  senderAuthority: PublicKey,
  tokenProgram: PublicKey,
  amount: number | bigint
): TransactionInstruction {
  // Discriminator from IDL for transfer_tokens instruction
  const discriminator = Buffer.from([54, 180, 238, 175, 74, 85, 126, 188]);
  
  // Convert amount to BN (supports both number and bigint)
  // For bigint: convert to string to preserve precision, BN constructor handles it efficiently
  let amountBN: BN;
  if (typeof amount === 'bigint') {
    // Convert bigint to string without losing precision
    amountBN = new BN(amount.toString(10));
  } else {
    amountBN = new BN(amount);
  }
  
  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  // ============================================================================
  // PREFLIGHT ASSERTIONS
  // ============================================================================
  
  // Validate token program is Token-2022 (UNIYAA requires Token-2022 only)
  const isToken2022 = tokenProgram.toBase58() === TOKEN_2022_PROGRAM_ADDRESS;
  
  if (!isToken2022) {
    const errorMsg = 
      `❌ CRITICAL: Invalid token program - UNIYAA requires Token-2022!\n` +
      `  Expected: ${TOKEN_2022_PROGRAM_ADDRESS} (Token-2022)\n` +
      `  Got: ${tokenProgram.toBase58()}\n` +
      `  This indicates a configuration error. Check TOKEN_PROGRAM_ID in constants.ts.`;
    console.error(errorMsg);
    throw new Error('transfer_tokens requires Token-2022 program');
  }

  // Assert sender authority is provided (required signer)
  if (!senderAuthority || senderAuthority.equals(PublicKey.default)) {
    throw new Error('transfer_tokens requires sender_authority (wallet public key) to be provided');
  }

  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Building transfer_tokens instruction (9 accounts):');
    console.log('  - Discriminator:', Array.from(discriminator).join(', '));
    console.log('  - Amount (raw base units):', amountBN.toString());
    console.log(`  - Token Program: ${tokenProgram.toBase58()} (Token-2022 ✅)`);
    console.log('  - Global State:', globalState.toBase58());
    console.log('  - Sender User Account:', senderUserAccount.toBase58());
    console.log('  - Recipient User Account:', recipientUserAccount.toBase58());
  }
  
  // Build keys in exact order matching backend IDL (9 accounts - includes global_state)
  // Order: sender_user_account, sender_token_account, recipient_user_account, 
  //        recipient_token_account, mint, mint_authority, global_state, sender_authority, token_program
  const keys = [
    { pubkey: senderUserAccount, isSigner: false, isWritable: true },      // 0. sender_user_account
    { pubkey: senderTokenAccount, isSigner: false, isWritable: true },     // 1. sender_token_account
    { pubkey: recipientUserAccount, isSigner: false, isWritable: true },   // 2. recipient_user_account
    { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },  // 3. recipient_token_account
    { pubkey: mint, isSigner: false, isWritable: true },                   // 4. mint
    { pubkey: mintAuthority, isSigner: false, isWritable: false },         // 5. mint_authority
    { pubkey: globalState, isSigner: false, isWritable: true },            // 6. global_state
    { pubkey: senderAuthority, isSigner: true, isWritable: false },        // 7. sender_authority (MUST be signer)
    { pubkey: tokenProgram, isSigner: false, isWritable: false },          // 8. token_program
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Instruction account metas (9 accounts):');
    instruction.keys.forEach((meta, idx) => {
      console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
    });
  }

  return instruction;
}

/**
 * Creates an unlock_tokens instruction
 * Unlocks tokens after 4-year cliff vesting period (Tiers 1-3 only)
 * 
 * @param authority - User's wallet public key
 * @param mint - UNIYAA mint PDA
 * @returns TransactionInstruction ready to be added to a transaction
 */
export function createUnlockTokensInstruction(
  authority: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  // Derive PDAs
  const [lockedTokenAccount] = getLockedTokenAccountPda(authority, PROGRAM_ID);
  const lockedTokenPda = getLockedTokenPda(authority, PROGRAM_ID);
  const lockedTokenAta = getLockedTokenAta(lockedTokenPda, mint, TOKEN_PROGRAM_ID);
  
  // Get user's regular token account (ATA)
  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    authority,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Instruction discriminator from IDL: [233, 35, 95, 159, 37, 185, 47, 88]
  const discriminator = Buffer.from([233, 35, 95, 159, 37, 185, 47, 88]);
  const data = discriminator; // No additional args
  
  // Build keys in exact order matching backend IDL (7 accounts)
  // Order: locked_token_account, locked_token_ata, locked_token_pda,
  //        user_token_account, mint, authority, token_program
  const keys = [
    { pubkey: lockedTokenAccount, isSigner: false, isWritable: true },   // 0. locked_token_account
    { pubkey: lockedTokenAta, isSigner: false, isWritable: true },       // 1. locked_token_ata
    { pubkey: lockedTokenPda, isSigner: false, isWritable: false },      // 2. locked_token_pda
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },     // 3. user_token_account
    { pubkey: mint, isSigner: false, isWritable: true },                 // 4. mint
    { pubkey: authority, isSigner: true, isWritable: false },            // 5. authority (MUST be signer)
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },    // 6. token_program
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
  
  if (DEBUG_INSTRUCTIONS) {
    console.log('🔧 Unlock Tokens Instruction account metas (7 accounts):');
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
export { PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
