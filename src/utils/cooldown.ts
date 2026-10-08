/**
 * Cooldown Guard - Enforce off-chain cooldown logic uniformly
 * 
 * This module provides shared cooldown enforcement across web and mobile to:
 * - Prevent multiple mints within the cooldown (24 hours for a wallet's
 *   first 100 mints, 30 days after that)
 * - Eliminate UI race conditions with optimistic cooldown + in-flight lock
 * - Align schema parsing with on-chain account layouts
 * 
 * The guard:
 * 1. Reads last_mint_time from UserAccount PDA (offset 136, i64 little-endian)
 * 2. Calculates cooldownUntil = last_mint_time + getCooldownPeriod(mintsMade)
 * 3. Applies optimistic cooldown and in-flight lock at click time
 * 4. Reconciles with on-chain last_mint_time after confirmation
 * 5. Persists cooldown state keyed by wallet across sessions
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { safeParseTimestamp } from './safeAccountParsing';

// Constants
const LAST_MINT_TIME_OFFSET = 136; // Offset in UserAccount for last_mint_time (i64)
const MIN_USER_ACCOUNT_SIZE = LAST_MINT_TIME_OFFSET + 8; // Minimum size to read last_mint_time (i64 = 8 bytes)
const IN_FLIGHT_LOCK_TTL = 120; // In-flight lock TTL in seconds (2 minutes)

// Get cooldown period from environment variable (default 2592000 = 30 days,
// matching MINTING_COOLDOWN_SECONDS in the on-chain program)
const MINT_COOLDOWN_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_MINT_COOLDOWN_SECONDS || '2592000',
  10
);

// A wallet's first DAILY_MINT_ATTEMPTS mints are 24 hours apart (matching
// DAILY_MINT_ATTEMPTS and DAILY_MINTING_COOLDOWN_SECONDS on-chain).
// The on-chain mint counter is UserMetadata.elevated_mint_attempts_used.
export const DAILY_MINT_ATTEMPTS = 100;
const DAILY_MINT_COOLDOWN_SECONDS = 86400;

// LocalStorage keys
const COOLDOWN_KEY_PREFIX = 'uniyaa:cooldown:';
const IN_FLIGHT_KEY_PREFIX = 'uniyaa:mintInFlight:';

/**
 * Cooldown state stored in localStorage
 */
interface CooldownState {
  lastMintTime: number; // Unix timestamp in seconds
  cooldownUntil: number; // Unix timestamp in seconds
  isOptimistic: boolean; // Whether this is an optimistic cooldown (not yet confirmed on-chain)
}

/**
 * In-flight lock state
 */
interface InFlightLock {
  lockedAt: number; // Unix timestamp in seconds
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * Get localStorage key for cooldown state
 */
function getCooldownKey(walletAddress: string): string {
  return `${COOLDOWN_KEY_PREFIX}${walletAddress}`;
}

/**
 * Get localStorage key for in-flight lock
 */
function getInFlightKey(walletAddress: string): string {
  return `${IN_FLIGHT_KEY_PREFIX}${walletAddress}`;
}

/**
 * Get cooldown state from localStorage
 */
function getCooldownState(walletAddress: string): CooldownState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCooldownKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.lastMintTime === 'number' &&
      typeof parsed.cooldownUntil === 'number' &&
      typeof parsed.isOptimistic === 'boolean'
    ) {
      return parsed as CooldownState;
    }
    
    // Invalid structure, remove corrupted data
    console.warn('Invalid cooldown state structure, removing corrupted data');
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error('Error reading cooldown state:', error);
    return null;
  }
}

/**
 * Set cooldown state in localStorage
 */
function setCooldownState(walletAddress: string, state: CooldownState): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCooldownKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Error storing cooldown state:', error);
  }
}

/**
 * Get in-flight lock from localStorage
 */
function getInFlightLock(walletAddress: string): InFlightLock | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getInFlightKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.lockedAt === 'number' &&
      typeof parsed.expiresAt === 'number'
    ) {
      // Check if lock has expired
      const now = Math.floor(Date.now() / 1000);
      if (now >= parsed.expiresAt) {
        // Lock expired, remove it
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed as InFlightLock;
    }
    
    // Invalid structure, remove corrupted data
    console.warn('Invalid in-flight lock structure, removing corrupted data');
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error('Error reading in-flight lock:', error);
    return null;
  }
}

