#!/usr/bin/env node
/**
 * EQUA Turso Reset Script
 * 
 * Resets the Turso database by truncating tables and reseeding default values.
 * 
 * Usage:
 *   npm run db:reset
 * 
 * Environment Variables:
 *   TURSO_DATABASE_URL - Turso database URL (required)
 *   TURSO_AUTH_TOKEN - Turso authentication token (optional for local dev)
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const config = {
  databaseUrl: process.env.TURSO_DATABASE_URL || process.env.NEXT_PUBLIC_TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN,
};

// ============================================================================
// Validation
// ============================================================================

if (!config.databaseUrl) {
  console.error('❌ Error: TURSO_DATABASE_URL environment variable is required');
  console.error('\nSet it in your .env.local file or pass it directly:');
  console.error('  TURSO_DATABASE_URL=libsql://your-db.turso.io npm run db:reset');
  console.error('\nFor local development:');
  console.error('  TURSO_DATABASE_URL=libsql://127.0.0.1:8080 npm run db:reset');
  process.exit(1);
}

// For local development, auth token is optional
if (!config.authToken && !config.databaseUrl.includes('127.0.0.1')) {
  console.warn('⚠️  Warning: TURSO_AUTH_TOKEN not set (required for remote databases)');
}

// ============================================================================
// Reset Execution
// ============================================================================

async function runReset() {
  try {
    console.log('🔄 Starting Turso database reset...');
    console.log(`📦 Database: ${config.databaseUrl}`);
    console.log('');
    console.warn('⚠️  WARNING: This will delete all data from registrations and transfer_totals tables!');
    console.log('');

    // Create Turso client
    const client = createClient({
      url: config.databaseUrl!,  // Non-null assertion is safe here due to validation above
      authToken: config.authToken || '',
    });

    // Test connection
    console.log('🔌 Testing connection...');
    await client.execute('SELECT 1');
    console.log('✅ Connection successful');

    // Read reset SQL
    const resetPath = join(__dirname, 'reset.sql');
    console.log(`📄 Reading reset script: ${resetPath}`);
    const resetSql = readFileSync(resetPath, 'utf-8');

    // Split SQL into individual statements (simple split by semicolon)
    const statements = resetSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.execute(stmt + ';');
        console.log(`  ✓ Statement ${i + 1}/${statements.length}`);
      } catch (error) {
        console.error(`  ✗ Statement ${i + 1}/${statements.length} failed:`, error);
        throw error;
      }
    }

    console.log('');
    console.log('✅ Database reset completed successfully!');
    console.log('');
    console.log('Reset tables:');
    console.log('  • registrations (reset to 0 individuals, 0 businesses)');
    console.log('  • transfer_totals (reset to 0 transfers)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

runReset();
