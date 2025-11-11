import { PublicKey } from '@solana/web3.js';

// Your deployed program ID on Devnet
export const PROGRAM_ID = new PublicKey('G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si');

// Devnet configuration
export const NETWORK = 'devnet';
export const COMMITMENT = 'confirmed';

// Global state PDA seeds
export const GLOBAL_STATE_SEED = 'global_state';

// User account seed
export const USER_ACCOUNT_SEED = 'user_account';