/**
 * Set in-flight lock in localStorage
 */
function setInFlightLock(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const lock: InFlightLock = {
      lockedAt: now,
      expiresAt: now + IN_FLIGHT_LOCK_TTL,
    };
    
    const key = getInFlightKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(lock));
  } catch (error) {
    console.error('Error setting in-flight lock:', error);
  }
}

/**
 * Clear in-flight lock from localStorage
 */
function clearInFlightLock(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getInFlightKey(walletAddress);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing in-flight lock:', error);
  }
}

/**
 * Read on-chain last_mint_time from UserAccount PDA
 * 
 * @param connection - Solana connection
 * @param userAccountPDA - UserAccount PDA address
 * @returns Unix timestamp in seconds, or 0 if not found/never minted
 */
export async function getOnchainLastMintTime(
  connection: Connection,
  userAccountPDA: PublicKey
): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPDA);
    
    if (!accountInfo || accountInfo.data.length < MIN_USER_ACCOUNT_SIZE) {
      console.log('⚠️ User account not found or too small for last_mint_time');
      return 0;
    }
    
    // Parse last_mint_time at offset 136 (i64 little-endian)
    const lastMintTime = safeParseTimestamp(accountInfo.data, LAST_MINT_TIME_OFFSET);
    
    if (lastMintTime > 0) {
      console.log(`⏰ On-chain last_mint_time: ${lastMintTime} (${new Date(lastMintTime * 1000).toLocaleString()})`);
    } else {
      console.log('⏰ On-chain last_mint_time: 0 (never minted)');
    }
    
    return lastMintTime;
  } catch (error) {
    console.error('Error reading on-chain last_mint_time:', error);
    return 0;
  }
}

/**
 * Check if user can mint now (not on cooldown and no in-flight transaction)
 * 
 * @param walletAddress - Wallet address to check
 * @returns true if user can mint, false if on cooldown or transaction in-flight
 */
export function canMintNow(walletAddress: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  
  // Check in-flight lock first
  const inFlightLock = getInFlightLock(walletAddress);
  if (inFlightLock) {
    console.log('🔒 Mint blocked: Transaction in-flight');
    return false;
  }
  
  // Check cooldown
  const cooldownState = getCooldownState(walletAddress);
  if (!cooldownState) {
    // No cooldown state, user can mint
    return true;
  }
  
  // Check if cooldown has expired
  if (now >= cooldownState.cooldownUntil) {
    console.log('✅ Cooldown expired, user can mint');
    return true;
  }
  
  console.log(`⏰ Cooldown active until ${new Date(cooldownState.cooldownUntil * 1000).toLocaleString()}`);
  return false;
}

/**
 * Start a mint operation - set optimistic cooldown and in-flight lock
 * Call this immediately when user clicks mint button
 * 
 * @param walletAddress - Wallet address
 * @param mintsBefore - Mints the wallet made before this one (on-chain counter)
 */
export function startMint(walletAddress: string, mintsBefore: number = DAILY_MINT_ATTEMPTS): void {
  const now = Math.floor(Date.now() / 1000);
  
  // Set in-flight lock (prevents double-clicks)
  setInFlightLock(walletAddress);
  
  const cooldownState: CooldownState = {
    lastMintTime: now,
    cooldownUntil: now + getCooldownPeriod(mintsBefore + 1),
    isOptimistic: true,
  };
  setCooldownState(walletAddress, cooldownState);
  
  console.log(`🚀 Mint started - optimistic cooldown set until ${new Date(cooldownState.cooldownUntil * 1000).toLocaleString()}`);
}

/**
 * End a mint operation - reconcile with on-chain data or clear on error
 * Call this after transaction confirmation (success) or on error (failure)
 * 
 * @param walletAddress - Wallet address
 * @param success - Whether the mint was successful
 * @param currentTime - Current Unix timestamp in seconds (for reconciliation)
 * @param onchainLastMintTime - On-chain last_mint_time after confirmation (optional)
 * @param mintsMade - Mints the wallet has made, including this one
 */
