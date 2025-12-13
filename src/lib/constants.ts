import { PublicKey } from '@solana/web3.js'; 
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID as SPL_ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Support both NEXT_PUBLIC_PROGRAM_ID (preferred) and legacy NEXT_PUBLIC_EQUA_PROGRAM_ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'
);

// ============================================================================
// TOKEN PROGRAM CONSTANTS (Token-2022)
// ============================================================================
// CRITICAL: EQUA mint on Devnet uses Token-2022 program
// DO NOT use standard SPL Token program ID (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
// 
// Token-2022 Program ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
// This MUST be passed at index 9 (token_program) in initialize_user instruction
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

// Associated Token Program ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
// This is the same for both standard SPL Token and Token-2022
// This MUST be passed at index 8 (associated_token_program) in initialize_user instruction
export const ASSOCIATED_TOKEN_PROGRAM_ID = SPL_ASSOCIATED_TOKEN_PROGRAM_ID;

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// PDA Seeds (must match Rust backend exactly)
export const GLOBAL_STATE_SEED = 'global-state';
export const MINT_SEED = 'equa-mint';
export const MINT_AUTHORITY_SEED = 'mint-authority';
export const USER_ACCOUNT_SEED = 'user-account';
export const USER_META_SEED = 'user-meta';
