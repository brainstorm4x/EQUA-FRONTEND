/**
 * Referral Rewards Utilities
 * 
 * Functions for querying and managing referral rewards on-chain.
 * 
 * IMPORTANT: Frontend now displays COMPUTED rewards based on actual minted amounts
 * of referred users (1% individual / 2% business), NOT the stored `referral_rewards`
 * field which contains legacy signup bonuses. This ensures displayed rewards reflect
 * only mint-based percentages and adjust dynamically with changing mint amounts.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { parseUserAccountData, UserAccountData } from './onchainRegistration';
import { PROGRAM_ID } from '@/lib/constants';
import { 
  INDIVIDUAL_REFERRAL_PERCENT, 
  BUSINESS_REFERRAL_PERCENT // Reserved for future use when backend adds referral_type field
} from './referralCalculator';

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
 * Get referral rewards balance for a user account (LEGACY - stored value)
 * 
 * NOTE: This returns the STORED `referral_rewards` field which includes legacy signup bonuses.
 * For accurate mint-based rewards, use `computeReferralRewards()` instead.
 * 
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns The referral rewards balance as a BN, or null if account doesn't exist
 * @deprecated Use computeReferralRewards for accurate mint-based rewards
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
 * Compute referral rewards from on-chain truth (minted amounts of referred users)
 * 
 * This function calculates rewards as a percentage of actual minted tokens by referred users,
 * ignoring the stored `referral_rewards` field which contains legacy signup bonuses.
 * 
 * Percentages:
 * - Individual referrals: 1% of minted amount
 * - Business referrals: 2% of minted amount (when backend adds referral_type field)
 * 
 * @param connection Solana connection
 * @param referrerAuthorityPubkey The referrer's wallet authority public key
 * @returns Computed rewards in base units (6 decimals), or null on error
 */
export async function computeReferralRewards(
  connection: Connection,
  referrerAuthorityPubkey: PublicKey
): Promise<BN | null> {
  try {
    // Get all users referred by this authority
    const referredUserPubkeys = await getUsersReferredBy(connection, referrerAuthorityPubkey);
    
    if (referredUserPubkeys.length === 0) {
      return new BN(0);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Computing rewards for ${referredUserPubkeys.length} referred users`);
    }

    let totalRewards = new BN(0);

    // For each referred user, calculate reward based on their minted amount
    for (const userPubkey of referredUserPubkeys) {
      try {
        const accountInfo = await connection.getAccountInfo(userPubkey);
        if (!accountInfo) continue;

        const userData = parseUserAccountData(accountInfo.data);
        if (!userData) continue;

        // Get minted amount (in base units - 6 decimals)
        const mintedAmount = userData.mintedAmount;

        // TODO: When backend adds referral_type field, check it here to use 1% or 2%
        // For now, use INDIVIDUAL_REFERRAL_PERCENT (1%) for all referrals
        const rewardPercent = INDIVIDUAL_REFERRAL_PERCENT;

        // Calculate reward: (minted_amount * percent) / 100
        // Use BN arithmetic to avoid overflow
        const reward = mintedAmount.mul(new BN(rewardPercent)).div(new BN(100));
        
        totalRewards = totalRewards.add(reward);

        if (process.env.NODE_ENV === 'development') {
          console.log(`  - User ${userPubkey.toBase58().slice(0, 8)}: minted ${mintedAmount.toString()}, reward ${reward.toString()}`);
        }
      } catch (error) {
        console.error(`Error processing referred user ${userPubkey.toBase58()}:`, error);
        // Continue processing other users
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Total computed rewards: ${totalRewards.toString()} base units`);
    }
    return totalRewards;
  } catch (error) {
    console.error('Error computing referral rewards:', error);
    return null;
  }
}

/**
 * Get complete referral statistics for a user (with COMPUTED rewards)
 * 
 * Returns computed mint-based rewards (not the stored legacy value) and actual
 * on-chain referred user count.
 * 
 * @param connection Solana connection
 * @param userAccountPubkey The user account public key
 * @returns Referral statistics with computed rewards and on-chain user count
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

    // Get all users this account has referred (on-chain source of truth)
    const referredUsers = await getUsersReferredBy(connection, userData.authority);

    // Compute rewards from actual minted amounts (not the stored field)
    const computedRewards = await computeReferralRewards(connection, userData.authority);

    return {
      referralRewards: computedRewards || new BN(0),  // Use computed rewards
      referredUsersCount: referredUsers.length,       // Use on-chain count
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
