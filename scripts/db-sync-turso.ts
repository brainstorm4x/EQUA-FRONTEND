#!/usr/bin/env ts-node
/**
 * Turso Database Schema Synchronization Script
 * 
 * This script reads the SQLite schema from db/schema.sql and applies it to a Turso database.
 * It handles schema creation, table creation, and index creation.
 * 
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:sync:turso
 *   
 * Or with explicit parameters:
 *   ts-node --esm scripts/db-sync-turso.ts
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

// ============================================================================
// Validation
// ============================================================================

if (!TURSO_DATABASE_URL) {
  console.error('❌ Error: Database URL is required but not configured');
  console.error('   Set TURSO_DATABASE_URL environment variable');
  console.error('   Example: export TURSO_DATABASE_URL=libsql://your-database.turso.io');
  process.exit(1);
}

if (!TURSO_AUTH_TOKEN) {
  console.error('❌ Error: Authentication token is required but not configured');
  console.error('   Set TURSO_AUTH_TOKEN environment variable');
  console.error('   Generate token with: turso db tokens create <database-name>');
  process.exit(1);
}

if (!fs.existsSync(SCHEMA_PATH)) {
  console.error(`❌ Error: Schema file not found at ${SCHEMA_PATH}`);
  process.exit(1);
}

// ============================================================================
// Main Script
// ============================================================================

async function syncSchema() {
  console.log('🚀 Starting Turso schema synchronization...\n');
  console.log(`📍 Database URL: ${TURSO_DATABASE_URL}`);
  console.log(`📄 Schema file: ${SCHEMA_PATH}\n`);

  // Create Turso client
  const client = createClient({
    url: TURSO_DATABASE_URL!,
    authToken: TURSO_AUTH_TOKEN!,
  });

  // Test connection
  console.log('🔌 Testing database connection...');
  try {
    await client.execute('SELECT 1');
    console.log('✅ Connection successful\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Read schema file
  console.log('📖 Reading schema file...');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  console.log('✅ Schema file loaded\n');

  // Parse and execute statements
  console.log('⚙️  Executing schema statements...\n');
  
  // Split by semicolon and filter out comments and empty lines
  const statements = schema
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => {
      if (!stmt) return false;
      // Remove single-line comments
      const lines = stmt.split('\n').filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      });
      return lines.length > 0;
    });

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Extract statement type for better logging
    const stmtType = stmt.split(/\s+/)[0].toUpperCase();
    const stmtPreview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    
    try {
      await client.execute(stmt);
      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] ${stmtType}: ${stmtPreview}...`);
    } catch (error) {
      const errorMsg = String(error);
      
      // Check if it's an "already exists" error - these are OK
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        skipCount++;
        console.log(`⏭️  [${i + 1}/${statements.length}] ${stmtType} (already exists): ${stmtPreview}...`);
      } else {
        errorCount++;
        console.error(`❌ [${i + 1}/${statements.length}] ${stmtType} failed: ${stmtPreview}...`);
        console.error(`   Error: ${errorMsg}\n`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Schema Synchronization Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total statements: ${statements.length}`);
  console.log('='.repeat(60) + '\n');

  // Verify tables were created
  console.log('🔍 Verifying tables...\n');
  
  const expectedTables = [
    'users',
    'transfers',
    'referrals',
    'referral_rate_limits',
    'analytics',
    'price_history',
    'device_fingerprints',
    'global_state',
    'eqx_prices',
  ];

  let allTablesExist = true;
  for (const table of expectedTables) {
    try {
      const result = await client.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        args: [table],
      });
      
      if (result.rows.length > 0) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.error(`❌ Table '${table}' not found`);
        allTablesExist = false;
      }
    } catch (error) {
      console.error(`❌ Error checking table '${table}':`, error);
      allTablesExist = false;
    }
  }

  console.log('');
  
  if (allTablesExist && errorCount === 0) {
    console.log('🎉 Schema synchronization completed successfully!');
    console.log('✅ All tables verified and ready to use\n');
    console.log('📝 Next steps:');
    console.log('   1. Set DB_PROVIDER=turso in your .env.local');
    console.log('   2. Run: npm run dev');
    process.exit(0);
  } else if (errorCount === 0) {
    console.log('⚠️  Schema synchronization completed with warnings');
    console.log('   Some tables may not have been created. Please check logs above.\n');
    process.exit(0);
  } else {
    console.error('❌ Schema synchronization completed with errors');
    console.error('   Please review the errors above and fix them before proceeding.\n');
    process.exit(1);
  }
}

// Run the sync
syncSchema().catch((error) => {
  console.error('💥 Unexpected error during schema sync:', error);
  process.exit(1);
});
