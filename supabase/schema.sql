-- ============================================================================
-- EQUA Frontend Supabase Schema
-- ============================================================================
-- This SQL file creates all necessary tables for the EQUA Frontend application
-- with persistent data layer for caching and analytics.
-- 
-- Features:
-- - UUID for all IDs (Supabase free tier compatible)
-- - Row Level Security (RLS) enabled
-- - JSONB for complex state data
-- - ON DELETE CASCADE for foreign keys
-- - Optimized indexes for common queries
-- ============================================================================

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- Stores registered wallet addresses and their metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'business')),
    device_fingerprint TEXT,
    referrer_wallet TEXT,
    user_number INTEGER,
    registration_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated/anon users (public stats)
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- Allow insert for anyone (registration)
CREATE POLICY "Anyone can register" ON users
    FOR INSERT WITH CHECK (true);

-- Users can only update their own record
-- Note: For wallet-based auth, you would need to implement custom JWT claims
-- or use a different auth mechanism. For now, updates are restricted.
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (false);  -- Disable updates by default for security

-- ============================================================================
-- TRANSFERS TABLE
-- Tracks EQUA token transfers between users
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_wallet TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    transaction_signature TEXT UNIQUE,
    transfer_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_signature ON transfers(transaction_signature);

-- Enable RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (for stats)
CREATE POLICY "Transfers are viewable by everyone" ON transfers
    FOR SELECT USING (true);

-- Allow insert for anyone (recording transfers)
CREATE POLICY "Anyone can record transfers" ON transfers
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- REFERRALS TABLE
-- Tracks referral relationships and events
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_wallet TEXT NOT NULL,
    referee_wallet TEXT NOT NULL UNIQUE,
    referral_code TEXT,
    reward_amount DECIMAL(20, 9) DEFAULT 0,
    is_rate_limited BOOLEAN DEFAULT false,
    referral_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Referrals are viewable by everyone" ON referrals
    FOR SELECT USING (true);

-- Allow insert for anyone
CREATE POLICY "Anyone can create referrals" ON referrals
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- REFERRAL_RATE_LIMITS TABLE
-- Tracks referral rate limiting per wallet (24-hour window)
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_wallet TEXT NOT NULL,
    referral_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    is_rate_limited BOOLEAN DEFAULT false,
    rate_limit_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_referrer ON referral_rate_limits(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON referral_rate_limits(window_start, window_end);

-- Enable RLS
ALTER TABLE referral_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Rate limits are viewable by everyone" ON referral_rate_limits
    FOR SELECT USING (true);

-- Allow insert/update for anyone
CREATE POLICY "Anyone can create rate limits" ON referral_rate_limits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rate limits" ON referral_rate_limits
    FOR UPDATE USING (true);

-- ============================================================================
-- ANALYTICS TABLE
-- Stores aggregated analytics and statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(20, 9) NOT NULL DEFAULT 0,
    metric_type TEXT NOT NULL DEFAULT 'counter' CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    dimensions JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON analytics(recorded_at);

-- Enable RLS
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Analytics are viewable by everyone" ON analytics
    FOR SELECT USING (true);

-- Allow insert for anyone
CREATE POLICY "Anyone can record analytics" ON analytics
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PRICE_HISTORY TABLE
-- Stores historical EQUA price data
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_usd DECIMAL(20, 9) NOT NULL,
    epoch_number INTEGER NOT NULL,
    phase TEXT NOT NULL,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    price_metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_epoch ON price_history(epoch_number);

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Price history is viewable by everyone" ON price_history
    FOR SELECT USING (true);

-- Allow insert for anyone
CREATE POLICY "Anyone can record price history" ON price_history
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- DEVICE_FINGERPRINTS TABLE
-- Tracks device fingerprints for Sybil prevention
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    user_agent TEXT,
    fingerprint_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fingerprints_wallet ON device_fingerprints(wallet_address);

-- Enable RLS
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Fingerprints are viewable by everyone" ON device_fingerprints
    FOR SELECT USING (true);

-- Allow insert for anyone
CREATE POLICY "Anyone can record fingerprints" ON device_fingerprints
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- GLOBAL_STATE TABLE
-- Caches global state data for frontend display
-- ============================================================================
CREATE TABLE IF NOT EXISTS global_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_key TEXT NOT NULL UNIQUE,
    state_value JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_global_state_key ON global_state(state_key);

-- Enable RLS
ALTER TABLE global_state ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Global state is viewable by everyone" ON global_state
    FOR SELECT USING (true);

-- Allow insert/update for anyone
CREATE POLICY "Anyone can update global state" ON global_state
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can modify global state" ON global_state
    FOR UPDATE USING (true);

-- ============================================================================
-- EQX_PRICES TABLE
-- Tracks EQX token price history for oracle functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS eqx_prices (
    id SERIAL PRIMARY KEY,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eqx_price_usd DECIMAL(20, 9) NOT NULL,
    usd_index DECIMAL(20, 9),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_eqx_prices_collected_at ON eqx_prices(collected_at);
CREATE INDEX IF NOT EXISTS idx_eqx_prices_source ON eqx_prices(source);

-- Enable RLS
ALTER TABLE eqx_prices ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "EQX prices are viewable by everyone" ON eqx_prices
    FOR SELECT USING (true);

-- Allow insert for anyone
CREATE POLICY "Anyone can record EQX prices" ON eqx_prices
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON referral_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_state_updated_at
    BEFORE UPDATE ON global_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AGGREGATE VIEWS
-- ============================================================================

-- View for total statistics
CREATE OR REPLACE VIEW stats_overview
WITH (security_invoker = true)
AS
SELECT 
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE account_type = 'individual') AS individual_users,
    (SELECT COUNT(*) FROM users WHERE account_type = 'business') AS business_users,
    (SELECT COUNT(*) FROM transfers) AS total_transfers,
    (SELECT COALESCE(SUM(amount), 0) FROM transfers) AS total_volume,
    (SELECT COUNT(*) FROM referrals) AS total_referrals;

-- View for recent activity
CREATE OR REPLACE VIEW recent_activity
WITH (security_invoker = true)
AS
SELECT 
    'registration' AS activity_type,
    wallet_address AS wallet,
    created_at
FROM users
UNION ALL
SELECT 
    'transfer' AS activity_type,
    sender_wallet AS wallet,
    created_at
FROM transfers
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get referral count in last 24 hours
CREATE OR REPLACE FUNCTION get_referral_count_24h(p_referrer_wallet TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM referrals
        WHERE referrer_wallet = p_referrer_wallet
        AND created_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if wallet is registered
CREATE OR REPLACE FUNCTION is_wallet_registered(p_wallet_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE wallet_address = p_wallet_address
    );
END;
$$ LANGUAGE plpgsql;

-- Function to upsert global state
CREATE OR REPLACE FUNCTION upsert_global_state(
    p_state_key TEXT,
    p_state_value JSONB,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO global_state (state_key, state_value, expires_at)
    VALUES (p_state_key, p_state_value, p_expires_at)
    ON CONFLICT (state_key) 
    DO UPDATE SET 
        state_value = p_state_value,
        expires_at = p_expires_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
