-- ============================================================================
-- EQUA Turso Migration Script
-- ============================================================================
-- This script creates tables for registrations and transfer totals tracking.
-- Compatible with libSQL/Turso database.
-- ============================================================================

-- ============================================================================
-- REGISTRATIONS TABLE
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
-- TRANSFER_TOTALS TABLE
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
-- MIGRATION COMPLETE
-- ============================================================================
