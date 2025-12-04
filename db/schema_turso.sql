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
-- REGISTRATION ANALYTICS TABLE
-- ============================================================================
-- Stores anonymous registration analytics with geographic data (NO PII)
-- Registration verification is done on-chain only
CREATE TABLE IF NOT EXISTS registration_analytics (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
    state TEXT,  -- User's state/province (for analytics)
    country TEXT,  -- User's country (for analytics)
    device_fingerprint TEXT,
    registration_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registration_analytics_account_type ON registration_analytics(account_type);
CREATE INDEX IF NOT EXISTS idx_registration_analytics_state ON registration_analytics(state);
CREATE INDEX IF NOT EXISTS idx_registration_analytics_country ON registration_analytics(country);
CREATE INDEX IF NOT EXISTS idx_registration_analytics_created_at ON registration_analytics(created_at);

-- ============================================================================
-- TRANSFER ANALYTICS TABLE
-- ============================================================================
-- Stores anonymous transfer statistics (NO PII - no wallet addresses)
CREATE TABLE IF NOT EXISTS transfer_analytics (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    amount NUMERIC NOT NULL,
    transaction_signature TEXT UNIQUE,  -- For deduplication only
    transfer_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfer_analytics_created_at ON transfer_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_transfer_analytics_signature ON transfer_analytics(transaction_signature);

-- ============================================================================
-- REFERRAL ANALYTICS TABLE
-- ============================================================================
-- Stores anonymous referral statistics (NO PII - no wallet addresses or codes)
CREATE TABLE IF NOT EXISTS referral_analytics (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    referral_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_analytics_created_at ON referral_analytics(created_at);

-- ============================================================================
-- DEVICE FINGERPRINTS TABLE
-- ============================================================================
-- Stores device fingerprints for Sybil prevention (NO PII)
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id TEXT PRIMARY KEY DEFAULT (
      LOWER(HEX(RANDOMBLOB(4))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(2))) || '-' ||
      LOWER(HEX(RANDOMBLOB(6)))
    ),
    fingerprint_hash TEXT NOT NULL UNIQUE,
    fingerprint_metadata JSON DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_created_at ON device_fingerprints(created_at);

-- ============================================================================
-- STATS OVERVIEW TABLE
-- ============================================================================
-- Aggregated counters used by the UI (getStatsOverview, getRegistrationStats)
-- NOTE: Registration verification is done on-chain, this is just for analytics
CREATE TABLE IF NOT EXISTS stats_overview (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_registrations INTEGER NOT NULL DEFAULT 0,  -- Anonymous count
    individual_registrations INTEGER NOT NULL DEFAULT 0,
    business_registrations INTEGER NOT NULL DEFAULT 0,
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
-- Registration analytics updated_at
CREATE TRIGGER IF NOT EXISTS trg_registration_analytics_updated_at
AFTER UPDATE ON registration_analytics
FOR EACH ROW
BEGIN
  UPDATE registration_analytics SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Global state updated_at
CREATE TRIGGER IF NOT EXISTS trg_global_state_updated_at
AFTER UPDATE ON global_state
FOR EACH ROW
BEGIN
  UPDATE global_state SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;