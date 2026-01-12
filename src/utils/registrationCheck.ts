/**
 * Unified Registration Check Utilities
 * 
 * Provides a single source of truth for checking user registration status.
 * Uses fetchUserMetadata as the canonical check per Phase 2 requirements.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { fetchUserMetadata, hasUserMetadata } from './userMetadata';

/**
 * Check if a user is registered (canonical method)
 * 
 * This is the single source of truth for registration status.
 * A user is considered registered if they have a valid UserMetadata account.
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns true if user is registered (has UserMetadata account)
 * 
 * @example
 * ```ts
 * const registered = await isUserRegistered(connection, publicKey);
 * if (registered) {
 *   // Show minting interface
 * } else {
 *   // Show registration form
 * }
 * ```
 */
export async function isUserRegistered(
  connection: Connection,
  authority: PublicKey
): Promise<boolean> {
  return await hasUserMetadata(connection, authority);
}

/**
 * Get user registration details
 * 
 * Returns full UserMetadata if registered, null otherwise.
 * Use this when you need tier information, not just registration status.
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @returns UserMetadata if registered, null otherwise
 * 
 * @example
 * ```ts
 * const metadata = await getUserRegistration(connection, publicKey);
 * if (metadata) {
 *   console.log('User #', metadata.user_index);
 *   console.log('Elevated attempts used:', metadata.elevated_mint_attempts_used);
 * }
 * ```
 */
export async function getUserRegistration(
  connection: Connection,
  authority: PublicKey
) {
  return await fetchUserMetadata(connection, authority);
}

/**
 * Wait for registration to be confirmed on-chain
 * 
 * Polls for UserMetadata account creation with exponential backoff.
 * Useful after submitting a registration transaction.
 * 
 * @param connection - Solana RPC connection
 * @param authority - User's wallet public key
 * @param maxAttempts - Maximum polling attempts (default: 10)
 * @param initialDelayMs - Initial delay between attempts in ms (default: 1000)
 * @returns true if registration confirmed within max attempts
 * 
 * @example
 * ```ts
 * await sendRegistrationTx(tx);
 * const confirmed = await waitForRegistration(connection, publicKey);
 * if (confirmed) {
 *   console.log('Registration confirmed!');
 * }
 * ```
 */
export async function waitForRegistration(
  connection: Connection,
  authority: PublicKey,
  maxAttempts: number = 10,
  initialDelayMs: number = 1000
): Promise<boolean> {
  let delay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const registered = await isUserRegistered(connection, authority);
    
    if (registered) {
      console.log(`✅ Registration confirmed after ${attempt} attempt(s)`);
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting for registration confirmation (attempt ${attempt}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000); // Exponential backoff, max 5s
    }
  }
  
  console.warn(`⚠️ Registration not confirmed after ${maxAttempts} attempts`);
  return false;
}
