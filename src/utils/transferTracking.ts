/**
 * Transfer Tracking Utilities
 * 
 * ARCHITECTURAL DECISION: Registered-Users-Only Policy
 * 
 * Transaction counts are read directly from on-chain GlobalState.total_transactions
 * instead of parsing raw SPL token transfers. This approach:
 * 
 * BENEFITS:
 * - ✅ Sybil-resistant: Backend enforces registered users only (0.1 SOL registration fee)
 * - ✅ Single source of truth: Always matches backend's authoritative counter
 * - ✅ Performance: 1 RPC call instead of parsing 100s of transactions
 * - ✅ Simplicity: No complex filtering logic required
 * - ✅ Accuracy: Cannot drift from backend state
 * 
 * WHAT IS COUNTED:
 * - Peer-to-peer transfers between registered users (via transfer_tokens instruction)
 * 
 * WHAT IS EXCLUDED (by backend PDA validation):
 * - Transfers from/to unregistered users (instruction fails if UserAccount PDA missing)
 * - Mint operations (separate mint_tokens instruction)
 * - Registration transfers (initialize_user instruction)
 * - Reward claims (claim_referral_rewards instruction)
 * 
 * BACKEND ALIGNMENT:
 * - Backend source: programs/equa_token/src/lib.rs (transfer_tokens instruction)
 * - GlobalState structure: programs/equa_token/src/state.rs
 * - Only transfer_tokens instruction increments GlobalState.total_transactions
 * 
 * SYBIL ATTACK PREVENTION:
 * - Registration requires 0.1 SOL fee (costly to create spam accounts)
 * - After first 100 users, referral required (additional barrier)
 * - Both sender and recipient MUST be registered (enforced by Anchor PDA validation)
 * 
 * ⚠️ DEPRECATED FOR UI DISPLAY - USE getGlobalTransactionCount() INSTEAD
 * 
 * This module provides localStorage-based transfer tracking for TESTING and LOCAL DEVELOPMENT only.
 * It is NOT the source of truth for production UI display.
 * 
 * FOR UI DISPLAY: Use `useGlobalStateStats()` hook or `getGlobalTransactionCount()` function.
 * The blockchain is the single source of truth for all transaction counts and statistics.
 * 
 * Legacy functionality (deprecated):
 * - Tracks EQUA token transfers using localStorage only (local testing only)
 * - Optional analytics logging (non-authoritative)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, getMintAuthorityPDA, getGlobalStatePDA } from '@/lib/program';
import * as anchor from '@coral-xyz/anchor';

// ============================================================================
// AUTHORITATIVE TRANSACTION COUNTING (On-Chain GlobalState)
// ============================================================================

/**
 * GlobalState account memory layout (based on actual backend IDL):
 * 
 * Offset 0-7:   Discriminator (8 bytes) - Anchor account discriminator
 * Offset 8-11:  user_count (u32, 4 bytes) - Total registered users
 * Offset 12-19: total_transactions (u64, 8 bytes) - ✅ AUTHORITATIVE TRANSACTION COUNT
 * Offset 20-27: current_epoch (u64, 8 bytes) - Current compounding epoch
 * Offset 28:    compounding_complete (bool, 1 byte)
 * Offset 29-36: last_epoch_update_time (i64, 8 bytes)
 * Offset 37-68: token_mint (Pubkey, 32 bytes)
 * Offset 69-76: min_sol_balance (u64, 8 bytes)
 * Offset 77-84: min_slot_gap_for_referrals (u64, 8 bytes)
 * 
 * Total: 85 bytes
 * 
 * Backend source: public/idl/equa_token.json (GlobalState type definition)
 */
const GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET = 12;
const GLOBAL_STATE_TOTAL_TRANSACTIONS_SIZE = 8;

