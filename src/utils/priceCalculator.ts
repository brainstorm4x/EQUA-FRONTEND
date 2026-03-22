/**
 * UNIA Token Price Appreciation Calculator
 * 
 * 9-Tier Price Model with Constant 0.01% Growth:
 * 
 * Tier 1: $0.01 to $0.1 (23,027 txns, 1 tx/epoch, 0.01% growth)
 * Tier 2: $0.1 to $1 (23,027 txns, 1 tx/epoch, 0.01% growth)
 * Tier 3: $1 to $10 (230,270 txns, 10 tx/epoch, 0.01% growth)
 * Tier 4: $10 to $100 (230,270 txns, 10 tx/epoch, 0.01% growth)
 * Tier 5: $100 to $1,000 (2,302,700 txns, 100 tx/epoch, 0.01% growth)
 * Tier 6: $1,000 to $10,000 (2,302,700 txns, 100 tx/epoch, 0.01% growth)
 * Tier 7: $10,000 to $100,000 (23,027,002 txns, 1000 tx/epoch, 0.01% growth)
 * Tier 8: $100,000 to $500,000 (16,095,184 txns, 1000 tx/epoch, 0.01% growth)
 * Tier 9: $500,000+ (Linear: $250 per epoch, 1000 tx/epoch, monthly cap $25,000)
 * 
 * Formula for Tiers 1-8 (Compounding): Price = StartPrice × (1.0001)^epoch
 * Formula for Tier 9 (Linear): Price = $500,000 + ($250 × epochs)
 */

export type PriceTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5' | 'tier6' | 'tier7' | 'tier8' | 'tier9';

export interface PriceInfo {
  currentPrice: number;
  currentEpoch: number;
  totalTransactions: number;
  tier: PriceTier;
  tierNumber: number;
  nextEpochPrice: number;
  transactionsToNextEpoch: number;
  compoundingComplete: boolean;
  transactionsPerEpoch: number;
}

export class UniaPriceCalculator {
  // Initial Price
  private static readonly INITIAL_PRICE = 0.01;
  
  // Growth rate - constant 0.01% across all tiers
  private static readonly GROWTH_RATE = 0.0001; // 0.01% = 1.0001
  
  // Tier price thresholds
  private static readonly TIER_1_END = 0.1;      // $0.1
  private static readonly TIER_2_END = 1;        // $1
  private static readonly TIER_3_END = 10;       // $10
  private static readonly TIER_4_END = 100;      // $100
  private static readonly TIER_5_END = 1000;     // $1,000
  private static readonly TIER_6_END = 10000;    // $10,000
  private static readonly TIER_7_END = 100000;   // $100,000
  private static readonly TIER_8_END = 500000;   // $500,000
  
  // Epoch sizes
  private static readonly TIER_1_2_EPOCH_SIZE = 1;     // 1 transaction per epoch
  private static readonly TIER_3_4_EPOCH_SIZE = 10;    // 10 transactions per epoch
  private static readonly TIER_5_6_EPOCH_SIZE = 100;   // 100 transactions per epoch
  private static readonly TIER_7_8_9_EPOCH_SIZE = 1000; // 1000 transactions per epoch
  
  // Tier 9 linear growth
  private static readonly TIER_9_LINEAR_INCREMENT = 250; // $250 per epoch
  private static readonly TIER_9_MONTHLY_CAP = 25_000;   // $25,000 max per month

  // Calculate epochs needed for each tier (using ln(endPrice/startPrice) / ln(1.0001))
  // Tier 1: $0.01 to $0.1 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_1_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_1_END_TRANSACTIONS = UniaPriceCalculator.TIER_1_EPOCHS * UniaPriceCalculator.TIER_1_2_EPOCH_SIZE;
  
  // Tier 2: $0.1 to $1 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_2_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_2_END_TRANSACTIONS = UniaPriceCalculator.TIER_1_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_2_EPOCHS * UniaPriceCalculator.TIER_1_2_EPOCH_SIZE);
  
