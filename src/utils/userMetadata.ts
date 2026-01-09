/**
 * UserMetadata on-chain account utilities
 * 
 * UserMetadata is a separate PDA that stores user-specific minting metadata:
 * - user_index: The user's registration order (1-based)
 * - elevated_mint_attempts_used: Number of elevated tier attempts used
 * 
 * This account is the canonical source of truth for determining:
 * - User's tier assignment
 * - Remaining elevated attempts
 * - Minting eligibility
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getUserMetadataPDA } from '@/lib/program';

/**
 * UserMetadata account structure (canonical on-chain layout)
 * 
 * Total: 96 bytes (8 discriminator + 88 data)
 * 
 * Layout (from Rust struct):
 * - Offset 0-7:   discriminator: [u8; 8]                    (8 bytes)
 * - Offset 8-39:  user_account: Pubkey                      (32 bytes)
 * - Offset 40:    user_type: u8                             (1 byte)
 * - Offset 41-44: user_index: u32                           (4 bytes) ← TIER DETERMINATION
 * - Offset 45-48: elevated_mint_attempts_used: u32          (4 bytes) ← ATTEMPT TRACKING
 * - Offset 49:    kyc_verified: bool                        (1 byte)
 * - Offset 50:    captcha_passed: bool                      (1 byte)
 * - Offset 51-82: device_fingerprint: [u8; 32]              (32 bytes)
 * - Offset 83-90: last_referral_slot: u64                   (8 bytes)
 * - Offset 91-94: referrals_made: u32                       (4 bytes)
 * - Offset 95:    version: u8                               (1 byte)
 * - Offset 96:    bonus_mints_this_month: u8                (1 byte) ← MONTHLY BONUS TRACKING
 * - Offset 97-100: last_bonus_mint_year: u32                (4 bytes) ← BONUS MINT YEAR
 * - Offset 101-104: last_bonus_mint_month: u32              (4 bytes) ← BONUS MINT MONTH
 * 
 * Seeds: [b"user-meta", authority] (MUST match backend exactly)
 */
export interface UserMetadata {
  user_index: number;
  elevated_mint_attempts_used: number;
  bonus_mints_this_month: number;
  last_bonus_mint_year: number;
  last_bonus_mint_month: number;
}

// Account size constants (aligned with 96-byte on-chain struct)
const DISCRIMINATOR_SIZE = 8;
const DISCRIMINATOR_OFFSET = 0;

// user_index is at offset 41 (after discriminator + user_account + user_type)
const USER_INDEX_OFFSET = 41;
const USER_INDEX_SIZE = 4;

// elevated_mint_attempts_used is at offset 45
const ELEVATED_ATTEMPTS_OFFSET = 45;
const ELEVATED_ATTEMPTS_SIZE = 4;

// bonus_mints_this_month is at offset 96 (after version at offset 95)
const BONUS_MINTS_OFFSET = 96;
const BONUS_MINTS_SIZE = 1;

// last_bonus_mint_year is at offset 97
const LAST_BONUS_YEAR_OFFSET = 97;
const LAST_BONUS_YEAR_SIZE = 4;

// last_bonus_mint_month is at offset 101
const LAST_BONUS_MONTH_OFFSET = 101;
const LAST_BONUS_MONTH_SIZE = 4;

// Minimum account size must be 105 bytes to include new fields (96 + 1 + 4 + 4)
const MIN_ACCOUNT_SIZE = 105;
// Legacy account size (before monthly bonus fields were added)
const LEGACY_ACCOUNT_SIZE = 96;

/**
 * Fetch and decode UserMetadata from on-chain
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns UserMetadata if account exists and is valid, null otherwise
 * 
 * Error logging distinguishes:
 * - Account missing (user not registered)
 * - Decode failed (invalid data or wrong account size)
 * - Network error (RPC failure)
 */