/**
 * Get total transaction count from on-chain GlobalState
 * 
 * This is the AUTHORITATIVE source for transaction counts.
 * Only registered-to-registered transfers increment this counter.
 * 
 * Backend enforces registered-users-only via PDA validation in transfer_tokens instruction.
 * This makes the system Sybil-resistant (registration requires 0.1 SOL + referral).
 * 
 * @param connection - Solana RPC connection
 * @returns Total number of registered user transfers, or 0 if account not found
 * 
 * @example
 * ```typescript
 * const connection = new Connection('https://api.devnet.solana.com');
 * const count = await getGlobalTransactionCount(connection);
 * console.log(`Total transactions: ${count}`);
 * ```
 * 
 * Backend source: programs/equa_token/src/lib.rs (transfer_tokens instruction)
 * GlobalState structure: public/idl/equa_token.json (GlobalState type)
 */
export async function getGlobalTransactionCount(
  connection: Connection
): Promise<number> {
  try {
    // Derive GlobalState PDA
    const [globalStatePDA] = getGlobalStatePDA();
    
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    
    if (!accountInfo || accountInfo.data.length < (GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET + GLOBAL_STATE_TOTAL_TRANSACTIONS_SIZE)) {
      console.warn('GlobalState account not found or invalid');
      return 0;
    }
    
    // Read total_transactions from offset 12-19 (u64, little-endian)
    const totalTransactionsBN = new anchor.BN(
      accountInfo.data.slice(
        GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET,
        GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET + GLOBAL_STATE_TOTAL_TRANSACTIONS_SIZE
      ),
      'le'
    );
    
    // Check if value exceeds JavaScript's safe integer range
    if (totalTransactionsBN.gt(new anchor.BN(Number.MAX_SAFE_INTEGER))) {
      console.warn('⚠️ Total transactions exceeds MAX_SAFE_INTEGER, using safe value');
      return Number.MAX_SAFE_INTEGER;
    }
    
    const totalTransactions = totalTransactionsBN.toNumber();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ On-chain transaction count: ${totalTransactions}`);
    }
    
    return totalTransactions;
  } catch (error) {
    console.error('Error fetching global transaction count:', error);
    return 0;
  }
}

/**
 * Get GlobalState PDA public key
 * 
 * This is a convenience export for deriving the GlobalState account address.
 * The GlobalState account stores authoritative transaction counts and user statistics.
 * 
 * @returns [publicKey, bump] tuple
 * 
 * @example
 * ```typescript
 * const [globalStatePDA, bump] = getGlobalStatePDAPublicKey();
 * console.log('GlobalState address:', globalStatePDA.toBase58());
 * ```
 */
export function getGlobalStatePDAPublicKey(): [PublicKey, number] {
  return getGlobalStatePDA();
}

// ============================================================================
// DEPRECATED: localStorage-based Transfer Tracking (Local Testing Only)
// ============================================================================

const STORAGE_KEY = 'equa_transfer_stats';
const PROCESSED_SIGNATURES_KEY = 'equa_processed_signatures';

// Cached authority blocklist (computed once at module load)
let cachedAuthorityBlocklist: Set<string> | null = null;

/**
 * Get dynamic authority blocklist derived from program constants and PDA helpers
 * Only user-signed transfers should be counted - exclude program/PDA-driven transfers
 * Cached after first computation for performance
 * @returns Set of blocklisted authority addresses (as base58 strings)
 */
function getAuthorityBlocklist(): Set<string> {
  if (cachedAuthorityBlocklist) {
    return cachedAuthorityBlocklist;
  }
  
  try {
    // Derive PDAs at runtime (no RPC calls - pure computation)
    const [mintAuthorityPDA] = getMintAuthorityPDA();
    const [globalStatePDA] = getGlobalStatePDA();
    
    cachedAuthorityBlocklist = new Set([
      PROGRAM_ID.toBase58(),
      mintAuthorityPDA.toBase58(),
      globalStatePDA.toBase58(),
    ]);
    
    return cachedAuthorityBlocklist;
  } catch (error) {
    // PDA derivation can fail in test environments or with invalid program IDs
    // Fall back to just blocking the program ID if it's valid
    console.warn('Failed to derive PDAs for authority blocklist:', error);
    
    try {
      if (PROGRAM_ID && typeof PROGRAM_ID.toBase58 === 'function') {
        cachedAuthorityBlocklist = new Set([PROGRAM_ID.toBase58()]);
        return cachedAuthorityBlocklist;
      }
    } catch {
      // PROGRAM_ID is completely invalid
    }
    
    // Return empty set if we can't derive any blocklist entries
    // This means we won't filter out any transfers, which is safer than crashing
    console.warn('Could not create authority blocklist, no filtering will be applied');
    cachedAuthorityBlocklist = new Set();
    return cachedAuthorityBlocklist;
  }
}

export interface TransferStats {
  totalTransfers: number;
  lastUpdated: number;
  lastProcessedSignature?: string;
}

/**
 * Gets transfer stats from localStorage
 */
export function getTransferStats(): TransferStats {
  if (typeof window === 'undefined') {
    return { totalTransfers: 0, lastUpdated: 0 };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { totalTransfers: 0, lastUpdated: 0 };
    }
    return JSON.parse(stored);
  } catch {
    console.warn('Failed to parse transfer stats');
    return { totalTransfers: 0, lastUpdated: 0 };
  }
}

/**
 * Saves transfer stats to localStorage
 */
export function saveTransferStats(stats: TransferStats): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    console.warn('Failed to save transfer stats');
  }
}

/**
 * Records a new transfer to localStorage
 * 
 * @deprecated Use getGlobalTransactionCount() for authoritative transaction counts.
 * This function is for local testing only and does NOT reflect on-chain state.
 * 
 * @param amount - Transfer amount (for logging only)
 * @param transactionSignature - Optional transaction signature (for logging only)
 */
export async function recordTransfer(
  amount: number,
  transactionSignature?: string
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ recordTransfer() is deprecated for UI display - use getGlobalTransactionCount() instead');
  }
  
  // Update localStorage for UI feedback
  const stats = getTransferStats();
  stats.totalTransfers += 1;
  stats.lastUpdated = Date.now();
  saveTransferStats(stats);
  
  console.log('✓ Transfer recorded to localStorage:', { 
    amount, 
    signature: transactionSignature,
    totalTransfers: stats.totalTransfers 
  });
  
  // Dispatch event for real-time UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('equa_transfer_recorded', {
      detail: { totalTransfers: stats.totalTransfers }
    }));
  }
}

/**
 * Gets total transfer count from localStorage
 * 
 * @deprecated Use getGlobalTransactionCount() for authoritative transaction counts.
 * This function returns localStorage data which is NOT the source of truth.
 * 
 * @returns Transfer count from localStorage (local testing only)
 */
export function getTotalTransfers(): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ getTotalTransfers() is deprecated for UI display - use getGlobalTransactionCount() instead');
  }
  return getTransferStats().totalTransfers;
}

/**
 * Resets transfer stats (for testing/admin purposes)
 */
export function resetTransferStats(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROCESSED_SIGNATURES_KEY);
    // Also clear the cached blocklist for testing
    cachedAuthorityBlocklist = null;
  } catch {
    console.warn('Failed to reset transfer stats');
  }
}

/**
 * Gets processed signatures from localStorage
 */
function getProcessedSignatures(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  
  try {
    const stored = localStorage.getItem(PROCESSED_SIGNATURES_KEY);
    if (!stored) {
      return new Set();
    }
    const array = JSON.parse(stored);
    return new Set(array);
  } catch {
    return new Set();
  }
}

/**
 * Saves processed signatures to localStorage
 * Limits to most recent 1000 to avoid storage bloat
 */
function saveProcessedSignatures(signatures: Set<string>): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only most recent 1000 signatures to prevent unbounded growth
    // Convert to array once for efficiency
    const allSignatures = Array.from(signatures);
    
    // If we have more than 1000, keep only the most recent ones
    const toSave = allSignatures.length > 1000 
      ? allSignatures.slice(allSignatures.length - 1000)
      : allSignatures;
    
    localStorage.setItem(PROCESSED_SIGNATURES_KEY, JSON.stringify(toSave));
  } catch {
    console.warn('Failed to save processed signatures');
  }
}

/**
 * Fetches transfer count from chain by scanning token account signatures
 * Updates localStorage with new transfers found
 * 
 * @deprecated Use getGlobalTransactionCount() instead
 * 
 * This function parses raw SPL transfers which:
 * - May include unregistered users (Sybil vulnerability)
 * - Diverges from backend's authoritative GlobalState counter
 * - Requires complex filtering logic and multiple RPC calls
 * 
 * The authoritative source is GlobalState.total_transactions which only counts
 * registered-to-registered transfers (enforced by backend PDA validation).
 * 
 * Will be removed in next major version.
 * 
 * Only counts actual user-to-user transfers (transfer/transferChecked instructions)
 * Excludes:
 * - Mint operations (mintTo/mintToChecked) and other non-transfer activity
 * - Program/PDA-driven transfers (signed by program ID or PDAs like mint authority)
 * 
 * @param connection - Solana RPC connection
 * @param tokenAccountAddress - Token account address (ATA)
 * @returns Updated transfer count (localStorage-based, NOT authoritative)
 */
export async function syncTransfersFromChain(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ syncTransfersFromChain() is deprecated - use getGlobalTransactionCount() for authoritative counts');
  }
  
  try {
    const processedSignatures = getProcessedSignatures();
    const stats = getTransferStats();
    
    // Fetch the mint address from the token account
    const accountInfo = await connection.getParsedAccountInfo(tokenAccountAddress);
    if (!accountInfo.value || !accountInfo.value.data) {
      console.warn('Token account not found or invalid');
      return stats.totalTransfers;
    }
    
    // Extract mint from parsed account data
    const parsedData = accountInfo.value.data as any;
    const tokenAccountMint = parsedData.parsed?.info?.mint;
    if (!tokenAccountMint) {
      console.warn('Could not determine mint from token account');
      return stats.totalTransfers;
    }
    
    // Fetch recent signatures for this token account
    // Limit to 100 to avoid rate limiting
    const signatures = await connection.getSignaturesForAddress(
      tokenAccountAddress,
      { limit: 100 }
    );

    let newTransferCount = 0;
    
    // Token program IDs (Token-2022 and legacy Token Program)
    const TOKEN_2022_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
    const LEGACY_TOKEN_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

    // Process signatures in chronological order (oldest first)
    // Iterate backwards to avoid mutating the original array
    for (let i = signatures.length - 1; i >= 0; i--) {
      const sigInfo = signatures[i];
      const signature = sigInfo.signature;
      
      // Skip if already processed
      if (processedSignatures.has(signature)) {
        continue;
      }

      // Mark as processed to avoid double-counting
      processedSignatures.add(signature);
      
      // Fetch parsed transaction to examine instructions
      const parsedTx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      // Skip if transaction is null or missing
      if (!parsedTx || !parsedTx.transaction) {
        continue;
      }
      
      const instructions = parsedTx.transaction.message.instructions;
      if (!instructions || instructions.length === 0) {
        continue;
      }
      
      // Get dynamic authority blocklist (derived at runtime from program constants)
      const authorityBlocklist = getAuthorityBlocklist();
      
      // Extract transaction signatures for signer correlation check
      // In getParsedTransaction, accountKeys contains all accounts, and signatures array tells us how many are signers
      const txSignatures = parsedTx.transaction.signatures || [];
      const accountKeys = parsedTx.transaction.message.accountKeys || [];
      
      // First N accounts in accountKeys are signers (where N = # of signatures)
      // Only apply signer check if we have both signatures AND accountKeys
      const hasSignatureData = txSignatures.length > 0 && accountKeys.length > 0;
      const signerKeys = hasSignatureData
        ? new Set(
            accountKeys
              .slice(0, txSignatures.length)
              .map((key: any) => {
                try {
                  // Handle both PublicKey objects and parsed account objects
                  if (typeof key === 'object' && key !== null) {
                    // Try pubkey first (parsed format), then toBase58 (PublicKey object)
                    if (key.pubkey && typeof key.pubkey.toBase58 === 'function') {
                      return key.pubkey.toBase58();
                    }
                    if (typeof key.toBase58 === 'function') {
                      return key.toBase58();
                    }
                  }
                  // If it's already a string, return it
                  if (typeof key === 'string') {
                    return key;
                  }
                  return null;
                } catch {
                  return null;
                }
              })
              .filter((pk): pk is string => pk !== null)
          )
        : null;
      
      // Check if transaction contains a valid transfer instruction
      let hasValidTransfer = false;
      
      for (const instruction of instructions) {
        // Only process parsed instructions
        const parsed = (instruction as any).parsed;
        if (!parsed) {
          continue;
        }
        
        // Check if instruction is from a token program
        const programId = (instruction as any).programId?.toBase58();
        const isTokenProgram = programId === TOKEN_2022_ID || programId === LEGACY_TOKEN_ID;
        
        if (!isTokenProgram) {
          continue;
        }
        
        const instructionType = parsed.type;
        
        // Only count transfer and transferChecked instructions
        // Exclude: mintTo, mintToChecked, and other instruction types
        if (instructionType !== 'transfer' && instructionType !== 'transferChecked') {
          continue;
        }
        
        // Verify the mint matches our token account's mint
        const instructionMint = parsed.info?.mint;
        if (instructionMint && instructionMint === tokenAccountMint) {
          // Check if this transaction contains minting instructions
          // Minting transactions should NOT be counted as peer-to-peer transfers
          const hasMintInstruction = instructions.some((ix: any) => {
            const parsed = ix.parsed;
            if (!parsed) return false;
            
            // Verify instruction is from a token program
            const programId = ix.programId?.toBase58();
            const isTokenProgram = programId === TOKEN_2022_ID || programId === LEGACY_TOKEN_ID;
            if (!isTokenProgram) return false;
            
            const type = parsed.type;
            const isMint = type === 'mintTo' || type === 'mintToChecked';
            
            if (isMint) {
              console.log(`Found mint instruction in tx ${signature.slice(0, 8)}...: type=${type}, program=${programId?.slice(0, 8)}...`);
            }
            
            return isMint;
          });

          // Skip transfers that are part of minting transactions
          if (hasMintInstruction) {
            console.log(`Skipping transfer in minting transaction: ${signature.slice(0, 8)}...`);
            continue; // This is a mint, not a peer-to-peer transfer
          }
          
          // Check if authority is blocklisted (PDA/program-driven transfer)
          // For transfer: check 'authority' field
          // For transferChecked: check 'authority' field (same as transfer)
          const authority = parsed.info?.authority;
          
          if (authority && authorityBlocklist.has(authority)) {
            // Skip program/PDA-driven transfers
            continue;
          }
          
          // Signer correlation check: only count transfers if authority appears in transaction signatures
          // Only enforce if we have signature data; otherwise default to blocklist-only (don't over-count)
          if (signerKeys !== null) {
            // We have signature info - verify authority is a signer
            if (!authority || !signerKeys.has(authority)) {
              // Authority not in signers - skip this transfer (likely CPI/program-driven)
              continue;
            }
          }
          // If no signature info available (signerKeys === null), we've already filtered by blocklist - accept transfer
          
          hasValidTransfer = true;
          console.log(`✓ Counting transfer in tx ${signature.slice(0, 8)}...: authority=${authority?.slice(0, 8)}..., mint matches`);
          break;
        }
      }
      
      // Only increment count if we found a valid transfer
      if (hasValidTransfer) {
        newTransferCount++;
      }
    }

    // Update stats if we found new transfers
    if (newTransferCount > 0) {
      stats.totalTransfers += newTransferCount;
      stats.lastUpdated = Date.now();
      if (signatures.length > 0) {
        stats.lastProcessedSignature = signatures[0].signature;
      }
      saveTransferStats(stats);
      saveProcessedSignatures(processedSignatures);
      
      console.log(`✓ Synced ${newTransferCount} new transfers from chain (total: ${stats.totalTransfers})`);
    }

    return stats.totalTransfers;
  } catch (error) {
    console.error('Error syncing transfers from chain:', error);
    // Return current count on error
    return getTransferStats().totalTransfers;
  }
}
