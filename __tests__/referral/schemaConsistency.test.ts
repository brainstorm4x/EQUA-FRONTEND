/**
 * Tests for referral schema consistency and transformations
 */

import { fetchReferralRegistry, resolveReferralInput } from '@/utils/referral';
import { ReferralState } from '@/types/referral';

describe('Referral Schema Consistency', () => {
  describe('fetchReferralRegistry', () => {
    it('should return registry with snake_case backend schema', async () => {
      const registry = await fetchReferralRegistry();
      
      // Check that at least one entry exists (from mock data)
      const entries = Object.values(registry);
      expect(entries.length).toBeGreaterThan(0);
      
      // Verify all entries follow backend snake_case schema
      entries.forEach((entry) => {
        expect(entry).toHaveProperty('referrer_pubkey');
        expect(entry).toHaveProperty('created_at');
        expect(entry).toHaveProperty('expires_at');
        expect(entry).toHaveProperty('used');
        
        // Ensure it's a valid schema format
        expect(typeof entry.referrer_pubkey).toBe('string');
        expect(typeof entry.created_at).toBe('number');
        expect(typeof entry.expires_at).toBe('number');
        expect(typeof entry.used).toBe('boolean');
      });
    });
  });

  describe('resolveReferralInput', () => {
    it('should transform backend schema to camelCase for UI consumption', async () => {
      const registry = await fetchReferralRegistry();
      
      // Find a valid code from the registry
      const validCode = Object.keys(registry).find(
        (code) => !registry[code].used && registry[code].expires_at > Math.floor(Date.now() / 1000)
      );
      
      if (validCode) {
        const result = resolveReferralInput(validCode, registry);
        
        // Verify UI layer uses camelCase
        if (result.state === ReferralState.VALID) {
          expect(result).toHaveProperty('referrerPubkey');
          expect(result.referrerPubkey).toBeTruthy();
          expect(typeof result.referrerPubkey).toBe('string');
        }
      }
    });

    it('should handle expired codes correctly', async () => {
      const registry = await fetchReferralRegistry();
      
      // Find an expired code from the registry
      const expiredCode = Object.keys(registry).find(
        (code) => registry[code].expires_at < Math.floor(Date.now() / 1000)
      );
      
      if (expiredCode) {
        const result = resolveReferralInput(expiredCode, registry);
        
        expect(result.state).toBe(ReferralState.EXPIRED);
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle used codes correctly', async () => {
      const registry = await fetchReferralRegistry();
      
      // Find a used code from the registry
      const usedCode = Object.keys(registry).find((code) => registry[code].used);
      
      if (usedCode) {
        const result = resolveReferralInput(usedCode, registry);
        
        expect(result.state).toBe(ReferralState.USED);
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle direct public key input', async () => {
      const registry = await fetchReferralRegistry();
      const validPublicKey = '11111111111111111111111111111111';
      
      const result = resolveReferralInput(validPublicKey, registry);
      
      expect(result.state).toBe(ReferralState.PUBLIC_KEY);
      expect(result.referrerPubkey).toBe(validPublicKey);
    });

    it('should handle malformed input', async () => {
      const registry = await fetchReferralRegistry();
      const malformedInput = 'not-a-valid-code-or-pubkey';
      
      const result = resolveReferralInput(malformedInput, registry);
      
      expect(result.state).toBe(ReferralState.MALFORMED);
      expect(result.error).toBeTruthy();
    });
  });
});
