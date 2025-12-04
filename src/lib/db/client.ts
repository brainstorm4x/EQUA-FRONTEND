/**
 * EQUA Database Client
 * 
 * Provides the Turso database adapter.
 * 
 * IMPORTANT: 
 * - Only Turso (libSQL) is supported
 * - NO PII is stored in the database
 * - User registration verification is done ON-CHAIN only
 * 
 * Configuration via environment variable:
 * - TURSO_DATABASE_URL - Turso database URL (required)
 * - TURSO_AUTH_TOKEN - Turso auth token (optional for local dev)
 */

import type { DatabaseAdapter } from './adapter';

// ============================================================================
// Adapter Factory
// ============================================================================

let cachedAdapter: DatabaseAdapter | null = null;

/**
 * Get the Turso database adapter.
 * 
 * IMPORTANT: This adapter should only be used in server-side code.
 * For client-side code, use server actions.
 */
export function getDbAdapter(): DatabaseAdapter {
  // Return cached adapter if available
  if (cachedAdapter) {
    return cachedAdapter;
  }

  // Check if we're in a server environment
  if (typeof window !== 'undefined') {
    throw new Error(
      '[EQUA DB] Database adapter cannot be used in browser environment. ' +
      'Use server actions or API routes instead.'
    );
  }

  // Server-side: use Turso
  // eslint-disable-next-line no-restricted-syntax
  const { getTursoAdapter } = require('./providers/turso-adapter');
  const tursoAdapter = getTursoAdapter();
  cachedAdapter = tursoAdapter;
  return tursoAdapter as DatabaseAdapter;
}

/**
 * Get the current database provider name (always 'turso')
 */
export function getDbProvider(): 'turso' {
  return 'turso';
}

/**
 * Check if Turso is the current provider (always true)
 */
export function isUsingTurso(): boolean {
  return true;
}

/**
 * Reset the cached adapter (useful for testing)
 */
export function resetDbAdapter(): void {
  cachedAdapter = null;
}

// ============================================================================
// Export the default adapter instance
// ============================================================================

// For convenience, export methods directly from the adapter
// Note: These should be used in server-side code or through server actions

export const db = {
  get adapter(): DatabaseAdapter {
    return getDbAdapter();
  },

  // Registration analytics
  recordRegistrationAnalytics: (...args: Parameters<DatabaseAdapter['recordRegistrationAnalytics']>) => 
    getDbAdapter().recordRegistrationAnalytics(...args),
  getRegistrationStats: () => getDbAdapter().getRegistrationStats(),
  getGeographicStats: () => getDbAdapter().getGeographicStats(),

  // Transfer analytics
  recordTransferAnalytics: (...args: Parameters<DatabaseAdapter['recordTransferAnalytics']>) => 
    getDbAdapter().recordTransferAnalytics(...args),
  getTotalTransfers: () => getDbAdapter().getTotalTransfers(),

  // Referral analytics
  recordReferralAnalytics: (...args: Parameters<DatabaseAdapter['recordReferralAnalytics']>) => 
    getDbAdapter().recordReferralAnalytics(...args),
  getTotalReferrals: () => getDbAdapter().getTotalReferrals(),

  // Fingerprint operations
  recordDeviceFingerprint: (...args: Parameters<DatabaseAdapter['recordDeviceFingerprint']>) => 
    getDbAdapter().recordDeviceFingerprint(...args),
  isFingerprintRegistered: (...args: Parameters<DatabaseAdapter['isFingerprintRegistered']>) => 
    getDbAdapter().isFingerprintRegistered(...args),

  // Stats
  getStatsOverview: () => getDbAdapter().getStatsOverview(),

  // Global state
  getGlobalState: <T>(...args: [string, T]) => 
    getDbAdapter().getGlobalState(...args),
  setGlobalState: <T extends Record<string, unknown>>(...args: Parameters<DatabaseAdapter['setGlobalState']>) => 
    getDbAdapter().setGlobalState<T>(...args as [string, T, Date?]),

  // EQX Price operations
  addEqxPrice: (...args: Parameters<DatabaseAdapter['addEqxPrice']>) => 
    getDbAdapter().addEqxPrice(...args),
  getLatestEqxPrice: () => getDbAdapter().getLatestEqxPrice(),
  getEqxPriceHistory: (...args: Parameters<DatabaseAdapter['getEqxPriceHistory']>) => 
    getDbAdapter().getEqxPriceHistory(...args),

  // Database reset
  resetAll: () => getDbAdapter().resetAll(),

  // Provider info
  isAvailable: () => getDbAdapter().isAvailable(),
  get provider() {
    return getDbAdapter().provider;
  },
};

export default db;
