import { PublicKey } from '@solana/web3.js'; 
import { TOKEN_PROGRAM_ID as SPL_TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID as SPL_ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Support both NEXT_PUBLIC_PROGRAM_ID (preferred) and legacy NEXT_PUBLIC_EQUA_PROGRAM_ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'
);

// Standard SPL Token Program (not Token-2022)
// The EQUA mint on devnet is owned by the standard SPL Token program
export const TOKEN_PROGRAM_ID = SPL_TOKEN_PROGRAM_ID;

// Associated Token Program - used for creating ATAs
// This MUST be ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
export const ASSOCIATED_TOKEN_PROGRAM_ID = SPL_ASSOCIATED_TOKEN_PROGRAM_ID;

// Runtime assertion to prevent passing wrong program IDs
if (typeof window !== 'undefined') {
  const expectedATokenAddress = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
  if (ASSOCIATED_TOKEN_PROGRAM_ID.toBase58() !== expectedATokenAddress) {
    console.error('❌ CRITICAL: ASSOCIATED_TOKEN_PROGRAM_ID mismatch!');
    console.error('Expected:', expectedATokenAddress);
    console.error('Got:', ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
    throw new Error('Invalid ASSOCIATED_TOKEN_PROGRAM_ID configuration');
  }
  
  const expectedTokenProgramAddress = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  if (TOKEN_PROGRAM_ID.toBase58() !== expectedTokenProgramAddress) {
    console.error('❌ CRITICAL: TOKEN_PROGRAM_ID mismatch!');
    console.error('Expected:', expectedTokenProgramAddress, '(Standard SPL Token)');
    console.error('Got:', TOKEN_PROGRAM_ID.toBase58());
    throw new Error('Invalid TOKEN_PROGRAM_ID configuration - should be Standard SPL Token, not Token-2022');
  }
  
  console.log('✅ Token program IDs validated at startup:');
  console.log('  - TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toBase58(), '(Standard SPL Token)');
  console.log('  - ASSOCIATED_TOKEN_PROGRAM_ID:', ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
}

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// PDA Seeds (must match Rust backend exactly)
export const GLOBAL_STATE_SEED = 'global-state';
export const MINT_SEED = 'equa-mint';
export const MINT_AUTHORITY_SEED = 'mint-authority';
export const USER_ACCOUNT_SEED = 'user-account';
export const USER_META_SEED = 'user-meta';
