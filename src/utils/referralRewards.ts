/**
 * Referral Rewards Utilities
 * 
 * Functions for querying and managing referral credits on-chain.
 * 
 * IMPORTANT: Frontend reads INTEGER CREDIT COUNT from backend's `referral_rewards` field.
 * - Individual referrals: 1 credit per registration
 * - Business referrals: 2 credits per registration
 * - Credits are redeemable for bonus minting attempts (5 credits = 1 bonus mint)
 * 
 * Backend source: programs/equa_token/src/lib.rs (lines 765-790)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { parseUserAccountData, UserAccountData } from './onchainRegistration';
import { PROGRAM_ID } from '@/lib/constants';
import { 
  INDIVIDUAL_CREDIT_AWARD,
  BUSINESS_CREDIT_AWARD,
  CREDITS_FOR_BONUS_MINT,
  // Legacy percentage constants (deprecated)
  INDIVIDUAL_REFERRAL_PERCENT, 
  BUSINESS_REFERRAL_PERCENT
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
 * Get referral credits from backend UserAccount
 * 
 * Reads the authoritative `referral_rewards` field which contains
 * integer credit count (NOT EQUA token amounts).
 * 
 * @param connection - Solana connection
 * @param userAccountPubkey - User account PDA public key (NOT authority pubkey)
 * @returns Credit count as number, or null on error
 */
export async function getReferralCredits(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<number | null> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo) {
      console.warn('User account not found');
      return null;
    }

    const userData = parseUserAccountData(accountInfo.data);
    if (!userData) {
      console.warn('Failed to parse user account data');
      return null;
    }

    // Read integer credit count from backend
    // Note: Credits are stored as u64, which is within JavaScript's safe integer range
    // for reasonable credit values (MAX_SAFE_INTEGER = 9,007,199,254,740,991)
    const credits = userData.referralRewards.toNumber();

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Referral credits: ${credits}`);
    }

    return credits;
  } catch (error) {
    console.error('Error fetching referral credits:', error);
    return null;
  }
}

/**
 * Compute referral rewards from on-chain truth (minted amounts of referred users)
 * 
 * @deprecated This function incorrectly calculates percentages. Use getReferralCredits() instead.
 * Will be removed in next major version.
 * 
 * @param connection Solana connection
 * @param referrerAuthorityPubkey The referrer's wallet authority public key
 * @returns Computed rewards in base units (6 decimals), or null on error
 */
export async function computeReferralRewards(
  connection: Connection,
  referrerAuthorityPubkey: PublicKey
): Promise<BN | null> {
  if (process.env.NODE_ENV === 'development') {
    console.warn('computeReferralRewards is deprecated, use getReferralCredits instead');
  }
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

        // Use INDIVIDUAL_REFERRAL_PERCENT (1%) for all referrals
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
 * Get complete referral statistics for a user
 * 
 * Returns integer credit count from backend and actual on-chain referred user count.
 * 
 * @param connection - Solana connection
 * @param userAccountPubkey - The user account public key (PDA)
 * @returns Referral statistics with integer credits
 */
export async function getReferralStats(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<{
  credits: number;           // Integer credit count from backend
  referredCount: number;     // Actual referred user count
  canClaimBonus: boolean;    // true if credits >= 5
  referredUsers: PublicKey[]; // List of referred user PDAs
} | null> {
  try {
    // Get credits from backend UserAccount
    const credits = await getReferralCredits(connection, userAccountPubkey);
    if (credits === null) return null;

    // Get user account data to extract authority
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo) return null;

    const userData = parseUserAccountData(accountInfo.data);
    if (!userData) return null;

    // Get referred user count
    const referredUsers = await getUsersReferredBy(connection, userData.authority);
    const referredCount = referredUsers.length;

    return {
      credits,
      referredCount,
      canClaimBonus: credits >= CREDITS_FOR_BONUS_MINT,
      referredUsers,
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
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
