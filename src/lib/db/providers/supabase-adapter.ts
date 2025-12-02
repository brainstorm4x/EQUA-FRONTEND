/**
 * EQUA Supabase Adapter
 * 
 * Implements the DatabaseAdapter interface using Supabase.
 * This wraps the existing Supabase database operations.
 */

import type {
  DatabaseAdapter,
  OperationResult,
  EqxPrice,
  EqxPriceResult,
  EqxPriceHistoryOptions,
} from '../adapter';
import { defaultStatsOverview, defaultRegistrationStats } from '../adapter';
import { supabase, isSupabaseAvailable as checkSupabaseAvailable } from '@/lib/supabase/client';
import type {
  User,
  UserInsert,
  TransferInsert,
  ReferralInsert,
  DeviceFingerprintInsert,
  StatsOverview,
  LocalRegistrationStats,
} from '@/lib/supabase/types';

// ============================================================================
// Constants
// ============================================================================

// PostgreSQL error codes
const POSTGRES_UNIQUE_VIOLATION = '23505';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || String(24 * 60 * 60 * 1000), 10);
const REFERRAL_RATE_LIMIT = parseInt(process.env.NEXT_PUBLIC_REFERRAL_RATE_LIMIT || '10', 10);

// ============================================================================
// Supabase Adapter Implementation
// ============================================================================

export class SupabaseAdapter implements DatabaseAdapter {
  readonly provider = 'supabase' as const;

  async isAvailable(): Promise<boolean> {
    return checkSupabaseAvailable();
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async registerUser(data: UserInsert): Promise<OperationResult<User>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert(data)
        .select()
        .single();

      if (error) {
        if (error.code === POSTGRES_UNIQUE_VIOLATION) {
          return { success: false, error: 'User already registered' };
        }
        throw error;
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to register user:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isWalletRegistered(walletAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Transfer Operations
  // ============================================================================

  async recordTransfer(data: TransferInsert): Promise<OperationResult> {
    try {
      const { error } = await supabase.from('transfers').insert(data);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to record transfer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTotalTransfers(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('transfers')
        .select('*', { count: 'exact', head: true });

      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Registration Stats
  // ============================================================================

  async getRegistrationStats(): Promise<LocalRegistrationStats> {
    try {
      const { data, error } = await supabase
        .from('stats_overview')
        .select('individual_users, business_users')
        .single();

      if (error || !data) return defaultRegistrationStats;

      return {
        individualCount: data.individual_users,
        businessCount: data.business_users,
        lastUpdated: Date.now(),
      };
    } catch {
      return defaultRegistrationStats;
    }
  }

  // ============================================================================
  // Referral Operations
  // ============================================================================

  async recordReferral(data: ReferralInsert): Promise<OperationResult> {
    try {
      const { error } = await supabase.from('referrals').insert(data);
      // Ignore duplicate errors
      if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
      return { success: true };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to record referral:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isReferrerRateLimited(referrerWallet: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', referrerWallet)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

      if (error || count === null) return false;
      return count >= REFERRAL_RATE_LIMIT;
    } catch {
      return false;
    }
  }

  async getReferralCount24h(referrerWallet: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', referrerWallet)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Fingerprint Operations
  // ============================================================================

  async recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<OperationResult> {
    try {
      const { error } = await supabase.from('device_fingerprints').insert(data);
      // Ignore duplicate errors
      if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
      return { success: true };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to record fingerprint:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isFingerprintRegistered(fingerprintHash: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('id')
        .eq('fingerprint_hash', fingerprintHash)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Stats
  // ============================================================================

  async getStatsOverview(): Promise<StatsOverview> {
    try {
      const { data, error } = await supabase
        .from('stats_overview')
        .select('*')
        .single();

      if (error || !data) return defaultStatsOverview;
      return {
        total_users: data.total_users,
        individual_users: data.individual_users,
        business_users: data.business_users,
        total_transfers: data.total_transfers,
        total_volume: data.total_volume,
        total_referrals: data.total_referrals,
      };
    } catch {
      return defaultStatsOverview;
    }
  }

  // ============================================================================
  // Global State
  // ============================================================================

  async getGlobalState<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const { data, error } = await supabase
        .from('global_state')
        .select('state_value, expires_at')
        .eq('state_key', key)
        .single();

      if (error || !data) return defaultValue;

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return defaultValue;
      }
      return data.state_value as T;
    } catch {
      return defaultValue;
    }
  }

  async setGlobalState<T extends Record<string, unknown>>(
    key: string,
    value: T,
    expiresAt?: Date
  ): Promise<OperationResult> {
    try {
      const { error } = await supabase.rpc('upsert_global_state', {
        p_state_key: key,
        p_state_value: value,
        p_expires_at: expiresAt?.toISOString() || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to set global state:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ============================================================================
  // EQX Price Operations
  // ============================================================================

  async addEqxPrice(
    priceUsd: number,
    usdIndex?: number,
    collectedAt?: Date,
    source?: string
  ): Promise<OperationResult<EqxPrice>> {
    try {
      const { data, error } = await supabase
        .from('eqx_prices')
        .insert({
          eqx_price_usd: priceUsd,
          usd_index: usdIndex ?? null,
          collected_at: (collectedAt ?? new Date()).toISOString(),
          source: source ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        success: true,
        data: {
          id: data.id,
          collected_at: new Date(data.collected_at),
          eqx_price_usd: data.eqx_price_usd,
          usd_index: data.usd_index,
          source: data.source,
          created_at: new Date(data.created_at),
        },
      };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to add EQX price:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLatestEqxPrice(): Promise<EqxPriceResult | null> {
    try {
      const { data, error } = await supabase
        .from('eqx_prices')
        .select('collected_at, eqx_price_usd, usd_index, source')
        .order('collected_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        collected_at: new Date(data.collected_at),
        eqx_price_usd: data.eqx_price_usd,
        usd_index: data.usd_index,
        source: data.source,
      };
    } catch {
      return null;
    }
  }

  async getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]> {
    try {
      let query = supabase
        .from('eqx_prices')
        .select('collected_at, eqx_price_usd, usd_index, source')
        .order('collected_at', { ascending: false });

      if (options?.from) {
        query = query.gte('collected_at', options.from.toISOString());
      }
      if (options?.to) {
        query = query.lte('collected_at', options.to.toISOString());
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(row => ({
        collected_at: new Date(row.collected_at),
        eqx_price_usd: row.eqx_price_usd,
        usd_index: row.usd_index,
        source: row.source,
      }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Database Reset
  // ============================================================================

  async resetAll(): Promise<OperationResult> {
    try {
      // Delete from all tables
      const tables = [
        'users',
        'transfers',
        'referrals',
        'referral_rate_limits',
        'device_fingerprints',
        'analytics',
        'price_history',
        'global_state',
        'eqx_prices',
      ];

      // Delete all rows from each table
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '');
        if (error) {
          console.warn(`[SupabaseAdapter] Failed to reset ${table}:`, error);
        }
      }

      console.log('[SupabaseAdapter] All tables reset successfully');
      return { success: true };
    } catch (error) {
      console.error('[SupabaseAdapter] Failed to reset database:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const supabaseAdapter = new SupabaseAdapter();
