/**
 * EQUA Frontend Supabase Types
 * 
 * TypeScript type definitions for all Supabase tables and operations.
 * These types match the database schema defined in schema.sql
 */

// ============================================================================
// Database Table Types
// ============================================================================

export interface User {
  id: string;
  wallet_address: string;
  account_type: 'individual' | 'business';
  device_fingerprint: string | null;
  referrer_wallet: string | null;
  user_number: number | null;
  registration_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  sender_wallet: string;
  recipient_wallet: string;
  amount: number;
  transaction_signature: string | null;
  transfer_metadata: Record<string, unknown>;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_wallet: string;
  referee_wallet: string;
  referral_code: string | null;
  reward_amount: number;
  is_rate_limited: boolean;
  referral_metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReferralRateLimit {
  id: string;
  referrer_wallet: string;
  referral_count: number;
  window_start: string;
  window_end: string;
  is_rate_limited: boolean;
  rate_limit_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Analytics {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'counter' | 'gauge' | 'histogram';
  dimensions: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  price_usd: number;
  epoch_number: number;
  phase: string;
  total_transactions: number;
  price_metadata: Record<string, unknown>;
  recorded_at: string;
}

export interface DeviceFingerprint {
  id: string;
  fingerprint_hash: string;
  wallet_address: string;
  user_agent: string | null;
  fingerprint_metadata: Record<string, unknown>;
  created_at: string;
}

export interface GlobalState {
  id: string;
  state_key: string;
  state_value: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

export interface UserInsert {
  id?: string;
  wallet_address: string;
  account_type?: 'individual' | 'business';
  device_fingerprint?: string | null;
  referrer_wallet?: string | null;
  user_number?: number | null;
  registration_metadata?: Record<string, unknown>;
}

export interface TransferInsert {
  id?: string;
  sender_wallet: string;
  recipient_wallet: string;
  amount: number;
  transaction_signature?: string | null;
  transfer_metadata?: Record<string, unknown>;
}

export interface ReferralInsert {
  id?: string;
  referrer_wallet: string;
  referee_wallet: string;
  referral_code?: string | null;
  reward_amount?: number;
  is_rate_limited?: boolean;
  referral_metadata?: Record<string, unknown>;
}

export interface ReferralRateLimitInsert {
  id?: string;
  referrer_wallet: string;
  referral_count?: number;
  window_start?: string;
  window_end?: string;
  is_rate_limited?: boolean;
  rate_limit_metadata?: Record<string, unknown>;
}

export interface AnalyticsInsert {
  id?: string;
  metric_name: string;
  metric_value: number;
  metric_type?: 'counter' | 'gauge' | 'histogram';
  dimensions?: Record<string, unknown>;
  recorded_at?: string;
}

export interface PriceHistoryInsert {
  id?: string;
  price_usd: number;
  epoch_number: number;
  phase: string;
  total_transactions?: number;
  price_metadata?: Record<string, unknown>;
}

export interface DeviceFingerprintInsert {
  id?: string;
  fingerprint_hash: string;
  wallet_address: string;
  user_agent?: string | null;
  fingerprint_metadata?: Record<string, unknown>;
}

export interface GlobalStateInsert {
  id?: string;
  state_key: string;
  state_value: Record<string, unknown>;
  expires_at?: string | null;
}

// ============================================================================
// Update Types (for updating existing records)
// ============================================================================

export interface UserUpdate {
  account_type?: 'individual' | 'business';
  device_fingerprint?: string | null;
  referrer_wallet?: string | null;
  user_number?: number | null;
  registration_metadata?: Record<string, unknown>;
}

export interface GlobalStateUpdate {
  state_value?: Record<string, unknown>;
  expires_at?: string | null;
}

// ============================================================================
// View Types
// ============================================================================

export interface StatsOverview {
  total_users: number;
  individual_users: number;
  business_users: number;
  total_transfers: number;
  total_volume: number;
  total_referrals: number;
}

export interface RecentActivity {
  activity_type: 'registration' | 'transfer';
  wallet: string;
  created_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}

// ============================================================================
// Client State Types (for localStorage fallback)
// ============================================================================

export interface LocalTransferStats {
  totalTransfers: number;
  lastUpdated: number;
}

export interface LocalRegistrationStats {
  individualCount: number;
  businessCount: number;
  lastUpdated: number;
}

export interface LocalRegisteredKey {
  publicKey: string;
  registeredAt: number;
  deviceFingerprint?: string;
}

export interface LocalReferralEvent {
  timestamp: number;
  refereeAddress: string;
}

export interface LocalReferrerData {
  referrerAddress: string;
  referrals: LocalReferralEvent[];
  totalReferrals: number;
  isRateLimited: boolean;
  lastUpdated: number;
}

// ============================================================================
// Sync State Types
// ============================================================================

export interface SyncState {
  lastSyncedAt: number;
  pendingOperations: PendingOperation[];
  isOnline: boolean;
}

export interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// ============================================================================
// Database Type Map (for generic operations)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      transfers: {
        Row: Transfer;
        Insert: TransferInsert;
        Update: never;
      };
      referrals: {
        Row: Referral;
        Insert: ReferralInsert;
        Update: never;
      };
      referral_rate_limits: {
        Row: ReferralRateLimit;
        Insert: ReferralRateLimitInsert;
        Update: Partial<ReferralRateLimitInsert>;
      };
      analytics: {
        Row: Analytics;
        Insert: AnalyticsInsert;
        Update: never;
      };
      price_history: {
        Row: PriceHistory;
        Insert: PriceHistoryInsert;
        Update: never;
      };
      device_fingerprints: {
        Row: DeviceFingerprint;
        Insert: DeviceFingerprintInsert;
        Update: never;
      };
      global_state: {
        Row: GlobalState;
        Insert: GlobalStateInsert;
        Update: GlobalStateUpdate;
      };
    };
    Views: {
      stats_overview: {
        Row: StatsOverview;
      };
      recent_activity: {
        Row: RecentActivity;
      };
    };
    Functions: {
      get_referral_count_24h: {
        Args: { p_referrer_wallet: string };
        Returns: number;
      };
      is_wallet_registered: {
        Args: { p_wallet_address: string };
        Returns: boolean;
      };
      upsert_global_state: {
        Args: {
          p_state_key: string;
          p_state_value: Record<string, unknown>;
          p_expires_at?: string | null;
        };
        Returns: void;
      };
    };
  };
}
