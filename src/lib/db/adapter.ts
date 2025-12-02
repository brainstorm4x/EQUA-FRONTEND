/**
 * EQUA Database Adapter Interface
 * 
 * Defines the contract for database operations that both
 * SupabaseAdapter and SQLiteAdapter must implement.
 */

import type {
  User,
  UserInsert,
  Transfer,
  TransferInsert,
  Referral,
  ReferralInsert,
  DeviceFingerprint,
  DeviceFingerprintInsert,
  StatsOverview,
  GlobalState,
  LocalRegistrationStats,
} from '@/lib/supabase/types';

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
  readonly provider: 'sqlite' | 'supabase' | 'turso';
  
  // Connection check
  isAvailable(): Promise<boolean>;
  
  // User operations
  registerUser(data: UserInsert): Promise<OperationResult<User>>;
  isWalletRegistered(walletAddress: string): Promise<boolean>;
  getUserByWallet(walletAddress: string): Promise<User | null>;
  
  // Transfer operations
  recordTransfer(data: TransferInsert): Promise<OperationResult>;
  getTotalTransfers(): Promise<number>;
  
  // Registration stats
  getRegistrationStats(): Promise<LocalRegistrationStats>;
  
  // Referral operations
  recordReferral(data: ReferralInsert): Promise<OperationResult>;
  isReferrerRateLimited(referrerWallet: string): Promise<boolean>;
  getReferralCount24h(referrerWallet: string): Promise<number>;
  
  // Fingerprint operations
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
  
  // EQX Price operations (new)
  addEqxPrice(
    priceUsd: number,
    usdIndex?: number,
    collectedAt?: Date,
    source?: string
  ): Promise<OperationResult<EqxPrice>>;
  getLatestEqxPrice(): Promise<EqxPriceResult | null>;
  getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]>;
}

// ============================================================================
// Default stats values
// ============================================================================

export const defaultStatsOverview: StatsOverview = {
  total_users: 0,
  individual_users: 0,
  business_users: 0,
  total_transfers: 0,
  total_volume: 0,
  total_referrals: 0,
};

export const defaultRegistrationStats: LocalRegistrationStats = {
  individualCount: 0,
  businessCount: 0,
  lastUpdated: 0,
};
