/**
 * EQUA Token Price Appreciation Calculator
 * 
 * New Multi-Phase Price Model:
 * 
 * Phase 1: Price $0.01 to $1
 * - 1 epoch = 1 transaction
 * - Growth: 0.1% per epoch, compounded
 * - Formula: Price = $0.01 × (1.001)^epoch
 * 
 * Phase 2: Price $1 to $10
 * - 1 epoch = 10 transactions
 * - Growth: 0.1% per epoch, compounded
 * - Formula: Price = $1 × (1.001)^epoch
 * 
 * Phase 3: Price $10 to $100
 * - 1 epoch = 100 transactions
 * - Growth: 0.1% per epoch, compounded
 * - Formula: Price = $10 × (1.001)^epoch
 * 
 * Phase 4: Price $100 to $200,000
 * - 1 epoch = 1,000 transactions
 * - Growth: 0.01% per epoch, compounded
 * - Formula: Price = $100 × (1.0001)^epoch
 * 
 * Phase 5 (Perpetual): Price > $200,000
 * - 1 epoch = 1,000 transactions
 * - Growth: $100 per epoch (0.05% of $200,000), linear, not compounded
 * - Formula: Price = $200,000 + ($100 × epochs_after_transition)
 * - Cap: Maximum $25,000 price increase per month
 */

