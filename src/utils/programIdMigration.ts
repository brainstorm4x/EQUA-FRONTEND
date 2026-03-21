/**
 * Program ID Migration Utility
 * 
 * Handles clearing of old localStorage data when the program ID changes.
 * This ensures users start fresh with new program deployments.
 */

const PROGRAM_ID_KEY = 'unia_current_program_id';

/**
 * Gets the stored program ID from localStorage
 */
function getStoredProgramId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(PROGRAM_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Stores the current program ID in localStorage
 */
function storeProgramId(programId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PROGRAM_ID_KEY, programId);
  } catch (error) {
    console.warn('Failed to store program ID:', error);
  }
}

/**
 * Clears all UNIA-related localStorage data
 */
function clearUniaLocalStorage(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing old UNIA data due to program ID change...');
  
  // List of localStorage keys to clear
  const keysToRemove = [
    'unia_registration_stats',        // Registration stats tracking
    'unia_transfer_stats',             // Transfer stats tracking
    'unia_referral_rate_limit_registry', // Referral rate limiting
    'unia_registered_keys',            // Registered public keys
    'unia_registered_fingerprints',    // Device fingerprints
    'unia_user_number',                // User registration number
    'unia_registration_complete',      // Registration event flag
  ];
  
  let clearedCount = 0;
  
  // Remove known keys
  for (const key of keysToRemove) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  }
  
  // Also clear any fingerprint keys (pattern: unia_fingerprint_*)
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('unia_fingerprint_')) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
  } catch (error) {
    console.warn('Failed to clear fingerprint keys:', error);
  }
  
  console.log(`✅ Cleared ${clearedCount} localStorage items for fresh start`);
}

/**
 * Checks if the program ID has changed and clears old data if needed.
 * Should be called on app initialization.
 * 
 * @param currentProgramId - The current program ID from environment
 * 
 * Note: This function only works in browser environments as it uses localStorage.
 * It will safely no-op in server-side rendering contexts.
 */
export function checkAndMigrateForProgramIdChange(currentProgramId: string): void {
  const storedProgramId = getStoredProgramId();
  
  // If no stored program ID, this is first run or after manual clear
  if (!storedProgramId) {
    console.log('📝 First run or after clear - storing current program ID');
    storeProgramId(currentProgramId);
    return;
  }
  
  // If program ID changed, clear old data
  if (storedProgramId !== currentProgramId) {
    console.log('🔄 Program ID changed!');
    console.log(`   Old: ${storedProgramId}`);
    console.log(`   New: ${currentProgramId}`);
    
    clearUniaLocalStorage();
    storeProgramId(currentProgramId);
    
    // Dispatch event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('unia_program_id_changed', {
        detail: { oldProgramId: storedProgramId, newProgramId: currentProgramId }
      }));
    }
    
    console.log('✅ Migration complete - ready for fresh start with new program ID');
  } else {
    // Program ID unchanged, no action needed
    console.log('✓ Program ID unchanged, continuing with existing data');
  }
}

/**
 * Manually clear all UNIA data (for testing/admin purposes)
 */
export function manualClearUniaData(): void {
  clearUniaLocalStorage();
  
  // Also clear the stored program ID to force re-check on next load
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PROGRAM_ID_KEY);
      console.log('✅ All UNIA data cleared manually');
    } catch (error) {
      console.warn('Failed to clear program ID key:', error);
    }
  }
}

/**
 * Reset localStorage caches when switching to a new Solana program ID.
 * This should be called when mounting components to ensure clean state.
 * 
 * @param currentProgramId - The current program ID (as base58 string)
 * 
 * Example usage:
 * ```typescript
 * resetForNewProgramId(PROGRAM_ID.toBase58())
 * ```
 */
export function resetForNewProgramId(currentProgramId: string): void {
  if (typeof window === 'undefined') return;
  
  const storedProgramId = getStoredProgramId();
  
  // If no stored program ID, this is first run or after manual clear
  if (!storedProgramId) {
    console.log('📝 First run with program ID:', currentProgramId);
    storeProgramId(currentProgramId);
    return;
  }
  
  // If program ID changed, clear old data
  if (storedProgramId !== currentProgramId) {
    console.log('🔄 Program ID changed - resetting local state');
    console.log(`   Old: ${storedProgramId}`);
    console.log(`   New: ${currentProgramId}`);
    
    clearUniaLocalStorage();
    storeProgramId(currentProgramId);
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('unia_program_id_changed', {
      detail: { oldProgramId: storedProgramId, newProgramId: currentProgramId }
    }));
    
    console.log('✅ Local state reset complete');
  }
}
