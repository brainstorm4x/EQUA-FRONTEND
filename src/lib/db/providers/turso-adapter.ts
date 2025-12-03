/**
 * EQUA Turso (libSQL) Adapter
 * 
 * Implements the DatabaseAdapter interface using Turso/libSQL over HTTP.
 * Turso provides a globally replicated SQLite-compatible database accessible via HTTP/WebSockets.
 * 
 * Key Features:
 * - HTTP-based access (works in serverless/edge environments)
 * - SQLite compatibility (same schema as SQLiteAdapter)
 * - Parameterized queries for security
 * - Global replication for low latency
 * 
 * IMPORTANT: This adapter uses @libsql/client which works in both Node.js and edge runtimes.
 * Credentials (TURSO_AUTH_TOKEN) should only be used server-side.
 */

import { createClient, type Client, type ResultSet } from '@libsql/client';
import type {
  DatabaseAdapter,
  OperationResult,
  EqxPrice,
  EqxPriceResult,
  EqxPriceHistoryOptions,
} from '../adapter';
import { defaultStatsOverview, defaultRegistrationStats } from '../adapter';
import type {
  User,
  UserInsert,
  TransferInsert,
  ReferralInsert,
  DeviceFingerprintInsert,
  StatsOverview,
  LocalRegistrationStats,
} from '@/lib/supabase/types';
import {
  TABLE_NAMES,
  COMMON_QUERIES,
  generateUUID,
  toISOString,
  parseISOString,
  buildEqxPriceHistoryQuery,
} from '../sql/statements';

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || String(24 * 60 * 60 * 1000), 10);
const REFERRAL_RATE_LIMIT = parseInt(process.env.NEXT_PUBLIC_REFERRAL_RATE_LIMIT || '10', 10);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is a unique constraint violation
 */
function isUniqueConstraintError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errStr = String(error);
    return errStr.includes('UNIQUE constraint failed') || errStr.includes('unique');
  }
  return false;
}

/**
 * Parse a row value safely
 */
function safeGetString(row: Record<string, unknown>, key: string): string | null {
  const val = row[key];
  return val !== null && val !== undefined ? String(val) : null;
}

