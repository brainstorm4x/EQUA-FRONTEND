/**
 * Transfer Tracking Utility
 * 
 * Tracks EQUA token transfers for UI display purposes using localStorage only.
 * All tracking is done locally without external database dependencies.
 * Supports both outbound (sends) and inbound (receives) tracking via chain signatures.
 */

import { Connection, PublicKey } from '@solana/web3.js';

const STORAGE_KEY = 'equa_transfer_stats';
const PROCESSED_SIGNATURES_KEY = 'equa_processed_signatures';

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
 * @param amount - Transfer amount (for logging only)
 * @param transactionSignature - Optional transaction signature (for logging only)
 */
export async function recordTransfer(
  amount: number,
  transactionSignature?: string
): Promise<void> {
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
 * Gets total transfer count
 */
export function getTotalTransfers(): number {
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
 * Only counts actual user-to-user transfers (transfer/transferChecked instructions)
 * Excludes mint operations (mintTo/mintToChecked) and other non-transfer activity
 * 
 * @param connection - Solana RPC connection
 * @param tokenAccountAddress - Token account address (ATA)
 * @returns Updated transfer count
 */
export async function syncTransfersFromChain(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
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
          hasValidTransfer = true;
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
