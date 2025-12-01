/**
 * EQUA SQLite Adapter
 * 
 * Implements the DatabaseAdapter interface using SQLite.
 * This is for local development and testing only.
 * 
 * IMPORTANT: This adapter uses better-sqlite3 which is a Node.js-only package.
 * It should only be used in server-side code (Next.js API routes, server components).
 */

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

// ============================================================================
// Types for better-sqlite3
// ============================================================================

interface Database {
  exec(sql: string): void;
  prepare<T = unknown>(sql: string): Statement<T>;
  close(): void;
}

interface Statement<T = unknown> {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || String(24 * 60 * 60 * 1000), 10);
const REFERRAL_RATE_LIMIT = parseInt(process.env.NEXT_PUBLIC_REFERRAL_RATE_LIMIT || '10', 10);

// ============================================================================
// Utility Functions
// ============================================================================

function generateUUID(): string {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toISOString(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

function parseISOString(str: string): Date {
  return new Date(str);
}

// ============================================================================
// SQLite Adapter Implementation
// ============================================================================

export class SQLiteAdapter implements DatabaseAdapter {
  readonly provider = 'sqlite' as const;
  private db: Database | null = null;
  private dbPath: string;
  private schemaApplied: boolean = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? process.env.SQLITE_DB_PATH ?? '.data/equa.sqlite';
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private getDatabase(): Database {
    if (!this.db) {
      // Dynamic import to prevent bundling in client-side code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BetterSqlite3 = require('better-sqlite3');
      this.db = new BetterSqlite3(this.dbPath) as Database;
      
      // Enable WAL mode for file-based databases (not for in-memory)
      if (this.dbPath !== ':memory:') {
        this.db.exec('PRAGMA journal_mode = WAL');
      }
      this.db.exec('PRAGMA foreign_keys = ON');
      
      // Apply schema if not yet done
      if (!this.schemaApplied) {
        this.applySchema();
        this.schemaApplied = true;
      }
    }
    return this.db;
  }

  private applySchema(): void {
    const db = this.db;
    if (!db) return;

    // For in-memory databases or when schema file can't be found, use inline schema
    if (this.dbPath === ':memory:') {
      this.applyInlineSchema();
      return;
    }

    // Read and execute schema
    const fs = require('fs');
    const path = require('path');
    
    // Try multiple possible schema locations
    const possiblePaths = [
      path.join(process.cwd(), 'db', 'schema.sql'),
      path.join(__dirname, '../../../../db/schema.sql'),
      path.join(__dirname, '../../../db/schema.sql'),
    ];

    let schemaPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        schemaPath = p;
        break;
      }
    }

    if (!schemaPath) {
      console.warn('[SQLiteAdapter] Schema file not found, using inline schema');
      this.applyInlineSchema();
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        db.exec(stmt);
      } catch (error) {
        // Ignore "already exists" errors
        const errMsg = String(error);
        if (!errMsg.includes('already exists')) {
          console.error('[SQLiteAdapter] Schema error:', error);
        }
      }
    }
  }

  private applyInlineSchema(): void {
    const db = this.db;
    if (!db) return;

    // Minimal inline schema for testing
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL UNIQUE,
        account_type TEXT NOT NULL DEFAULT 'individual',
        device_fingerprint TEXT,
        referrer_wallet TEXT,
        user_number INTEGER,
        registration_metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        sender_wallet TEXT NOT NULL,
        recipient_wallet TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_signature TEXT UNIQUE,
        transfer_metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_wallet TEXT NOT NULL,
        referee_wallet TEXT NOT NULL UNIQUE,
        referral_code TEXT,
        reward_amount REAL DEFAULT 0,
        is_rate_limited INTEGER DEFAULT 0,
        referral_metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS device_fingerprints (
        id TEXT PRIMARY KEY,
        fingerprint_hash TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        user_agent TEXT,
        fingerprint_metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS global_state (
        id TEXT PRIMARY KEY,
        state_key TEXT NOT NULL UNIQUE,
        state_value TEXT NOT NULL DEFAULT '{}',
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS eqx_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
        eqx_price_usd REAL NOT NULL,
        usd_index REAL,
        source TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
      )`,
    ];

    for (const sql of tables) {
      try {
        db.exec(sql);
      } catch (error) {
        console.error('[SQLiteAdapter] Inline schema error:', error);
      }
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.schemaApplied = false;
    }
  }

  // ============================================================================
  // Connection
  // ============================================================================

  async isAvailable(): Promise<boolean> {
    try {
      this.getDatabase();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async registerUser(data: UserInsert): Promise<OperationResult<User>> {
    try {
      const db = this.getDatabase();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      const stmt = db.prepare(`
        INSERT INTO users (id, wallet_address, account_type, device_fingerprint, referrer_wallet, user_number, registration_metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.wallet_address,
        data.account_type ?? 'individual',
        data.device_fingerprint ?? null,
        data.referrer_wallet ?? null,
        data.user_number ?? null,
        JSON.stringify(data.registration_metadata ?? {}),
        now,
        now
      );

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
      console.error('[SQLiteAdapter] Failed to register user:', error);
      const errMsg = String(error);
      if (errMsg.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'User already registered' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isWalletRegistered(walletAddress: string): Promise<boolean> {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare<{ id: string }>('SELECT id FROM users WHERE wallet_address = ?');
      const result = stmt.get(walletAddress);
      return !!result;
    } catch {
      return false;
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare<{
        id: string;
        wallet_address: string;
        account_type: string;
        device_fingerprint: string | null;
        referrer_wallet: string | null;
        user_number: number | null;
        registration_metadata: string;
        created_at: string;
        updated_at: string;
      }>('SELECT * FROM users WHERE wallet_address = ?');
      const row = stmt.get(walletAddress);
      
      if (!row) return null;

      return {
        id: row.id,
        wallet_address: row.wallet_address,
        account_type: row.account_type as 'individual' | 'business',
        device_fingerprint: row.device_fingerprint,
        referrer_wallet: row.referrer_wallet,
        user_number: row.user_number,
        registration_metadata: JSON.parse(row.registration_metadata || '{}'),
        created_at: row.created_at,
        updated_at: row.updated_at,
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
      const db = this.getDatabase();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      const stmt = db.prepare(`
        INSERT INTO transfers (id, sender_wallet, recipient_wallet, amount, transaction_signature, transfer_metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.sender_wallet,
        data.recipient_wallet,
        data.amount,
        data.transaction_signature ?? null,
        JSON.stringify(data.transfer_metadata ?? {}),
        now
      );

      return { success: true };
    } catch (error) {
      console.error('[SQLiteAdapter] Failed to record transfer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTotalTransfers(): Promise<number> {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM transfers');
      const result = stmt.get();
      return result?.count ?? 0;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Registration Stats
  // ============================================================================

  async getRegistrationStats(): Promise<LocalRegistrationStats> {
    try {
      const db = this.getDatabase();
      
      const individualStmt = db.prepare<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE account_type = 'individual'"
      );
      const businessStmt = db.prepare<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE account_type = 'business'"
      );

      const individual = individualStmt.get();
      const business = businessStmt.get();

      return {
        individualCount: individual?.count ?? 0,
        businessCount: business?.count ?? 0,
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
      const db = this.getDatabase();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      const stmt = db.prepare(`
        INSERT INTO referrals (id, referrer_wallet, referee_wallet, referral_code, reward_amount, is_rate_limited, referral_metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.referrer_wallet,
        data.referee_wallet,
        data.referral_code ?? null,
        data.reward_amount ?? 0,
        data.is_rate_limited ? 1 : 0,
        JSON.stringify(data.referral_metadata ?? {}),
        now
      );

      return { success: true };
    } catch (error) {
      console.error('[SQLiteAdapter] Failed to record referral:', error);
      const errMsg = String(error);
      // Ignore unique constraint violations (duplicate referrals)
      if (errMsg.includes('UNIQUE constraint failed')) {
        return { success: true };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isReferrerRateLimited(referrerWallet: string): Promise<boolean> {
    try {
      const count = await this.getReferralCount24h(referrerWallet);
      return count >= REFERRAL_RATE_LIMIT;
    } catch {
      return false;
    }
  }

  async getReferralCount24h(referrerWallet: string): Promise<number> {
    try {
      const db = this.getDatabase();
      const cutoffTime = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      
      const stmt = db.prepare<{ count: number }>(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_wallet = ? AND created_at >= ?'
      );
      const result = stmt.get(referrerWallet, cutoffTime);
      return result?.count ?? 0;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Fingerprint Operations
  // ============================================================================

  async recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<OperationResult> {
    try {
      const db = this.getDatabase();
      const id = data.id ?? generateUUID();
      const now = toISOString();

      const stmt = db.prepare(`
        INSERT INTO device_fingerprints (id, fingerprint_hash, wallet_address, user_agent, fingerprint_metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.fingerprint_hash,
        data.wallet_address,
        data.user_agent ?? null,
        JSON.stringify(data.fingerprint_metadata ?? {}),
        now
      );

      return { success: true };
    } catch (error) {
      console.error('[SQLiteAdapter] Failed to record fingerprint:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async isFingerprintRegistered(fingerprintHash: string): Promise<boolean> {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare<{ id: string }>('SELECT id FROM device_fingerprints WHERE fingerprint_hash = ? LIMIT 1');
      const result = stmt.get(fingerprintHash);
      return !!result;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Stats
  // ============================================================================

  async getStatsOverview(): Promise<StatsOverview> {
    try {
      const db = this.getDatabase();

      // Get user counts
      const totalUsersStmt = db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM users');
      const individualStmt = db.prepare<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE account_type = 'individual'"
      );
      const businessStmt = db.prepare<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE account_type = 'business'"
      );

      // Get transfer counts
      const transfersStmt = db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM transfers');
      const volumeStmt = db.prepare<{ total: number | null }>('SELECT SUM(amount) as total FROM transfers');

      // Get referral count
      const referralsStmt = db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM referrals');

      return {
        total_users: totalUsersStmt.get()?.count ?? 0,
        individual_users: individualStmt.get()?.count ?? 0,
        business_users: businessStmt.get()?.count ?? 0,
        total_transfers: transfersStmt.get()?.count ?? 0,
        total_volume: volumeStmt.get()?.total ?? 0,
        total_referrals: referralsStmt.get()?.count ?? 0,
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
      const db = this.getDatabase();
      const stmt = db.prepare<{ state_value: string; expires_at: string | null }>(
        'SELECT state_value, expires_at FROM global_state WHERE state_key = ?'
      );
      const row = stmt.get(key);

      if (!row) return defaultValue;

      // Check if expired
      if (row.expires_at && parseISOString(row.expires_at) < new Date()) {
        return defaultValue;
      }

      return JSON.parse(row.state_value) as T;
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
      const db = this.getDatabase();
      const id = generateUUID();
      const now = toISOString();
      const valueStr = JSON.stringify(value);
      const expiresAtStr = expiresAt ? toISOString(expiresAt) : null;

      // Upsert: insert or replace
      const stmt = db.prepare(`
        INSERT INTO global_state (id, state_key, state_value, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(state_key) DO UPDATE SET
          state_value = excluded.state_value,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `);

      stmt.run(id, key, valueStr, expiresAtStr, now, now);

      return { success: true };
    } catch (error) {
      console.error('[SQLiteAdapter] Failed to set global state:', error);
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
      const db = this.getDatabase();
      const now = toISOString();
      const collectedAtStr = collectedAt ? toISOString(collectedAt) : now;

      const stmt = db.prepare(`
        INSERT INTO eqx_prices (collected_at, eqx_price_usd, usd_index, source, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(collectedAtStr, priceUsd, usdIndex ?? null, source ?? null, now);

      const eqxPrice: EqxPrice = {
        id: Number(result.lastInsertRowid),
        collected_at: parseISOString(collectedAtStr),
        eqx_price_usd: priceUsd,
        usd_index: usdIndex ?? null,
        source: source ?? null,
        created_at: parseISOString(now),
      };

      return { success: true, data: eqxPrice };
    } catch (error) {
      console.error('[SQLiteAdapter] Failed to add EQX price:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLatestEqxPrice(): Promise<EqxPriceResult | null> {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare<{
        collected_at: string;
        eqx_price_usd: number;
        usd_index: number | null;
        source: string | null;
      }>('SELECT collected_at, eqx_price_usd, usd_index, source FROM eqx_prices ORDER BY collected_at DESC LIMIT 1');
      
      const row = stmt.get();
      if (!row) return null;

      return {
        collected_at: parseISOString(row.collected_at),
        eqx_price_usd: row.eqx_price_usd,
        usd_index: row.usd_index,
        source: row.source,
      };
    } catch {
      return null;
    }
  }

  async getEqxPriceHistory(options?: EqxPriceHistoryOptions): Promise<EqxPriceResult[]> {
    try {
      const db = this.getDatabase();
      
      let sql = 'SELECT collected_at, eqx_price_usd, usd_index, source FROM eqx_prices';
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options?.from) {
        conditions.push('collected_at >= ?');
        params.push(toISOString(options.from));
      }
      if (options?.to) {
        conditions.push('collected_at <= ?');
        params.push(toISOString(options.to));
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY collected_at DESC';

      if (options?.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      const stmt = db.prepare<{
        collected_at: string;
        eqx_price_usd: number;
        usd_index: number | null;
        source: string | null;
      }>(sql);

      const rows = stmt.all(...params);

      return rows.map(row => ({
        collected_at: parseISOString(row.collected_at),
        eqx_price_usd: row.eqx_price_usd,
        usd_index: row.usd_index,
        source: row.source,
      }));
    } catch {
      return [];
    }
  }
}

// Export factory function to create instances
export function createSQLiteAdapter(dbPath?: string): SQLiteAdapter {
  return new SQLiteAdapter(dbPath);
}

// Export singleton instance for default usage
let defaultInstance: SQLiteAdapter | null = null;

export function getSQLiteAdapter(): SQLiteAdapter {
  if (!defaultInstance) {
    defaultInstance = new SQLiteAdapter();
  }
  return defaultInstance;
}
