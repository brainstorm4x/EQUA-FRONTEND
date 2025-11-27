/**
 * EQUA Token Price Appreciation Calculator
 * 
 * Three-Phase Price Model:
 * 
 * Phase 1 (Early Growth): Price $0.01 to $100
 * - Epochs: 1 epoch = 100 transactions
 * - Growth: 0.1% per epoch, compounded
 * - Formula: Price = $0.01 × (1.001)^epoch
 * - Ends at: ~9,215 epochs (921,500 transactions) when price reaches $100
 * 
 * Phase 2 (Scaling): Price $100 to $200,000
 * - Epochs: 1 epoch = 1,000 transactions
 * - Growth: 0.01% per epoch, compounded
 * - Formula: Price = $100 × (1.0001)^epoch
 * - Ends at: ~76,012 epochs (76,012,000 transactions after Phase 1) when price reaches $200,000
 * 
 * Phase 3 (Perpetual): Price > $200,000
 * - Epochs: 1 epoch = 1,000 transactions
 * - Growth: $100 per epoch (linear, not compounded)
 * - Formula: Price = $200,000 + ($100 × epochs_after_transition)
 * - Cap: Maximum $25,000 price increase per month
 */

export type PricePhase = 'phase1' | 'phase2' | 'phase3';

export interface PriceInfo {
  currentPrice: number;
  currentEpoch: number;
  totalTransactions: number;
  phase: PricePhase;
  nextEpochPrice: number;
  transactionsToNextEpoch: number;
  compoundingComplete: boolean;
  transactionsPerEpoch: number;
}

export class EquaPriceCalculator {
  // Phase 1 Constants (Early Growth)
  private static readonly INITIAL_PRICE = 0.01;
  private static readonly PHASE1_GROWTH_RATE = 0.001; // 0.1%
  private static readonly PHASE1_TRANSACTIONS_PER_EPOCH = 100;
  private static readonly PHASE1_PRICE_THRESHOLD = 100; // $100
  
  // Phase 2 Constants (Scaling)
  private static readonly PHASE2_GROWTH_RATE = 0.0001; // 0.01%
  private static readonly PHASE2_TRANSACTIONS_PER_EPOCH = 1000;
  private static readonly PHASE2_PRICE_THRESHOLD = 200_000; // $200,000
  
  // Phase 3 Constants (Perpetual)
  private static readonly PHASE3_TRANSACTIONS_PER_EPOCH = 1000;
  private static readonly PHASE3_INCREMENT = 100; // $100 per epoch
  private static readonly PHASE3_MONTHLY_CAP = 25_000; // $25,000 max per month

  // Calculate the epoch at which Phase 1 ends (price reaches $100)
  // Solving: 0.01 * (1.001)^n = 100 => n = ln(10000) / ln(1.001) ≈ 9215
  private static readonly PHASE1_END_EPOCH = 9215;
  private static readonly PHASE1_END_TRANSACTIONS = 9215 * 100; // 921,500

  // Calculate the epoch at which Phase 2 ends (price reaches $200,000)
  // Solving: 100 * (1.0001)^n = 200000 => n = ln(2000) / ln(1.0001) ≈ 76012
  private static readonly PHASE2_EPOCHS_DURATION = 76012;
  private static readonly PHASE2_END_TRANSACTIONS = 921_500 + (76012 * 1000); // ~76,934,500

  /**
   * Determine the current price phase based on total transactions
   */
  static getPhase(totalTransactions: number): PricePhase {
    if (totalTransactions < this.PHASE1_END_TRANSACTIONS) {
      return 'phase1';
    }
    if (totalTransactions < this.PHASE2_END_TRANSACTIONS) {
      return 'phase2';
    }
    return 'phase3';
  }

  /**
   * Calculate current EQUA price based on transaction count
   */
  static calculatePrice(
    totalTransactions: number,
    currentEpoch?: number,
    compoundingComplete?: boolean
  ): number {
    // If no transactions yet, return initial price
    if (totalTransactions === 0) {
      return this.INITIAL_PRICE;
    }

    const phase = this.getPhase(totalTransactions);

    switch (phase) {
      case 'phase1':
        return this.calculatePhase1Price(totalTransactions);
      case 'phase2':
        return this.calculatePhase2Price(totalTransactions);
      case 'phase3':
        return this.calculatePhase3Price(totalTransactions);
    }
  }