function safeGetNumber(row: Record<string, unknown>, key: string): number | null {
  const val = row[key];
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

// ============================================================================
// Turso Adapter Implementation
// ============================================================================

export class TursoAdapter implements DatabaseAdapter {
  readonly provider = 'turso' as const;
  private client: Client | null = null;
  private databaseUrl: string;
  private authToken: string;

  constructor(databaseUrl?: string, authToken?: string) {
    this.databaseUrl = databaseUrl ?? process.env.TURSO_DATABASE_URL ?? '';
    this.authToken = authToken ?? process.env.TURSO_AUTH_TOKEN ?? '';

    if (!this.databaseUrl) {
      throw new Error('[TursoAdapter] Database URL is required but not configured');
    }
    // Auth token is optional for local development (turso dev doesn't require auth)
    // For production (turso cloud), an auth token is required
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private getClient(): Client {
    if (!this.client) {
      const config: any = {
        url: this.databaseUrl,
      };
      // Only add authToken if it's provided (local dev doesn't need it)
      if (this.authToken) {
        config.authToken = this.authToken;
      }
      this.client = createClient(config);
    }
    return this.client;
  }

  // ============================================================================
  // Connection Check
  // ============================================================================

  async isAvailable(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('[TursoAdapter] Connection check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async registerUser(data: UserInsert): Promise<OperationResult<User>> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO ${TABLE_NAMES.USERS} 
          (id, wallet_address, account_type, device_fingerprint, referrer_wallet, user_number, registration_metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.wallet_address,
          data.account_type ?? 'individual',
          data.device_fingerprint ?? null,
          data.referrer_wallet ?? null,
          data.user_number ?? null,
          JSON.stringify(data.registration_metadata ?? {}),
          now,
          now,
        ],
      });

      const user: User = {
        id,
        wallet_address: data.wallet_address,
        account_type: data.account_type ?? 'individual',
        device_fingerprint: data.device_fingerprint ?? null,
        referrer_wallet: data.referrer_wallet ?? null,
        user_number: data.user_number ?? null,
        registration_metadata: data.registration_metadata ?? {},
        created_at: now,
        updated_at: now,
      };

      return { success: true, data: user };
    } catch (error) {
      console.error('[TursoAdapter] Failed to register user:', error);
      if (isUniqueConstraintError(error)) {
        return { success: false, error: 'User already registered' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isWalletRegistered(walletAddress: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: COMMON_QUERIES.CHECK_WALLET_EXISTS,
        args: [walletAddress],
      });
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: COMMON_QUERIES.GET_USER_BY_WALLET,
        args: [walletAddress],
      });

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as Record<string, unknown>;
      
      return {
        id: String(row.id),
        wallet_address: String(row.wallet_address),
        account_type: String(row.account_type) as 'individual' | 'business',
        device_fingerprint: safeGetString(row, 'device_fingerprint'),
        referrer_wallet: safeGetString(row, 'referrer_wallet'),
        user_number: safeGetNumber(row, 'user_number'),
        registration_metadata: JSON.parse(safeGetString(row, 'registration_metadata') || '{}'),
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Transfer Operations
  // ============================================================================

  async recordTransfer(data: TransferInsert): Promise<OperationResult> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO ${TABLE_NAMES.TRANSFERS}
          (id, sender_wallet, recipient_wallet, amount, transaction_signature, transfer_metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.sender_wallet,
          data.recipient_wallet,
          data.amount,
          data.transaction_signature ?? null,
          JSON.stringify(data.transfer_metadata ?? {}),
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Failed to record transfer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTotalTransfers(): Promise<number> {
    try {
      const client = this.getClient();
      const result = await client.execute(COMMON_QUERIES.COUNT_TRANSFERS);
      if (result.rows.length === 0) return 0;
      return Number(result.rows[0].count) || 0;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Registration Stats
  // ============================================================================

  async getRegistrationStats(): Promise<LocalRegistrationStats> {
    try {
      const client = this.getClient();
      
      const individualResult = await client.execute(COMMON_QUERIES.COUNT_USERS_BY_TYPE_INDIVIDUAL);
      const businessResult = await client.execute(COMMON_QUERIES.COUNT_USERS_BY_TYPE_BUSINESS);

      return {
        individualCount: individualResult.rows.length > 0 ? Number(individualResult.rows[0].count) || 0 : 0,
        businessCount: businessResult.rows.length > 0 ? Number(businessResult.rows[0].count) || 0 : 0,
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
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO ${TABLE_NAMES.REFERRALS}
          (id, referrer_wallet, referee_wallet, referral_code, reward_amount, is_rate_limited, referral_metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.referrer_wallet,
          data.referee_wallet,
          data.referral_code ?? null,
          data.reward_amount ?? 0,
          data.is_rate_limited ? 1 : 0,
          JSON.stringify(data.referral_metadata ?? {}),
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Failed to record referral:', error);
      if (isUniqueConstraintError(error)) {
        return { success: false, error: 'Referee already referred' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isReferrerRateLimited(referrerWallet: string): Promise<boolean> {
    const count = await this.getReferralCount24h(referrerWallet);
    return count >= REFERRAL_RATE_LIMIT;
  }

  async getReferralCount24h(referrerWallet: string): Promise<number> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: COMMON_QUERIES.COUNT_REFERRALS_24H,
        args: [referrerWallet],
      });
      if (result.rows.length === 0) return 0;
      return Number(result.rows[0].count) || 0;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Fingerprint Operations
  // ============================================================================

  async recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<OperationResult> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO ${TABLE_NAMES.DEVICE_FINGERPRINTS}
          (id, fingerprint_hash, wallet_address, user_agent, fingerprint_metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.fingerprint_hash,
          data.wallet_address,
          data.user_agent ?? null,
          JSON.stringify(data.fingerprint_metadata ?? {}),
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Failed to record fingerprint:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isFingerprintRegistered(fingerprintHash: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: COMMON_QUERIES.CHECK_FINGERPRINT_EXISTS,
        args: [fingerprintHash],
      });
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Stats
  // ============================================================================

  async getStatsOverview(): Promise<StatsOverview> {
    try {
      const client = this.getClient();
      const result = await client.execute(`
        SELECT 
          (SELECT COUNT(*) FROM ${TABLE_NAMES.USERS}) as total_users,
          (SELECT COUNT(*) FROM ${TABLE_NAMES.USERS} WHERE account_type = 'individual') as individual_users,
          (SELECT COUNT(*) FROM ${TABLE_NAMES.USERS} WHERE account_type = 'business') as business_users,
          (SELECT COUNT(*) FROM ${TABLE_NAMES.TRANSFERS}) as total_transfers,
          (SELECT COALESCE(SUM(amount), 0) FROM ${TABLE_NAMES.TRANSFERS}) as total_volume,
          (SELECT COUNT(*) FROM ${TABLE_NAMES.REFERRALS}) as total_referrals
      `);

      if (result.rows.length === 0) return defaultStatsOverview;

      const row = result.rows[0] as Record<string, unknown>;
      
      return {
        total_users: Number(row.total_users) || 0,
        individual_users: Number(row.individual_users) || 0,
        business_users: Number(row.business_users) || 0,
        total_transfers: Number(row.total_transfers) || 0,
        total_volume: Number(row.total_volume) || 0,
        total_referrals: Number(row.total_referrals) || 0,
      };
    } catch (error) {
      console.error('[TursoAdapter] Failed to get stats:', error);
      return defaultStatsOverview;
    }
  }

  // ============================================================================
  // Global State
  // ============================================================================

  async getGlobalState<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: COMMON_QUERIES.GET_GLOBAL_STATE,
        args: [key],
      });

      if (result.rows.length === 0) return defaultValue;

      const row = result.rows[0] as Record<string, unknown>;
      const expiresAt = safeGetString(row, 'expires_at');
      
      // Check if expired
      if (expiresAt) {
        const expiryDate = parseISOString(expiresAt);
        if (expiryDate.getTime() < Date.now()) {
          return defaultValue;
        }
      }

      const stateValue = safeGetString(row, 'state_value');
      if (!stateValue) return defaultValue;

      return JSON.parse(stateValue) as T;
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
      const client = this.getClient();
      const id = generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT OR REPLACE INTO ${TABLE_NAMES.GLOBAL_STATE}
          (id, state_key, state_value, expires_at, created_at, updated_at)
          VALUES (
            COALESCE((SELECT id FROM ${TABLE_NAMES.GLOBAL_STATE} WHERE state_key = ?), ?),
            ?, ?, ?, 
            COALESCE((SELECT created_at FROM ${TABLE_NAMES.GLOBAL_STATE} WHERE state_key = ?), ?),
            ?
          )
        `,
        args: [
          key, id,
          key,
          JSON.stringify(value),
          expiresAt ? toISOString(expiresAt) : null,
          key, now,
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Failed to set global state:', error);
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
      const client = this.getClient();
      const now = toISOString();
      const collectionTime = toISOString(collectedAt);

      const result = await client.execute({
        sql: `
          INSERT INTO ${TABLE_NAMES.EQX_PRICES}
          (collected_at, eqx_price_usd, usd_index, source, created_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, collected_at, eqx_price_usd, usd_index, source, created_at
        `,
        args: [collectionTime, priceUsd, usdIndex ?? null, source ?? null, now],
      });

      if (result.rows.length === 0) {
        return { success: false, error: 'Failed to insert price' };
      }

      const row = result.rows[0] as Record<string, unknown>;
      
      const eqxPrice: EqxPrice = {
        id: Number(row.id),
        collected_at: parseISOString(String(row.collected_at)),
        eqx_price_usd: Number(row.eqx_price_usd),
        usd_index: safeGetNumber(row, 'usd_index'),
        source: safeGetString(row, 'source'),
        created_at: parseISOString(String(row.created_at)),
      };

      return { success: true, data: eqxPrice };
    } catch (error) {
      console.error('[TursoAdapter] Failed to add EQX price:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLatestEqxPrice(): Promise<EqxPriceResult | null> {
    try {
      const client = this.getClient();
      const result = await client.execute(COMMON_QUERIES.GET_LATEST_EQX_PRICE);

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as Record<string, unknown>;
      
      return {
        collected_at: parseISOString(String(row.collected_at)),
        eqx_price_usd: Number(row.eqx_price_usd),
        usd_index: safeGetNumber(row, 'usd_index'),
        source: safeGetString(row, 'source'),
      };
    } catch {
      return null;
    }
  }

  async getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]> {
    try {
      const client = this.getClient();
      const { sql, params } = buildEqxPriceHistoryQuery(options);

      const result = await client.execute({
        sql,
        args: params,
      });

      return result.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          collected_at: parseISOString(String(r.collected_at)),
          eqx_price_usd: Number(r.eqx_price_usd),
          usd_index: safeGetNumber(r, 'usd_index'),
          source: safeGetString(r, 'source'),
        };
      });
    } catch (error) {
      console.error('[TursoAdapter] Failed to get price history:', error);
      return [];
    }
  }

  // ============================================================================
  // Database Reset
  // ============================================================================

  async resetAll(): Promise<OperationResult> {
    try {
      const client = this.getClient();
      
      // Truncate all relevant tables
      await client.batch([
        `DELETE FROM ${TABLE_NAMES.USERS}`,
        `DELETE FROM ${TABLE_NAMES.TRANSFERS}`,
        `DELETE FROM ${TABLE_NAMES.REFERRALS}`,
        `DELETE FROM ${TABLE_NAMES.REFERRAL_RATE_LIMITS}`,
        `DELETE FROM ${TABLE_NAMES.DEVICE_FINGERPRINTS}`,
        `DELETE FROM ${TABLE_NAMES.ANALYTICS}`,
        `DELETE FROM ${TABLE_NAMES.PRICE_HISTORY}`,
        `DELETE FROM ${TABLE_NAMES.GLOBAL_STATE}`,
        `DELETE FROM ${TABLE_NAMES.EQX_PRICES}`,
      ], 'write');

      console.log('[TursoAdapter] All tables reset successfully');
      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Failed to reset database:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cachedTursoAdapter: TursoAdapter | null = null;

export function getTursoAdapter(): TursoAdapter {
  if (!cachedTursoAdapter) {
    cachedTursoAdapter = new TursoAdapter();
  }
  return cachedTursoAdapter;
}

export const tursoAdapter = getTursoAdapter();
