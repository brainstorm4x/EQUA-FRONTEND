/**
 * Tests for the EQUA Price Calculator
 * Validates the three-phase price appreciation model
 */

import { EquaPriceCalculator } from '@/utils/priceCalculator';

describe('EquaPriceCalculator', () => {
  describe('Phase 1 (Early Growth)', () => {
    it('should return initial price of $0.01 at 0 transactions', () => {
      const price = EquaPriceCalculator.calculatePrice(0);
      expect(price).toBe(0.01);
    });

    it('should be in phase1 for transactions below 921,500', () => {
      expect(EquaPriceCalculator.getPhase(0)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(100)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(500000)).toBe('phase1');
      expect(EquaPriceCalculator.getPhase(921499)).toBe('phase1');
    });

    it('should calculate 0.1% growth per epoch (100 transactions)', () => {
      // At epoch 1 (100 transactions): $0.01 * 1.001^1 ≈ $0.01001
      const price1 = EquaPriceCalculator.calculatePrice(100);
      expect(price1).toBeCloseTo(0.01 * 1.001, 5);

      // At epoch 10 (1000 transactions): $0.01 * 1.001^10 ≈ $0.01010045
      const price10 = EquaPriceCalculator.calculatePrice(1000);
      expect(price10).toBeCloseTo(0.01 * Math.pow(1.001, 10), 5);
    });

    it('should reach approximately $100 at the end of phase 1', () => {
      // At approximately 921,500 transactions (epoch 9215)
      const price = EquaPriceCalculator.calculatePrice(921400);
      // Should be close to $100
      expect(price).toBeGreaterThan(90);
      expect(price).toBeLessThan(110);
    });
  });

  describe('Phase 2 (Scaling)', () => {
    it('should be in phase2 for transactions between 921,500 and ~76,934,500', () => {
      expect(EquaPriceCalculator.getPhase(921500)).toBe('phase2');
      expect(EquaPriceCalculator.getPhase(1000000)).toBe('phase2');
      expect(EquaPriceCalculator.getPhase(50000000)).toBe('phase2');
    });

    it('should start phase 2 at approximately $100', () => {
      const price = EquaPriceCalculator.calculatePrice(921500);
      expect(price).toBeCloseTo(100, 0);
    });

    it('should calculate 0.01% growth per epoch (1000 transactions) in phase 2', () => {
      const basePrice = 100;
      // At first epoch in phase 2: $100 * 1.0001^1
      const price1 = EquaPriceCalculator.calculatePrice(922500);
      expect(price1).toBeCloseTo(basePrice * Math.pow(1.0001, 1), 2);

      // At epoch 10 in phase 2: $100 * 1.0001^10
      const price10 = EquaPriceCalculator.calculatePrice(931500);
      expect(price10).toBeCloseTo(basePrice * Math.pow(1.0001, 10), 2);
    });
  });

  describe('Phase 3 (Perpetual)', () => {
    const phase2EndTransactions = 76934500; // Approximate

    it('should be in phase3 after ~76,934,500 transactions', () => {
      expect(EquaPriceCalculator.getPhase(phase2EndTransactions)).toBe('phase3');
      expect(EquaPriceCalculator.getPhase(80000000)).toBe('phase3');
      expect(EquaPriceCalculator.getPhase(100000000)).toBe('phase3');
    });

    it('should start phase 3 at approximately $200,000', () => {
      const price = EquaPriceCalculator.calculatePrice(phase2EndTransactions);
      expect(price).toBeCloseTo(200000, -3); // Within $1000
    });

    it('should add $100 per epoch (1000 transactions) in phase 3', () => {
      const basePrice = EquaPriceCalculator.calculatePrice(phase2EndTransactions);
      
      // After 1000 more transactions (1 epoch)
      const price1Epoch = EquaPriceCalculator.calculatePrice(phase2EndTransactions + 1000);
      expect(price1Epoch).toBeCloseTo(basePrice + 100, 0);
      
      // After 10000 more transactions (10 epochs)
      const price10Epochs = EquaPriceCalculator.calculatePrice(phase2EndTransactions + 10000);
      expect(price10Epochs).toBeCloseTo(basePrice + 1000, 0);
    });
  });

  describe('getCurrentEpoch', () => {
    it('should calculate epoch correctly in phase 1 (100 tx per epoch)', () => {
      expect(EquaPriceCalculator.getCurrentEpoch(0)).toBe(0);
      expect(EquaPriceCalculator.getCurrentEpoch(100)).toBe(1);
      expect(EquaPriceCalculator.getCurrentEpoch(1000)).toBe(10);
      expect(EquaPriceCalculator.getCurrentEpoch(500000)).toBe(5000);
    });

    it('should calculate epoch correctly in phase 2 (1000 tx per epoch)', () => {
      // After phase 1 (9215 epochs), phase 2 starts
      const phase1EndEpoch = 9215;
      const phase1EndTx = 921500;
      
      expect(EquaPriceCalculator.getCurrentEpoch(phase1EndTx)).toBe(phase1EndEpoch);
      expect(EquaPriceCalculator.getCurrentEpoch(phase1EndTx + 1000)).toBe(phase1EndEpoch + 1);
      expect(EquaPriceCalculator.getCurrentEpoch(phase1EndTx + 10000)).toBe(phase1EndEpoch + 10);
    });
  });

  describe('getTransactionsPerEpoch', () => {
    it('should return 100 for phase 1', () => {
      expect(EquaPriceCalculator.getTransactionsPerEpoch(0)).toBe(100);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(500000)).toBe(100);
    });

    it('should return 1000 for phase 2 and phase 3', () => {
      expect(EquaPriceCalculator.getTransactionsPerEpoch(1000000)).toBe(1000);
      expect(EquaPriceCalculator.getTransactionsPerEpoch(80000000)).toBe(1000);
    });
  });

  describe('getPriceInfo', () => {
    it('should return comprehensive price info', () => {
      const info = EquaPriceCalculator.getPriceInfo(1000);
      
      expect(info).toHaveProperty('currentPrice');
      expect(info).toHaveProperty('currentEpoch');
      expect(info).toHaveProperty('totalTransactions');
      expect(info).toHaveProperty('phase');
      expect(info).toHaveProperty('nextEpochPrice');
      expect(info).toHaveProperty('transactionsToNextEpoch');
      expect(info).toHaveProperty('compoundingComplete');
      expect(info).toHaveProperty('transactionsPerEpoch');
      
      expect(info.totalTransactions).toBe(1000);
      expect(info.phase).toBe('phase1');
      expect(info.transactionsPerEpoch).toBe(100);
    });

    it('should indicate compoundingComplete in phase 3', () => {
      const info = EquaPriceCalculator.getPriceInfo(80000000);
      expect(info.phase).toBe('phase3');
      expect(info.compoundingComplete).toBe(true);
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

    it('should include phase transition milestones', () => {
      const milestones = EquaPriceCalculator.getMilestones();
      
      const phase1Complete = milestones.find(m => m.description.includes('Phase 1 Complete'));
      expect(phase1Complete).toBeDefined();
      expect(phase1Complete?.price).toBeCloseTo(100, 0);
      
      const phase2Complete = milestones.find(m => m.description.includes('Phase 2 Complete'));
      expect(phase2Complete).toBeDefined();
      expect(phase2Complete?.price).toBeCloseTo(200000, 0);
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
    it('should return phase threshold information', () => {
      const thresholds = EquaPriceCalculator.getPhaseThresholds();
      
      expect(thresholds.phase1EndTransactions).toBe(921500);
      expect(thresholds.phase1EndPrice).toBe(100);
      expect(thresholds.phase2EndPrice).toBe(200000);
      expect(thresholds.phase3MonthlyCap).toBe(25000);
    });
  });
});
