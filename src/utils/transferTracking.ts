/**
 * Transfer Tracking Utility
 * 
 * Tracks EQUA token transfers for UI display purposes.
 * 
 * IMPORTANT: NO PII is stored in the database.
 * - Transfer analytics are recorded anonymously (no wallet addresses)
 * - Only transaction signatures and amounts are stored for deduplication
 * - localStorage is used for immediate UI feedback
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
 * Also attempts to persist anonymous analytics to database
 * 
 * @param amount - Transfer amount
 * @param transactionSignature - Optional transaction signature (for deduplication)
 * 
 * NOTE: Wallet addresses are NOT stored (privacy-preserving)
 */
export async function recordTransfer(
  amount: number,
  transactionSignature?: string
): Promise<void> {
  // Update localStorage for immediate UI feedback
  const stats = getTransferStats();
  stats.totalTransfers += 1;
  stats.lastUpdated = Date.now();
  saveTransferStats(stats);
  
  // Attempt to persist anonymous analytics to database
  try {
    const { db } = await import('@/lib/db/client');
    await db.recordTransferAnalytics({
      amount: amount,
      transaction_signature: transactionSignature,
      transfer_metadata: {
        timestamp: Date.now(),
      },
    });
    console.log('✓ Transfer analytics recorded to database (no PII)');
  } catch (error) {
    console.warn('Failed to record transfer analytics to database:', error);
    // Continue - localStorage tracking is already done
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
