/**
 * Shared SQL Statements and Constants
 * 
 * Common SQL queries and table definitions used across database adapters.
 * This helps maintain consistency between SQLite and Turso implementations.
 */

// ============================================================================
// Table Names
// ============================================================================

export const TABLE_NAMES = {
  USERS: 'users',
  TRANSFERS: 'transfers',
  REFERRALS: 'referrals',
  REFERRAL_RATE_LIMITS: 'referral_rate_limits',
  ANALYTICS: 'analytics',
  PRICE_HISTORY: 'price_history',
  DEVICE_FINGERPRINTS: 'device_fingerprints',
  GLOBAL_STATE: 'global_state',
  EQX_PRICES: 'eqx_prices',
} as const;

// ============================================================================
// Common Query Fragments
// ============================================================================

export const COMMON_QUERIES = {
  // User queries
  CHECK_WALLET_EXISTS: `SELECT id FROM ${TABLE_NAMES.USERS} WHERE wallet_address = ?`,
  GET_USER_BY_WALLET: `SELECT * FROM ${TABLE_NAMES.USERS} WHERE wallet_address = ?`,
  COUNT_USERS_BY_TYPE_INDIVIDUAL: `SELECT COUNT(*) as count FROM ${TABLE_NAMES.USERS} WHERE account_type = 'individual'`,
  COUNT_USERS_BY_TYPE_BUSINESS: `SELECT COUNT(*) as count FROM ${TABLE_NAMES.USERS} WHERE account_type = 'business'`,
  
  // Transfer queries
  COUNT_TRANSFERS: `SELECT COUNT(*) as count FROM ${TABLE_NAMES.TRANSFERS}`,
  
  // Referral queries
  COUNT_REFERRALS_24H: `
    SELECT COUNT(*) as count 
    FROM ${TABLE_NAMES.REFERRALS}
    WHERE referrer_wallet = ? 
      AND created_at >= datetime('now', '-24 hours')
  `,
  
  // Fingerprint queries
  CHECK_FINGERPRINT_EXISTS: `SELECT id FROM ${TABLE_NAMES.DEVICE_FINGERPRINTS} WHERE fingerprint_hash = ?`,
  
  // Global state queries
  GET_GLOBAL_STATE: `SELECT state_value, expires_at FROM ${TABLE_NAMES.GLOBAL_STATE} WHERE state_key = ?`,
  
  // EQX Price queries
  GET_LATEST_EQX_PRICE: `
    SELECT collected_at, eqx_price_usd, usd_index, source
    FROM ${TABLE_NAMES.EQX_PRICES}
    ORDER BY collected_at DESC
    LIMIT 1
  `,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a UUID v4 compatible string
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert a Date to ISO string format
 */
export function toISOString(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

/**
 * Parse an ISO string to Date
 */
export function parseISOString(str: string): Date {
  return new Date(str);
}

/**
 * Build EQX price history query with filters
 */
export function buildEqxPriceHistoryQuery(options?: {
  from?: Date;
  to?: Date;
  limit?: number;
}): { sql: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.from) {
    conditions.push('collected_at >= ?');
    params.push(toISOString(options.from));
  }

  if (options?.to) {
    conditions.push('collected_at <= ?');
    params.push(toISOString(options.to));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = options?.limit ? `LIMIT ?` : '';
  
  if (options?.limit) {
    params.push(options.limit);
  }

  const sql = `
    SELECT collected_at, eqx_price_usd, usd_index, source
    FROM ${TABLE_NAMES.EQX_PRICES}
    ${whereClause}
    ORDER BY collected_at DESC
    ${limitClause}
  `.trim();

  return { sql, params };
}