  // Tier 3: $1 to $10 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_3_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_3_END_TRANSACTIONS = UniaPriceCalculator.TIER_2_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_3_EPOCHS * UniaPriceCalculator.TIER_3_4_EPOCH_SIZE);
  
  // Tier 4: $10 to $100 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_4_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_4_END_TRANSACTIONS = UniaPriceCalculator.TIER_3_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_4_EPOCHS * UniaPriceCalculator.TIER_3_4_EPOCH_SIZE);
  
  // Tier 5: $100 to $1,000 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_5_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_5_END_TRANSACTIONS = UniaPriceCalculator.TIER_4_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_5_EPOCHS * UniaPriceCalculator.TIER_5_6_EPOCH_SIZE);
  
  // Tier 6: $1,000 to $10,000 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_6_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_6_END_TRANSACTIONS = UniaPriceCalculator.TIER_5_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_6_EPOCHS * UniaPriceCalculator.TIER_5_6_EPOCH_SIZE);
  
  // Tier 7: $10,000 to $100,000 = 10x = ln(10) / ln(1.0001) ≈ 23027 epochs
  private static readonly TIER_7_EPOCHS = Math.ceil(Math.log(10) / Math.log(1.0001)); // ~23027
  private static readonly TIER_7_END_TRANSACTIONS = UniaPriceCalculator.TIER_6_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_7_EPOCHS * UniaPriceCalculator.TIER_7_8_9_EPOCH_SIZE);
  
  // Tier 8: $100,000 to $500,000 = 5x = ln(5) / ln(1.0001) ≈ 16095 epochs
  private static readonly TIER_8_EPOCHS = Math.ceil(Math.log(5) / Math.log(1.0001)); // ~16095
  private static readonly TIER_8_END_TRANSACTIONS = UniaPriceCalculator.TIER_7_END_TRANSACTIONS + 
    (UniaPriceCalculator.TIER_8_EPOCHS * UniaPriceCalculator.TIER_7_8_9_EPOCH_SIZE);

  /**
   * Determine the current price tier based on total transactions
   */
  static getTier(totalTransactions: number): PriceTier {
    if (totalTransactions < this.TIER_1_END_TRANSACTIONS) {
      return 'tier1';
    }
    if (totalTransactions < this.TIER_2_END_TRANSACTIONS) {
      return 'tier2';
    }
    if (totalTransactions < this.TIER_3_END_TRANSACTIONS) {
      return 'tier3';
    }
    if (totalTransactions < this.TIER_4_END_TRANSACTIONS) {
      return 'tier4';
    }
    if (totalTransactions < this.TIER_5_END_TRANSACTIONS) {
      return 'tier5';
    }
    if (totalTransactions < this.TIER_6_END_TRANSACTIONS) {
      return 'tier6';
    }
    if (totalTransactions < this.TIER_7_END_TRANSACTIONS) {
      return 'tier7';
    }
    if (totalTransactions < this.TIER_8_END_TRANSACTIONS) {
      return 'tier8';
    }
    return 'tier9';
  }

  /**
   * Get tier number (1-9) from tier string
   */
  static getTierNumber(tier: PriceTier): number {
    const tierMap: Record<PriceTier, number> = {
      tier1: 1, tier2: 2, tier3: 3, tier4: 4, tier5: 5,
      tier6: 6, tier7: 7, tier8: 8, tier9: 9
    };
    return tierMap[tier];
  }

  /**
   * Calculate current UNIA price based on transaction count
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

    const tier = this.getTier(totalTransactions);

    switch (tier) {
      case 'tier1':
        return this.calculateTier1Price(totalTransactions);
      case 'tier2':
        return this.calculateTier2Price(totalTransactions);
      case 'tier3':
        return this.calculateTier3Price(totalTransactions);
      case 'tier4':
        return this.calculateTier4Price(totalTransactions);
      case 'tier5':
        return this.calculateTier5Price(totalTransactions);
      case 'tier6':
        return this.calculateTier6Price(totalTransactions);
      case 'tier7':
        return this.calculateTier7Price(totalTransactions);
      case 'tier8':
        return this.calculateTier8Price(totalTransactions);
      case 'tier9':
        return this.calculateTier9Price(totalTransactions);
    }
  }

  /**
   * Tier 1: $0.01 to $0.1
   * 1 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier1Price(totalTransactions: number): number {
    const epoch = Math.floor(totalTransactions / this.TIER_1_2_EPOCH_SIZE);
    if (epoch === 0) return this.INITIAL_PRICE;
    
    return this.INITIAL_PRICE * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 2: $0.1 to $1
   * 1 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier2Price(totalTransactions: number): number {
    const transactionsInTier2 = totalTransactions - this.TIER_1_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier2 / this.TIER_1_2_EPOCH_SIZE);
    
    return this.TIER_1_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 3: $1 to $10
   * 10 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier3Price(totalTransactions: number): number {
    const transactionsInTier3 = totalTransactions - this.TIER_2_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier3 / this.TIER_3_4_EPOCH_SIZE);
    
    return this.TIER_2_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 4: $10 to $100
   * 10 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier4Price(totalTransactions: number): number {
    const transactionsInTier4 = totalTransactions - this.TIER_3_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier4 / this.TIER_3_4_EPOCH_SIZE);
    
    return this.TIER_3_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 5: $100 to $1,000
   * 100 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier5Price(totalTransactions: number): number {
    const transactionsInTier5 = totalTransactions - this.TIER_4_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier5 / this.TIER_5_6_EPOCH_SIZE);
    
    return this.TIER_4_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 6: $1,000 to $10,000
   * 100 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier6Price(totalTransactions: number): number {
    const transactionsInTier6 = totalTransactions - this.TIER_5_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier6 / this.TIER_5_6_EPOCH_SIZE);
    
    return this.TIER_5_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 7: $10,000 to $100,000
   * 1000 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier7Price(totalTransactions: number): number {
    const transactionsInTier7 = totalTransactions - this.TIER_6_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier7 / this.TIER_7_8_9_EPOCH_SIZE);
    
    return this.TIER_6_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 8: $100,000 to $500,000
   * 1000 tx = 1 epoch, 0.01% growth
   */
  private static calculateTier8Price(totalTransactions: number): number {
    const transactionsInTier8 = totalTransactions - this.TIER_7_END_TRANSACTIONS;
    const epoch = Math.floor(transactionsInTier8 / this.TIER_7_8_9_EPOCH_SIZE);
    
    return this.TIER_7_END * Math.pow(1 + this.GROWTH_RATE, epoch);
  }

  /**
   * Tier 9: $500,000+
   * 1000 tx = 1 epoch, $250 linear increase
   * 0.05% of $500,000 = $250 per epoch
   * Cap: $25,000 max per month
   */
  private static calculateTier9Price(totalTransactions: number): number {
    const transactionsInTier9 = totalTransactions - this.TIER_8_END_TRANSACTIONS;
    const epochsInTier9 = Math.floor(transactionsInTier9 / this.TIER_7_8_9_EPOCH_SIZE);
    
    // Calculate potential price increase
    const potentialIncrease = epochsInTier9 * this.TIER_9_LINEAR_INCREMENT;
    
    // Note: The monthly cap is enforced at the on-chain level
    // Here we show the theoretical price for display purposes
    
    return this.TIER_8_END + potentialIncrease;
  }

  /**
   * Get the current epoch number based on total transactions
   */
  static getCurrentEpoch(totalTransactions: number): number {
    const tier = this.getTier(totalTransactions);

    switch (tier) {
      case 'tier1':
        return Math.floor(totalTransactions / this.TIER_1_2_EPOCH_SIZE);
      case 'tier2': {
        const transactionsInTier2 = totalTransactions - this.TIER_1_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + Math.floor(transactionsInTier2 / this.TIER_1_2_EPOCH_SIZE);
      }
      case 'tier3': {
        const transactionsInTier3 = totalTransactions - this.TIER_2_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + 
               Math.floor(transactionsInTier3 / this.TIER_3_4_EPOCH_SIZE);
      }
      case 'tier4': {
        const transactionsInTier4 = totalTransactions - this.TIER_3_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS +
               Math.floor(transactionsInTier4 / this.TIER_3_4_EPOCH_SIZE);
      }
      case 'tier5': {
        const transactionsInTier5 = totalTransactions - this.TIER_4_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS +
               Math.floor(transactionsInTier5 / this.TIER_5_6_EPOCH_SIZE);
      }
      case 'tier6': {
        const transactionsInTier6 = totalTransactions - this.TIER_5_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + 
               this.TIER_5_EPOCHS + Math.floor(transactionsInTier6 / this.TIER_5_6_EPOCH_SIZE);
      }
      case 'tier7': {
        const transactionsInTier7 = totalTransactions - this.TIER_6_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + 
               this.TIER_5_EPOCHS + this.TIER_6_EPOCHS + Math.floor(transactionsInTier7 / this.TIER_7_8_9_EPOCH_SIZE);
      }
      case 'tier8': {
        const transactionsInTier8 = totalTransactions - this.TIER_7_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + 
               this.TIER_5_EPOCHS + this.TIER_6_EPOCHS + this.TIER_7_EPOCHS + 
               Math.floor(transactionsInTier8 / this.TIER_7_8_9_EPOCH_SIZE);
      }
      case 'tier9': {
        const transactionsInTier9 = totalTransactions - this.TIER_8_END_TRANSACTIONS;
        return this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + 
               this.TIER_5_EPOCHS + this.TIER_6_EPOCHS + this.TIER_7_EPOCHS + this.TIER_8_EPOCHS + 
               Math.floor(transactionsInTier9 / this.TIER_7_8_9_EPOCH_SIZE);
      }
    }
  }

  /**
   * Get transactions per epoch for the current tier
   */
  static getTransactionsPerEpoch(totalTransactions: number): number {
    const tier = this.getTier(totalTransactions);
    
    switch (tier) {
      case 'tier1':
      case 'tier2':
        return this.TIER_1_2_EPOCH_SIZE;
      case 'tier3':
      case 'tier4':
        return this.TIER_3_4_EPOCH_SIZE;
      case 'tier5':
      case 'tier6':
        return this.TIER_5_6_EPOCH_SIZE;
      case 'tier7':
      case 'tier8':
      case 'tier9':
        return this.TIER_7_8_9_EPOCH_SIZE;
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
    const tier = this.getTier(totalTransactions);
    const tierNumber = this.getTierNumber(tier);
    const transactionsPerEpoch = this.getTransactionsPerEpoch(totalTransactions);
    const calculatedEpoch = this.getCurrentEpoch(totalTransactions);
    const currentPrice = this.calculatePrice(totalTransactions);

    // Calculate next epoch price
    const nextEpochTransactions = totalTransactions + transactionsPerEpoch;
    const nextEpochPrice = this.calculatePrice(nextEpochTransactions);

    // Calculate transactions remaining to next epoch
    let transactionsToNextEpoch: number;
    switch (tier) {
      case 'tier1': {
        transactionsToNextEpoch = this.TIER_1_2_EPOCH_SIZE - (totalTransactions % this.TIER_1_2_EPOCH_SIZE);
        break;
      }
      case 'tier2': {
        const txInTier2 = totalTransactions - this.TIER_1_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_1_2_EPOCH_SIZE - (txInTier2 % this.TIER_1_2_EPOCH_SIZE);
        break;
      }
      case 'tier3': {
        const txInTier3 = totalTransactions - this.TIER_2_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_3_4_EPOCH_SIZE - (txInTier3 % this.TIER_3_4_EPOCH_SIZE);
        break;
      }
      case 'tier4': {
        const txInTier4 = totalTransactions - this.TIER_3_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_3_4_EPOCH_SIZE - (txInTier4 % this.TIER_3_4_EPOCH_SIZE);
        break;
      }
      case 'tier5': {
        const txInTier5 = totalTransactions - this.TIER_4_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_5_6_EPOCH_SIZE - (txInTier5 % this.TIER_5_6_EPOCH_SIZE);
        break;
      }
      case 'tier6': {
        const txInTier6 = totalTransactions - this.TIER_5_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_5_6_EPOCH_SIZE - (txInTier6 % this.TIER_5_6_EPOCH_SIZE);
        break;
      }
      case 'tier7': {
        const txInTier7 = totalTransactions - this.TIER_6_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_7_8_9_EPOCH_SIZE - (txInTier7 % this.TIER_7_8_9_EPOCH_SIZE);
        break;
      }
      case 'tier8': {
        const txInTier8 = totalTransactions - this.TIER_7_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_7_8_9_EPOCH_SIZE - (txInTier8 % this.TIER_7_8_9_EPOCH_SIZE);
        break;
      }
      case 'tier9': {
        const txInTier9 = totalTransactions - this.TIER_8_END_TRANSACTIONS;
        transactionsToNextEpoch = this.TIER_7_8_9_EPOCH_SIZE - (txInTier9 % this.TIER_7_8_9_EPOCH_SIZE);
        break;
      }
    }

    return {
      currentPrice,
      currentEpoch: calculatedEpoch,
      totalTransactions,
      tier,
      tierNumber,
      nextEpochPrice,
      transactionsToNextEpoch,
      compoundingComplete: tier === 'tier9',
      transactionsPerEpoch,
    };
  }

  /**
   * Calculate price at a specific epoch (for projections)
   */
  static getPriceAtEpoch(epoch: number): number {
    // Tier 1: epochs 0 to TIER_1_EPOCHS
    if (epoch <= this.TIER_1_EPOCHS) {
      return this.INITIAL_PRICE * Math.pow(1 + this.GROWTH_RATE, epoch);
    }
    
    // Tier 2: epochs TIER_1_EPOCHS to (TIER_1_EPOCHS + TIER_2_EPOCHS)
    const tier2Epoch = epoch - this.TIER_1_EPOCHS;
    if (tier2Epoch <= this.TIER_2_EPOCHS) {
      return this.TIER_1_END * Math.pow(1 + this.GROWTH_RATE, tier2Epoch);
    }
    
    // Tier 3
    const tier3Epoch = tier2Epoch - this.TIER_2_EPOCHS;
    if (tier3Epoch <= this.TIER_3_EPOCHS) {
      return this.TIER_2_END * Math.pow(1 + this.GROWTH_RATE, tier3Epoch);
    }
    
    // Tier 4
    const tier4Epoch = tier3Epoch - this.TIER_3_EPOCHS;
    if (tier4Epoch <= this.TIER_4_EPOCHS) {
      return this.TIER_3_END * Math.pow(1 + this.GROWTH_RATE, tier4Epoch);
    }
    
    // Tier 5
    const tier5Epoch = tier4Epoch - this.TIER_4_EPOCHS;
    if (tier5Epoch <= this.TIER_5_EPOCHS) {
      return this.TIER_4_END * Math.pow(1 + this.GROWTH_RATE, tier5Epoch);
    }
    
    // Tier 6
    const tier6Epoch = tier5Epoch - this.TIER_5_EPOCHS;
    if (tier6Epoch <= this.TIER_6_EPOCHS) {
      return this.TIER_5_END * Math.pow(1 + this.GROWTH_RATE, tier6Epoch);
    }
    
    // Tier 7
    const tier7Epoch = tier6Epoch - this.TIER_6_EPOCHS;
    if (tier7Epoch <= this.TIER_7_EPOCHS) {
      return this.TIER_6_END * Math.pow(1 + this.GROWTH_RATE, tier7Epoch);
    }
    
    // Tier 8
    const tier8Epoch = tier7Epoch - this.TIER_7_EPOCHS;
    if (tier8Epoch <= this.TIER_8_EPOCHS) {
      return this.TIER_7_END * Math.pow(1 + this.GROWTH_RATE, tier8Epoch);
    }
    
    // Tier 9: Linear growth
    const tier9Epoch = tier8Epoch - this.TIER_8_EPOCHS;
    return this.TIER_8_END + (this.TIER_9_LINEAR_INCREMENT * tier9Epoch);
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
   * Get milestone information based on the nine-tier model
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
      { epoch: this.TIER_1_EPOCHS, price: 0.1, description: 'Tier 1 Complete - $0.1' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS, price: 1, description: 'Tier 2 Complete - $1' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS, price: 10, description: 'Tier 3 Complete - $10' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS, price: 100, description: 'Tier 4 Complete - $100' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + this.TIER_5_EPOCHS, price: 1000, description: 'Tier 5 Complete - $1,000' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + this.TIER_5_EPOCHS + this.TIER_6_EPOCHS, price: 10000, description: 'Tier 6 Complete - $10,000' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + this.TIER_5_EPOCHS + this.TIER_6_EPOCHS + this.TIER_7_EPOCHS, price: 100000, description: 'Tier 7 Complete - $100,000' },
      { epoch: this.TIER_1_EPOCHS + this.TIER_2_EPOCHS + this.TIER_3_EPOCHS + this.TIER_4_EPOCHS + this.TIER_5_EPOCHS + this.TIER_6_EPOCHS + this.TIER_7_EPOCHS + this.TIER_8_EPOCHS, price: 500000, description: 'Tier 8 Complete - $500,000 (Compounding Stops)' },
    ];
  }

  /**
   * Get tier thresholds for display
   */
  static getTierThresholds(): {
    tier1EndTransactions: number;
    tier1EndPrice: number;
    tier2EndTransactions: number;
    tier2EndPrice: number;
    tier3EndTransactions: number;
    tier3EndPrice: number;
    tier4EndTransactions: number;
    tier4EndPrice: number;
    tier5EndTransactions: number;
    tier5EndPrice: number;
    tier6EndTransactions: number;
    tier6EndPrice: number;
    tier7EndTransactions: number;
    tier7EndPrice: number;
    tier8EndTransactions: number;
    tier8EndPrice: number;
    tier9MonthlyCap: number;
  } {
    return {
      tier1EndTransactions: this.TIER_1_END_TRANSACTIONS,
      tier1EndPrice: this.TIER_1_END,
      tier2EndTransactions: this.TIER_2_END_TRANSACTIONS,
      tier2EndPrice: this.TIER_2_END,
      tier3EndTransactions: this.TIER_3_END_TRANSACTIONS,
      tier3EndPrice: this.TIER_3_END,
      tier4EndTransactions: this.TIER_4_END_TRANSACTIONS,
      tier4EndPrice: this.TIER_4_END,
      tier5EndTransactions: this.TIER_5_END_TRANSACTIONS,
      tier5EndPrice: this.TIER_5_END,
      tier6EndTransactions: this.TIER_6_END_TRANSACTIONS,
      tier6EndPrice: this.TIER_6_END,
      tier7EndTransactions: this.TIER_7_END_TRANSACTIONS,
      tier7EndPrice: this.TIER_7_END,
      tier8EndTransactions: this.TIER_8_END_TRANSACTIONS,
      tier8EndPrice: this.TIER_8_END,
      tier9MonthlyCap: this.TIER_9_MONTHLY_CAP,
    };
  }
}

// Export convenience function
export function getCurrentUniaPrice(
  totalTransactions: number,
  currentEpoch?: number,
  compoundingComplete?: boolean
): number {
  return UniaPriceCalculator.calculatePrice(
    totalTransactions,
    currentEpoch,
    compoundingComplete
  );
}

/**
 * Format UNIA price for display
 * - Shows $0.01 for base price (no extra decimals)
 * - Shows 4 decimal places for prices under $1
 * - Shows 2 decimal places for prices $1 and above
 */
export function formatUniaPrice(price: number): string {
  if (price === 0.01) {
    return '$0.01';
  }
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
