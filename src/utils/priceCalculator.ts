<<<<<<< HEAD
/**
 * EQUA Token Price Appreciation Calculator
 * 
 * Phase 1 (Compounding): Epochs 1-168,121
 * - Initial: $0.01
 * - Growth: 1% per epoch (1,000 transactions)
 * - Max: 2,500 epochs/month
 * - End: $200,003 at epoch 168,121
 * 
 * Phase 2 (Linear): Epochs 168,122+
 * - Base: $200,003
 * - Growth: $100 per epoch
 * - No rate limit
 */

export interface PriceInfo {
  currentPrice: number;
  currentEpoch: number;
  totalTransactions: number;
  phase: 'compounding' | 'linear';
  nextEpochPrice: number;
  transactionsToNextEpoch: number;
  compoundingComplete: boolean;
}

export class EquaPriceCalculator {
  // Constants
  private static readonly INITIAL_PRICE = 0.01;
  private static readonly COMPOUNDING_RATE = 0.01; // 1%
  private static readonly COMPOUNDING_END_EPOCH = 168_121;
  private static readonly PHASE2_BASE_PRICE = 200_003;
  private static readonly PHASE2_INCREMENT = 100;
  private static readonly TRANSACTIONS_PER_EPOCH = 1000;
  private static readonly MAX_EPOCHS_PER_MONTH = 2500;

  /**
   * Calculate current EQUA price based on transaction count
   */
  static calculatePrice(
    totalTransactions: number,
    currentEpoch: number,
    compoundingComplete: boolean
  ): number {
    // If no transactions yet, return initial price
    if (totalTransactions === 0) {
      return this.INITIAL_PRICE;
    }

    // Phase 1: Compounding
    if (!compoundingComplete && currentEpoch < this.COMPOUNDING_END_EPOCH) {
      return this.calculateCompoundingPrice(currentEpoch);
    }

    // Phase 2: Linear growth
    return this.calculateLinearPrice(currentEpoch);
  }

  /**
   * Calculate price during compounding phase
   * Formula: Price = 0.01 × (1.01)^epoch
   */
  private static calculateCompoundingPrice(epoch: number): number {
    if (epoch === 0) return this.INITIAL_PRICE;
    
    // Use logarithmic calculation for precision with large exponents
    const price = this.INITIAL_PRICE * Math.pow(1 + this.COMPOUNDING_RATE, epoch);
    
    return price;
  }

  /**
   * Calculate price during linear growth phase
   * Formula: Price = 200,003 + (100 × (epoch - 168,121))
   */
  private static calculateLinearPrice(epoch: number): number {
    const epochsAfterCompounding = Math.max(0, epoch - this.COMPOUNDING_END_EPOCH);
    return this.PHASE2_BASE_PRICE + (this.PHASE2_INCREMENT * epochsAfterCompounding);
  }

  /**
   * Get comprehensive price information
   */
  static getPriceInfo(
    totalTransactions: number,
    currentEpoch: number,
    compoundingComplete: boolean
  ): PriceInfo {
    const currentPrice = this.calculatePrice(
      totalTransactions,
      currentEpoch,
      compoundingComplete
    );

    const nextEpoch = currentEpoch + 1;
    const nextEpochPrice = this.calculatePrice(
      (nextEpoch * this.TRANSACTIONS_PER_EPOCH),
      nextEpoch,
      compoundingComplete
    );

    const transactionsToNextEpoch = 
      ((currentEpoch + 1) * this.TRANSACTIONS_PER_EPOCH) - totalTransactions;

    return {
      currentPrice,
      currentEpoch,
      totalTransactions,
      phase: compoundingComplete || currentEpoch >= this.COMPOUNDING_END_EPOCH 
        ? 'linear' 
        : 'compounding',
      nextEpochPrice,
      transactionsToNextEpoch,
      compoundingComplete,
    };
  }

  /**
   * Calculate price at a specific epoch (for projections)
   */
  static getPriceAtEpoch(epoch: number): number {
    if (epoch < this.COMPOUNDING_END_EPOCH) {
      return this.calculateCompoundingPrice(epoch);
    }
    return this.calculateLinearPrice(epoch);
  }

  /**
   * Calculate percentage change between two epochs
   */
  static calculatePriceChange(fromEpoch: number, toEpoch: number): {
    absoluteChange: number;
    percentageChange: number;
  } {
    const fromPrice = this.getPriceAtEpoch(fromEpoch);
    const toPrice = this.getPriceAtEpoch(toEpoch);
    
    const absoluteChange = toPrice - fromPrice;
    const percentageChange = ((toPrice - fromPrice) / fromPrice) * 100;

    return {
      absoluteChange,
      percentageChange,
    };
  }

  /**
   * Get milestone information
   */
  static getMilestones(): Array<{
    epoch: number;
    price: number;
    description: string;
  }> {
    return [
      { epoch: 0, price: 0.01, description: 'Launch' },
      { epoch: 1000, price: this.getPriceAtEpoch(1000), description: '1 million transactions' },
      { epoch: 10000, price: this.getPriceAtEpoch(10000), description: '10 million transactions' },
      { epoch: 100000, price: this.getPriceAtEpoch(100000), description: '100 million transactions' },
      { epoch: 168121, price: 200003, description: 'Compounding complete' },
      { epoch: 170000, price: this.getPriceAtEpoch(170000), description: 'Linear phase' },
    ];
  }
}

// Export convenience function
export function getCurrentEquaPrice(
  totalTransactions: number,
  currentEpoch: number,
  compoundingComplete: boolean
): number {
  return EquaPriceCalculator.calculatePrice(
    totalTransactions,
    currentEpoch,
    compoundingComplete
  );
}
=======
404: Not Found
>>>>>>> 369107deb2deb2298e4e33d2b4bd97b0179db76c
