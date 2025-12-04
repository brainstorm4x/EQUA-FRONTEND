/**
 * EQUA Turso (libSQL) Adapter
 * 
 * Implements the DatabaseAdapter interface using Turso/libSQL over HTTP.
 * 
 * IMPORTANT PRIVACY PRINCIPLES:
 * - NO PII (Personally Identifiable Information) is stored
 * - NO wallet addresses in the database
 * - User registration verification is done ON-CHAIN only
 * - Database is used for anonymous analytics and statistics only
 * 
 * Key Features:
 * - HTTP-based access (works in serverless/edge environments)
 * - SQLite compatibility
 * - Parameterized queries for security
 * - Global replication for low latency
 * 
 * Credentials (TURSO_AUTH_TOKEN) should only be used server-side.
 */

import { createClient, type Client } from '@libsql/client';
import type {
  DatabaseAdapter,
  OperationResult,
  EqxPrice,
  EqxPriceResult,
  EqxPriceHistoryOptions,
} from '../adapter';
import { defaultStatsOverview, defaultRegistrationStats } from '../adapter';
import type {
  RegistrationAnalytics,
  RegistrationAnalyticsInsert,
  TransferAnalyticsInsert,
  ReferralAnalyticsInsert,
  DeviceFingerprintInsert,
  StatsOverview,
  LocalRegistrationStats,
  GeographicStats,
} from '../types';