export function endMint(
  walletAddress: string,
  success: boolean,
  currentTime?: number,
  onchainLastMintTime?: number,
  mintsMade: number = DAILY_MINT_ATTEMPTS
): void {
  // Always clear in-flight lock
  clearInFlightLock(walletAddress);
  
  if (!success) {
    // On error, clear optimistic cooldown
    console.log('❌ Mint failed - clearing optimistic cooldown');
    
    // Restore previous cooldown state if it exists
    // For now, just clear it - the next refresh will fetch from chain
    if (typeof window !== 'undefined') {
      const key = getCooldownKey(walletAddress);
      localStorage.removeItem(key);
    }
    return;
  }
  
  // On success, reconcile with on-chain data
  const now = currentTime || Math.floor(Date.now() / 1000);
  const lastMintTime = onchainLastMintTime || now;
  
  const cooldownState: CooldownState = {
    lastMintTime,
    cooldownUntil: lastMintTime + getCooldownPeriod(mintsMade),
    isOptimistic: false, // Now confirmed on-chain
  };
  setCooldownState(walletAddress, cooldownState);
  
  console.log(`✅ Mint confirmed - cooldown set until ${new Date(cooldownState.cooldownUntil * 1000).toLocaleString()}`);
}

/**
 * Get time remaining in cooldown (in seconds)
 * Returns 0 if no cooldown or cooldown expired
 * 
 * @param walletAddress - Wallet address
 * @returns Seconds remaining in cooldown, or 0 if no cooldown
 */
export function timeRemaining(walletAddress: string): number {
  const now = Math.floor(Date.now() / 1000);
  const cooldownState = getCooldownState(walletAddress);
  
  if (!cooldownState) {
    return 0;
  }
  
  const remaining = cooldownState.cooldownUntil - now;
  return Math.max(0, remaining);
}

/**
 * Get cooldown until timestamp
 * Returns null if no cooldown
 * 
 * @param walletAddress - Wallet address
 * @returns Unix timestamp in seconds when cooldown expires, or null
 */
export function getCooldownUntil(walletAddress: string): number | null {
  const cooldownState = getCooldownState(walletAddress);
  return cooldownState ? cooldownState.cooldownUntil : null;
}

/**
 * Check if there's an in-flight mint transaction
 * 
 * @param walletAddress - Wallet address
 * @returns true if there's an active in-flight lock
 */
export function hasInFlightMint(walletAddress: string): boolean {
  return getInFlightLock(walletAddress) !== null;
}

/**
 * Sync cooldown state with on-chain data
 * Call this on page load or when user connects wallet
 * 
 * @param connection - Solana connection
 * @param userAccountPDA - UserAccount PDA address
 * @param walletAddress - Wallet address
 * @param mintsMade - Mints the wallet has made (on-chain counter)
 */
export async function syncCooldownState(
  connection: Connection,
  userAccountPDA: PublicKey,
  walletAddress: string,
  mintsMade: number = DAILY_MINT_ATTEMPTS
): Promise<void> {
  try {
    const onchainLastMintTime = await getOnchainLastMintTime(connection, userAccountPDA);
    
    if (onchainLastMintTime === 0) {
      // User has never minted, clear any stale cooldown state
      if (typeof window !== 'undefined') {
        const key = getCooldownKey(walletAddress);
        localStorage.removeItem(key);
      }
      return;
    }
    
    // Update cooldown state with on-chain data
    const cooldownState: CooldownState = {
      lastMintTime: onchainLastMintTime,
      cooldownUntil: onchainLastMintTime + getCooldownPeriod(mintsMade),
      isOptimistic: false,
    };
    setCooldownState(walletAddress, cooldownState);
    
    console.log('🔄 Cooldown state synced with on-chain data');
  } catch (error) {
    console.error('Error syncing cooldown state:', error);
  }
}

/**
 * Get the cooldown before the next mint, given how many mints the wallet has
 * made: 24 hours while under DAILY_MINT_ATTEMPTS, 30 days after that.
 * Without a count it returns the longer, 30-day period.
 * @param mintsMade - Mints the wallet has made (on-chain counter)
 * @returns Cooldown period in seconds
 */
export function getCooldownPeriod(mintsMade: number = DAILY_MINT_ATTEMPTS): number {
  return mintsMade < DAILY_MINT_ATTEMPTS ? DAILY_MINT_COOLDOWN_SECONDS : MINT_COOLDOWN_SECONDS;
}
