import { PublicKey } from '@solana/web3.js'; 
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export const PROGRAM_ID = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');

// SPL Token-2022 Program
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// PDA Seeds (must match Rust backend exactly)
export const GLOBAL_STATE_SEED = 'global-state';
export const MINT_SEED = 'equa-mint';
export const MINT_AUTHORITY_SEED = 'mint-authority';
