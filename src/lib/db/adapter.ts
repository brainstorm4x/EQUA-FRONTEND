/**
 * EQUA Database Adapter Interface
 * 
 * Defines the contract for database operations.
 * 
 * IMPORTANT: This database stores NO PII (Personally Identifiable Information).
 * - Registration verification is done ON-CHAIN only
 * - Database is used for anonymous analytics and statistics only
 * - No wallet addresses or user-identifying information is stored
 */

import type {
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
} from './types';

// ============================================================================
// EQX Price Types (new feature)
// ============================================================================

export interface EqxPrice {
  id: number;
  collected_at: Date;
  eqx_price_usd: number;
  usd_index: number | null;
  source: string | null;
  created_at: Date;
}

export interface EqxPriceInsert {
  eqx_price_usd: number;
  usd_index?: number | null;
  collected_at?: Date;
  source?: string | null;
}

export interface EqxPriceHistoryOptions {
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface EqxPriceResult {
  collected_at: Date;
  eqx_price_usd: number;
  usd_index?: number | null;
  source?: string | null;
}

// ============================================================================
// Operation Result Types
// ============================================================================

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Database Adapter Interface
// ============================================================================

export interface DatabaseAdapter {
  // Provider info
  readonly provider: 'turso';
  
  // Connection check
  isAvailable(): Promise<boolean>;
  
  // Registration analytics (NO PII - just anonymous statistics)
  recordRegistrationAnalytics(data: RegistrationAnalyticsInsert): Promise<OperationResult<RegistrationAnalytics>>;
  getRegistrationStats(): Promise<LocalRegistrationStats>;
  getGeographicStats(): Promise<GeographicStats[]>;
  
  // Transfer analytics (NO PII - anonymous statistics)
  recordTransferAnalytics(data: TransferAnalyticsInsert): Promise<OperationResult>;
  getTotalTransfers(): Promise<number>;
  
  // Referral analytics (NO PII - anonymous count)
  recordReferralAnalytics(data: ReferralAnalyticsInsert): Promise<OperationResult>;
  getTotalReferrals(): Promise<number>;
  
  // Device fingerprint operations (for Sybil prevention, NO wallet linkage)
  recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<OperationResult>;
  isFingerprintRegistered(fingerprintHash: string): Promise<boolean>;
  
  // Stats
  getStatsOverview(): Promise<StatsOverview>;
  
  // Global state
  getGlobalState<T>(key: string, defaultValue: T): Promise<T>;
  setGlobalState<T extends Record<string, unknown>>(
    key: string,
    value: T,
    expiresAt?: Date
  ): Promise<OperationResult>;
  
  // EQX Price operations (unchanged)
  addEqxPrice(
    priceUsd: number,
    usdIndex?: number,
    collectedAt?: Date,
    source?: string
  ): Promise<OperationResult<EqxPrice>>;
  getLatestEqxPrice(): Promise<EqxPriceResult | null>;
  getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]>;
  
  // Database reset (for migrations and testing)
  resetAll(): Promise<OperationResult>;
}

// ============================================================================
// Default stats values
// ============================================================================

export const defaultStatsOverview: StatsOverview = {
  total_registrations: 0,
  individual_registrations: 0,
  business_registrations: 0,
  total_transfers: 0,
  total_volume: 0,
  total_referrals: 0,
};

export const defaultRegistrationStats: LocalRegistrationStats = {
  individualCount: 0,
  businessCount: 0,
  lastUpdated: 0,
};
