/**
 * Tests for the EQUA Price Calculator
 * Validates the five-phase price appreciation model
 * 
 * New Model:
 * - Phase 1: $0.01 to $1, 0.1% per 1 tx
 * - Phase 2: $1 to $10, 0.1% per 10 tx  
 * - Phase 3: $10 to $100, 0.1% per 100 tx
 * - Phase 4: $100 to $200,000, 0.01% per 1000 tx
 * - Phase 5: >$200,000, $100 per 1000 tx (linear)
 */

import { EquaPriceCalculator } from '@/utils/priceCalculator';

describe('EquaPriceCalculator', () => {
  describe('Phase 1 ($0.01 to $1)', () => {
    it('should return initial price of $0.01 at 0 transactions', () => {
      const price = EquaPriceCalculator.calculatePrice(0);
      expect(price).toBe(0.01);
    });

    it('should be in phase1 for transactions until price reaches $1', () => {
      expect(EquaPriceCalculator.getPhase(0)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(100)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(1000)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(4000)).toBe('phase1');
    });

    it('should calculate 0.1% growth per epoch (1 transaction)', () => {
      // At epoch 1 (1 transaction): $0.01 * 1.001^1
      const price1 = EquaPriceCalculator.calculatePrice(1);
      expect(price1).toBeCloseTo(0.01 * 1.001, 5);

      // At epoch 10 (10 transactions): $0.01 * 1.001^10
      const price10 = EquaPriceCalculator.calculatePrice(10);
      expect(price10).toBeCloseTo(0.01 * Math.pow(1.001, 10), 5);

      // At epoch 100 (100 transactions): $0.01 * 1.001^100
      const price100 = EquaPriceCalculator.calculatePrice(100);
      expect(price100).toBeCloseTo(0.01 * Math.pow(1.001, 100), 4);
    });

    it('should reach approximately $1 at the end of phase 1', () => {
      // Phase 1 ends at ~4605 transactions when price reaches $1
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase1EndTransactions);
      expect(price).toBeCloseTo(1, 1);
    });
  });

  describe('Phase 2 ($1 to $10)', () => {
    it('should be in phase2 after price exceeds $1', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getPhase(thresholds.phase1EndTransactions)).toBe('phase2');
      expect(EquaPriceCalculator.getPhase(thresholds.phase1EndTransactions + 1000)).toBe('phase2');
    });

    it('should start phase 2 at approximately $1', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase1EndTransactions);
      expect(price).toBeCloseTo(1, 0);
    });

    it('should calculate 0.1% growth per epoch (10 transactions) in phase 2', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const basePrice = 1;
      
      // At first epoch in phase 2: $1 * 1.001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.phase1EndTransactions + 10);
      expect(price1).toBeCloseTo(basePrice * 1.001, 3);

      // At epoch 10 in phase 2: $1 * 1.001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.phase1EndTransactions + 100);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.001, 10), 3);
    });

    it('should reach approximately $10 at the end of phase 2', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase2EndTransactions);
      expect(price).toBeCloseTo(10, 0);
    });
  });

  describe('Phase 3 ($10 to $100)', () => {
    it('should be in phase3 after price exceeds $10', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getPhase(thresholds.phase2EndTransactions)).toBe('phase3');
      expect(EquaPriceCalculator.getPhase(thresholds.phase2EndTransactions + 10000)).toBe('phase3');
    });

    it('should start phase 3 at approximately $10', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase2EndTransactions);
      expect(price).toBeCloseTo(10, 0);
    });

    it('should calculate 0.1% growth per epoch (100 transactions) in phase 3', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const basePrice = 10;
      
      // At first epoch in phase 3: $10 * 1.001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.phase2EndTransactions + 100);
      expect(price1).toBeCloseTo(basePrice * 1.001, 2);

      // At epoch 10 in phase 3: $10 * 1.001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.phase2EndTransactions + 1000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.001, 10), 2);
    });

    it('should reach approximately $100 at the end of phase 3', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase3EndTransactions);
      expect(price).toBeCloseTo(100, 0);
    });
  });

  describe('Phase 4 ($100 to $200,000)', () => {
    it('should be in phase4 after price exceeds $100', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getPhase(thresholds.phase3EndTransactions)).toBe('phase4');
      expect(EquaPriceCalculator.getPhase(thresholds.phase3EndTransactions + 1000000)).toBe('phase4');
    });

    it('should start phase 4 at approximately $100', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase3EndTransactions);
      expect(price).toBeCloseTo(100, 0);
    });

    it('should calculate 0.01% growth per epoch (1000 transactions) in phase 4', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const basePrice = 100;
      
      // At first epoch in phase 4: $100 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(thresholds.phase3EndTransactions + 1000);
      expect(price1).toBeCloseTo(basePrice * 1.0001, 2);

      // At epoch 10 in phase 4: $100 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(thresholds.phase3EndTransactions + 10000);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 2);
    });

    it('should reach approximately $200,000 at the end of phase 4', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase4EndTransactions);
      expect(price).toBeCloseTo(200000, -3); // Within $1000
    });
  });

  describe('Phase 5 (Perpetual >$200,000)', () => {
    it('should be in phase5 after price exceeds $200,000', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getPhase(thresholds.phase4EndTransactions)).toBe('phase5');
      expect(EquaPriceCalculator.getPhase(thresholds.phase4EndTransactions + 1000000)).toBe('phase5');
    });

    it('should start phase 5 at approximately $200,000', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const price = EquaPriceCalculator.calculatePrice(thresholds.phase4EndTransactions);
      expect(price).toBeCloseTo(200000, -3); // Within $1000
    });

    it('should add $100 per epoch (1000 transactions) in phase 5', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const basePrice = EquaPriceCalculator.calculatePrice(thresholds.phase4EndTransactions);
      
      // After 1000 more transactions (1 epoch)
      const price1Epoch = EquaPriceCalculator.calculatePrice(thresholds.phase4EndTransactions + 1000);
      expect(price1Epoch).toBeCloseTo(basePrice + 100, 0);
      
      // After 10000 more transactions (10 epochs)
      const price10Epochs = EquaPriceCalculator.calculatePrice(thresholds.phase4EndTransactions + 10000);
      expect(price10Epochs).toBeCloseTo(basePrice + 1000, 0);
    });

    it('should indicate compoundingComplete in phase 5', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      const info = EquaPriceCalculator.getPriceInfo(thresholds.phase4EndTransactions + 1000);
      expect(info.phase).toBe('phase5');
      expect(info.compoundingComplete).toBe(true);
    });
  });

  describe('getCurrentEpoch', () => {
    it('should calculate epoch correctly in phase 1 (1 tx per epoch)', () => {
      expect(EquaPriceCalculator.getCurrentEpoch(0)).toBe(0);
      expect(EquaPriceCalculator.getCurrentEpoch(1)).toBe(1);
      expect(EquaPriceCalculator.getCurrentEpoch(10)).toBe(10);
      expect(EquaPriceCalculator.getCurrentEpoch(100)).toBe(100);
    });

    it('should calculate epoch correctly across phase transitions', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      
      // Phase 1 end epoch should be around 4605
      const phase1EndEpoch = EquaPriceCalculator.getCurrentEpoch(thresholds.phase1EndTransactions);
      expect(phase1EndEpoch).toBeGreaterThan(4000);
      expect(phase1EndEpoch).toBeLessThan(5000);
    });
  });

  describe('getTransactionsPerEpoch', () => {
    it('should return 1 for phase 1', () => {
      expect(EquaPriceCalculator.getTransactionsPerEpoch(0)).toBe(1);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(1000)).toBe(1);
    });

    it('should return 10 for phase 2', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.phase1EndTransactions)).toBe(10);
    });

    it('should return 100 for phase 3', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.phase2EndTransactions)).toBe(100);
    });

    it('should return 1000 for phase 4 and phase 5', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.phase3EndTransactions)).toBe(1000);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(thresholds.phase4EndTransactions)).toBe(1000);
    });
  });

  describe('getPriceInfo', () => {
    it('should return comprehensive price info', () => {
      const info = EquaPriceCalculator.getPriceInfo(100);
      
      expect(info).toHaveProperty('currentPrice');
      expect(info).toHaveProperty('currentEpoch');
      expect(info).toHaveProperty('totalTransactions');
      expect(info).toHaveProperty('phase');
      expect(info).toHaveProperty('nextEpochPrice');
      expect(info).toHaveProperty('transactionsToNextEpoch');
      expect(info).toHaveProperty('compoundingComplete');
      expect(info).toHaveProperty('transactionsPerEpoch');
      
      expect(info.totalTransactions).toBe(100);
      expect(info.phase).toBe('phase1');
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

    it('should include all phase transition milestones', () => {
      const milestones = EquaPriceCalculator.getMilestones();
      
      const phase1Complete = milestones.find(m => m.description.includes('Phase 1 Complete'));
      expect(phase1Complete).toBeDefined();
      expect(phase1Complete?.price).toBe(1);
      
      const phase2Complete = milestones.find(m => m.description.includes('Phase 2 Complete'));
      expect(phase2Complete).toBeDefined();
      expect(phase2Complete?.price).toBe(10);
      
      const phase3Complete = milestones.find(m => m.description.includes('Phase 3 Complete'));
      expect(phase3Complete).toBeDefined();
      expect(phase3Complete?.price).toBe(100);
      
      const phase4Complete = milestones.find(m => m.description.includes('Phase 4 Complete'));
      expect(phase4Complete).toBeDefined();
      expect(phase4Complete?.price).toBe(200000);
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

  describe('getPhaseThresholds', () => {
    it('should return all phase threshold information', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      
      expect(thresholds.phase1EndPrice).toBe(1);
      expect(thresholds.phase2EndPrice).toBe(10);
      expect(thresholds.phase3EndPrice).toBe(100);
      expect(thresholds.phase4EndPrice).toBe(200000);
      expect(thresholds.phase5MonthlyCap).toBe(25000);
      
      // Verify transaction thresholds are sequential
      expect(thresholds.phase1EndTransactions).toBeGreaterThan(0);
      expect(thresholds.phase2EndTransactions).toBeGreaterThan(thresholds.phase1EndTransactions);
      expect(thresholds.phase3EndTransactions).toBeGreaterThan(thresholds.phase2EndTransactions);
      expect(thresholds.phase4EndTransactions).toBeGreaterThan(thresholds.phase3EndTransactions);
    });
  });
});
