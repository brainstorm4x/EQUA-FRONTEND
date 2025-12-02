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

type DBProvider = 'sqlite' | 'supabase' | 'turso';

function getProvider(): DBProvider {
  // Explicit environment variable takes precedence
  const envProvider = process.env.DB_PROVIDER?.toLowerCase();
  if (envProvider === 'sqlite' || envProvider === 'supabase' || envProvider === 'turso') {
    return envProvider;
  }

  // Check for NEXT_PUBLIC variant (for client-side awareness)
  const publicProvider = process.env.NEXT_PUBLIC_DB_PROVIDER?.toLowerCase();
  if (publicProvider === 'sqlite' || publicProvider === 'supabase' || publicProvider === 'turso') {
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
 * IMPORTANT: SQLite and Turso adapters should only be used in server-side code.
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
      // eslint-disable-next-line no-restricted-syntax
      const { supabaseAdapter } = require('./providers/supabase-adapter');
      cachedAdapter = supabaseAdapter;
      cachedProvider = 'supabase';
      return supabaseAdapter as DatabaseAdapter;
    }

    // Server-side: use SQLite
    // eslint-disable-next-line no-restricted-syntax
    const { getSQLiteAdapter } = require('./providers/sqlite-adapter');
    const sqliteAdapter = getSQLiteAdapter();
    cachedAdapter = sqliteAdapter;
    cachedProvider = provider;
    return sqliteAdapter as DatabaseAdapter;
  } else if (provider === 'turso') {
    // Check if we're in a server environment
    if (typeof window !== 'undefined') {
      console.warn(
        '[EQUA DB] Turso adapter requested in browser environment. ' +
        'Using Supabase adapter instead. Turso credentials should only be used server-side.'
      );
      // Fall back to Supabase in browser
      // eslint-disable-next-line no-restricted-syntax
      const { supabaseAdapter } = require('./providers/supabase-adapter');
      cachedAdapter = supabaseAdapter;
      cachedProvider = 'supabase';
      return supabaseAdapter as DatabaseAdapter;
    }

    // Server-side: use Turso
    // eslint-disable-next-line no-restricted-syntax
    const { getTursoAdapter } = require('./providers/turso-adapter');
    const tursoAdapter = getTursoAdapter();
    cachedAdapter = tursoAdapter;
    cachedProvider = provider;
    return tursoAdapter as DatabaseAdapter;
  } else {
    // Supabase works in both environments
    // eslint-disable-next-line no-restricted-syntax
    const { supabaseAdapter } = require('./providers/supabase-adapter');
    cachedAdapter = supabaseAdapter;
    cachedProvider = provider;
    return supabaseAdapter as DatabaseAdapter;
  }
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
 * Check if Turso is the current provider
 */
export function isUsingTurso(): boolean {
  return getProvider() === 'turso';
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
