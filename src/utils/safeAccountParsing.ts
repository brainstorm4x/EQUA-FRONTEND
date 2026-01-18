/**
 * Safe account data parsing utilities with overflow protection
 * 
 * This module provides safe parsing functions for on-chain account data
 * to prevent overflow bugs and handle uninitialized/corrupted values.
 */

import * as anchor from '@coral-xyz/anchor';

// Maximum reasonable user count (sanity check)
const MAX_REASONABLE_USER_COUNT = 1_000_000;

// Maximum safe timestamp (year 2243 in seconds)
const MAX_SAFE_TIMESTAMP = 8640000000;

/**
 * Safely parse user count from global state account data
 * 
 * GlobalState structure (from IDL):
 * - 8 bytes: discriminator
 * - 4 bytes: user_count (u32)
 * - 8 bytes: total_transactions (u64)
 * - 8 bytes: current_epoch (u64)
 * - 1 byte: compounding_complete (bool)
 * - 8 bytes: last_epoch_update_time (i64)
 * - 32 bytes: token_mint (pubkey)
 * 
 * @param accountData - Raw account data buffer from global state
 * @param offset - Byte offset where user count field starts (default: 8)
 * @param length - Byte length of the field (default: 4 for u32)
 * @returns Parsed user count, or 0 if invalid/uninitialized
 */
export function safeParseUserCount(
  accountData: Buffer | Uint8Array | null | undefined,
  offset: number = 8,
  length: number = 4
): number {
  // Handle null/undefined account data
  if (!accountData) {
    console.warn('⚠️ Account data is null or undefined, returning 0 user count');
    return 0;
  }

  // Check if account data is long enough
  if (accountData.length < offset + length) {
    console.warn(
      `⚠️ Account data too short (${accountData.length} bytes) for user count at offset ${offset}, returning 0`
    );
    return 0;
  }

  try {
    // Extract the raw bytes
    const rawBytes = accountData.slice(offset, offset + length);
    
    // Parse as little-endian u32 (or u64 if length is 8)
    const rawValue = new anchor.BN(rawBytes, 'le');
    
    // Check for overflow: value should fit in JavaScript's safe integer range
    // Note: JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1
    // But we use a much smaller sanity check for user counts
    if (rawValue.gt(new anchor.BN(MAX_REASONABLE_USER_COUNT))) {
      console.warn(
        `⚠️ User count overflow detected: ${rawValue.toString()} exceeds maximum ${MAX_REASONABLE_USER_COUNT}. ` +
        'This likely indicates uninitialized or corrupted data. Returning 0.'
      );
      return 0;
    }

    // Check for negative values (guards against corrupted data with invalid bit patterns)
    if (rawValue.isNeg()) {
      console.warn('⚠️ User count is negative (corrupted data detected), returning 0');
      return 0;
    }

    // Safe to convert to number
    const userCount = rawValue.toNumber();
    
    // Additional sanity check: ensure conversion resulted in a valid finite number
    if (!Number.isFinite(userCount) || userCount < 0) {
      console.warn(`⚠️ User count ${userCount} failed post-conversion validation, returning 0`);
      return 0;
    }

    return userCount;
  } catch (error) {
    console.error('❌ Error parsing user count from account data:', error);
    return 0;
  }
}

/**
 * Safely parse timestamp from account data
 * 
 * @param accountData - Raw account data buffer
 * @param offset - Byte offset where timestamp field starts
 * @param length - Byte length of the field (default: 8 for i64/u64)
 * @returns Parsed timestamp in seconds, or 0 if invalid/uninitialized
 */
export function safeParseTimestamp(
  accountData: Buffer | Uint8Array | null | undefined,
  offset: number,
  length: number = 8
): number {
  // Handle null/undefined account data
  if (!accountData) {
    console.warn('⚠️ Account data is null or undefined, returning 0 timestamp');
    return 0;
  }

  // Check if account data is long enough
  if (accountData.length < offset + length) {
    console.warn(
      `⚠️ Account data too short (${accountData.length} bytes) for timestamp at offset ${offset}, returning 0`
    );
    return 0;
  }

  try {
    // Extract the raw bytes
    const rawBytes = accountData.slice(offset, offset + length);
    
    // Parse as little-endian i64/u64
    const rawValue = new anchor.BN(rawBytes, 'le');
    
    // Check for unreasonable timestamp values
    if (rawValue.gt(new anchor.BN(MAX_SAFE_TIMESTAMP))) {
      console.warn(
        `⚠️ Timestamp appears uninitialized or corrupted: ${rawValue.toString()} exceeds ${MAX_SAFE_TIMESTAMP}. ` +
        'Returning 0.'
      );
      return 0;
    }

    // Check for negative values
    if (rawValue.isNeg()) {
      console.warn('⚠️ Timestamp is negative, returning 0');
      return 0;
    }

    const timestamp = rawValue.toNumber();
    
    // Additional sanity check
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      console.warn(`⚠️ Timestamp ${timestamp} failed post-conversion validation, returning 0`);
      return 0;
    }

    return timestamp;
  } catch (error) {
    console.error('❌ Error parsing timestamp from account data:', error);
    return 0;
  }
}

