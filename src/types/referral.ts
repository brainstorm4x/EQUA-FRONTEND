/**
 * Types for the off-chain referral code system
 * 
 * Schema Design:
 * - Backend API and registry use snake_case (referrer_pubkey, created_at, expires_at, used)
 * - Frontend UI layer uses camelCase (referrerPubkey, expiresInSeconds)
 * - Transformation between formats happens in utility functions (see src/utils/referral/registry.ts)
 */

/**
 * Enum representing the possible states of a referral resolution
 */
export enum ReferralState {
  /** Code is valid and can be used */
  VALID = 'VALID',
  /** Code has already been used */
  USED = 'USED',
  /** Code has expired (15 minute TTL exceeded) */
  EXPIRED = 'EXPIRED',
  /** Code was not found in the registry */
  NOT_FOUND = 'NOT_FOUND',
  /** Input was detected as a direct public key */
  PUBLIC_KEY = 'PUBLIC_KEY',
  /** Input format is invalid (neither valid code nor public key) */
  MALFORMED = 'MALFORMED',
  /** Loading/pending state while resolving */
  LOADING = 'LOADING',
  /** Initial state before any input */
  IDLE = 'IDLE',
}

/**
 * A single referral code entry in the registry
 * 
 * NOTE: This interface uses snake_case to match the backend schema defined in 
 * schemas/referralCode.schema.json. Frontend UI components receive transformed
 * camelCase versions (e.g., referrerPubkey) via ReferralResolutionResult.
 */
export interface ReferralCodeEntry {
  /** The referrer's Solana public key (base58 encoded) */
  referrer_pubkey: string;
  /** Unix timestamp (seconds) when the code was created */
  created_at: number;
  /** Unix timestamp (seconds) when the code expires */
  expires_at: number;
  /** Whether this code has been used */
  used: boolean;
}

/**
 * The referral registry mapping codes to their entries
 */
export interface ReferralRegistry {
  [code: string]: ReferralCodeEntry;
}

/**
 * Result of resolving a referral input (code or public key)
 * 
 * NOTE: This interface uses camelCase for UI consumption. The underlying
 * ReferralCodeEntry uses snake_case to match backend schema.
 */
export interface ReferralResolutionResult {
  /** The current state of the resolution */
  state: ReferralState;
  /** The referrer's public key if resolution was successful (camelCase for UI) */
  referrerPubkey?: string;
  /** Error message if applicable */
  error?: string;
  /** Seconds until the code expires (only for VALID state) */
  expiresInSeconds?: number;
}

/**
 * Hook return type for useReferralResolution
 */
export interface UseReferralResolutionResult {
  /** Current resolution status */
  status: ReferralState;
  /** The referrer's public key if resolution was successful */
  referrerPubkey: string | null;
  /** Error message if resolution failed */
  error: string | null;
  /** Seconds until expiration (only for VALID state) */
  expiresInSeconds: number | null;
  /** Whether the resolution is currently loading */
  isLoading: boolean;
  /** Whether the input represents a valid referral */
  isValid: boolean;
}
