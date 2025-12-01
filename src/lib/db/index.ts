/**
 * EQUA Database Module
 * 
 * Main entry point for database operations.
 * Provides a unified interface that works with both SQLite and Supabase.
 */

// Export adapter interface and types
export type {
  DatabaseAdapter,
  OperationResult,
  EqxPrice,
  EqxPriceInsert,
  EqxPriceResult,
  EqxPriceHistoryOptions,
} from './adapter';

export {
  defaultStatsOverview,
  defaultRegistrationStats,
} from './adapter';

// Export client and provider selection
export {
  db,
  getDbAdapter,
  getDbProvider,
  isUsingSQLite,
  isUsingSupabase,
  resetDbAdapter,
} from './client';

// Export adapters for direct usage if needed
export { SupabaseAdapter, supabaseAdapter } from './providers/supabase-adapter';
// Note: SQLite adapter is only available server-side
// export { SQLiteAdapter, createSQLiteAdapter, getSQLiteAdapter } from './providers/sqlite-adapter';