/**
 * Safely parse u64 amount from account data
 * 
 * @param accountData - Raw account data buffer
 * @param offset - Byte offset where amount field starts
 * @param length - Byte length of the field (default: 8 for u64)
 * @param maxValue - Maximum reasonable value (optional sanity check)
 * @returns Parsed amount, or 0 if invalid/uninitialized
 */
export function safeParseAmount(
  accountData: Buffer | Uint8Array | null | undefined,
  offset: number,
  length: number = 8,
  maxValue?: number
): number {
  // Handle null/undefined account data
  if (!accountData) {
    return 0;
  }

  // Check if account data is long enough
  if (accountData.length < offset + length) {
    return 0;
  }

  try {
    // Extract the raw bytes
    const rawBytes = accountData.slice(offset, offset + length);
    
    // Parse as little-endian u64
    const rawValue = new anchor.BN(rawBytes, 'le');
    
    // Apply optional max value check
    if (maxValue !== undefined && rawValue.gt(new anchor.BN(maxValue))) {
      console.warn(
        `⚠️ Amount overflow detected: ${rawValue.toString()} exceeds maximum ${maxValue}. Returning 0.`
      );
      return 0;
    }

    // Check for negative values
    if (rawValue.isNeg()) {
      return 0;
    }

    const amount = rawValue.toNumber();
    
    // Sanity check
    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }

    return amount;
  } catch (error) {
    console.error('❌ Error parsing amount from account data:', error);
    return 0;
  }
}

/**
 * UserAccount structure offsets (from IDL):
 * - discriminator: 0 (8 bytes)
 * - authority: 8 (32 bytes, pubkey)
 * - referral: 40 (32 bytes, pubkey)
 * - token_account: 72 (32 bytes, pubkey)
 * - minted_amount: 104 (8 bytes, u64)
 * - mint_start: 112 (8 bytes, i64)
 * - referral_rewards: 120 (8 bytes, u64)
 * - last_mint_time: 128 (8 bytes, i64)
 * Total size: 136 bytes
 */
export const USER_ACCOUNT_OFFSETS = {
  DISCRIMINATOR: 0,
  AUTHORITY: 8,
  REFERRAL: 40,
  TOKEN_ACCOUNT: 72,
  MINTED_AMOUNT: 104,
  MINT_START: 112,
  REFERRAL_REWARDS: 120,
  LAST_MINT_TIME: 128,
} as const;

export const USER_ACCOUNT_SIZE = 136;

/**
 * Decoded UserAccount data
 */
export interface DecodedUserAccount {
  authority: string; // Base58 encoded public key
  referral: string; // Base58 encoded public key
  tokenAccount: string; // Base58 encoded public key
  mintedAmount: number;
  mintStart: number;
  referralRewards: number;
  lastMintTime: number;
}

/**
 * Decodes a UserAccount buffer into structured data
 * 
 * @param accountData - Raw account data buffer from UserAccount PDA
 * @returns Decoded account data or null if invalid
 */
export function decodeUserAccount(
  accountData: Buffer | Uint8Array | null | undefined
): DecodedUserAccount | null {
  // Validate account data exists and has correct size
  if (!accountData || accountData.length < USER_ACCOUNT_SIZE) {
    console.warn(
      `⚠️ Invalid UserAccount data: expected ${USER_ACCOUNT_SIZE} bytes, got ${accountData?.length || 0}`
    );
    return null;
  }

  try {
    // Parse public keys
    const authorityBytes = accountData.slice(
      USER_ACCOUNT_OFFSETS.AUTHORITY,
      USER_ACCOUNT_OFFSETS.AUTHORITY + 32
    );
    const referralBytes = accountData.slice(
      USER_ACCOUNT_OFFSETS.REFERRAL,
      USER_ACCOUNT_OFFSETS.REFERRAL + 32
    );
    const tokenAccountBytes = accountData.slice(
      USER_ACCOUNT_OFFSETS.TOKEN_ACCOUNT,
      USER_ACCOUNT_OFFSETS.TOKEN_ACCOUNT + 32
    );

    // Convert to PublicKey and then to Base58
    // Note: Using PublicKey constructor is standard practice in Solana programs
    // and provides validation. Performance impact is minimal as this is not a hot path.
    const authority = new anchor.web3.PublicKey(authorityBytes).toBase58();
    const referral = new anchor.web3.PublicKey(referralBytes).toBase58();
    const tokenAccount = new anchor.web3.PublicKey(tokenAccountBytes).toBase58();

    // Parse numeric fields using safe parsing functions
    const mintedAmount = safeParseAmount(
      accountData,
      USER_ACCOUNT_OFFSETS.MINTED_AMOUNT
    );
    const mintStart = safeParseTimestamp(
      accountData,
      USER_ACCOUNT_OFFSETS.MINT_START
    );
    const referralRewards = safeParseAmount(
      accountData,
      USER_ACCOUNT_OFFSETS.REFERRAL_REWARDS
    );
    const lastMintTime = safeParseTimestamp(
      accountData,
      USER_ACCOUNT_OFFSETS.LAST_MINT_TIME
    );

    return {
      authority,
      referral,
      tokenAccount,
      mintedAmount,
      mintStart,
      referralRewards,
      lastMintTime,
    };
  } catch (error) {
    console.error('❌ Error decoding UserAccount:', error);
    return null;
  }
}

