/**
 * EQUA Database Client
 * 
 * Provides the database adapter based on environment configuration.
 * Defaults to SQLite for development/CI and Supabase for production.
 * 
 * Configuration via environment variable:
 * - DB_PROVIDER=sqlite - Use local SQLite database
 * - DB_PROVIDER=supabase - Use Supabase cloud database
 * 
 * If not specified:
 * - Production (NODE_ENV=production): Supabase
 * - Development/CI: SQLite
 */

import type { DatabaseAdapter } from './adapter';

// ============================================================================
// Provider Selection Logic
// ============================================================================

type DBProvider = 'sqlite' | 'supabase';

function getProvider(): DBProvider {
  // Explicit environment variable takes precedence
  const envProvider = process.env.DB_PROVIDER?.toLowerCase();
  if (envProvider === 'sqlite' || envProvider === 'supabase') {
    return envProvider;
  }

  // Check for NEXT_PUBLIC variant (for client-side awareness)
  const publicProvider = process.env.NEXT_PUBLIC_DB_PROVIDER?.toLowerCase();
  if (publicProvider === 'sqlite' || publicProvider === 'supabase') {
    return publicProvider;
  }

  // Default based on environment
  // In production, prefer Supabase if credentials are available
  if (process.env.NODE_ENV === 'production') {
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    return hasSupabaseConfig ? 'supabase' : 'sqlite';
  }

  // Development/test: default to SQLite for offline-first development
  return 'sqlite';
}

// ============================================================================
// Adapter Factory
// ============================================================================

let cachedAdapter: DatabaseAdapter | null = null;
let cachedProvider: DBProvider | null = null;

/**
 * Get the database adapter based on current configuration.
 * 
 * IMPORTANT: SQLite adapter should only be used in server-side code.
 * For client-side code, use the Supabase adapter hooks or a server action.
 */
export function getDbAdapter(): DatabaseAdapter {
  const provider = getProvider();
  
  // Return cached adapter if provider hasn't changed
  if (cachedAdapter && cachedProvider === provider) {
    return cachedAdapter;
  }

  if (provider === 'sqlite') {
    // Check if we're in a server environment
    if (typeof window !== 'undefined') {
      console.warn(
        '[EQUA DB] SQLite adapter requested in browser environment. ' +
        'Using Supabase adapter instead. SQLite is only available on the server.'
      );
      // Fall back to Supabase in browser
      const { supabaseAdapter } = require('./providers/supabase-adapter');
      cachedAdapter = supabaseAdapter;
      cachedProvider = 'supabase';
      return cachedAdapter;
    }

    // Server-side: use SQLite
    const { getSQLiteAdapter } = require('./providers/sqlite-adapter');
    cachedAdapter = getSQLiteAdapter();
    cachedProvider = provider;
  } else {
    // Supabase works in both environments
    const { supabaseAdapter } = require('./providers/supabase-adapter');
    cachedAdapter = supabaseAdapter;
    cachedProvider = provider;
  }

  console.log(`[EQUA DB] Using ${cachedProvider} database adapter`);
  return cachedAdapter;
}

/**
 * Get the current database provider name
 */
export function getDbProvider(): DBProvider {
  return getProvider();
}

/**
 * Check if SQLite is the current provider
 */
export function isUsingSQLite(): boolean {
  return getProvider() === 'sqlite';
}

/**
 * Check if Supabase is the current provider
 */
export function isUsingSupabase(): boolean {
  return getProvider() === 'supabase';
}

/**
 * Reset the cached adapter (useful for testing)
 */
export function resetDbAdapter(): void {
  cachedAdapter = null;
  cachedProvider = null;
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

  // User operations
  registerUser: (...args: Parameters<DatabaseAdapter['registerUser']>) => 
    getDbAdapter().registerUser(...args),
  isWalletRegistered: (...args: Parameters<DatabaseAdapter['isWalletRegistered']>) => 
    getDbAdapter().isWalletRegistered(...args),
  getUserByWallet: (...args: Parameters<DatabaseAdapter['getUserByWallet']>) => 
    getDbAdapter().getUserByWallet(...args),

  // Transfer operations
  recordTransfer: (...args: Parameters<DatabaseAdapter['recordTransfer']>) => 
    getDbAdapter().recordTransfer(...args),
  getTotalTransfers: () => getDbAdapter().getTotalTransfers(),

  // Registration stats
  getRegistrationStats: () => getDbAdapter().getRegistrationStats(),

  // Referral operations
  recordReferral: (...args: Parameters<DatabaseAdapter['recordReferral']>) => 
    getDbAdapter().recordReferral(...args),
  isReferrerRateLimited: (...args: Parameters<DatabaseAdapter['isReferrerRateLimited']>) => 
    getDbAdapter().isReferrerRateLimited(...args),
  getReferralCount24h: (...args: Parameters<DatabaseAdapter['getReferralCount24h']>) => 
    getDbAdapter().getReferralCount24h(...args),

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

  // Provider info
  isAvailable: () => getDbAdapter().isAvailable(),
  get provider() {
    return getDbAdapter().provider;
  },
};

export default db;
