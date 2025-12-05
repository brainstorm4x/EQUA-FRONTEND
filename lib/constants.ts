import { PublicKey } from '@solana/web3.js'; 
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'
);

// Token-2022 Program (newer token extension program)
// The smart contract on-chain uses the Token-2022 program
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// PDA Seeds (must match Rust backend exactly)
export const GLOBAL_STATE_SEED = 'global-state';
export const MINT_SEED = 'equa-mint';
export const MINT_AUTHORITY_SEED = 'mint-authority';