/**
 * GlobalState structure offsets (from IDL):
 * - discriminator: 0 (8 bytes)
 * - user_count: 8 (4 bytes, u32)
 * - total_transactions: 12 (8 bytes, u64)
 * - current_epoch: 20 (8 bytes, u64)
 * - compounding_complete: 28 (1 byte, bool)
 * - last_epoch_update_time: 29 (8 bytes, i64)
 * - token_mint: 37 (32 bytes, pubkey)
 * Total size: 69 bytes
 */
export const GLOBAL_STATE_OFFSETS = {
  DISCRIMINATOR: 0,
  USER_COUNT: 8,
  TOTAL_TRANSACTIONS: 12,
  CURRENT_EPOCH: 20,
  COMPOUNDING_COMPLETE: 28,
  LAST_EPOCH_UPDATE_TIME: 29,
  TOKEN_MINT: 37,
} as const;

export const GLOBAL_STATE_SIZE = 69;

/**
 * Decoded GlobalState data
 */
export interface DecodedGlobalState {
  userCount: number;
  totalTransactions: number;
  currentEpoch: number;
  compoundingComplete: boolean;
  lastEpochUpdateTime: number;
  tokenMint: string; // Base58 encoded public key
}

/**
 * Decodes a GlobalState buffer into structured data
 * 
 * @param accountData - Raw account data buffer from GlobalState PDA
 * @returns Decoded global state data or null if invalid
 */
export function decodeGlobalState(
  accountData: Buffer | Uint8Array | null | undefined
): DecodedGlobalState | null {
  // Validate account data exists and has correct size
  if (!accountData || accountData.length < GLOBAL_STATE_SIZE) {
    console.warn(
      `⚠️ Invalid GlobalState data: expected ${GLOBAL_STATE_SIZE} bytes, got ${accountData?.length || 0}`
    );
    return null;
  }

  try {
    // Parse user_count (u32 at offset 8)
    const userCount = safeParseUserCount(accountData, GLOBAL_STATE_OFFSETS.USER_COUNT, 4);

    // Parse total_transactions (u64 at offset 12)
    const totalTransactions = safeParseAmount(
      accountData,
      GLOBAL_STATE_OFFSETS.TOTAL_TRANSACTIONS,
      8
    );

    // Parse current_epoch (u64 at offset 20)
    const currentEpoch = safeParseAmount(
      accountData,
      GLOBAL_STATE_OFFSETS.CURRENT_EPOCH,
      8
    );

    // Parse compounding_complete (bool at offset 28)
    const compoundingComplete = accountData[GLOBAL_STATE_OFFSETS.COMPOUNDING_COMPLETE] !== 0;

    // Parse last_epoch_update_time (i64 at offset 29)
    const lastEpochUpdateTime = safeParseTimestamp(
      accountData,
      GLOBAL_STATE_OFFSETS.LAST_EPOCH_UPDATE_TIME,
      8
    );

    // Parse token_mint (pubkey at offset 37)
    const tokenMintBytes = accountData.slice(
      GLOBAL_STATE_OFFSETS.TOKEN_MINT,
      GLOBAL_STATE_OFFSETS.TOKEN_MINT + 32
    );
    const tokenMint = new anchor.web3.PublicKey(tokenMintBytes).toBase58();

    return {
      userCount,
      totalTransactions,
      currentEpoch,
      compoundingComplete,
      lastEpochUpdateTime,
      tokenMint,
    };
  } catch (error) {
    console.error('❌ Error decoding GlobalState:', error);
    return null;
  }
}
