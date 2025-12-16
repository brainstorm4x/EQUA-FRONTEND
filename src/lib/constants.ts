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

// Token Program Selection
// CRITICAL: The EQUA backend may require Token-2022. Check your deployment.
// The mint_tokens instruction validates the token program ID.
// Set NEXT_PUBLIC_TOKEN_STANDARD='standard' to use Standard SPL Token.
// Any other value (including missing/undefined) defaults to Token-2022.
const tokenStandardEnv = process.env.NEXT_PUBLIC_TOKEN_STANDARD;
const useStandardToken = tokenStandardEnv === 'standard';
export const TOKEN_PROGRAM_ID = useStandardToken ? SPL_TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

// Log token standard selection for debugging
if (typeof window !== 'undefined') {
  const selectedProgram = useStandardToken ? 'Standard SPL Token' : 'Token-2022';
  if (tokenStandardEnv && tokenStandardEnv !== 'standard') {
    console.warn(
      `⚠️ NEXT_PUBLIC_TOKEN_STANDARD='${tokenStandardEnv}' is not 'standard', defaulting to Token-2022.`,
      '\nValid values: "standard" (for SPL Token) or undefined/anything else (for Token-2022)'
    );
  }
  console.log(`📋 Token Program: ${selectedProgram} (${TOKEN_PROGRAM_ID.toBase58()})`);
}

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

// ============================================================================
// Token Mint Configuration
// ============================================================================
// EQUA token uses 6 decimals (1 EQUA = 1,000,000 base units)
// This is the expected decimals value for the on-chain mint account
export const EQUA_DECIMALS = 6;
export const EQUA_DECIMAL_MULTIPLIER = Math.pow(10, EQUA_DECIMALS);

// EQUA mint address (derived from PDA in program)
// This will be computed from getMintPDA() but we document the expected value
// The actual mint decimals should be fetched from on-chain to ensure accuracy

// Network configuration
// Support both legacy (NEXT_PUBLIC_NETWORK, NEXT_PUBLIC_RPC_ENDPOINT) and new naming conventions
// (NEXT_PUBLIC_SOLANA_NETWORK, NEXT_PUBLIC_SOLANA_RPC_HOST) without breaking existing setups
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com';

/**
 * Check for missing environment variable configuration and return warnings
 * Only warns if NEITHER naming convention is set
 * @returns Array of warning messages (empty if config is valid)
 */
export function getEnvConfigWarnings(): string[] {
  const warnings: string[] = [];
  
  // Check if network is configured (either name)
  const hasNetwork = !!(
    process.env.NEXT_PUBLIC_NETWORK || 
    process.env.NEXT_PUBLIC_SOLANA_NETWORK
  );
  
  // Check if RPC endpoint is configured (either name)
  const hasRpcEndpoint = !!(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || 
    process.env.NEXT_PUBLIC_SOLANA_RPC_HOST
  );
  
  if (!hasNetwork) {
    warnings.push(
      'Missing network configuration. Set either NEXT_PUBLIC_NETWORK or NEXT_PUBLIC_SOLANA_NETWORK'
    );
  }
  
  if (!hasRpcEndpoint) {
    warnings.push(
      'Missing RPC endpoint configuration. Set either NEXT_PUBLIC_RPC_ENDPOINT or NEXT_PUBLIC_SOLANA_RPC_HOST'
    );
  }
  
  // Validate network value if set
  if (hasNetwork) {
    const validNetworks = ['devnet', 'testnet', 'mainnet-beta', 'localnet'];
    // Read current network value directly from env (not the cached NETWORK constant)
    const currentNetwork = 
      process.env.NEXT_PUBLIC_NETWORK || 
      process.env.NEXT_PUBLIC_SOLANA_NETWORK || 
      'devnet';
    
    if (!validNetworks.includes(currentNetwork)) {
      warnings.push(
        `Invalid network configuration: ${currentNetwork}. Must be one of: ${validNetworks.join(', ')}`
      );
    }
  }
  
  return warnings;
}

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