  /**
   * Calculate price during Phase 1 (Early Growth)
   * Formula: Price = $0.01 × (1.001)^epoch
   * 1 epoch = 100 transactions
   */
  private static calculatePhase1Price(totalTransactions: number): number {
    const epoch = Math.floor(totalTransactions / this.PHASE1_TRANSACTIONS_PER_EPOCH);
    if (epoch === 0) return this.INITIAL_PRICE;
    
    const price = this.INITIAL_PRICE * Math.pow(1 + this.PHASE1_GROWTH_RATE, epoch);
    return price;
  }

  /**
   * Calculate price during Phase 2 (Scaling)
   * Formula: Price = $100 × (1.0001)^epoch
   * 1 epoch = 1,000 transactions (after Phase 1)
   */
  private static calculatePhase2Price(totalTransactions: number): number {
    const transactionsInPhase2 = totalTransactions - this.PHASE1_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInPhase2 / this.PHASE2_TRANSACTIONS_PER_EPOCH);
    
    const price = this.PHASE1_PRICE_THRESHOLD * Math.pow(1 + this.PHASE2_GROWTH_RATE, epoch);
    return price;
  }

  /**
   * Calculate price during Phase 3 (Perpetual Linear Growth)
   * Formula: Price = $200,000 + ($100 × epochs_after_transition)
   * Capped at $25,000 increase per month
   */
  private static calculatePhase3Price(totalTransactions: number): number {
    const transactionsInPhase3 = totalTransactions - this.PHASE2_END_TRANSACTIONS;
    const epochsInPhase3 = Math.floor(transactionsInPhase3 / this.PHASE3_TRANSACTIONS_PER_EPOCH);
    
    // Calculate potential price increase
    const potentialIncrease = epochsInPhase3 * this.PHASE3_INCREMENT;
    
    // Note: The monthly cap is enforced at the on-chain level
    // Here we show the theoretical price for display purposes
    // In practice, the actual price would be tracked on-chain with the monthly cap enforced
    
    return this.PHASE2_PRICE_THRESHOLD + potentialIncrease;
  }

  /**
   * Get the current epoch number based on total transactions
   */
  static getCurrentEpoch(totalTransactions: number): number {
    const phase = this.getPhase(totalTransactions);

    switch (phase) {
      case 'phase1':
        return Math.floor(totalTransactions / this.PHASE1_TRANSACTIONS_PER_EPOCH);
      case 'phase2': {
        const transactionsInPhase2 = totalTransactions - this.PHASE1_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + Math.floor(transactionsInPhase2 / this.PHASE2_TRANSACTIONS_PER_EPOCH);
      }
      case 'phase3': {
        const transactionsInPhase3 = totalTransactions - this.PHASE2_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + 
               Math.floor(transactionsInPhase3 / this.PHASE3_TRANSACTIONS_PER_EPOCH);
      }
    }
  }

  /**
   * Get transactions per epoch for the current phase
   */
  static getTransactionsPerEpoch(totalTransactions: number): number {
    const phase = this.getPhase(totalTransactions);
    
    switch (phase) {
      case 'phase1':
        return this.PHASE1_TRANSACTIONS_PER_EPOCH;
      case 'phase2':
      case 'phase3':
        return this.PHASE2_TRANSACTIONS_PER_EPOCH;
    }
  }

  /**
   * Get comprehensive price information
   */
  static getPriceInfo(
    totalTransactions: number,
    currentEpoch?: number,
    compoundingComplete?: boolean
  ): PriceInfo {
    const phase = this.getPhase(totalTransactions);
    const transactionsPerEpoch = this.getTransactionsPerEpoch(totalTransactions);
    const calculatedEpoch = this.getCurrentEpoch(totalTransactions);
    const currentPrice = this.calculatePrice(totalTransactions);

    // Calculate next epoch price
    const nextEpochTransactions = totalTransactions + transactionsPerEpoch;
    const nextEpochPrice = this.calculatePrice(nextEpochTransactions);

    // Calculate transactions remaining to next epoch
    let transactionsToNextEpoch: number;
    if (phase === 'phase1') {
      transactionsToNextEpoch = this.PHASE1_TRANSACTIONS_PER_EPOCH - 
        (totalTransactions % this.PHASE1_TRANSACTIONS_PER_EPOCH);
    } else {
      const relevantTransactions = phase === 'phase2' 
        ? totalTransactions - this.PHASE1_END_TRANSACTIONS
        : totalTransactions - this.PHASE2_END_TRANSACTIONS;
      transactionsToNextEpoch = this.PHASE2_TRANSACTIONS_PER_EPOCH - 
        (relevantTransactions % this.PHASE2_TRANSACTIONS_PER_EPOCH);
    }

    return {
      currentPrice,
      currentEpoch: calculatedEpoch,
      totalTransactions,
      phase,
      nextEpochPrice,
      transactionsToNextEpoch,
      compoundingComplete: phase === 'phase3',
      transactionsPerEpoch,
    };
  }

  /**
   * Calculate price at a specific epoch (for projections)
   */
  static getPriceAtEpoch(epoch: number): number {
    // Calculate total transactions for this epoch
    if (epoch <= this.PHASE1_END_EPOCH) {
      return this.INITIAL_PRICE * Math.pow(1 + this.PHASE1_GROWTH_RATE, epoch);
    }
    
    const phase2Epoch = epoch - this.PHASE1_END_EPOCH;
    if (phase2Epoch <= this.PHASE2_EPOCHS_DURATION) {
      return this.PHASE1_PRICE_THRESHOLD * Math.pow(1 + this.PHASE2_GROWTH_RATE, phase2Epoch);
    }
    
    const phase3Epoch = phase2Epoch - this.PHASE2_EPOCHS_DURATION;
    return this.PHASE2_PRICE_THRESHOLD + (this.PHASE3_INCREMENT * phase3Epoch);
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
   * Get milestone information based on the three-phase model
   */
  static getMilestones(): Array<{
    epoch: number;
    price: number;
    description: string;
  }> {
    return [
      { epoch: 0, price: 0.01, description: 'Launch' },
      { epoch: 100, price: this.getPriceAtEpoch(100), description: '10,000 transactions' },
      { epoch: 1000, price: this.getPriceAtEpoch(1000), description: '100,000 transactions' },
      { epoch: 5000, price: this.getPriceAtEpoch(5000), description: '500,000 transactions' },
      { epoch: this.PHASE1_END_EPOCH, price: 100, description: 'Phase 1 Complete - $100' },
      { epoch: this.PHASE1_END_EPOCH + 1000, price: this.getPriceAtEpoch(this.PHASE1_END_EPOCH + 1000), description: 'Phase 2 Growth' },
      { epoch: this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION, price: 200000, description: 'Phase 2 Complete - $200,000' },
      { epoch: this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + 1000, price: this.getPriceAtEpoch(this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + 1000), description: 'Phase 3 Linear Growth' },
    ];
  }

  /**
   * Get phase thresholds for display
   */
  static getPhaseThresholds(): {
    phase1EndTransactions: number;
    phase1EndPrice: number;
    phase2EndTransactions: number;
    phase2EndPrice: number;
    phase3MonthlyCap: number;
  } {
    return {
      phase1EndTransactions: this.PHASE1_END_TRANSACTIONS,
      phase1EndPrice: this.PHASE1_PRICE_THRESHOLD,
      phase2EndTransactions: this.PHASE2_END_TRANSACTIONS,
      phase2EndPrice: this.PHASE2_PRICE_THRESHOLD,
      phase3MonthlyCap: this.PHASE3_MONTHLY_CAP,
    };
  }
}

// Export convenience function
export function getCurrentEquaPrice(
  totalTransactions: number,
  currentEpoch?: number,
  compoundingComplete?: boolean
): number {
  return EquaPriceCalculator.calculatePrice(
    totalTransactions,
    currentEpoch,
    compoundingComplete
  );
}