export async function fetchUserMetadata(
  connection: Connection,
  authority: PublicKey
): Promise<UserMetadata | null> {
  const [userMetadataPDA] = getUserMetadataPDA(authority);
  
  try {
    const accountInfo = await connection.getAccountInfo(userMetadataPDA);
    
    if (!accountInfo) {
      console.warn('⚠️ [UserMetadata] Account missing:', {
        type: 'ACCOUNT_NOT_FOUND',
        pda: userMetadataPDA.toBase58(),
        authority: authority.toBase58(),
        message: 'User may not be registered yet'
      });
      return null;
    }
    
    // Validate account size matches expected struct (support both legacy and new format)
    if (accountInfo.data.length < LEGACY_ACCOUNT_SIZE) {
      console.error('❌ [UserMetadata] Decode failed - invalid account size:', {
        type: 'INVALID_ACCOUNT_SIZE',
        pda: userMetadataPDA.toBase58(),
        actualSize: accountInfo.data.length,
        expectedSize: `${LEGACY_ACCOUNT_SIZE} (legacy) or ${MIN_ACCOUNT_SIZE} (current)`,
        message: `Account is ${accountInfo.data.length} bytes, expected at least ${LEGACY_ACCOUNT_SIZE} bytes`
      });
      return null;
    }
    
    const isLegacyFormat = accountInfo.data.length < MIN_ACCOUNT_SIZE;
    
    // Decode user_index (u32 little-endian at offset 41)
    const userIndexBN = new anchor.BN(
      accountInfo.data.slice(USER_INDEX_OFFSET, USER_INDEX_OFFSET + USER_INDEX_SIZE),
      'le'
    );
    const user_index = userIndexBN.toNumber();
    
    // Decode elevated_mint_attempts_used (u32 little-endian at offset 45)
    const elevatedAttemptsBN = new anchor.BN(
      accountInfo.data.slice(ELEVATED_ATTEMPTS_OFFSET, ELEVATED_ATTEMPTS_OFFSET + ELEVATED_ATTEMPTS_SIZE),
      'le'
    );
    const elevated_mint_attempts_used = elevatedAttemptsBN.toNumber();
    
    // Sanity check: user_index should be positive and reasonable
    if (user_index <= 0 || user_index > 100_000_000) {
      console.error('❌ [UserMetadata] Decode failed - invalid user_index:', {
        type: 'INVALID_USER_INDEX',
        pda: userMetadataPDA.toBase58(),
        user_index,
        validRange: '1-100,000,000',
        message: 'user_index outside valid range'
      });
      return null;
    }
    
    // Sanity check: elevated attempts should be reasonable
    if (elevated_mint_attempts_used < 0 || elevated_mint_attempts_used > 1000) {
      console.error('❌ [UserMetadata] Decode failed - invalid elevated_mint_attempts_used:', {
        type: 'INVALID_ELEVATED_ATTEMPTS',
        pda: userMetadataPDA.toBase58(),
        elevated_mint_attempts_used,
        validRange: '0-1000',
        message: 'elevated_mint_attempts_used outside valid range'
      });
      return null;
    }
    
    // Decode monthly bonus fields (if available, otherwise use defaults for legacy accounts)
    let bonus_mints_this_month = 0;
    let last_bonus_mint_year = 0;
    let last_bonus_mint_month = 0;
    
    if (!isLegacyFormat) {
      // Decode bonus_mints_this_month (u8 at offset 96)
      bonus_mints_this_month = accountInfo.data[BONUS_MINTS_OFFSET];
      
      // Decode last_bonus_mint_year (u32 little-endian at offset 97)
      const lastBonusYearBN = new anchor.BN(
        accountInfo.data.slice(LAST_BONUS_YEAR_OFFSET, LAST_BONUS_YEAR_OFFSET + LAST_BONUS_YEAR_SIZE),
        'le'
      );
      last_bonus_mint_year = lastBonusYearBN.toNumber();
      
      // Decode last_bonus_mint_month (u32 little-endian at offset 101)
      const lastBonusMonthBN = new anchor.BN(
        accountInfo.data.slice(LAST_BONUS_MONTH_OFFSET, LAST_BONUS_MONTH_OFFSET + LAST_BONUS_MONTH_SIZE),
        'le'
      );
      last_bonus_mint_month = lastBonusMonthBN.toNumber();
      
      // Sanity check: bonus_mints_this_month should not exceed 5 (ABSOLUTE_MONTHLY_CAP)
      if (bonus_mints_this_month > 5) {
        console.warn('⚠️ [UserMetadata] Unusual bonus_mints_this_month value:', {
          bonus_mints_this_month,
          message: 'Value exceeds expected monthly cap of 5'
        });
      }
      
      // Sanity check: month should be 1-12 or 0 (uninitialized)
      if (last_bonus_mint_month > 12) {
        console.warn('⚠️ [UserMetadata] Invalid last_bonus_mint_month:', {
          last_bonus_mint_month,
          validRange: '0-12',
          message: 'Month outside valid range'
        });
      }
    }
    
    const metadata: UserMetadata = {
      user_index,
      elevated_mint_attempts_used,
      bonus_mints_this_month,
      last_bonus_mint_year,
      last_bonus_mint_month,
    };
    
    console.log('✅ [UserMetadata] Successfully fetched and decoded:', {
      type: 'SUCCESS',
      pda: userMetadataPDA.toBase58(),
      user_index: metadata.user_index,
      elevated_mint_attempts_used: metadata.elevated_mint_attempts_used,
      bonus_mints_this_month: metadata.bonus_mints_this_month,
      last_bonus_mint_year: metadata.last_bonus_mint_year,
      last_bonus_mint_month: metadata.last_bonus_mint_month,
      accountSize: accountInfo.data.length,
      isLegacyFormat
    });
    
    return metadata;
  } catch (error) {
    console.error('❌ [UserMetadata] Network error during fetch:', {
      type: 'NETWORK_ERROR',
      pda: userMetadataPDA.toBase58(),
      authority: authority.toBase58(),
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to fetch account from RPC'
    });
    return null;
  }
}

