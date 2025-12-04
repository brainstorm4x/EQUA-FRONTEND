/**
 * Onchain Registration Utilities
 * 
 * Functions for checking and validating user registration on-chain,
 * without relying on database storage.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * UserAccount structure from the IDL
 */
export interface UserAccountData {
  authority: PublicKey;
  referral: PublicKey;
  tokenAccount: PublicKey;
  mintedAmount: BN;
  mintStart: BN;
  lockedUntil: BN;
  referralRewards: BN;
  lastMintTime: BN;
}

/**
 * Check if a user account exists on-chain
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key (not PDA, but a Keypair)
 * @returns true if the account exists and has data, false otherwise
 */
export async function isUserAccountRegisteredOnchain(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    return accountInfo !== null && accountInfo.data.length > 0;
  } catch (error) {
    console.error('Error checking user account registration:', error);
    return false;
  }
}

/**
 * Validate that a referrer account exists on-chain
 * @param connection Solana connection
 * @param referrerPubkey The referrer's user account public key
 * @returns true if the referrer account exists, false otherwise
 */
export async function validateReferrerOnchain(
  connection: Connection,
  referrerPubkey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(referrerPubkey);
    // Check that account exists and has sufficient data to be a UserAccount
    // UserAccount discriminator (8 bytes) + authority (32) + referral (32) + ... = at least 144 bytes
    return accountInfo !== null && accountInfo.data.length >= 144;
  } catch (error) {
    console.error('Error validating referrer account:', error);
    return false;
  }
}

/**
 * Parse UserAccount data from raw account data
 * @param accountData Raw account data buffer
 * @returns Parsed UserAccountData or null if parsing fails
 */
export function parseUserAccountData(accountData: Buffer): UserAccountData | null {
  try {
    // Check minimum length
    if (accountData.length < 144) {
      console.error('Account data too short to be a valid UserAccount');
      return null;
    }

    // Offsets based on IDL structure:
    // 8 bytes: discriminator
    // 32 bytes: authority (Pubkey)
    // 32 bytes: referral (Pubkey)
    // 32 bytes: token_account (Pubkey)
    // 8 bytes: minted_amount (u64)
    // 8 bytes: mint_start (i64)
    // 8 bytes: locked_until (i64)
    // 8 bytes: referral_rewards (u64)
    // 8 bytes: last_mint_time (i64)
    
    let offset = 8; // Skip discriminator
    
    const authority = new PublicKey(accountData.slice(offset, offset + 32));
    offset += 32;
    
    const referral = new PublicKey(accountData.slice(offset, offset + 32));
    offset += 32;
    
    const tokenAccount = new PublicKey(accountData.slice(offset, offset + 32));
    offset += 32;
    
    const mintedAmount = new BN(accountData.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const mintStart = new BN(accountData.slice(offset, offset + 8), 'le');
    offset += 8;
    
    // Note: mintStart, lockedUntil, and lastMintTime are i64 (signed) in the IDL,
    // but for timestamp values, we treat them as unsigned since timestamps are always positive.
    // If negative values are encountered, they would wrap around in the BN representation.
    const lockedUntil = new BN(accountData.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const referralRewards = new BN(accountData.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const lastMintTime = new BN(accountData.slice(offset, offset + 8), 'le');
    
    return {
      authority,
      referral,
      tokenAccount,
      mintedAmount,
      mintStart,
      lockedUntil,
      referralRewards,
      lastMintTime,
    };
  } catch (error) {
    console.error('Error parsing UserAccount data:', error);
    return null;
  }
}

/**
 * Fetch and parse a user account from the blockchain
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns Parsed UserAccountData or null if account doesn't exist or parsing fails
 */
export async function getUserAccountData(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<UserAccountData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    
    if (!accountInfo || accountInfo.data.length === 0) {
      return null;
    }
    
    return parseUserAccountData(accountInfo.data);
  } catch (error) {
    console.error('Error fetching user account data:', error);
    return null;
  }
}

/**
 * Check if a public key is the default public key (all zeros)
 * Used to check if a user has a referrer
 */
export function isDefaultPublicKey(pubkey: PublicKey): boolean {
  return pubkey.equals(PublicKey.default);
}

/**
 * Get referral information from a user account
 * @param accountData Parsed UserAccountData
 * @returns Object with referral info
 */
export function getReferralInfo(accountData: UserAccountData) {
  const hasReferrer = !isDefaultPublicKey(accountData.referral);
  
  return {
    hasReferrer,
    referralAddress: hasReferrer ? accountData.referral.toBase58() : null,
    referralRewards: accountData.referralRewards.toNumber(),
  };
}
