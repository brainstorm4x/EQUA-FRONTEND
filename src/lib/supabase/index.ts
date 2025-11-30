/**
 * EQUA Frontend Supabase Module
 * 
 * Main entry point for all Supabase-related functionality.
 * Exports client, types, database operations, and React hooks.
 */

// Export types
export * from './types';

// Export client
export { supabase, getSupabaseClient, isSupabaseAvailable, supabaseConfig } from './client';

// Export database operations
export { db, default as database } from './database';
export {
  // User operations
  registerUser,
  isWalletRegistered,
  getUserByWallet,
  
  // Transfer operations
  recordTransfer,
  getTotalTransfers,
  
  // Registration stats
  getRegistrationStats,
  recordRegistrationStats,
  
  // Referral operations
  recordReferral,
  isReferrerRateLimited,
  getReferralCount24h,
  
  // Fingerprint operations
  recordDeviceFingerprint,
  isFingerprintRegistered,
  
  // Stats
  getStatsOverview,
  
  // Global state
  getGlobalState,
  setGlobalState,
  
  // Sync
  syncPendingOperations,
  getPendingOperationsCount,
  
  // Cleanup
  clearAllLocalData,
} from './database';

// Export React hooks
export {
  useSupabaseConnection,
  useAutoSync,
  useStats,
  useTransferCount,
  useRegistrationStats,
  useWalletRegistration,
  useSupabase,
} from './hooks';

export type {
  UseSupabaseConnectionResult,
  UseAutoSyncResult,
  UseStatsResult,
  UseTransferCountResult,
  UseRegistrationStatsResult,
  UseWalletRegistrationResult,
  UseSupabaseResult,
} from './hooks';
