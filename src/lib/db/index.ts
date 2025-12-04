/**
 * EQUA Database Module
 * 
 * Main entry point for database operations.
 * Provides a unified interface using Turso (libSQL) for all database operations.
 * 
 * IMPORTANT:
 * - Only Turso is supported
 * - NO PII is stored in the database
 * - User registration verification is done ON-CHAIN only
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

// Export database types
export type {
  RegistrationAnalytics,
  RegistrationAnalyticsInsert,
  TransferAnalytics,
  TransferAnalyticsInsert,
  ReferralAnalytics,
  ReferralAnalyticsInsert,
  DeviceFingerprint,
  DeviceFingerprintInsert,
  StatsOverview,
  LocalRegistrationStats,
  GeographicStats,
  GlobalState,
} from './types';

// Export client and provider selection
export {
  db,
  getDbAdapter,
  getDbProvider,
  isUsingTurso,
  resetDbAdapter,
} from './client';

// Export Turso adapter for direct usage if needed
export { TursoAdapter, getTursoAdapter } from './providers/turso-adapter';
