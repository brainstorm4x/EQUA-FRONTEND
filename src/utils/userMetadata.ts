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
 * UserMetadata account structure (based on canonical backend)
 * 
 * Layout (total 24 bytes + 8 discriminator = 32 bytes):
 * - discriminator: [u8; 8] - Anchor account discriminator
 * - user_index: u32 - User registration order (1-based, so user #1 has index 1)
 * - elevated_mint_attempts_used: u32 - Number of elevated attempts used
 * - padding: [u8; 16] - Reserved for future fields
 */
export interface UserMetadata {
  user_index: number;
  elevated_mint_attempts_used: number;
}

// Account size constants
const DISCRIMINATOR_SIZE = 8;
const USER_INDEX_OFFSET = 8;
const USER_INDEX_SIZE = 4;
const ELEVATED_ATTEMPTS_OFFSET = 12;
const ELEVATED_ATTEMPTS_SIZE = 4;
const MIN_ACCOUNT_SIZE = 16; // discriminator (8) + user_index (4) + elevated_attempts (4)

/**
 * Fetch and decode UserMetadata from on-chain
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns UserMetadata if account exists and is valid, null otherwise
 */
export async function fetchUserMetadata(
  connection: Connection,
  authority: PublicKey
): Promise<UserMetadata | null> {
  try {
    const [userMetadataPDA] = getUserMetadataPDA(authority);
    
    const accountInfo = await connection.getAccountInfo(userMetadataPDA);
    
    if (!accountInfo) {
      console.warn('⚠️ UserMetadata account not found for:', authority.toBase58());
      return null;
    }
    
    if (accountInfo.data.length < MIN_ACCOUNT_SIZE) {
      console.error('❌ UserMetadata account too small:', accountInfo.data.length, 'bytes (expected at least', MIN_ACCOUNT_SIZE, 'bytes)');
      return null;
    }
    
    // Decode user_index (u32 little-endian at offset 8)
    const userIndexBN = new anchor.BN(
      accountInfo.data.slice(USER_INDEX_OFFSET, USER_INDEX_OFFSET + USER_INDEX_SIZE),
      'le'
    );
    const user_index = userIndexBN.toNumber();
    
    // Decode elevated_mint_attempts_used (u32 little-endian at offset 12)
    const elevatedAttemptsBN = new anchor.BN(
      accountInfo.data.slice(ELEVATED_ATTEMPTS_OFFSET, ELEVATED_ATTEMPTS_OFFSET + ELEVATED_ATTEMPTS_SIZE),
      'le'
    );
    const elevated_mint_attempts_used = elevatedAttemptsBN.toNumber();
    
    // Sanity check: user_index should be positive and reasonable
    if (user_index <= 0 || user_index > 100_000_000) {
      console.error('❌ Invalid user_index:', user_index, '(expected 1-100,000,000)');
      return null;
    }
    
    // Sanity check: elevated attempts should be reasonable
    if (elevated_mint_attempts_used < 0 || elevated_mint_attempts_used > 1000) {
      console.error('❌ Invalid elevated_mint_attempts_used:', elevated_mint_attempts_used, '(expected 0-1000)');
      return null;
    }
    
    const metadata: UserMetadata = {
      user_index,
      elevated_mint_attempts_used,
    };
    
    console.log('✅ UserMetadata fetched:', {
      pda: userMetadataPDA.toBase58(),
      user_index: metadata.user_index,
      elevated_mint_attempts_used: metadata.elevated_mint_attempts_used,
    });
    
    return metadata;
  } catch (error) {
    console.error('❌ Error fetching UserMetadata:', error);
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
