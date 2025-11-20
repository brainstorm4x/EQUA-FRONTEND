import { PublicKey } from '@solana/web3.js';

// Your deployed program ID on Devnet
export const PROGRAM_ID = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');

// Devnet configuration
export const NETWORK = 'devnet';
export const COMMITMENT = 'confirmed';

// Global state PDA seeds
export const GLOBAL_STATE_SEED = 'global_state';

// User account seed
export const USER_ACCOUNT_SEED = 'user_account';
