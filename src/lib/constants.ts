import { PublicKey } from '@solana/web3.js';

/**
 * EQUA Token Program Constants
 * These values are used throughout the application
 */

// Program ID for the EQUA Token Smart Contract
export const EQUA_PROGRAM_ID = new PublicKey('G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si');

// Network Configuration
export const NETWORK = 'devnet' as const;
export const CLUSTER_API_URL = 'https://api.devnet.solana.com';

// Token Configuration
export const TOKEN_DECIMALS = 6;
export const TOKEN_NAME = 'EQUA';
export const TOKEN_SYMBOL = 'EQUA';

// Mint Configuration
export const DEFAULT_MINT_AMOUNT = 1000; // 1,000 EQUA tokens
export const MINT_AMOUNT_RAW = DEFAULT_MINT_AMOUNT * Math.pow(10, TOKEN_DECIMALS); // With decimals

// PDAs (Program Derived Addresses) Seeds
export const GLOBAL_STATE_SEED = 'global_state';
export const MINT_SEED = 'mint';
export const MINT_AUTHORITY_SEED = 'mint_authority';

// Transaction Configuration
export const TRANSACTION_TIMEOUT = 60000; // 60 seconds
export const CONFIRMATION_COMMITMENT = 'confirmed' as const;

// UI Configuration
export const EXPLORER_BASE_URL = `https://explorer.solana.com`;
export const EXPLORER_CLUSTER = 'devnet';

// Referral Configuration
export const DEFAULT_REFERRER = PublicKey.default;

// Lock Period Configuration (in seconds)
export const LOCK_PERIOD_2_YEARS = 2 * 365 * 24 * 60 * 60; // 2 years in seconds

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INSUFFICIENT_SOL: 'Insufficient SOL balance for transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  USER_NOT_REGISTERED: 'User account not registered. Please register first.',
  PROGRAM_ERROR: 'Program execution error. Please check your inputs.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Successfully registered!',
  MINT_SUCCESS: 'Successfully minted EQUA tokens!',
  TRANSFER_SUCCESS: 'Transfer completed successfully!',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_KEYPAIR: 'equa_user_keypair',
  THEME: 'equa_theme',
  WALLET_PREFERENCE: 'equa_wallet_preference',
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_REFERRALS: false,
  ENABLE_TRANSFERS: false,
  ENABLE_STAKING: false,
  SHOW_DEBUG_INFO: process.env.NODE_ENV === 'development',
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  MINT_COOLDOWN_MS: 10000, // 10 seconds between mints
  MAX_RETRIES: 3,
} as const;
