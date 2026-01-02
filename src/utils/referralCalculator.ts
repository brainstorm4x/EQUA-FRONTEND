/**
 * EQUA Token Referral Reward Calculator
 * 
 * Calculates referral rewards as integer credits awarded on registration:
 * - Individual referrals: 1 credit per successful registration
 * - Business referrals: 2 credits per successful registration
 * 
 * Credits are redeemable for bonus minting attempts (5 credits = 1 bonus mint).
 * Credits are stored as integers in the backend UserAccount.referral_rewards field.
 * 
 * Backend source: programs/equa_token/src/lib.rs (lines 765-790)
 */

import { formatEquaRaw } from './tokenFormat';
import { AccountType } from './registration';

// Referral credit awards (integer-based, NOT percentages)
export const INDIVIDUAL_CREDIT_AWARD = 1;  // 1 credit per individual referral
export const BUSINESS_CREDIT_AWARD = 2;    // 2 credits per business referral
export const CREDITS_FOR_BONUS_MINT = 5;   // 5 credits = 1 bonus mint attempt

// @deprecated Use INDIVIDUAL_CREDIT_AWARD instead. Will be removed in next major version.
export const INDIVIDUAL_REFERRAL_PERCENT = 1;  // 1% for referring individuals
// @deprecated Use BUSINESS_CREDIT_AWARD instead. Will be removed in next major version.
export const BUSINESS_REFERRAL_PERCENT = 2;    // 2% for referring businesses

// EQUA token decimals (6 decimals)
const EQUA_DECIMALS = 6;
const EQUA_DECIMAL_MULTIPLIER = 10 ** EQUA_DECIMALS; // 1_000_000

export interface ReferralRewardInfo {
  userIndex: number;
  accountType: AccountType;
  referralPercent: number;
  rewardAmount: number;
  rewardAmountRaw: bigint;
  description: string;
  isRecurring: boolean;
}

/**
 * Information about a credit-based referral reward calculation
 */
export interface CreditBasedRewardInfo {
  /** The type of account being referred */
  accountType: AccountType;
  /** Integer credits awarded for this referral (1 or 2) */
  creditsAwarded: number;
  /** Total accumulated credits from backend */
  totalCredits: number;
  /** Credits required for bonus mint (always 5) */
  creditsForBonusMint: number;
  /** Whether user can claim a bonus mint */
  canClaimBonus: boolean;
}

/**
 * Information about a percentage-based referral reward calculation
 * @deprecated Use CreditBasedRewardInfo instead. Will be removed in next major version.
 */
export interface PercentageBasedRewardInfo {
  /** The amount of EQUA being minted by the referee (in base units / Gajbhiyes) */
  mintAmount: number;
  /** The type of account being referred */
  accountType: AccountType;
  /** The referral percentage applied (1% for individuals, 2% for businesses) */
  referralPercent: number;
  /** The calculated reward in human-readable EQUA tokens */
  rewardAmount: number;
  /** The calculated reward in base units (Gajbhiyes) - 9 decimals precision */
  rewardAmountRaw: bigint;
  /** Whether this is a recurring reward (true = earned on each mint by referee) */
  isRecurring: boolean;
}

export class ReferralRewardCalculator {
  /**
   * Get credit award amount based on account type
   * Matches backend logic: 1 credit for individual, 2 for business
   */
  static getCreditAward(accountType: AccountType): number {
    return accountType === 'business' ? BUSINESS_CREDIT_AWARD : INDIVIDUAL_CREDIT_AWARD;
  }

  /**
   * Calculate credit-based reward info
   * @param accountType - Type of referral (individual or business)
   * @param currentTotalCredits - Current accumulated credits from backend
   * @returns Credit-based reward information
   */
  static calculateCreditReward(
    accountType: AccountType,
    currentTotalCredits: number
  ): CreditBasedRewardInfo {
    const creditsAwarded = this.getCreditAward(accountType);
    const totalCredits = currentTotalCredits;
    const creditsForBonusMint = CREDITS_FOR_BONUS_MINT;
    const canClaimBonus = totalCredits >= creditsForBonusMint;

    return {
      accountType,
      creditsAwarded,
      totalCredits,
      creditsForBonusMint,
      canClaimBonus,
    };
  }

  /**
   * Format credit count for display
   */
  static formatCredits(credits: number): string {
    return `${credits} Credit${credits !== 1 ? 's' : ''}`;
  }

  /**
   * Get the referral percentage based on account type
   * @deprecated Use getCreditAward instead. Will be removed in next major version.
   */
  static getReferralPercent(accountType: AccountType): number {
    if (process.env.NODE_ENV === 'development') {
      console.warn('getReferralPercent is deprecated, use getCreditAward instead');
    }
    return accountType === 'business' ? BUSINESS_REFERRAL_PERCENT : INDIVIDUAL_REFERRAL_PERCENT;
  }

  /**
   * Calculate referral reward as a percentage of minted amount
   * This is the primary reward calculation method for the new percentage-based system
   * 
   * @deprecated Use calculateCreditReward instead. Will be removed in next major version.
   * @param mintAmount - The amount of EQUA being minted by the referee (in base units)
   * @param accountType - The type of account being referred ('individual' or 'business')
   * @returns PercentageBasedRewardInfo with calculated reward
   */
  static calculatePercentageReward(
    mintAmount: number,
    accountType: AccountType
  ): PercentageBasedRewardInfo {
    if (process.env.NODE_ENV === 'development') {
      console.warn('calculatePercentageReward is deprecated, use calculateCreditReward instead');
    }
    const referralPercent = this.getReferralPercent(accountType);
    // Use integer arithmetic to avoid floating-point precision issues
    // Calculate: (mintAmount * referralPercent) / 100
    const rewardAmountRaw = BigInt(Math.floor(mintAmount)) * BigInt(referralPercent) / 100n;
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

/**
 * @deprecated Use calculateCreditReward instead. Will be removed in next major version.
 */
export function calculatePercentageReferralReward(mintAmount: number, accountType: AccountType): PercentageBasedRewardInfo {
  if (process.env.NODE_ENV === 'development') {
    console.warn('calculatePercentageReferralReward is deprecated, use calculateCreditReward instead');
  }
  return ReferralRewardCalculator.calculatePercentageReward(mintAmount, accountType);
}

export function formatReferralReward(rewardAmountRaw: bigint): string {
  return ReferralRewardCalculator.formatReward(rewardAmountRaw);
}

/**
 * @deprecated Use getCreditAward instead. Will be removed in next major version.
 */
export function getReferralPercent(accountType: AccountType): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn('getReferralPercent is deprecated, use getCreditAward instead');
  }
  return ReferralRewardCalculator.getReferralPercent(accountType);
}

// New credit-based functions
export function calculateCreditReward(accountType: AccountType, currentTotalCredits: number): CreditBasedRewardInfo {
  return ReferralRewardCalculator.calculateCreditReward(accountType, currentTotalCredits);
}

export function getCreditAward(accountType: AccountType): number {
  return ReferralRewardCalculator.getCreditAward(accountType);
}

export function formatCredits(credits: number): string {
  return ReferralRewardCalculator.formatCredits(credits);
}
