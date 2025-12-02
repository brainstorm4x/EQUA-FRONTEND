-- ============================================================================
-- EQUA Turso Reset Script
-- ============================================================================
-- This script truncates all custom Turso tables and reseeds default values.
-- Use this to reset the database to a clean state for testing or migrations.
-- ============================================================================

-- ============================================================================
-- TRUNCATE TABLES
-- Clear all data from custom tables
-- ============================================================================

DELETE FROM registrations;
DELETE FROM transfer_totals;

-- ============================================================================
-- RESEED DEFAULT DATA
-- Initialize accumulator rows with default values
-- ============================================================================

-- Reset individual registration count to 0
INSERT INTO registrations (id, type, count, created_at, last_updated)
VALUES (
  1,
  'individual',
  0,
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'),
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')
);

-- Reset business registration count to 0
INSERT INTO registrations (id, type, count, created_at, last_updated)
VALUES (
  2,
  'business',
  0,
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'),
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')
);

-- Reset transfer totals accumulator to 0
INSERT INTO transfer_totals (id, count, created_at, last_updated)
VALUES (
  1,
  0,
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now'),
  strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now')
);

-- ============================================================================
-- RESET COMPLETE
-- ============================================================================
