/**
 * Transfer Tracking Utility
 * 
 * Tracks EQUA token transfers between users locally.
 * Since SPL token transfers don't increment the on-chain global state counter,
 * we track transfers locally for UI display purposes.
 * 
 * Note: This is client-side tracking. In production, consider using:
 * - On-chain event subscriptions
 * - Backend service with database
 * - Solana RPC signature history queries
 */

const STORAGE_KEY = 'equa_transfer_stats';

export interface TransferStats {
  totalTransfers: number;
  lastUpdated: number;
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
 * Records a new transfer
 * Also attempts to persist to database for better tracking across sessions
 * 
 * @param senderWallet - Optional sender wallet address
 * @param recipientWallet - Optional recipient wallet address  
 * @param amount - Optional transfer amount
 * @param transactionSignature - Optional transaction signature
 * 
 * Note: If wallet addresses and amount are not provided, only localStorage
 * tracking will be updated. Database persistence requires all parameters.
 */
export async function recordTransfer(
  senderWallet?: string,
  recipientWallet?: string,
  amount?: number,
  transactionSignature?: string
): Promise<void> {
  // Update localStorage for immediate UI feedback
  const stats = getTransferStats();
  stats.totalTransfers += 1;
  stats.lastUpdated = Date.now();
  saveTransferStats(stats);
  
  // Attempt to persist to database only if all required data is provided
  if (senderWallet && recipientWallet && amount !== undefined) {
    try {
      const { db } = await import('@/lib/db/client');
      await db.recordTransfer({
        sender_wallet: senderWallet,
        recipient_wallet: recipientWallet,
        amount: amount,
        transaction_signature: transactionSignature,
      });
      console.log('✓ Transfer recorded to database');
    } catch (error) {
      console.warn('Failed to record transfer to database:', error);
      // Continue - localStorage tracking is already done
    }
  } else {
    console.log('ℹ Transfer recorded to localStorage only (missing database parameters)');
  }
  
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
  } catch {
    console.warn('Failed to reset transfer stats');
  }
}
