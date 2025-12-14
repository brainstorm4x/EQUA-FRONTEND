import { PublicKey } from '@solana/web3.js'; 
import { 
  TOKEN_PROGRAM_ID as SPL_TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID as SPL_ASSOCIATED_TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

// Support both NEXT_PUBLIC_PROGRAM_ID (preferred) and legacy NEXT_PUBLIC_EQUA_PROGRAM_ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.NEXT_PUBLIC_EQUA_PROGRAM_ID || '7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP'
);

// Token-2022 Program (SPL Token Extensions)
// CRITICAL: The EQUA backend requires Token-2022. Do not use Standard SPL Token.
// The mint_tokens instruction specifically validates Token-2022 program ID.
// Override via NEXT_PUBLIC_TOKEN_STANDARD='standard' only for testing/debugging.
const useStandardToken = process.env.NEXT_PUBLIC_TOKEN_STANDARD === 'standard';
export const TOKEN_PROGRAM_ID = useStandardToken ? SPL_TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

// Associated Token Program - used for creating ATAs
// This MUST be ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
export const ASSOCIATED_TOKEN_PROGRAM_ID = SPL_ASSOCIATED_TOKEN_PROGRAM_ID;

// Runtime assertion to prevent passing wrong program IDs
// Only run in browser (not during SSR/build) to avoid Next.js build issues
if (typeof window !== 'undefined') {
  const expectedATokenAddress = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
  if (ASSOCIATED_TOKEN_PROGRAM_ID.toBase58() !== expectedATokenAddress) {
    console.error('❌ CRITICAL: ASSOCIATED_TOKEN_PROGRAM_ID mismatch!');
    console.error('Expected:', expectedATokenAddress);
    console.error('Got:', ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
    throw new Error('Invalid ASSOCIATED_TOKEN_PROGRAM_ID configuration');
  }
  
  // Token program IDs for validation
  const standardTokenAddress = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const token2022Address = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  const configuredAddress = TOKEN_PROGRAM_ID.toBase58();
  
  // Verify configured token program is valid
  if (configuredAddress !== standardTokenAddress && configuredAddress !== token2022Address) {
    console.error('❌ CRITICAL: TOKEN_PROGRAM_ID is not a valid token program!');
    console.error('Expected: Either', standardTokenAddress, '(Standard) or', token2022Address, '(Token-2022)');
    console.error('Got:', configuredAddress);
    throw new Error('Invalid TOKEN_PROGRAM_ID configuration');
  }
  
  const tokenProgramName = configuredAddress === token2022Address ? 'Token-2022' : 'Standard SPL Token';
  console.log('✅ Token program IDs validated at startup:');
  console.log(`  - TOKEN_PROGRAM_ID: ${configuredAddress} (${tokenProgramName})`);
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
export const BUSINESS_REGISTRY_SEED = 'business-registry';

// Token Program Addresses (for validation)
export const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const STANDARD_TOKEN_PROGRAM_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// UserAccount Structure Offsets (136 bytes total)
// Used for parsing UserAccount data when reading from chain
export const USER_ACCOUNT_DISCRIMINATOR_OFFSET = 0;
export const USER_ACCOUNT_DISCRIMINATOR_SIZE = 8;
export const USER_ACCOUNT_AUTHORITY_OFFSET = 8;
export const USER_ACCOUNT_AUTHORITY_SIZE = 32;
export const USER_ACCOUNT_REFERRAL_OFFSET = 40;
export const USER_ACCOUNT_REFERRAL_SIZE = 32;
export const USER_ACCOUNT_TOKEN_ACCOUNT_OFFSET = 72;
export const USER_ACCOUNT_TOKEN_ACCOUNT_SIZE = 32;
export const USER_ACCOUNT_MINTED_AMOUNT_OFFSET = 104;
export const USER_ACCOUNT_MINTED_AMOUNT_SIZE = 8;
export const USER_ACCOUNT_MINT_START_OFFSET = 112;
export const USER_ACCOUNT_MINT_START_SIZE = 8;
export const USER_ACCOUNT_REFERRAL_REWARDS_OFFSET = 120;
export const USER_ACCOUNT_REFERRAL_REWARDS_SIZE = 8;
export const USER_ACCOUNT_LAST_MINT_TIME_OFFSET = 128;
export const USER_ACCOUNT_LAST_MINT_TIME_SIZE = 8;
