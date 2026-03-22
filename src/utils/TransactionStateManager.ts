/**
 * Transaction State Manager
 *
 * Persists transaction state to localStorage during mobile deep link flows.
 * Allows restoration of transaction context after returning from wallet app.
 *
 * Lifecycle:
 * 1. saveTransactionState() before wallet.signTransaction()
 * 2. User deep links to wallet app
 * 3. User approves/rejects
 * 4. Browser returns to UNIA
 * 5. restoreTransactionState() on page mount
 * 6. clearTransactionState() on completion or error
 */

const STORAGE_KEY = 'equa_pending_transaction';
const STATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface TransactionState {
  type: 'registration' | 'mint';
  timestamp: number;
  publicKey: string;
  metadata?: {
    accountType?: number;
    referrer?: string;
    amount?: number;
  };
  serializedTransaction?: string; // Base64 encoded transaction
}

/**
 * Save transaction state before deep link
 */
export function saveTransactionState(state: TransactionState): void {
  try {
    const stateWithTimestamp = {
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    console.log('💾 [StateManager] Transaction state saved:', {
      type: state.type,
      publicKey: state.publicKey.substring(0, 8) + '...',
    });
  } catch (error) {
    console.error('❌ [StateManager] Failed to save state:', error);
  }
}

/**
 * Restore transaction state after deep link return
 * Returns null if no state, expired, or invalid
 */
export function restoreTransactionState(): TransactionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const state: TransactionState = JSON.parse(raw);
    const age = Date.now() - state.timestamp;

    if (age > STATE_TIMEOUT_MS) {
      console.warn('⏰ [StateManager] State expired, clearing');
      clearTransactionState();
      return null;
    }

    console.log('📦 [StateManager] State restored:', {
      type: state.type,
      age: Math.floor(age / 1000) + 's',
      publicKey: state.publicKey.substring(0, 8) + '...',
    });

    return state;
  } catch (error) {
    console.error('❌ [StateManager] Failed to restore state:', error);
    clearTransactionState();
    return null;
  }
}

/**
 * Clear transaction state (on success or final error)
 */
export function clearTransactionState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ [StateManager] State cleared');
  } catch (error) {
    console.error('❌ [StateManager] Failed to clear state:', error);
  }
}

/**
 * Check if there's a pending transaction
 */
export function hasPendingTransaction(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