export type PricePhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5';

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
  // Initial Price
  private static readonly INITIAL_PRICE = 0.01;
  
  // Growth rates
  private static readonly EARLY_GROWTH_RATE = 0.001; // 0.1%
  private static readonly LATE_GROWTH_RATE = 0.0001; // 0.01%
  
  // Phase thresholds (prices)
  private static readonly PHASE1_PRICE_THRESHOLD = 1; // $1
  private static readonly PHASE2_PRICE_THRESHOLD = 10; // $10
  private static readonly PHASE3_PRICE_THRESHOLD = 100; // $100
  private static readonly PHASE4_PRICE_THRESHOLD = 200_000; // $200,000
  
  // Transactions per epoch for each phase
  private static readonly PHASE1_TX_PER_EPOCH = 1;
  private static readonly PHASE2_TX_PER_EPOCH = 10;
  private static readonly PHASE3_TX_PER_EPOCH = 100;
  private static readonly PHASE4_TX_PER_EPOCH = 1000;
  private static readonly PHASE5_TX_PER_EPOCH = 1000;
  
  // Phase 5 Constants (Perpetual)
  private static readonly PHASE5_INCREMENT = 100; // $100 per epoch (0.05% of $200,000)
  private static readonly PHASE5_MONTHLY_CAP = 25_000; // $25,000 max per month

  // Calculate epochs needed to reach price thresholds dynamically
  // Phase 1: $0.01 to $1 = growth of 100x = ln(100) / ln(1.001) ≈ 4605 epochs
  private static readonly PHASE1_END_EPOCH = Math.ceil(Math.log(100) / Math.log(1.001)); // ~4605
  private static readonly PHASE1_END_TRANSACTIONS = EquaPriceCalculator.PHASE1_END_EPOCH * EquaPriceCalculator.PHASE1_TX_PER_EPOCH;
  
  // Phase 2: $1 to $10 = growth of 10x = ln(10) / ln(1.001) ≈ 2303 epochs
  private static readonly PHASE2_EPOCHS_DURATION = Math.ceil(Math.log(10) / Math.log(1.001)); // ~2303
  private static readonly PHASE2_END_TRANSACTIONS = EquaPriceCalculator.PHASE1_END_TRANSACTIONS + 
    (EquaPriceCalculator.PHASE2_EPOCHS_DURATION * EquaPriceCalculator.PHASE2_TX_PER_EPOCH);
  
  // Phase 3: $10 to $100 = growth of 10x = ln(10) / ln(1.001) ≈ 2303 epochs
  private static readonly PHASE3_EPOCHS_DURATION = Math.ceil(Math.log(10) / Math.log(1.001)); // ~2303
  private static readonly PHASE3_END_TRANSACTIONS = EquaPriceCalculator.PHASE2_END_TRANSACTIONS + 
    (EquaPriceCalculator.PHASE3_EPOCHS_DURATION * EquaPriceCalculator.PHASE3_TX_PER_EPOCH);
  
  // Phase 4: $100 to $200,000 = growth of 2000x = ln(2000) / ln(1.0001) ≈ 76012 epochs
  private static readonly PHASE4_EPOCHS_DURATION = Math.ceil(Math.log(2000) / Math.log(1.0001)); // ~76012
  private static readonly PHASE4_END_TRANSACTIONS = EquaPriceCalculator.PHASE3_END_TRANSACTIONS + 
    (EquaPriceCalculator.PHASE4_EPOCHS_DURATION * EquaPriceCalculator.PHASE4_TX_PER_EPOCH);

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
    if (totalTransactions < this.PHASE3_END_TRANSACTIONS) {
      return 'phase3';
    }
    if (totalTransactions < this.PHASE4_END_TRANSACTIONS) {
      return 'phase4';
    }
    return 'phase5';
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
      case 'phase4':
        return this.calculatePhase4Price(totalTransactions);
      case 'phase5':
        return this.calculatePhase5Price(totalTransactions);
    }
  }

  /**
   * Phase 1: $0.01 to $1
   * 1 tx = 1 epoch, 0.1% growth
   */
  private static calculatePhase1Price(totalTransactions: number): number {
    const epoch = Math.floor(totalTransactions / this.PHASE1_TX_PER_EPOCH);
    if (epoch === 0) return this.INITIAL_PRICE;
    
    return this.INITIAL_PRICE * Math.pow(1 + this.EARLY_GROWTH_RATE, epoch);
  }

  /**
   * Phase 2: $1 to $10
   * 10 tx = 1 epoch, 0.1% growth
   */
  private static calculatePhase2Price(totalTransactions: number): number {
    const transactionsInPhase2 = totalTransactions - this.PHASE1_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInPhase2 / this.PHASE2_TX_PER_EPOCH);
    
    return this.PHASE1_PRICE_THRESHOLD * Math.pow(1 + this.EARLY_GROWTH_RATE, epoch);
  }

  /**
   * Phase 3: $10 to $100
   * 100 tx = 1 epoch, 0.1% growth
   */
  private static calculatePhase3Price(totalTransactions: number): number {
    const transactionsInPhase3 = totalTransactions - this.PHASE2_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInPhase3 / this.PHASE3_TX_PER_EPOCH);
    
    return this.PHASE2_PRICE_THRESHOLD * Math.pow(1 + this.EARLY_GROWTH_RATE, epoch);
  }

  /**
   * Phase 4: $100 to $200,000
   * 1000 tx = 1 epoch, 0.01% growth
   */
  private static calculatePhase4Price(totalTransactions: number): number {
    const transactionsInPhase4 = totalTransactions - this.PHASE3_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInPhase4 / this.PHASE4_TX_PER_EPOCH);
    
    return this.PHASE3_PRICE_THRESHOLD * Math.pow(1 + this.LATE_GROWTH_RATE, epoch);
  }

  /**
   * Phase 5: $200,000+
   * 1000 tx = 1 epoch, $100 linear increase
   * 0.05% of $200,000 = $100 per epoch
   * Cap: $25,000 max per month
   */
  private static calculatePhase5Price(totalTransactions: number): number {
    const transactionsInPhase5 = totalTransactions - this.PHASE4_END_TRANSACTIONS;
    const epochsInPhase5 = Math.floor(transactionsInPhase5 / this.PHASE5_TX_PER_EPOCH);
    
    // Calculate potential price increase
    const potentialIncrease = epochsInPhase5 * this.PHASE5_INCREMENT;
    
    // Note: The monthly cap is enforced at the on-chain level
    // Here we show the theoretical price for display purposes
    
    return this.PHASE4_PRICE_THRESHOLD + potentialIncrease;
  }

  /**
   * Get the current epoch number based on total transactions
   */
  static getCurrentEpoch(totalTransactions: number): number {
    const phase = this.getPhase(totalTransactions);

    switch (phase) {
      case 'phase1':
        return Math.floor(totalTransactions / this.PHASE1_TX_PER_EPOCH);
      case 'phase2': {
        const transactionsInPhase2 = totalTransactions - this.PHASE1_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + Math.floor(transactionsInPhase2 / this.PHASE2_TX_PER_EPOCH);
      }
      case 'phase3': {
        const transactionsInPhase3 = totalTransactions - this.PHASE2_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + 
               Math.floor(transactionsInPhase3 / this.PHASE3_TX_PER_EPOCH);
      }
      case 'phase4': {
        const transactionsInPhase4 = totalTransactions - this.PHASE3_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + this.PHASE3_EPOCHS_DURATION +
               Math.floor(transactionsInPhase4 / this.PHASE4_TX_PER_EPOCH);
      }
      case 'phase5': {
        const transactionsInPhase5 = totalTransactions - this.PHASE4_END_TRANSACTIONS;
        return this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + this.PHASE3_EPOCHS_DURATION + 
               this.PHASE4_EPOCHS_DURATION + Math.floor(transactionsInPhase5 / this.PHASE5_TX_PER_EPOCH);
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
        return this.PHASE1_TX_PER_EPOCH;
      case 'phase2':
        return this.PHASE2_TX_PER_EPOCH;
      case 'phase3':
        return this.PHASE3_TX_PER_EPOCH;
      case 'phase4':
      case 'phase5':
        return this.PHASE4_TX_PER_EPOCH;
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
    switch (phase) {
      case 'phase1':
        transactionsToNextEpoch = this.PHASE1_TX_PER_EPOCH - (totalTransactions % this.PHASE1_TX_PER_EPOCH);
        break;
      case 'phase2': {
        const txInPhase2 = totalTransactions - this.PHASE1_END_TRANSACTIONS;
        transactionsToNextEpoch = this.PHASE2_TX_PER_EPOCH - (txInPhase2 % this.PHASE2_TX_PER_EPOCH);
        break;
      }
      case 'phase3': {
        const txInPhase3 = totalTransactions - this.PHASE2_END_TRANSACTIONS;
        transactionsToNextEpoch = this.PHASE3_TX_PER_EPOCH - (txInPhase3 % this.PHASE3_TX_PER_EPOCH);
        break;
      }
      case 'phase4': {
        const txInPhase4 = totalTransactions - this.PHASE3_END_TRANSACTIONS;
        transactionsToNextEpoch = this.PHASE4_TX_PER_EPOCH - (txInPhase4 % this.PHASE4_TX_PER_EPOCH);
        break;
      }
      case 'phase5': {
        const txInPhase5 = totalTransactions - this.PHASE4_END_TRANSACTIONS;
        transactionsToNextEpoch = this.PHASE5_TX_PER_EPOCH - (txInPhase5 % this.PHASE5_TX_PER_EPOCH);
        break;
      }
    }

    return {
      currentPrice,
      currentEpoch: calculatedEpoch,
      totalTransactions,
      phase,
      nextEpochPrice,
      transactionsToNextEpoch,
      compoundingComplete: phase === 'phase5',
      transactionsPerEpoch,
    };
  }

  /**
   * Calculate price at a specific epoch (for projections)
   */
  static getPriceAtEpoch(epoch: number): number {
    // Phase 1: epochs 0 to PHASE1_END_EPOCH
    if (epoch <= this.PHASE1_END_EPOCH) {
      return this.INITIAL_PRICE * Math.pow(1 + this.EARLY_GROWTH_RATE, epoch);
    }
    
    // Phase 2: epochs PHASE1_END_EPOCH to (PHASE1_END_EPOCH + PHASE2_EPOCHS_DURATION)
    const phase2Epoch = epoch - this.PHASE1_END_EPOCH;
    if (phase2Epoch <= this.PHASE2_EPOCHS_DURATION) {
      return this.PHASE1_PRICE_THRESHOLD * Math.pow(1 + this.EARLY_GROWTH_RATE, phase2Epoch);
    }
    
    // Phase 3: epochs to (PHASE1 + PHASE2 + PHASE3)
    const phase3Epoch = phase2Epoch - this.PHASE2_EPOCHS_DURATION;
    if (phase3Epoch <= this.PHASE3_EPOCHS_DURATION) {
      return this.PHASE2_PRICE_THRESHOLD * Math.pow(1 + this.EARLY_GROWTH_RATE, phase3Epoch);
    }
    
    // Phase 4: epochs to (PHASE1 + PHASE2 + PHASE3 + PHASE4)
    const phase4Epoch = phase3Epoch - this.PHASE3_EPOCHS_DURATION;
    if (phase4Epoch <= this.PHASE4_EPOCHS_DURATION) {
      return this.PHASE3_PRICE_THRESHOLD * Math.pow(1 + this.LATE_GROWTH_RATE, phase4Epoch);
    }
    
    // Phase 5: Linear growth
    const phase5Epoch = phase4Epoch - this.PHASE4_EPOCHS_DURATION;
    return this.PHASE4_PRICE_THRESHOLD + (this.PHASE5_INCREMENT * phase5Epoch);
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
   * Get milestone information based on the five-phase model
   */
  static getMilestones(): Array<{
    epoch: number;
    price: number;
    description: string;
  }> {
    return [
      { epoch: 0, price: 0.01, description: 'Launch' },
      { epoch: 100, price: this.getPriceAtEpoch(100), description: '100 transactions' },
      { epoch: 1000, price: this.getPriceAtEpoch(1000), description: '1,000 transactions' },
      { epoch: this.PHASE1_END_EPOCH, price: 1, description: 'Phase 1 Complete - $1' },
      { epoch: this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION, price: 10, description: 'Phase 2 Complete - $10' },
      { epoch: this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + this.PHASE3_EPOCHS_DURATION, price: 100, description: 'Phase 3 Complete - $100' },
      { epoch: this.PHASE1_END_EPOCH + this.PHASE2_EPOCHS_DURATION + this.PHASE3_EPOCHS_DURATION + this.PHASE4_EPOCHS_DURATION, price: 200000, description: 'Phase 4 Complete - $200,000 (Compounding Stops)' },
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
    phase3EndTransactions: number;
    phase3EndPrice: number;
    phase4EndTransactions: number;
    phase4EndPrice: number;
    phase5MonthlyCap: number;
  } {
    return {
      phase1EndTransactions: this.PHASE1_END_TRANSACTIONS,
      phase1EndPrice: this.PHASE1_PRICE_THRESHOLD,
      phase2EndTransactions: this.PHASE2_END_TRANSACTIONS,
      phase2EndPrice: this.PHASE2_PRICE_THRESHOLD,
      phase3EndTransactions: this.PHASE3_END_TRANSACTIONS,
      phase3EndPrice: this.PHASE3_PRICE_THRESHOLD,
      phase4EndTransactions: this.PHASE4_END_TRANSACTIONS,
      phase4EndPrice: this.PHASE4_PRICE_THRESHOLD,
      phase5MonthlyCap: this.PHASE5_MONTHLY_CAP,
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
