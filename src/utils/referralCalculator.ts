<<<<<<< HEAD
/**
 * EQUA Token Referral Reward Calculator
 * 
 * Calculates referral rewards based on user tier:
 * - Users 1-100: 1,000 EQUA
 * - Users 101-1,000: 500 EQUA
 * - Users 1,001-10,000: 100 EQUA
 * - Users 10,001+: 50 EQUA
 */

export interface ReferralRewardInfo {
  userIndex: number;
  tier: string;
  rewardAmount: number;
  rewardAmountRaw: bigint; // With 6 decimals
  description: string;
}

export class ReferralRewardCalculator {
  // Reward amounts (in EQUA, stored with 6 decimals)
  private static readonly TIER_1_REWARD = 1_000_000_000n; // 1,000 EQUA
  private static readonly TIER_2_REWARD = 500_000_000n;   // 500 EQUA
  private static readonly TIER_3_REWARD = 100_000_000n;   // 100 EQUA
  private static readonly TIER_4_REWARD = 50_000_000n;    // 50 EQUA

  private static readonly DECIMALS = 6;
  private static readonly DECIMAL_MULTIPLIER = 10 ** this.DECIMALS;

  /**
   * Calculate referral reward for a given user index
   */
  static calculateReward(userIndex: number): ReferralRewardInfo {
    let rewardAmountRaw: bigint;
    let tier: string;
    let description: string;

    if (userIndex <= 100) {
      rewardAmountRaw = this.TIER_1_REWARD;
      tier = "Tier 1 (1-100)";
      description = "Early Adopter Premium";
    } else if (userIndex <= 1_000) {
      rewardAmountRaw = this.TIER_2_REWARD;
      tier = "Tier 2 (101-1,000)";
      description = "Pioneer Reward";
    } else if (userIndex <= 10_000) {
      rewardAmountRaw = this.TIER_3_REWARD;
      tier = "Tier 3 (1,001-10,000)";
      description = "Community Builder";
    } else {
      rewardAmountRaw = this.TIER_4_REWARD;
      tier = "Tier 4 (10,001+)";
      description = "Standard Referral";
    }

    const rewardAmount = Number(rewardAmountRaw) / this.DECIMAL_MULTIPLIER;

    return {
      userIndex,
      tier,
      rewardAmount,
      rewardAmountRaw,
      description,
    };
  }

  /**
   * Calculate total rewards for multiple referrals
   */
  static calculateTotalRewards(userIndices: number[]): {
    totalReward: number;
    totalRewardRaw: bigint;
    breakdown: ReferralRewardInfo[];
  } {
    const breakdown = userIndices.map((index) => this.calculateReward(index));
    const totalRewardRaw = breakdown.reduce(
      (sum, info) => sum + info.rewardAmountRaw,
      0n
    );
    const totalReward = Number(totalRewardRaw) / this.DECIMAL_MULTIPLIER;

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
    const amount = Number(rewardAmountRaw) / this.DECIMAL_MULTIPLIER;
    return `${amount.toLocaleString()} EQUA`;
  }

  /**
   * Convert raw amount to human-readable
   */
  static fromRaw(rawAmount: bigint | number): number {
    const raw = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount);
    return Number(raw) / this.DECIMAL_MULTIPLIER;
  }

  /**
   * Convert human-readable to raw amount
   */
  static toRaw(amount: number): bigint {
    return BigInt(Math.floor(amount * this.DECIMAL_MULTIPLIER));
  }

  /**
   * Get all tier information
   */
  static getTierInfo(): Array<{
    tier: string;
    userRange: string;
    reward: number;
    description: string;
  }> {
    return [
      {
        tier: "Tier 1",
        userRange: "1-100",
        reward: Number(this.TIER_1_REWARD) / this.DECIMAL_MULTIPLIER,
        description: "Early Adopter Premium",
      },
      {
        tier: "Tier 2",
        userRange: "101-1,000",
        reward: Number(this.TIER_2_REWARD) / this.DECIMAL_MULTIPLIER,
        description: "Pioneer Reward",
      },
      {
        tier: "Tier 3",
        userRange: "1,001-10,000",
        reward: Number(this.TIER_3_REWARD) / this.DECIMAL_MULTIPLIER,
        description: "Community Builder",
      },
      {
        tier: "Tier 4",
        userRange: "10,001+",
        reward: Number(this.TIER_4_REWARD) / this.DECIMAL_MULTIPLIER,
        description: "Standard Referral",
      },
    ];
  }

  /**
   * Estimate future rewards
   */
  static estimateRewards(
    currentUserCount: number,
    projectedNewUsers: number
  ): number {
    let totalRewards = 0;

    for (let i = 1; i <= projectedNewUsers; i++) {
      const userIndex = currentUserCount + i;
      const info = this.calculateReward(userIndex);
      totalRewards += info.rewardAmount;
    }

    return totalRewards;
  }
}

// Export convenience functions
export function calculateReferralReward(userIndex: number): ReferralRewardInfo {
  return ReferralRewardCalculator.calculateReward(userIndex);
}

export function formatReferralReward(rewardAmountRaw: bigint): string {
  return ReferralRewardCalculator.formatReward(rewardAmountRaw);
}
=======
404: Not Found
>>>>>>> 369107deb2deb2298e4e33d2b4bd97b0179db76c
