-- ============================================================================
-- EQUA Frontend Turso Database Setup Script
-- ============================================================================
-- This SQL file creates all necessary tables and functions for the EQUA 
-- Frontend application compatible with Turso (libSQL) database.
-- 
-- Run this script in your Turso database using:
--   turso db shell <your-db-name> < scripts/turso/turso-setup.sql
-- 
-- Or for local development:
--   turso dev --db-file equa-local.db
--   sqlite3 equa-local.db < scripts/turso/turso-setup.sql
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- Stores registered wallet addresses and their metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    wallet_address TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
    device_fingerprint TEXT,
    referrer_wallet TEXT,
    user_number INTEGER,
    registration_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================================================
-- TRANSFERS TABLE
-- Tracks EQUA token transfers between users
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    sender_wallet TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_signature TEXT UNIQUE,
    transfer_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_signature ON transfers(transaction_signature);

-- ============================================================================
-- REFERRALS TABLE
-- Tracks referral relationships and events
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    referrer_wallet TEXT NOT NULL,
    referee_wallet TEXT NOT NULL UNIQUE,
    referral_code TEXT,
    reward_amount REAL DEFAULT 0,
    is_rate_limited INTEGER DEFAULT 0,
    referral_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- ============================================================================
-- REFERRAL_RATE_LIMITS TABLE
-- Tracks referral rate limiting per wallet (24-hour window)
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_rate_limits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    referrer_wallet TEXT NOT NULL,
    referral_count INTEGER NOT NULL DEFAULT 1,
    window_start TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    window_end TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', datetime('now', '+24 hours'))),
    is_rate_limited INTEGER DEFAULT 0,
    rate_limit_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_referrer ON referral_rate_limits(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON referral_rate_limits(window_start, window_end);

-- ============================================================================
-- ANALYTICS TABLE
-- Stores aggregated analytics and statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL DEFAULT 0,
    metric_type TEXT NOT NULL DEFAULT 'counter' CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    dimensions TEXT DEFAULT '{}',
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON analytics(recorded_at);

-- ============================================================================
-- PRICE_HISTORY TABLE
-- Stores historical EQUA price data
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    price_usd REAL NOT NULL,
    epoch_number INTEGER NOT NULL,
    phase TEXT NOT NULL,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    price_metadata TEXT DEFAULT '{}',
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_epoch ON price_history(epoch_number);

-- ============================================================================
-- DEVICE_FINGERPRINTS TABLE
-- Tracks device fingerprints for Sybil prevention
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    fingerprint_hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    user_agent TEXT,
    fingerprint_metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fingerprints_wallet ON device_fingerprints(wallet_address);

-- ============================================================================
-- GLOBAL_STATE TABLE
-- Caches global state data for frontend display
-- ============================================================================
CREATE TABLE IF NOT EXISTS global_state (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    state_key TEXT NOT NULL UNIQUE,
    state_value TEXT NOT NULL DEFAULT '{}',
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_global_state_key ON global_state(state_key);

-- ============================================================================
-- EQX_PRICES TABLE
-- Tracks EQX token price history for oracle functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS eqx_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    eqx_price_usd REAL NOT NULL,
    usd_index REAL,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_eqx_prices_collected_at ON eqx_prices(collected_at);
CREATE INDEX IF NOT EXISTS idx_eqx_prices_source ON eqx_prices(source);

-- ============================================================================
-- REGISTRATIONS TABLE (for accumulator pattern)
-- Tracks user registrations by type (individual or business)
-- ============================================================================
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('individual', 'business')),
    count INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_registrations_type ON registrations(type);

-- ============================================================================
-- TRANSFER_TOTALS TABLE (for accumulator pattern)
-- Accumulator table for total transfer count across the platform
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfer_totals (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    count INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'))
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transfer_totals_updated ON transfer_totals(last_updated);

-- ============================================================================
-- TRIGGERS
-- Auto-update updated_at columns (SQLite/Turso requires separate triggers)
-- ============================================================================

-- Update users.updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = NEW.id;
END;

-- Update referral_rate_limits.updated_at
CREATE TRIGGER IF NOT EXISTS update_rate_limits_updated_at 
    AFTER UPDATE ON referral_rate_limits
    FOR EACH ROW
BEGIN
    UPDATE referral_rate_limits SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = NEW.id;
END;

-- Update global_state.updated_at
CREATE TRIGGER IF NOT EXISTS update_global_state_updated_at 
    AFTER UPDATE ON global_state
    FOR EACH ROW
BEGIN
    UPDATE global_state SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = NEW.id;
END;

-- ============================================================================
-- SEED DEFAULT DATA
-- Initialize accumulator rows if they don't exist
-- ============================================================================

-- Seed individual registration count (default: 0)
INSERT OR IGNORE INTO registrations (id, type, count)
VALUES (1, 'individual', 0);

-- Seed business registration count (default: 0)
INSERT OR IGNORE INTO registrations (id, type, count)
VALUES (2, 'business', 0);

-- Seed transfer totals accumulator (default: 0)
INSERT OR IGNORE INTO transfer_totals (id, count)
VALUES (1, 0);

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Verify tables were created
SELECT 'Setup complete! Created tables:' AS status;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
