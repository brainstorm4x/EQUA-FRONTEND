/**
 * Referral Rewards Utilities
 * 
 * Functions for querying and managing referral rewards on-chain.
 * These functions allow users to check accumulated rewards and prepare
 * for claiming them (claiming requires backend program support).
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { parseUserAccountData, UserAccountData } from './onchainRegistration';
import { PROGRAM_ID } from '@/lib/constants';

/**
 * Get all users referred by a specific address
 * @param connection Solana connection
 * @param referrerPubkey The referrer's public key
 * @returns Array of user account public keys that were referred by this address
 */
export async function getUsersReferredBy(
  connection: Connection,
  referrerPubkey: PublicKey
): Promise<PublicKey[]> {
  try {
    // Get all accounts owned by the program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          // Filter by referral field (offset: 8 bytes discriminator + 32 bytes authority = 40)
          memcmp: {
            offset: 40,
            bytes: referrerPubkey.toBase58(),
          },
        },
      ],
    });

    return accounts.map(account => account.pubkey);
  } catch (error) {
    console.error('Error fetching referred users:', error);
    return [];
  }
}

/**
 * Get referral rewards balance for a user account
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns The referral rewards balance as a BN, or null if account doesn't exist
 */
export async function getReferralRewardsBalance(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<BN | null> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo || accountInfo.data.length < 128) {
      return null;
    }

    const userData = parseUserAccountData(accountInfo.data);
    return userData?.referralRewards || null;
  } catch (error) {
    console.error('Error fetching referral rewards:', error);
    return null;
  }
}

/**
 * Get complete referral statistics for a user
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns Referral statistics including rewards and referred users count
 */
export async function getReferralStats(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<{
  referralRewards: BN;
  referredUsersCount: number;
  referredUsers: PublicKey[];
} | null> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo) {
      return null;
    }

    const userData = parseUserAccountData(accountInfo.data);
    if (!userData) {
      return null;
    }

    // Get all users this account has referred
    const referredUsers = await getUsersReferredBy(connection, userData.authority);

    return {
      referralRewards: userData.referralRewards,
      referredUsersCount: referredUsers.length,
      referredUsers,
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return null;
  }
}

/**
 * Format referral rewards from base units to display format (6 decimals)
 * @param rewardsRaw Raw rewards amount (base units)
 * @returns Formatted string with 6 decimals
 */
export function formatReferralRewards(rewardsRaw: BN): string {
  const DECIMALS = 6;
  const divisor = new BN(10).pow(new BN(DECIMALS));
  
  const whole = rewardsRaw.div(divisor);
  const remainder = rewardsRaw.mod(divisor);
  
  // Pad remainder to 6 digits
  const remainderStr = remainder.toString().padStart(DECIMALS, '0');
  
  return `${whole.toString()}.${remainderStr}`;
}

/**
 * Check if a user account has claimable rewards
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns true if rewards > 0, false otherwise
 */
export async function hasClaimableRewards(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  const rewards = await getReferralRewardsBalance(connection, userAccountPubkey);
  return rewards !== null && rewards.gt(new BN(0));
}

/**
 * Get detailed information about each referred user
 * @param connection Solana connection
 * @param referredUserPubkeys Array of referred user public keys
 * @returns Array of user account data for each referred user
 */
export async function getReferredUsersDetails(
  connection: Connection,
  referredUserPubkeys: PublicKey[]
): Promise<(UserAccountData & { pubkey: PublicKey })[]> {
  const details: (UserAccountData & { pubkey: PublicKey })[] = [];

  for (const pubkey of referredUserPubkeys) {
    try {
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (accountInfo) {
        const userData = parseUserAccountData(accountInfo.data);
        if (userData) {
          details.push({ ...userData, pubkey });
        }
      }
    } catch (error) {
      console.error(`Error fetching details for ${pubkey.toBase58()}:`, error);
    }
  }

  return details;
}