// ============================================================================
// Utility Functions
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function toISOString(date?: Date): string {
  return (date || new Date()).toISOString();
}

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
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private getClient(): Client {
    if (!this.client) {
      interface ClientConfig {
        url: string;
        authToken?: string;
      }
      const config: ClientConfig = {
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
  // Registration Analytics Operations (NO PII)
  // ============================================================================

  async recordRegistrationAnalytics(data: RegistrationAnalyticsInsert): Promise<OperationResult<RegistrationAnalytics>> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO registration_analytics
          (id, account_type, state, country, device_fingerprint, registration_metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.account_type || 'individual',
          data.state || null,
          data.country || null,
          data.device_fingerprint || null,
          JSON.stringify(data.registration_metadata || {}),
          now,
          now,
        ],
      });

      // Update stats_overview
      await client.execute(`
        UPDATE stats_overview 
        SET total_registrations = total_registrations + 1,
            individual_registrations = individual_registrations + ${data.account_type === 'business' ? 0 : 1},
            business_registrations = business_registrations + ${data.account_type === 'business' ? 1 : 0},
            updated_at = CURRENT_TIMESTAMP
      `);

      return {
        success: true,
        data: {
          id,
          account_type: data.account_type || 'individual',
          state: data.state || null,
          country: data.country || null,
          device_fingerprint: data.device_fingerprint || null,
          registration_metadata: data.registration_metadata || {},
          created_at: now,
          updated_at: now,
        },
      };
    } catch (error) {
      console.error('[TursoAdapter] Error recording registration analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record registration analytics',
      };
    }
  }

  async getRegistrationStats(): Promise<LocalRegistrationStats> {
    try {
      const client = this.getClient();
      const result = await client.execute(`
        SELECT 
          SUM(CASE WHEN account_type = 'individual' THEN 1 ELSE 0 END) as individual_count,
          SUM(CASE WHEN account_type = 'business' THEN 1 ELSE 0 END) as business_count
        FROM registration_analytics
      `);

      const row = result.rows[0];
      return {
        individualCount: Number(row.individual_count) || 0,
        businessCount: Number(row.business_count) || 0,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('[TursoAdapter] Error getting registration stats:', error);
      return { ...defaultRegistrationStats, lastUpdated: Date.now() };
    }
  }

  async getGeographicStats(): Promise<GeographicStats[]> {
    try {
      const client = this.getClient();
      const result = await client.execute(`
        SELECT country, state, COUNT(*) as count
        FROM registration_analytics
        WHERE country IS NOT NULL
        GROUP BY country, state
        ORDER BY count DESC
      `);

      return result.rows.map(row => ({
        country: String(row.country),
        state: row.state ? String(row.state) : null,
        count: Number(row.count),
      }));
    } catch (error) {
      console.error('[TursoAdapter] Error getting geographic stats:', error);
      return [];
    }
  }

  // ============================================================================
  // Transfer Analytics Operations (NO PII)
  // ============================================================================

  async recordTransferAnalytics(data: TransferAnalyticsInsert): Promise<OperationResult> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO transfer_analytics
          (id, amount, transaction_signature, transfer_metadata, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.amount,
          data.transaction_signature || null,
          JSON.stringify(data.transfer_metadata || {}),
          now,
        ],
      });

      // Update stats_overview
      await client.execute(`
        UPDATE stats_overview 
        SET total_transfers = total_transfers + 1,
            updated_at = CURRENT_TIMESTAMP
      `);

      return { success: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        console.log('[TursoAdapter] Transfer already recorded (duplicate signature)');
        return { success: true }; // Silently ignore duplicates
      }
      console.error('[TursoAdapter] Error recording transfer analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record transfer',
      };
    }
  }

  async getTotalTransfers(): Promise<number> {
    try {
      const client = this.getClient();
      const result = await client.execute('SELECT COUNT(*) as count FROM transfer_analytics');
      return Number(result.rows[0].count) || 0;
    } catch (error) {
      console.error('[TursoAdapter] Error getting total transfers:', error);
      return 0;
    }
  }

  // ============================================================================
  // Referral Analytics Operations (NO PII)
  // ============================================================================

  async recordReferralAnalytics(data: ReferralAnalyticsInsert): Promise<OperationResult> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO referral_analytics
          (id, referral_metadata, created_at)
          VALUES (?, ?, ?)
        `,
        args: [
          id,
          JSON.stringify(data.referral_metadata || {}),
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Error recording referral analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record referral',
      };
    }
  }

  async getTotalReferrals(): Promise<number> {
    try {
      const client = this.getClient();
      const result = await client.execute('SELECT COUNT(*) as count FROM referral_analytics');
      return Number(result.rows[0].count) || 0;
    } catch (error) {
      console.error('[TursoAdapter] Error getting total referrals:', error);
      return 0;
    }
  }

  // ============================================================================
  // Device Fingerprint Operations (for Sybil prevention, NO wallet linkage)
  // ============================================================================

  async recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<OperationResult> {
    try {
      const client = this.getClient();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      await client.execute({
        sql: `
          INSERT INTO device_fingerprints
          (id, fingerprint_hash, fingerprint_metadata, created_at)
          VALUES (?, ?, ?, ?)
        `,
        args: [
          id,
          data.fingerprint_hash,
          JSON.stringify(data.fingerprint_metadata || {}),
          now,
        ],
      });

      return { success: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        console.log('[TursoAdapter] Fingerprint already exists');
        return {
          success: false,
          error: 'Fingerprint already registered',
        };
      }
      console.error('[TursoAdapter] Error recording device fingerprint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record fingerprint',
      };
    }
  }

  async isFingerprintRegistered(fingerprintHash: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: 'SELECT id FROM device_fingerprints WHERE fingerprint_hash = ? LIMIT 1',
        args: [fingerprintHash],
      });
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TursoAdapter] Error checking fingerprint:', error);
      return false;
    }
  }

  // ============================================================================
  // Stats Operations
  // ============================================================================

  async getStatsOverview(): Promise<StatsOverview> {
    try {
      const client = this.getClient();
      
      // Get registration stats
      const registrationResult = await client.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN account_type = 'individual' THEN 1 ELSE 0 END) as individual,
          SUM(CASE WHEN account_type = 'business' THEN 1 ELSE 0 END) as business
        FROM registration_analytics
      `);
      
      // Get transfer stats
      const transferResult = await client.execute(`
        SELECT COUNT(*) as count, SUM(amount) as volume FROM transfer_analytics
      `);
      
      // Get referral stats
      const referralResult = await client.execute(`
        SELECT COUNT(*) as count FROM referral_analytics
      `);

      const regRow = registrationResult.rows[0];
      const transferRow = transferResult.rows[0];
      const referralRow = referralResult.rows[0];

      return {
        total_registrations: Number(regRow.total) || 0,
        individual_registrations: Number(regRow.individual) || 0,
        business_registrations: Number(regRow.business) || 0,
        total_transfers: Number(transferRow.count) || 0,
        total_volume: Number(transferRow.volume) || 0,
        total_referrals: Number(referralRow.count) || 0,
      };
    } catch (error) {
      console.error('[TursoAdapter] Error getting stats overview:', error);
      return defaultStatsOverview;
    }
  }

  // ============================================================================
  // Global State Operations
  // ============================================================================

  async getGlobalState<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const client = this.getClient();
      const result = await client.execute({
        sql: 'SELECT state_value, expires_at FROM global_state WHERE state_key = ?',
        args: [key],
      });

      if (result.rows.length === 0) {
        return defaultValue;
      }

      const row = result.rows[0];
      const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
      
      if (expiresAt && expiresAt < new Date()) {
        return defaultValue;
      }

      return JSON.parse(String(row.state_value)) as T;
    } catch (error) {
      console.error('[TursoAdapter] Error getting global state:', error);
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
      const now = toISOString();
      const expiresAtStr = expiresAt ? toISOString(expiresAt) : null;

      await client.execute({
        sql: `
          INSERT INTO global_state (state_key, state_value, expires_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(state_key) DO UPDATE SET
            state_value = excluded.state_value,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
        `,
        args: [key, JSON.stringify(value), expiresAtStr, now, now],
      });

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Error setting global state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set global state',
      };
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
      const collectedAtStr = collectedAt ? toISOString(collectedAt) : now;

      const result = await client.execute({
        sql: `
          INSERT INTO eqx_prices (price_usd, usd_index, source, collected_at, created_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id
        `,
        args: [priceUsd, usdIndex || null, source || null, collectedAtStr, now],
      });

      const id = Number(result.rows[0].id);

      return {
        success: true,
        data: {
          id,
          collected_at: new Date(collectedAtStr),
          eqx_price_usd: priceUsd,
          usd_index: usdIndex || null,
          source: source || null,
          created_at: new Date(now),
        },
      };
    } catch (error) {
      console.error('[TursoAdapter] Error adding EQX price:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add price',
      };
    }
  }

  async getLatestEqxPrice(): Promise<EqxPriceResult | null> {
    try {
      const client = this.getClient();
      const result = await client.execute(`
        SELECT collected_at, price_usd as eqx_price_usd, usd_index, source
        FROM eqx_prices
        ORDER BY collected_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        collected_at: new Date(String(row.collected_at)),
        eqx_price_usd: Number(row.eqx_price_usd),
        usd_index: row.usd_index ? Number(row.usd_index) : null,
        source: row.source ? String(row.source) : null,
      };
    } catch (error) {
      console.error('[TursoAdapter] Error getting latest EQX price:', error);
      return null;
    }
  }

  async getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]> {
    try {
      const client = this.getClient();
      const { from, to, limit = 100 } = options || {};

      let sql = `
        SELECT collected_at, price_usd as eqx_price_usd, usd_index, source
        FROM eqx_prices
        WHERE 1=1
      `;
      const args: (string | number)[] = [];

      if (from) {
        sql += ' AND collected_at >= ?';
        args.push(toISOString(from));
      }
      if (to) {
        sql += ' AND collected_at <= ?';
        args.push(toISOString(to));
      }

      sql += ' ORDER BY collected_at DESC LIMIT ?';
      args.push(limit);

      const result = await client.execute({ sql, args });

      return result.rows.map(row => ({
        collected_at: new Date(String(row.collected_at)),
        eqx_price_usd: Number(row.eqx_price_usd),
        usd_index: row.usd_index ? Number(row.usd_index) : null,
        source: row.source ? String(row.source) : null,
      }));
    } catch (error) {
      console.error('[TursoAdapter] Error getting EQX price history:', error);
      return [];
    }
  }

  // ============================================================================
  // Database Reset (for migrations and testing)
  // ============================================================================

  async resetAll(): Promise<OperationResult> {
    try {
      const client = this.getClient();
      
      // Delete all data from tables
      await client.execute('DELETE FROM registration_analytics');
      await client.execute('DELETE FROM transfer_analytics');
      await client.execute('DELETE FROM referral_analytics');
      await client.execute('DELETE FROM device_fingerprints');
      await client.execute('DELETE FROM global_state');
      await client.execute('DELETE FROM eqx_prices');
      await client.execute('DELETE FROM stats_overview');

      // Reset stats_overview
      await client.execute(`
        INSERT INTO stats_overview 
        (total_registrations, individual_registrations, business_registrations, total_transfers, updated_at)
        VALUES (0, 0, 0, 0, CURRENT_TIMESTAMP)
      `);

      return { success: true };
    } catch (error) {
      console.error('[TursoAdapter] Error resetting database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset database',
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tursoAdapter: TursoAdapter | null = null;

export function getTursoAdapter(databaseUrl?: string, authToken?: string): TursoAdapter {
  if (!tursoAdapter) {
    tursoAdapter = new TursoAdapter(databaseUrl, authToken);
  }
  return tursoAdapter;
}

export default TursoAdapter;
