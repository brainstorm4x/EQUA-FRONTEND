/**
 * Solana Admin Utilities for Netlify Functions
 * 
 * Provides secure admin keypair loading and common Solana utilities
 * for backend operations that require admin authority.
 * 
 * SECURITY NOTES:
 * - ADMIN_PRIVATE_KEY must be stored in Netlify environment variables
 * - Never commit the private key to source control
 * - Rotate the key immediately if compromised
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Get admin keypair from environment variable
 * 
 * @throws Error if ADMIN_PRIVATE_KEY is not set or invalid
 * @returns Keypair object for signing admin transactions
 */
export function getAdminKeypair(): Keypair {
  const privateKeyBase58 = process.env.ADMIN_PRIVATE_KEY;
  
  if (!privateKeyBase58) {
    throw new Error(
      'ADMIN_PRIVATE_KEY environment variable not configured. ' +
      'Please set this in Netlify dashboard or .env.local for development.'
    );
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(
      `Failed to decode admin private key: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Ensure the key is base58 encoded.'
    );
  }
}

/**
 * Get Solana RPC connection
 * 
 * Uses NEXT_PUBLIC_RPC_URL from environment, defaults to devnet
 * 
 * @returns Connection object configured for the specified network
 */
export function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Get EQUA program ID
 * 
 * Uses NEXT_PUBLIC_PROGRAM_ID from environment, defaults to known devnet deployment
 * 
 * @returns PublicKey of the EQUA token program
 */
export function getProgramId(): PublicKey {
  const programIdStr = process.env.NEXT_PUBLIC_PROGRAM_ID || 'D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw';
  return new PublicKey(programIdStr);
}

/**
 * Derive BusinessRegistry PDA
 * 
 * PDA Seeds: ["business-registry"]
 * Must match the seed defined in the EQUA backend program
 * 
 * @param programId - The EQUA program ID
 * @returns PublicKey of the BusinessRegistry PDA
 */
export function getBusinessRegistryPDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('business-registry')],
    programId
  );
  return pda;
}
