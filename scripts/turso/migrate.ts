#!/usr/bin/env node
/**
 * EQUA Turso Migration Script
 * 
 * Applies the migrate.sql schema to a Turso database.
 * 
 * Usage:
 *   npm run db:migrate
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
  console.error('  TURSO_DATABASE_URL=libsql://your-db.turso.io npm run db:migrate');
  console.error('\nFor local development:');
  console.error('  TURSO_DATABASE_URL=libsql://127.0.0.1:8080 npm run db:migrate');
  process.exit(1);
}

// For local development, auth token is optional
if (!config.authToken && !config.databaseUrl.includes('127.0.0.1')) {
  console.warn('⚠️  Warning: TURSO_AUTH_TOKEN not set (required for remote databases)');
}

// ============================================================================
// Migration Execution
// ============================================================================

async function runMigration() {
  try {
    console.log('🔄 Starting Turso migration...');
    console.log(`📦 Database: ${config.databaseUrl}`);

    // Create Turso client
    const client = createClient({
      url: config.databaseUrl!,  // Non-null assertion is safe here due to validation above
      authToken: config.authToken || '',
    });

    // Test connection
    console.log('🔌 Testing connection...');
    await client.execute('SELECT 1');
    console.log('✅ Connection successful');

    // Read migration SQL
    const migrationPath = join(__dirname, 'migrate.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSql
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
        // Ignore "table already exists" errors
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('already exists')) {
          console.log(`  ⚠ Statement ${i + 1}/${statements.length} (table exists, skipping)`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nTables created:');
    console.log('  • registrations (tracks user registration counts by type)');
    console.log('  • transfer_totals (accumulator for total transfer count)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

runMigration();
