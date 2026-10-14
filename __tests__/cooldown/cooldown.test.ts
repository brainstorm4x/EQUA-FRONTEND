/**
 * Unit tests for cooldown enforcement utility
 */

import {
  canMintNow,
  startMint,
  endMint,
  timeRemaining,
  getCooldownUntil,
  hasInFlightMint,
  getCooldownPeriod,
} from '@/utils/cooldown';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Cooldown Guard', () => {
  const testWallet = 'TestWallet123';
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  describe('getCooldownPeriod', () => {
    it('should return 2592000 seconds (30 days) by default', () => {
      expect(getCooldownPeriod()).toBe(2592000);
    });
  });

  describe('canMintNow', () => {
    it('should return true when no cooldown state exists', () => {
      expect(canMintNow(testWallet)).toBe(true);
    });

    it('should return false when there is an active in-flight lock', () => {
      startMint(testWallet);
      expect(canMintNow(testWallet)).toBe(false);
    });

    it('should return false when cooldown is active', () => {
      const now = Math.floor(Date.now() / 1000);
      const lastMintTime = now - 100; // 100 seconds ago
      endMint(testWallet, true, now, lastMintTime);
      
      expect(canMintNow(testWallet)).toBe(false);
    });

    it('should return true when cooldown has expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const lastMintTime = now - 2592001; // More than 30 days ago
      endMint(testWallet, true, now, lastMintTime);
      
      expect(canMintNow(testWallet)).toBe(true);
    });
  });

  describe('startMint', () => {
    it('should set optimistic cooldown state', () => {
      startMint(testWallet);
      
      expect(canMintNow(testWallet)).toBe(false);
      expect(hasInFlightMint(testWallet)).toBe(true);
    });

    it('should set cooldown until 30 days from now', () => {
      const before = Math.floor(Date.now() / 1000);
      startMint(testWallet);
      const after = Math.floor(Date.now() / 1000);
      
      const cooldownUntil = getCooldownUntil(testWallet);
      expect(cooldownUntil).not.toBeNull();
      
      if (cooldownUntil) {
        const expectedMin = before + 2592000;
        const expectedMax = after + 2592000;
        expect(cooldownUntil).toBeGreaterThanOrEqual(expectedMin);
        expect(cooldownUntil).toBeLessThanOrEqual(expectedMax);
      }
    });
  });

  describe('endMint', () => {
    it('should clear in-flight lock on success', () => {
      startMint(testWallet);
      expect(hasInFlightMint(testWallet)).toBe(true);
      
      const now = Math.floor(Date.now() / 1000);
      endMint(testWallet, true, now, now);
      
      expect(hasInFlightMint(testWallet)).toBe(false);
    });

    it('should clear in-flight lock on error', () => {
      startMint(testWallet);
      expect(hasInFlightMint(testWallet)).toBe(true);
      
      endMint(testWallet, false);
      
      expect(hasInFlightMint(testWallet)).toBe(false);
    });

    it('should clear optimistic cooldown on error', () => {
      startMint(testWallet);
      expect(canMintNow(testWallet)).toBe(false);
      
      endMint(testWallet, false);
      
      // After clearing the optimistic cooldown, should be able to mint again
      // (assuming no other cooldown state exists)
      expect(canMintNow(testWallet)).toBe(true);
    });

    it('should set confirmed cooldown on success', () => {
      const now = Math.floor(Date.now() / 1000);
      const lastMintTime = now - 100;
      
      endMint(testWallet, true, now, lastMintTime);
      
      expect(canMintNow(testWallet)).toBe(false);
      const cooldownUntil = getCooldownUntil(testWallet);
      expect(cooldownUntil).toBe(lastMintTime + 2592000);
    });
  });

  describe('timeRemaining', () => {
    it('should return 0 when no cooldown exists', () => {
      expect(timeRemaining(testWallet)).toBe(0);
    });

    it('should return correct time remaining during cooldown', () => {
      const now = Math.floor(Date.now() / 1000);
      const lastMintTime = now - 1000; // 1000 seconds ago
      endMint(testWallet, true, now, lastMintTime);
      
      const remaining = timeRemaining(testWallet);
      const expected = 2592000 - 1000; // 30 days - 1000 seconds
      
      // Allow 1 second tolerance for test execution time
      expect(remaining).toBeGreaterThanOrEqual(expected - 1);
      expect(remaining).toBeLessThanOrEqual(expected + 1);
    });

    it('should return 0 when cooldown has expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const lastMintTime = now - 2592001; // More than 30 days ago
      endMint(testWallet, true, now, lastMintTime);
      
      expect(timeRemaining(testWallet)).toBe(0);
    });
  });

  describe('hasInFlightMint', () => {
    it('should return false when no in-flight lock exists', () => {
      expect(hasInFlightMint(testWallet)).toBe(false);
    });

    it('should return true when in-flight lock exists', () => {
      startMint(testWallet);
      expect(hasInFlightMint(testWallet)).toBe(true);
    });

    it('should return false after in-flight lock is cleared', () => {
      startMint(testWallet);
      endMint(testWallet, false);
      expect(hasInFlightMint(testWallet)).toBe(false);
    });
  });

  describe('Wallet-specific state', () => {
    it('should maintain separate cooldown state per wallet', () => {
      const wallet1 = 'Wallet1';
      const wallet2 = 'Wallet2';
      
      startMint(wallet1);
      
      expect(canMintNow(wallet1)).toBe(false);
      expect(canMintNow(wallet2)).toBe(true);
    });

    it('should maintain separate in-flight locks per wallet', () => {
      const wallet1 = 'Wallet1';
      const wallet2 = 'Wallet2';
      
      startMint(wallet1);
      
      expect(hasInFlightMint(wallet1)).toBe(true);
      expect(hasInFlightMint(wallet2)).toBe(false);
    });
  });

  describe('Race condition prevention', () => {
    it('should block rapid successive calls to startMint', () => {
      startMint(testWallet);
      
      // Try to start another mint immediately
      expect(canMintNow(testWallet)).toBe(false);
      
      // This should be blocked by the in-flight lock
      // In real usage, handleMint would check canMintNow() and return early
      expect(hasInFlightMint(testWallet)).toBe(true);
    });

    it('should maintain cooldown through optimistic -> confirmed transition', () => {
      // Start optimistic mint
      startMint(testWallet);
      expect(canMintNow(testWallet)).toBe(false);
      
      // Confirm with on-chain data
      const now = Math.floor(Date.now() / 1000);
      endMint(testWallet, true, now, now);
      
      // Should still be on cooldown (just transitioned from optimistic to confirmed)
      expect(canMintNow(testWallet)).toBe(false);
      expect(hasInFlightMint(testWallet)).toBe(false); // But lock should be cleared
    });
  });

  describe('a mint left unfinished (page closed or back button mid-mint)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('blocks a second click while the first mint may still be in flight', () => {
      startMint(testWallet);
      expect(canMintNow(testWallet)).toBe(false);
    });

    it('does not block minting for 30 days once the in-flight window has passed', () => {
      startMint(testWallet); // the page is then left before endMint() runs
      const later = Date.now() + 3 * 60 * 1000; // 3 minutes on (in-flight lock is 2)
      jest.spyOn(Date, 'now').mockReturnValue(later);

      expect(canMintNow(testWallet)).toBe(true);
      expect(timeRemaining(testWallet)).toBe(0);
      expect(getCooldownUntil(testWallet)).toBeNull();
    });

    it('a confirmed mint still keeps its 30-day cooldown', () => {
      const now = Math.floor(Date.now() / 1000);
      endMint(testWallet, true, now, now - 60);
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * 60 * 1000);
      expect(canMintNow(testWallet)).toBe(false);
    });

    it('ignores cooldowns stored by an older deployment', () => {
      const now = Math.floor(Date.now() / 1000);
      // old key format (no program ID) with a confirmed cooldown
      localStorageMock.setItem(
        `uniyaa:cooldown:${testWallet}`,
        JSON.stringify({ lastMintTime: now - 60, cooldownUntil: now + 2591940, isOptimistic: false }),
      );
      expect(canMintNow(testWallet)).toBe(true);
    });
  });
});
