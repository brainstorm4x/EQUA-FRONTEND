/**
 * Configuration constants for the referral code system
 */

/** Length of generated referral codes */
export const CODE_LENGTH = 10;

/** Time-to-live for referral codes in seconds (15 minutes) */
export const CODE_TTL_SECONDS = 900;

/** Regex pattern for validating referral codes */
export const CODE_PATTERN = /^[A-Za-z0-9]{10}$/;

/** Characters used for generating referral codes */
export const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Debounce delay for referral input validation (in milliseconds) */
export const DEBOUNCE_DELAY_MS = 300;

/** Base58 pattern for Solana public keys */
export const PUBKEY_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
