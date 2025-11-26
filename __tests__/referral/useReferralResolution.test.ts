/**
 * Unit tests for useReferralResolution hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useReferralResolution } from '@/hooks/useReferralResolution';
import { ReferralState } from '@/types/referral';

// Mock the registry fetch
jest.mock('@/utils/referral/registry', () => {
  const now = Math.floor(Date.now() / 1000);
  const CODE_TTL_SECONDS = 900;
  
  const mockRegistry = {
    'ValidCode1': {
      referrer_pubkey: '11111111111111111111111111111112',
      created_at: now - 60,
      expires_at: now + CODE_TTL_SECONDS - 60,
      used: false,
    },
    'UsedCode01': {
      referrer_pubkey: '22222222222222222222222222222222',
      created_at: now - 300,
      expires_at: now + CODE_TTL_SECONDS - 300,
      used: true,
    },
    'ExpiredCd1': {
      referrer_pubkey: '33333333333333333333333333333333',
      created_at: now - CODE_TTL_SECONDS - 60,
      expires_at: now - 60,
      used: false,
    },
  };

  return {
    fetchReferralRegistry: jest.fn(async () => {
      // Return immediately to avoid act warnings
      return Promise.resolve(mockRegistry);
    }),
    resolveReferralInput: jest.requireActual('@/utils/referral/registry').resolveReferralInput,
  };
});

describe('useReferralResolution', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return IDLE state with empty input', async () => {
      const { result } = renderHook(() => useReferralResolution(''));

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      expect(result.current.referrerPubkey).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should show loading state when input changes', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Change input to trigger loading
      rerender({ input: 'ValidCode1' });

      expect(result.current.status).toBe(ReferralState.LOADING);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Valid Code Resolution', () => {
    it('should resolve a valid code after debounce', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      // Change input
      await act(async () => {
        rerender({ input: 'ValidCode1' });
      });

      // Fast-forward past debounce
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.VALID);
      });

      expect(result.current.referrerPubkey).toBe('11111111111111111111111111111112');
      expect(result.current.expiresInSeconds).toBeGreaterThan(0);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Used Code Resolution', () => {
    it('should return USED state for a used code', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: 'UsedCode01' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.USED);
      });

      expect(result.current.error).toBe('This referral code has already been used');
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Expired Code Resolution', () => {
    it('should return EXPIRED state for an expired code', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: 'ExpiredCd1' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.EXPIRED);
      });

      expect(result.current.error).toBe('This referral code has expired');
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Not Found Code Resolution', () => {
    it('should return NOT_FOUND state for unknown code', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: 'Unknown123' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.NOT_FOUND);
      });

      expect(result.current.error).toBe('Referral code not found');
    });
  });

  describe('Public Key Resolution', () => {
    it('should return PUBLIC_KEY state for valid public key', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: '11111111111111111111111111111111' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.PUBLIC_KEY);
      });

      expect(result.current.referrerPubkey).toBe('11111111111111111111111111111111');
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Malformed Input Resolution', () => {
    it('should return MALFORMED state for invalid input', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: 'invalid!!!' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.MALFORMED);
      });

      expect(result.current.error).toBe('Invalid referral code or wallet address format');
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid input changes', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      // Rapid changes
      await act(async () => {
        rerender({ input: 'V' });
        rerender({ input: 'Va' });
        rerender({ input: 'Val' });
        rerender({ input: 'ValidCode1' });
      });

      // Should still be loading
      expect(result.current.status).toBe(ReferralState.LOADING);

      // Wait for debounce
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.VALID);
      });
    });
  });

  describe('State Transitions', () => {
    it('should transition from IDLE -> LOADING -> VALID', async () => {
      const states: ReferralState[] = [];
      
      const { result, rerender } = renderHook(
        ({ input }) => {
          const hookResult = useReferralResolution(input, 100);
          states.push(hookResult.status);
          return hookResult;
        },
        { initialProps: { input: '' } }
      );

      expect(result.current.status).toBe(ReferralState.IDLE);

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      await act(async () => {
        rerender({ input: 'ValidCode1' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.VALID);
      });

      // Should have transitioned through IDLE -> LOADING -> VALID
      expect(states).toContain(ReferralState.IDLE);
      expect(states).toContain(ReferralState.LOADING);
      expect(states).toContain(ReferralState.VALID);
    });

    it('should reset to IDLE when input is cleared', async () => {
      const { result, rerender } = renderHook(
        ({ input }) => useReferralResolution(input, 100),
        { initialProps: { input: '' } }
      );

      // Wait for registry to load
      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.IDLE);
      });

      // Set a valid code
      await act(async () => {
        rerender({ input: 'ValidCode1' });
      });

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.status).toBe(ReferralState.VALID);
      });

      // Clear input
      await act(async () => {
        rerender({ input: '' });
      });

      expect(result.current.status).toBe(ReferralState.IDLE);
      expect(result.current.referrerPubkey).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
