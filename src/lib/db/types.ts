/**
 * EQUA Frontend Database Types
 * 
 * TypeScript type definitions for all database tables and operations.
 * These types match the database schema defined in db/schema_turso.sql
 * 
 * IMPORTANT: This database stores NO PII (Personally Identifiable Information).
 * - No wallet addresses
 * - No referral codes
 * - Only anonymous analytics and aggregated statistics
 * - User registration verification is done ON-CHAIN only
 */

// ============================================================================
// Database Table Types
// ============================================================================

/**
 * Registration Analytics - Anonymous registration data with geographic info
 * NO wallet addresses or user-identifying information
 */
export interface RegistrationAnalytics {
  id: string;
  account_type: 'individual' | 'business';
  state: string | null;  // User's state/province (for analytics only)
  country: string | null;  // User's country (for analytics only)
  device_fingerprint: string | null;
  registration_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Transfer Analytics - Anonymous transfer statistics
 * NO wallet addresses
 */
export interface TransferAnalytics {
  id: string;
  amount: number;
  transaction_signature: string | null;  // For deduplication only
  transfer_metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Referral Analytics - Anonymous referral statistics
 * NO wallet addresses or referral codes
 */
export interface ReferralAnalytics {
  id: string;
  referral_metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Device Fingerprint - For Sybil attack prevention
 * NO wallet addresses
 */
export interface DeviceFingerprint {
  id: string;
  fingerprint_hash: string;
  fingerprint_metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Global State - Key/value store for application-wide state
 */
export interface GlobalState {
  id: string;
  state_key: string;
  state_value: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Stats Overview - Aggregated statistics
 */
export interface StatsOverview {
  total_registrations: number;
  individual_registrations: number;
  business_registrations: number;
  total_transfers: number;
  total_volume: number;
  total_referrals: number;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

export interface RegistrationAnalyticsInsert {
  id?: string;
  account_type?: 'individual' | 'business';
  state?: string | null;
  country?: string | null;
  device_fingerprint?: string | null;
  registration_metadata?: Record<string, unknown>;
}

export interface TransferAnalyticsInsert {
  id?: string;
  amount: number;
  transaction_signature?: string | null;
  transfer_metadata?: Record<string, unknown>;
}

export interface ReferralAnalyticsInsert {
  id?: string;
  referral_metadata?: Record<string, unknown>;
}

export interface DeviceFingerprintInsert {
  id?: string;
  fingerprint_hash: string;
  fingerprint_metadata?: Record<string, unknown>;
}

// ============================================================================
// Local Registration Stats (computed from analytics)
// ============================================================================

export interface LocalRegistrationStats {
  individualCount: number;
  businessCount: number;
  lastUpdated: number;
}

// ============================================================================
// Geographic Analytics
// ============================================================================

export interface GeographicStats {
  country: string;
  state: string | null;
  count: number;
}
