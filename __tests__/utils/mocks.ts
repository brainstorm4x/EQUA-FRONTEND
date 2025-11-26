/**
 * Mock data and utilities for testing
 */

import { ReferralRegistry, ReferralCodeEntry } from '@/types/referral';

const NOW = Math.floor(Date.now() / 1000);
const CODE_TTL_SECONDS = 900; // 15 minutes

/**
 * Generate a mock referral code entry
 */
export function createMockReferralEntry(
  overrides?: Partial<ReferralCodeEntry>
): ReferralCodeEntry {
  return {
    referrer_pubkey: '11111111111111111111111111111111',
    created_at: NOW - 60,
    expires_at: NOW + CODE_TTL_SECONDS - 60,
    used: false,
    ...overrides,
  };
}

/**
 * Mock referral registry with various states for testing
 */
export const MOCK_REFERRAL_REGISTRY: ReferralRegistry = {
  // Valid code - not used, not expired
  ValidCode1: createMockReferralEntry({
    referrer_pubkey: '11111111111111111111111111111112',
  }),
  
  // Used code
  UsedCode01: createMockReferralEntry({
    referrer_pubkey: '22222222222222222222222222222222',
    used: true,
  }),
  
  // Expired code
  ExpiredCd1: createMockReferralEntry({
    referrer_pubkey: '33333333333333333333333333333333',
    created_at: NOW - CODE_TTL_SECONDS - 60,
    expires_at: NOW - 60,
  }),
  
  // About to expire (1 minute left)
  Expiring01: createMockReferralEntry({
    referrer_pubkey: '44444444444444444444444444444444',
    created_at: NOW - CODE_TTL_SECONDS + 60,
    expires_at: NOW + 60,
  }),
  
  // Multiple valid codes for different users
  ValidCode2: createMockReferralEntry({
    referrer_pubkey: '55555555555555555555555555555555',
  }),
  ValidCode3: createMockReferralEntry({
    referrer_pubkey: '66666666666666666666666666666666',
  }),
};

/**
 * Mock valid Solana public keys for testing
 */
export const MOCK_PUBLIC_KEYS = {
  VALID_1: '11111111111111111111111111111111',
  VALID_2: '22222222222222222222222222222222',
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  // Base58 encoded valid public key
  REALISTIC: 'CqKe5xR7R9K7XmM3h2cQkN8pJ8rDz3K3t2hY5Z7gT3K8',
};

/**
 * Mock user account data for testing
 */
export interface MockUserAccount {
  publicKey: string;
  totalUsers: number;
  walletBalance: number; // in lamports
  isRegistered: boolean;
  userNumber?: number;
  mintedAmount?: number;
}

/**
 * Create a mock user account with sensible defaults
 */
export function createMockUserAccount(
  overrides?: Partial<MockUserAccount>
): MockUserAccount {
  return {
    publicKey: MOCK_PUBLIC_KEYS.VALID_1,
    totalUsers: 50,
    walletBalance: 100_000_000, // 0.1 SOL
    isRegistered: false,
    ...overrides,
  };
}

/**
 * Mock responses for various error states
 */
export const MOCK_ERRORS = {
  NETWORK_ERROR: new Error('Network request failed'),
  INSUFFICIENT_BALANCE: new Error('Insufficient SOL balance'),
  INVALID_ACCOUNT: new Error('Account does not exist'),
  TRANSACTION_FAILED: new Error('Transaction failed'),
  REGISTRY_FETCH_FAILED: new Error('Failed to fetch referral registry'),
};

/**
 * Mock total user counts for different test scenarios
 */
export const MOCK_USER_COUNTS = {
  BELOW_THRESHOLD: 50,
  AT_THRESHOLD: 100,
  ABOVE_THRESHOLD: 150,
  OVERFLOW: 17179869188, // Unreasonably large value to test overflow
  MAX_SAFE: 1_000_000,
};

/**
 * Mock wallet balances for different test scenarios
 */
export const MOCK_WALLET_BALANCES = {
  INSUFFICIENT: 10_000_000, // 0.01 SOL - below minimum
  SUFFICIENT: 100_000_000, // 0.1 SOL - sufficient for registration
  GENEROUS: 1_000_000_000, // 1 SOL
};

/**
 * Helper to mock blockchain RPC responses
 */
export function mockRpcResponse<T>(data: T) {
  return {
    context: { slot: 123456 },
    value: data,
  };
}

/**
 * Helper to mock failed blockchain RPC responses
 */
export function mockRpcError(error: Error) {
  return Promise.reject(error);
}

/**
 * Mock delay for async operations in tests
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock fetch implementation for registry
 */
export function mockFetchReferralRegistry(
  registry: ReferralRegistry = MOCK_REFERRAL_REGISTRY
): jest.Mock {
  return jest.fn().mockResolvedValue(registry);
}

/**
 * Mock fetch implementation that fails
 */
export function mockFetchReferralRegistryError(
  error: Error = MOCK_ERRORS.REGISTRY_FETCH_FAILED
): jest.Mock {
  return jest.fn().mockRejectedValue(error);
}
