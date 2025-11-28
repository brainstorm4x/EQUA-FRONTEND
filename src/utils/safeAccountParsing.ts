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
