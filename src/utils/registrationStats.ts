/**
 * Registration Stats Tracking Utility
 * 
 * Tracks individual and business registration counts locally.
 * Note: In production, this should be tracked on-chain in the smart contract.
 * This is a client-side tracking mechanism for UI display purposes.
 */

const STORAGE_KEY = 'equa_registration_stats';

export interface RegistrationStats {
  individualCount: number;
  businessCount: number;
  lastUpdated: number;
}

/**
 * Gets registration stats from localStorage
 */
export function getRegistrationStats(): RegistrationStats {
  if (typeof window === 'undefined') {
    return { individualCount: 0, businessCount: 0, lastUpdated: 0 };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { individualCount: 0, businessCount: 0, lastUpdated: 0 };
    }
    return JSON.parse(stored);
  } catch {
    console.warn('Failed to parse registration stats');
    return { individualCount: 0, businessCount: 0, lastUpdated: 0 };
  }
}

/**
 * Saves registration stats to localStorage
 */
export function saveRegistrationStats(stats: RegistrationStats): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    console.warn('Failed to save registration stats');
  }
}

/**
 * Records a new registration
 * @param accountType - 'individual' or 'business'
 */
export function recordRegistration(accountType: 'individual' | 'business'): void {
  const stats = getRegistrationStats();
  
  if (accountType === 'individual') {
    stats.individualCount += 1;
  } else {
    stats.businessCount += 1;
  }
  
  stats.lastUpdated = Date.now();
  saveRegistrationStats(stats);
}

/**
 * Gets total registration count
 */
export function getTotalRegistrations(): number {
  const stats = getRegistrationStats();
  return stats.individualCount + stats.businessCount;
}

/**
 * Resets registration stats (for testing/admin purposes)
 */
export function resetRegistrationStats(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn('Failed to reset registration stats');
  }
}