/**
 * Check if user has a valid UserMetadata account
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns true if account exists and is valid
 */
export async function hasUserMetadata(
  connection: Connection,
  authority: PublicKey
): Promise<boolean> {
  const metadata = await fetchUserMetadata(connection, authority);
  return metadata !== null;
}

/**
 * Get user's registration number (user_index) from on-chain metadata
 * This is the canonical source of truth for tier determination
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns user_index if available, null otherwise
 */
export async function getUserIndex(
  connection: Connection,
  authority: PublicKey
): Promise<number | null> {
  const metadata = await fetchUserMetadata(connection, authority);
  return metadata?.user_index ?? null;
}

/**
 * Get user's elevated attempts used from on-chain metadata
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns elevated_mint_attempts_used if available, null otherwise
 */
export async function getElevatedAttemptsUsed(
  connection: Connection,
  authority: PublicKey
): Promise<number | null> {
  const metadata = await fetchUserMetadata(connection, authority);
  return metadata?.elevated_mint_attempts_used ?? null;
}

/**
 * Get remaining monthly bonus mints for a user
 * 
 * Calculates how many bonus mints the user can still claim this month.
 * Monthly cap: 5 bonus mints per calendar month (ABSOLUTE_MONTHLY_CAP = 5)
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns Remaining bonus mints (0-5), or 5 if metadata not found (default to max)
 */
export async function getRemainingMonthlyBonusMints(
  connection: Connection,
  authority: PublicKey
): Promise<number> {
  const metadata = await fetchUserMetadata(connection, authority);
  if (!metadata) {
    // Default to max if not found (conservative - allows user to attempt claim)
    return 5;
  }
  
  // Check if we're in the same month as the last bonus mint
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based, backend uses 1-based
  
  // If the year or month has changed, the counter resets to 0 on backend
  // So we can claim 5 more mints
  if (metadata.last_bonus_mint_year !== currentYear || 
      metadata.last_bonus_mint_month !== currentMonth) {
    return 5;
  }
  
  // Same month - return remaining from cap
  const ABSOLUTE_MONTHLY_CAP = 5;
  const remaining = ABSOLUTE_MONTHLY_CAP - metadata.bonus_mints_this_month;
  return Math.max(0, remaining);
}
