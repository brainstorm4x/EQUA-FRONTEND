/**
 * Unit tests for resolveReferralInput function
 */

import { resolveReferralInput } from '@/utils/referral/registry';
import { ReferralState, ReferralRegistry } from '@/types/referral';
import { CODE_TTL_SECONDS } from '@/config/referral';

describe('resolveReferralInput', () => {
  const now = Math.floor(Date.now() / 1000);

  // Test registry with various code states
  const mockRegistry: ReferralRegistry = {
    // Valid code (not expired, not used)
    'ValidCode1': {
      referrer_pubkey: '11111111111111111111111111111112',
      created_at: now - 60,
      expires_at: now + CODE_TTL_SECONDS - 60,
      used: false,
    },
    // Used code
    'UsedCode01': {
      referrer_pubkey: '22222222222222222222222222222222',
      created_at: now - 300,
      expires_at: now + CODE_TTL_SECONDS - 300,
      used: true,
    },
    // Expired code
    'ExpiredCd1': {
      referrer_pubkey: '33333333333333333333333333333333',
      created_at: now - CODE_TTL_SECONDS - 60,
      expires_at: now - 60,
      used: false,
    },
  };

  describe('Valid Code', () => {
    it('should return VALID state for an existing, unexpired, unused code', () => {
      const result = resolveReferralInput('ValidCode1', mockRegistry);

      expect(result.state).toBe(ReferralState.VALID);
      expect(result.referrerPubkey).toBe('11111111111111111111111111111112');
      expect(result.expiresInSeconds).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should return correct expiresInSeconds value', () => {
      const result = resolveReferralInput('ValidCode1', mockRegistry);

      // The expires_at is now + CODE_TTL_SECONDS - 60, so remaining should be around CODE_TTL_SECONDS - 60
      expect(result.expiresInSeconds).toBeLessThanOrEqual(CODE_TTL_SECONDS - 60 + 1);
      expect(result.expiresInSeconds).toBeGreaterThan(0);
    });
  });

  describe('Used Code', () => {
    it('should return USED state for a code that has been used', () => {
      const result = resolveReferralInput('UsedCode01', mockRegistry);

      expect(result.state).toBe(ReferralState.USED);
      expect(result.error).toBe('This referral code has already been used');
      expect(result.referrerPubkey).toBeUndefined();
    });
  });

  describe('Expired Code', () => {
    it('should return EXPIRED state for a code that has expired', () => {
      const result = resolveReferralInput('ExpiredCd1', mockRegistry);

      expect(result.state).toBe(ReferralState.EXPIRED);
      expect(result.error).toBe('This referral code has expired');
      expect(result.referrerPubkey).toBeUndefined();
    });
  });

  describe('Nonexistent Code', () => {
    it('should return NOT_FOUND state for a code not in the registry', () => {
      const result = resolveReferralInput('Unknown123', mockRegistry);

      expect(result.state).toBe(ReferralState.NOT_FOUND);
      expect(result.error).toBe('Referral code not found');
      expect(result.referrerPubkey).toBeUndefined();
    });
  });

  describe('Public Key Input', () => {
    it('should return PUBLIC_KEY state for a valid Solana public key', () => {
      // Using a valid base58 public key format (Solana's system program)
      const validPubkey = '11111111111111111111111111111111';
      const result = resolveReferralInput(validPubkey, mockRegistry);

      expect(result.state).toBe(ReferralState.PUBLIC_KEY);
      expect(result.referrerPubkey).toBe(validPubkey);
      expect(result.error).toBeUndefined();
    });

    it('should handle longer valid public keys', () => {
      // Another valid format public key
      const validPubkey = 'B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2';
      const result = resolveReferralInput(validPubkey, mockRegistry);

      expect(result.state).toBe(ReferralState.PUBLIC_KEY);
      expect(result.referrerPubkey).toBe(validPubkey);
    });
  });

  describe('Malformed Input', () => {
    it('should return MALFORMED state for invalid input', () => {
      const result = resolveReferralInput('invalid!!!', mockRegistry);

      expect(result.state).toBe(ReferralState.MALFORMED);
      expect(result.error).toBe('Invalid referral code or wallet address format');
      expect(result.referrerPubkey).toBeUndefined();
    });

    it('should return MALFORMED for input with special characters', () => {
      const result = resolveReferralInput('code@#$%^&', mockRegistry);

      expect(result.state).toBe(ReferralState.MALFORMED);
    });

    it('should return MALFORMED for too short input that is not a valid pubkey', () => {
      const result = resolveReferralInput('abc', mockRegistry);

      expect(result.state).toBe(ReferralState.MALFORMED);
    });
  });

  describe('Empty Input', () => {
    it('should return IDLE state for empty string', () => {
      const result = resolveReferralInput('', mockRegistry);

      expect(result.state).toBe(ReferralState.IDLE);
    });

    it('should return IDLE state for whitespace-only string', () => {
      const result = resolveReferralInput('   ', mockRegistry);

      expect(result.state).toBe(ReferralState.IDLE);
    });
  });

  describe('Input Trimming', () => {
    it('should trim leading and trailing whitespace', () => {
      const result = resolveReferralInput('  ValidCode1  ', mockRegistry);

      expect(result.state).toBe(ReferralState.VALID);
      expect(result.referrerPubkey).toBe('11111111111111111111111111111112');
    });
  });

  describe('Priority of validation states', () => {
    it('should check used status before expiration', () => {
      // Create a code that is both used AND expired
      const testRegistry: ReferralRegistry = {
        'UsedExpir1': {
          referrer_pubkey: '44444444444444444444444444444444',
          created_at: now - CODE_TTL_SECONDS - 60,
          expires_at: now - 60,
          used: true,
        },
      };

      const result = resolveReferralInput('UsedExpir1', testRegistry);

      // Should return USED first (as per the validation order in the code)
      expect(result.state).toBe(ReferralState.USED);
    });
  });
});
