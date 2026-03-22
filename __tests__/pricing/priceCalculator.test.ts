/**
 * Tests for the UNIA Price Calculator
 * Validates the nine-tier price appreciation model
 * 
 * New 9-Tier Model:
 * - Tier 1: $0.01 to $0.1, 0.01% per 1 tx
 * - Tier 2: $0.1 to $1, 0.01% per 1 tx  
 * - Tier 3: $1 to $10, 0.01% per 10 tx
 * - Tier 4: $10 to $100, 0.01% per 10 tx
 * - Tier 5: $100 to $1,000, 0.01% per 100 tx
 * - Tier 6: $1,000 to $10,000, 0.01% per 100 tx
 * - Tier 7: $10,000 to $100,000, 0.01% per 1000 tx
 * - Tier 8: $100,000 to $500,000, 0.01% per 1000 tx
 * - Tier 9: >$500,000, $250 per 1000 tx (linear)
 */

import { EquaPriceCalculator } from '@/utils/priceCalculator';

describe('EquaPriceCalculator', () => {
  describe('Tier 1 ($0.01 to $0.1)', () => {
    it('should return initial price of $0.01 at 0 transactions', () => {
      const price = EquaPriceCalculator.calculatePrice(0);
      expect(price).toBe(0.01);
    });

    it('should be in tier1 for transactions until price reaches $0.1', () => {
      expect(EquaPriceCalculator.getTier(0)).toBe('tier1');
      expect(EquaPriceCalculator.getTier(100)).toBe('tier1');
      expect(EquaPriceCalculator.getTier(1000)).toBe('tier1');
      expect(EquaPriceCalculator.getTier(10000)).toBe('tier1');
    });

    it('should calculate 0.01% growth per epoch (1 transaction)', () => {
      // At epoch 1 (1 transaction): $0.01 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(1);
      expect(price1).toBeCloseTo(0.01 * 1.0001, 5);

      // At epoch 10 (10 transactions): $0.01 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(10);
      expect(price10).toBeCloseTo(0.01 * Math.pow(1.0001, 10), 5);

      // At epoch 100 (100 transactions): $0.01 * 1.0001^100
      const price100 = EquaPriceCalculator.calculatePrice(100);
      expect(price100).toBeCloseTo(0.01 * Math.pow(1.0001, 100), 4);
    });

    it('should reach approximately $0.1 at the end of tier 1', () => {
      // Tier 1 ends at ~23027 transactions when price reaches $0.1
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier1EndTransactions);
      expect(price).toBeCloseTo(0.1, 1);
    });
  });

  describe('Tier 2 ($0.1 to $1)', () => {
    it('should be in tier2 after price exceeds $0.1', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier1EndTransactions)).toBe('tier2');
      expect(EquaPriceCalculator.getTier(thresholds.tier1EndTransactions + 1000)).toBe('tier2');
    });

    it('should start tier 2 at approximately $0.1', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier1EndTransactions);
      expect(price).toBeCloseTo(0.1, 1);
    });

    it('should calculate 0.01% growth per epoch (1 transaction) in tier 2', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 0.1;
      
      // At first epoch in tier 2: $0.1 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier1EndTransactions + 1);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 4);

      // At epoch 10 in tier 2: $0.1 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier1EndTransactions + 10);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 4);
    });

    it('should reach approximately $1 at the end of tier 2', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier2EndTransactions);
      expect(price).toBeCloseTo(1, 0);
    });
  });

  describe('Tier 3 ($1 to $10)', () => {
    it('should be in tier3 after price exceeds $1', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier2EndTransactions)).toBe('tier3');
      expect(EquaPriceCalculator.getTier(thresholds.tier2EndTransactions + 10000)).toBe('tier3');
    });

    it('should start tier 3 at approximately $1', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier2EndTransactions);
      expect(price).toBeCloseTo(1, 0);
    });

    it('should calculate 0.01% growth per epoch (10 transactions) in tier 3', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 1;
      
      // At first epoch in tier 3: $1 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier2EndTransactions + 10);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 3);

      // At epoch 10 in tier 3: $1 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier2EndTransactions + 100);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 3);
    });

    it('should reach approximately $10 at the end of tier 3', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier3EndTransactions);
      expect(price).toBeCloseTo(10, 0);
    });
  });

  describe('Tier 4 ($10 to $100)', () => {
    it('should be in tier4 after price exceeds $10', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier3EndTransactions)).toBe('tier4');
      expect(EquaPriceCalculator.getTier(thresholds.tier3EndTransactions + 10000)).toBe('tier4');
    });

    it('should start tier 4 at approximately $10', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier3EndTransactions);
      expect(price).toBeCloseTo(10, 0);
    });

    it('should calculate 0.01% growth per epoch (10 transactions) in tier 4', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 10;
      
      // At first epoch in tier 4: $10 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier3EndTransactions + 10);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 2);

      // At epoch 10 in tier 4: $10 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier3EndTransactions + 100);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 2);
    });

    it('should reach approximately $100 at the end of tier 4', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier4EndTransactions);
      expect(price).toBeCloseTo(100, 0);
    });
  });

  describe('Tier 5 ($100 to $1,000)', () => {
    it('should be in tier5 after price exceeds $100', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier4EndTransactions)).toBe('tier5');
      expect(EquaPriceCalculator.getTier(thresholds.tier4EndTransactions + 100000)).toBe('tier5');
    });

    it('should start tier 5 at approximately $100', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier4EndTransactions);
      expect(price).toBeCloseTo(100, 0);
    });

    it('should calculate 0.01% growth per epoch (100 transactions) in tier 5', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 100;
      
      // At first epoch in tier 5: $100 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier4EndTransactions + 100);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 2);

      // At epoch 10 in tier 5: $100 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier4EndTransactions + 1000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 2);
    });

    it('should reach approximately $1,000 at the end of tier 5', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier5EndTransactions);
      expect(price).toBeCloseTo(1000, 0);
    });
  });

  describe('Tier 6 ($1,000 to $10,000)', () => {
    it('should be in tier6 after price exceeds $1,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier5EndTransactions)).toBe('tier6');
      expect(EquaPriceCalculator.getTier(thresholds.tier5EndTransactions + 100000)).toBe('tier6');
    });

    it('should start tier 6 at approximately $1,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier5EndTransactions);
      expect(price).toBeCloseTo(1000, 0);
    });

    it('should calculate 0.01% growth per epoch (100 transactions) in tier 6', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 1000;
      
      // At first epoch in tier 6: $1000 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier5EndTransactions + 100);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 1);

      // At epoch 10 in tier 6: $1000 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier5EndTransactions + 1000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 1);
    });

    it('should reach approximately $10,000 at the end of tier 6', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier6EndTransactions);
      expect(price).toBeCloseTo(10000, 0);
    });
  });

  describe('Tier 7 ($10,000 to $100,000)', () => {
    it('should be in tier7 after price exceeds $10,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier6EndTransactions)).toBe('tier7');
      expect(EquaPriceCalculator.getTier(thresholds.tier6EndTransactions + 1000000)).toBe('tier7');
    });

    it('should start tier 7 at approximately $10,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier6EndTransactions);
      expect(price).toBeCloseTo(10000, 0);
    });

    it('should calculate 0.01% growth per epoch (1000 transactions) in tier 7', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 10000;
      
      // At first epoch in tier 7: $10000 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier6EndTransactions + 1000);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 0);

      // At epoch 10 in tier 7: $10000 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier6EndTransactions + 10000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 0);
    });

    it('should reach approximately $100,000 at the end of tier 7', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier7EndTransactions);
      expect(price).toBeCloseTo(100000, 0);
    });
  });

  describe('Tier 8 ($100,000 to $500,000)', () => {
    it('should be in tier8 after price exceeds $100,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier7EndTransactions)).toBe('tier8');
      expect(EquaPriceCalculator.getTier(thresholds.tier7EndTransactions + 1000000)).toBe('tier8');
    });

    it('should start tier 8 at approximately $100,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier7EndTransactions);
      expect(price).toBeCloseTo(100000, 0);
    });

    it('should calculate 0.01% growth per epoch (1000 transactions) in tier 8', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = 100000;
      
      // At first epoch in tier 8: $100000 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.tier7EndTransactions + 1000);
      expect(price1).toBeCloseTo(basePrice * 1.0001, -1);

      // At epoch 10 in tier 8: $100000 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.tier7EndTransactions + 10000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), -1);
    });

    it('should reach approximately $500,000 at the end of tier 8', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier8EndTransactions);
      expect(price).toBeCloseTo(500000, -3); // Within $1000
    });
  });

  describe('Tier 9 (Perpetual >$500,000)', () => {
    it('should be in tier9 after price exceeds $500,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTier(thresholds.tier8EndTransactions)).toBe('tier9');
      expect(EquaPriceCalculator.getTier(thresholds.tier8EndTransactions + 1000000)).toBe('tier9');
    });

    it('should start tier 9 at approximately $500,000', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.tier8EndTransactions);
      expect(price).toBeCloseTo(500000, -3); // Within $1000
    });

    it('should add $250 per epoch (1000 transactions) in tier 9', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const basePrice = EquaPriceCalculator.calculatePrice(thresholds.tier8EndTransactions);
      
      // After 1000 more transactions (1 epoch)
      const price1Epoch = EquaPriceCalculator.calculatePrice(thresholds.tier8EndTransactions + 1000);
      expect(price1Epoch).toBeCloseTo(basePrice + 250, 0);
      
      // After 10000 more transactions (10 epochs)
      const price10Epochs = EquaPriceCalculator.calculatePrice(thresholds.tier8EndTransactions + 10000);
      expect(price10Epochs).toBeCloseTo(basePrice + 2500, 0);
    });

    it('should indicate compoundingComplete in tier 9', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      const info = EquaPriceCalculator.getPriceInfo(thresholds.tier8EndTransactions + 1000);
      expect(info.tier).toBe('tier9');
      expect(info.compoundingComplete).toBe(true);
    });
  });

  describe('getCurrentEpoch', () => {
    it('should calculate epoch correctly in tier 1 (1 tx per epoch)', () => {
      expect(EquaPriceCalculator.getCurrentEpoch(0)).toBe(0);
      expect(EquaPriceCalculator.getCurrentEpoch(1)).toBe(1);
      expect(EquaPriceCalculator.getCurrentEpoch(10)).toBe(10);
      expect(EquaPriceCalculator.getCurrentEpoch(100)).toBe(100);
    });

    it('should calculate epoch correctly across tier transitions', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      
      // Tier 1 end epoch should be around 23027
      const tier1EndEpoch = EquaPriceCalculator.getCurrentEpoch(thresholds.tier1EndTransactions);
      expect(tier1EndEpoch).toBeGreaterThan(20000);
      expect(tier1EndEpoch).toBeLessThan(25000);
    });
  });

  describe('getTransactionsPerEpoch', () => {
    it('should return 1 for tier 1 and tier 2', () => {
      expect(EquaPriceCalculator.getTransactionsPerEpoch(0)).toBe(1);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(1000)).toBe(1);
      
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier1EndTransactions)).toBe(1);
    });

    it('should return 10 for tier 3 and tier 4', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier2EndTransactions)).toBe(10);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier3EndTransactions)).toBe(10);
    });

    it('should return 100 for tier 5 and tier 6', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier4EndTransactions)).toBe(100);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier5EndTransactions)).toBe(100);
    });

    it('should return 1000 for tier 7, tier 8, and tier 9', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier6EndTransactions)).toBe(1000);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier7EndTransactions)).toBe(1000);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.tier8EndTransactions)).toBe(1000);
    });
  });

  describe('getPriceInfo', () => {
    it('should return comprehensive price info with tier fields', () => {
      const info = EquaPriceCalculator.getPriceInfo(100);
      
      expect(info).toHaveProperty('currentPrice');
      expect(info).toHaveProperty('currentEpoch');
      expect(info).toHaveProperty('totalTransactions');
      expect(info).toHaveProperty('tier');
      expect(info).toHaveProperty('tierNumber');
      expect(info).toHaveProperty('nextEpochPrice');
      expect(info).toHaveProperty('transactionsToNextEpoch');
      expect(info).toHaveProperty('compoundingComplete');
      expect(info).toHaveProperty('transactionsPerEpoch');
      
      expect(info.totalTransactions).toBe(100);
      expect(info.tier).toBe('tier1');
      expect(info.tierNumber).toBe(1);
      expect(info.transactionsPerEpoch).toBe(1);
    });
  });

  describe('getMilestones', () => {
    it('should return an array of milestone objects', () => {
      const milestones = EquaPriceCalculator.getMilestones();
      
      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);
      
      milestones.forEach(milestone => {
        expect(milestone).toHaveProperty('epoch');
        expect(milestone).toHaveProperty('price');
        expect(milestone).toHaveProperty('description');
      });
    });

    it('should include launch milestone at $0.01', () => {
      const milestones = EquaPriceCalculator.getMilestones();
      const launchMilestone = milestones.find(m => m.description === 'Launch');
      
      expect(launchMilestone).toBeDefined();
      expect(launchMilestone?.price).toBe(0.01);
      expect(launchMilestone?.epoch).toBe(0);
    });

    it('should include all tier transition milestones', () => {
      const milestones = EquaPriceCalculator.getMilestones();
      
      const tier1Complete = milestones.find(m => m.description.includes('Tier 1 Complete'));
      expect(tier1Complete).toBeDefined();
      expect(tier1Complete?.price).toBe(0.1);
      
      const tier2Complete = milestones.find(m => m.description.includes('Tier 2 Complete'));
      expect(tier2Complete).toBeDefined();
      expect(tier2Complete?.price).toBe(1);
      
      const tier3Complete = milestones.find(m => m.description.includes('Tier 3 Complete'));
      expect(tier3Complete).toBeDefined();
      expect(tier3Complete?.price).toBe(10);
      
      const tier8Complete = milestones.find(m => m.description.includes('Tier 8 Complete'));
      expect(tier8Complete).toBeDefined();
      expect(tier8Complete?.price).toBe(500000);
    });
  });

  describe('calculatePriceChange', () => {
    it('should calculate absolute and percentage change between epochs', () => {
      const change = EquaPriceCalculator.calculatePriceChange(0, 100);
      
      expect(change).toHaveProperty('absoluteChange');
      expect(change).toHaveProperty('percentageChange');
      expect(change.absoluteChange).toBeGreaterThan(0);
      expect(change.percentageChange).toBeGreaterThan(0);
    });
  });

  describe('getTierThresholds', () => {
    it('should return all tier threshold information', () => {
      const thresholds = EquaPriceCalculator.getTierThresholds();
      
      expect(thresholds.tier1EndPrice).toBe(0.1);
      expect(thresholds.tier2EndPrice).toBe(1);
      expect(thresholds.tier3EndPrice).toBe(10);
      expect(thresholds.tier4EndPrice).toBe(100);
      expect(thresholds.tier5EndPrice).toBe(1000);
      expect(thresholds.tier6EndPrice).toBe(10000);
      expect(thresholds.tier7EndPrice).toBe(100000);
      expect(thresholds.tier8EndPrice).toBe(500000);
      expect(thresholds.tier9MonthlyCap).toBe(25000);
      
      // Verify transaction thresholds are sequential
      expect(thresholds.tier1EndTransactions).toBeGreaterThan(0);
      expect(thresholds.tier2EndTransactions).toBeGreaterThan(thresholds.tier1EndTransactions);
      expect(thresholds.tier3EndTransactions).toBeGreaterThan(thresholds.tier2EndTransactions);
      expect(thresholds.tier4EndTransactions).toBeGreaterThan(thresholds.tier3EndTransactions);
      expect(thresholds.tier5EndTransactions).toBeGreaterThan(thresholds.tier4EndTransactions);
      expect(thresholds.tier6EndTransactions).toBeGreaterThan(thresholds.tier5EndTransactions);
      expect(thresholds.tier7EndTransactions).toBeGreaterThan(thresholds.tier6EndTransactions);
      expect(thresholds.tier8EndTransactions).toBeGreaterThan(thresholds.tier7EndTransactions);
    });
  });
});
