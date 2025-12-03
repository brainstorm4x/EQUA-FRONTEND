-- ============================================================================
-- EQUA Frontend Turso (libSQL/SQLite) Schema
-- ============================================================================
-- This schema mirrors the Supabase PostgreSQL schema using SQLite-compatible types.
-- Notes:
-- - UUIDs are stored as TEXT and generated via a random blob expression.
-- - JSONB is mapped to JSON.
-- - TIMESTAMPTZ is mapped to DATETIME with CURRENT_TIMESTAMP defaults.
-- - PostgreSQL RLS/policies are not available; enforce via application logic.
-- ============================================================================

-- Helper: generate UUID-like TEXT (not strict RFC4122; adjust if needed)
-- Use LOWER HEX of randomblob(16) with hyphens. You may choose to generate UUIDs in app code instead.
CREATE TABLE IF NOT EXISTS uuid_helper (
  id TEXT PRIMARY KEY
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    wallet_address TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
    device_fingerprint TEXT,
    referrer_wallet TEXT,
    user_number INTEGER,
    registration_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================================================
-- TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    sender_wallet TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_signature TEXT UNIQUE,
    transfer_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_signature ON transfers(transaction_signature);

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    referrer_wallet TEXT NOT NULL,
    referee_wallet TEXT NOT NULL UNIQUE,
    referral_code TEXT,
    referral_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- ============================================================================
-- DEVICE FINGERPRINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    fingerprint_hash TEXT NOT NULL UNIQUE,
    wallet_address TEXT,
    fingerprint_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_wallet ON device_fingerprints(wallet_address);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_created_at ON device_fingerprints(created_at);

-- ============================================================================
-- STATS OVERVIEW TABLE
-- ============================================================================
-- Aggregated counters used by the UI (getStatsOverview, getRegistrationStats)
CREATE TABLE IF NOT EXISTS stats_overview (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_users INTEGER NOT NULL DEFAULT 0,
    individual_users INTEGER NOT NULL DEFAULT 0,
    business_users INTEGER NOT NULL DEFAULT 0,
    total_transfers INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GLOBAL STATE TABLE
-- ============================================================================
-- Key/value store for app-wide JSON state with optional expiry
CREATE TABLE IF NOT EXISTS global_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_key TEXT NOT NULL UNIQUE,
    state_value JSON NOT NULL DEFAULT '{}',
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_state_key ON global_state(state_key);
CREATE INDEX IF NOT EXISTS idx_global_state_expires ON global_state(expires_at);

-- ============================================================================
-- EQX PRICE TABLE
-- ============================================================================
-- For price history and latest price retrieval
CREATE TABLE IF NOT EXISTS eqx_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price_usd NUMERIC NOT NULL,
    usd_index NUMERIC,
    source TEXT,
    collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eqx_prices_collected_at ON eqx_prices(collected_at);

-- ============================================================================
-- TRIGGERS (updated_at management)
-- ============================================================================
-- Users updated_at
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Global state updated_at
CREATE TRIGGER IF NOT EXISTS trg_global_state_updated_at
AFTER UPDATE ON global_state
FOR EACH ROW
BEGIN
  UPDATE global_state SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;