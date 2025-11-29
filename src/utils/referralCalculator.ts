/**
 * EQUA Token Referral Reward Calculator
 * 
 * Calculates referral rewards as a percentage of minted tokens:
 * - Individual referrals: 1% of referred user's minted tokens (one-time on each mint)
 * - Business referrals: 2% of referred user's minted tokens (one-time on each mint)
 * 
 * Note: These are recurring rewards - the referrer gets a percentage each time
 * their referee mints tokens.
 */

import { formatEquaRaw } from './tokenFormat';
import { AccountType } from './registration';

// Referral reward percentages
export const INDIVIDUAL_REFERRAL_PERCENT = 1;  // 1% for referring individuals
export const BUSINESS_REFERRAL_PERCENT = 2;    // 2% for referring businesses

// EQUA token decimals (9 decimals)
const EQUA_DECIMALS = 9;
const EQUA_DECIMAL_MULTIPLIER = 10 ** EQUA_DECIMALS;

export interface ReferralRewardInfo {
  userIndex: number;
  accountType: AccountType;
  referralPercent: number;
  rewardAmount: number;
  rewardAmountRaw: bigint;
  description: string;
  isRecurring: boolean;
}

export interface PercentageBasedRewardInfo {
  mintAmount: number;
  accountType: AccountType;
  referralPercent: number;
  rewardAmount: number;
  rewardAmountRaw: bigint;
  isRecurring: boolean;
}

export class ReferralRewardCalculator {
  /**
   * Get the referral percentage based on account type
   */
  static getReferralPercent(accountType: AccountType): number {
    return accountType === 'business' ? BUSINESS_REFERRAL_PERCENT : INDIVIDUAL_REFERRAL_PERCENT;
  }

  /**
   * Calculate referral reward as a percentage of minted amount
   * This is the primary reward calculation method for the new percentage-based system
   * 
   * @param mintAmount - The amount of EQUA being minted by the referee (in base units)
   * @param accountType - The type of account being referred ('individual' or 'business')
   * @returns PercentageBasedRewardInfo with calculated reward
   */
  static calculatePercentageReward(
    mintAmount: number,
    accountType: AccountType
  ): PercentageBasedRewardInfo {
    const referralPercent = this.getReferralPercent(accountType);
    const rewardAmountRaw = BigInt(Math.floor(mintAmount * referralPercent / 100));
    const rewardAmount = Number(rewardAmountRaw) / EQUA_DECIMAL_MULTIPLIER;

    return {
      mintAmount,
      accountType,
      referralPercent,
      rewardAmount,
      rewardAmountRaw,
      isRecurring: true, // Rewards are recurring (on each mint)
    };
  }

  /**
   * Calculate referral reward for a given user index (legacy method for backward compatibility)
   * Now uses percentage-based calculation with a default mint amount
   */
  static calculateReward(userIndex: number, accountType: AccountType = 'individual'): ReferralRewardInfo {
    const referralPercent = this.getReferralPercent(accountType);
    
    // For legacy compatibility, calculate based on default mint amounts per tier
    let defaultMintAmount: number;
    let description: string;
    
    if (userIndex <= 100) {
      defaultMintAmount = 100_000 * EQUA_DECIMAL_MULTIPLIER; // 100,000 EQUA for early adopters
      description = "Early Adopter Referral";
    } else if (userIndex <= 1_000) {
      defaultMintAmount = 10_000 * EQUA_DECIMAL_MULTIPLIER; // 10,000 EQUA for pioneers
      description = "Pioneer Referral";
    } else if (userIndex <= 10_000) {
      defaultMintAmount = 1_000 * EQUA_DECIMAL_MULTIPLIER; // 1,000 EQUA for community builders
      description = "Community Builder Referral";
    } else {
      defaultMintAmount = 100 * EQUA_DECIMAL_MULTIPLIER; // 100 EQUA for standard users
      description = "Standard Referral";
    }

    const rewardAmountRaw = BigInt(Math.floor(defaultMintAmount * referralPercent / 100));
    const rewardAmount = Number(rewardAmountRaw) / EQUA_DECIMAL_MULTIPLIER;

    return {
      userIndex,
      accountType,
      referralPercent,
      rewardAmount,
      rewardAmountRaw,
      description,
      isRecurring: true, // Rewards are recurring
    };
  }

  /**
   * Calculate total rewards for multiple referrals
   */
  static calculateTotalRewards(
    referrals: Array<{ userIndex: number; accountType: AccountType }>
  ): {
    totalReward: number;
    totalRewardRaw: bigint;
    breakdown: ReferralRewardInfo[];
  } {
    const breakdown = referrals.map(({ userIndex, accountType }) => 
      this.calculateReward(userIndex, accountType)
    );
    const totalRewardRaw = breakdown.reduce(
      (sum, info) => sum + info.rewardAmountRaw,
      0n
    );
    const totalReward = Number(totalRewardRaw) / EQUA_DECIMAL_MULTIPLIER;

    return {
      totalReward,
      totalRewardRaw,
      breakdown,
    };
  }

  /**
   * Format reward amount for display
   */
  static formatReward(rewardAmountRaw: bigint): string {
    return `${formatEquaRaw(Number(rewardAmountRaw), { trimTrailingZeros: true })} EQUA`;
  }

  /**
   * Convert raw amount to human-readable
   */
  static fromRaw(rawAmount: bigint | number): number {
    const raw = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount);
    return Number(raw) / EQUA_DECIMAL_MULTIPLIER;
  }

  /**
   * Convert human-readable to raw amount
   */
  static toRaw(amount: number): bigint {
    return BigInt(Math.floor(amount * EQUA_DECIMAL_MULTIPLIER));
  }

  /**
   * Get referral tier information
   */
  static getTierInfo(): Array<{
    tier: string;
    userRange: string;
    individualPercent: number;
    businessPercent: number;
    description: string;
    isRecurring: boolean;
  }> {
    return [
      {
        tier: "Individual",
        userRange: "All users",
        individualPercent: INDIVIDUAL_REFERRAL_PERCENT,
        businessPercent: 0,
        description: "1% of referred user's minted tokens",
        isRecurring: true,
      },
      {
        tier: "Business",
        userRange: "All users",
        individualPercent: 0,
        businessPercent: BUSINESS_REFERRAL_PERCENT,
        description: "2% of referred user's minted tokens",
        isRecurring: true,
      },
    ];
  }

  /**
   * Estimate future rewards based on expected mint amounts
   */
  static estimateRewards(
    estimatedMintAmount: number,
    numberOfReferrals: number,
    accountType: AccountType = 'individual'
  ): number {
    const referralPercent = this.getReferralPercent(accountType);
    return (estimatedMintAmount * numberOfReferrals * referralPercent) / 100;
  }
}

// Export convenience functions
export function calculateReferralReward(userIndex: number, accountType: AccountType = 'individual'): ReferralRewardInfo {
  return ReferralRewardCalculator.calculateReward(userIndex, accountType);
}

export function calculatePercentageReferralReward(mintAmount: number, accountType: AccountType): PercentageBasedRewardInfo {
  return ReferralRewardCalculator.calculatePercentageReward(mintAmount, accountType);
}

export function formatReferralReward(rewardAmountRaw: bigint): string {
  return ReferralRewardCalculator.formatReward(rewardAmountRaw);
}

export function getReferralPercent(accountType: AccountType): number {
  return ReferralRewardCalculator.getReferralPercent(accountType);
}
