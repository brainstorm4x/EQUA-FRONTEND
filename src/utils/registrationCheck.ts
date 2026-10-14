import { Connection, PublicKey } from '@solana/web3.js';
import { fetchUserMetadata } from '@/utils/userMetadata';

/**
 * Canonical registration check - Single Source of Truth
 * 
 * A user is considered registered if their UserMetadata account exists on-chain.
 * This is the authoritative check used across the entire application.
 *
 * Read from the chain only (the connection reads at "confirmed", the level
 * registration waits for). An RPC failure is thrown, NOT reported as "not
 * registered": callers must not show the registration form when the answer
 * is unknown.
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns Promise<boolean> - true if user is registered, false otherwise
 * 
 * @example
 * ```typescript
 * const isRegistered = await isUserRegistered(connection, publicKey);
 * if (!isRegistered) {
 *   // Show registration flow
 * }
 * ```
 */
export async function isUserRegistered(
  connection: Connection,
  authority: PublicKey
): Promise<boolean> {
  try {
    console.log('🔍 [RegistrationCheck] Checking registration for:', authority.toBase58());
    
    const metadata = await fetchUserMetadata(connection, authority);
    
    if (metadata !== null) {
      console.log('✅ [RegistrationCheck] User is registered');
      console.log('   - User Index:', metadata.user_index);
      console.log('   - Elevated Attempts Used:', metadata.elevated_mint_attempts_used);
      return true;
    }
    
    console.log('ℹ️ [RegistrationCheck] User not registered (UserMetadata not found)');
    return false;
    
  } catch (error) {
    console.error('❌ [RegistrationCheck] Unexpected error during registration check:', error);
    throw error;
  }
}

/**
 * Fetch user metadata if registered, null if not registered
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns Promise<UserMetadata | null> - User metadata or null if not registered
 */
export async function getUserMetadataIfRegistered(
  connection: Connection,
  authority: PublicKey
) {
  const metadata = await fetchUserMetadata(connection, authority);
  
  if (metadata !== null) {
    return {
      userIndex: metadata.user_index,
      elevatedMintAttemptsUsed: metadata.elevated_mint_attempts_used,
    };
  }
  
  return null;
}
