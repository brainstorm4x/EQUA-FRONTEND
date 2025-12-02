/**
 * Tests for Program ID configuration and propagation
 */

import { PublicKey } from '@solana/web3.js';
import { getProgramId, PROGRAM_ID } from '@/config/program';
import { 
  getCurrentProgramId, 
  isUsingProgramIdOverride, 
  getProgramIdSource,
  DEFAULT_PROGRAM_ID 
} from '../../lib/assertProgramId';

describe('Program ID Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default Program ID', () => {
    it('should use default Program ID when no env override is set', () => {
      delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      delete process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;

      const programId = PROGRAM_ID.toBase58();
      expect(programId).toBe(DEFAULT_PROGRAM_ID);
    });

    it('should return valid PublicKey', () => {
      const programId = getProgramId();
      expect(programId).toBeInstanceOf(PublicKey);
      expect(programId.toBase58()).toBeTruthy();
    });
  });

  describe('Environment Override', () => {
    it('should use NEXT_PUBLIC_PROGRAM_ID when set', () => {
      const testProgramId = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';
      process.env.NEXT_PUBLIC_PROGRAM_ID = testProgramId;

      // Need to reload module to pick up env change
      jest.resetModules();
      const { PROGRAM_ID: newProgramId } = require('@/config/program');
      
      expect(newProgramId.toBase58()).toBe(testProgramId);
    });

    it('should fallback to NEXT_PUBLIC_EQUA_PROGRAM_ID for backward compatibility', () => {
      const testProgramId = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';
      delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID = testProgramId;

      // Need to reload module to pick up env change
      jest.resetModules();
      const { PROGRAM_ID: newProgramId } = require('@/config/program');
      
      expect(newProgramId.toBase58()).toBe(testProgramId);
    });

    it('should prefer NEXT_PUBLIC_PROGRAM_ID over NEXT_PUBLIC_EQUA_PROGRAM_ID', () => {
      const preferredId = '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP';
      const legacyId = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';
      
      process.env.NEXT_PUBLIC_PROGRAM_ID = preferredId;
      process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID = legacyId;

      // Need to reload module to pick up env change
      jest.resetModules();
      const { PROGRAM_ID: newProgramId } = require('@/config/program');
      
      expect(newProgramId.toBase58()).toBe(preferredId);
    });
  });

  describe('Program ID Source Detection', () => {
    it('should detect when using default Program ID', () => {
      delete process.env.NEXT_PUBLIC_PROGRAM_ID;
      delete process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID;

      expect(isUsingProgramIdOverride()).toBe(false);
      expect(getProgramIdSource()).toBe('default');
    });

    it('should detect when using environment override', () => {
      process.env.NEXT_PUBLIC_PROGRAM_ID = '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP';

      expect(isUsingProgramIdOverride()).toBe(true);
      expect(getProgramIdSource()).toBe('environment');
    });
  });

  describe('Program ID Consistency', () => {
    it('should return same Program ID from different imports', () => {
      const programIdFromConfig = getProgramId().toBase58();
      const programIdFromConstant = PROGRAM_ID.toBase58();
      const programIdFromAssertion = getCurrentProgramId();

      expect(programIdFromConfig).toBe(programIdFromConstant);
      expect(programIdFromConfig).toBe(programIdFromAssertion);
    });

    it('should maintain Program ID consistency across multiple calls', () => {
      const firstCall = getProgramId();
      const secondCall = getProgramId();
      
      // Should return the same instance (memoized)
      expect(firstCall).toBe(secondCall);
      expect(firstCall.toBase58()).toBe(secondCall.toBase58());
    });
  });

  describe('Program ID Validation', () => {
    it('should have valid base58 string', () => {
      const programIdStr = PROGRAM_ID.toBase58();
      
      // Base58 characters only
      expect(programIdStr).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
      
      // Typical Solana address length (32-44 characters)
      expect(programIdStr.length).toBeGreaterThanOrEqual(32);
      expect(programIdStr.length).toBeLessThanOrEqual(44);
    });

    it('should be convertible to buffer', () => {
      const buffer = PROGRAM_ID.toBuffer();
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(32); // Solana PublicKey is 32 bytes
    });
  });
});
