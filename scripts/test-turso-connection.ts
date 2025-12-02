#!/usr/bin/env ts-node
/**
 * Turso Database Connection Test Script
 * 
 * Tests connectivity to a Turso database and lists basic information.
 * 
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run test:turso
 *   
 * Or:
 *   ts-node --esm scripts/test-turso-connection.ts
 */

import { createClient } from '@libsql/client';

// ============================================================================
// Configuration
// ============================================================================

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// ============================================================================
// Validation
// ============================================================================

if (!TURSO_DATABASE_URL) {
  console.error('❌ Error: TURSO_DATABASE_URL environment variable is required');
  console.error('   Example: export TURSO_DATABASE_URL=libsql://your-db.turso.io');
  process.exit(1);
}

if (!TURSO_AUTH_TOKEN) {
  console.error('❌ Error: TURSO_AUTH_TOKEN environment variable is required');
  console.error('   Get your token with: turso db tokens create <db-name>');
  process.exit(1);
}

// ============================================================================
// Main Script
// ============================================================================

async function testConnection() {
  console.log('🔌 Testing Turso database connection...\n');
  console.log(`📍 Database URL: ${TURSO_DATABASE_URL}\n`);

  // Create Turso client
  const client = createClient({
    url: TURSO_DATABASE_URL!,
    authToken: TURSO_AUTH_TOKEN!,
  });

  // Test basic query
  console.log('🧪 Running test query (SELECT 1)...');
  try {
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Connection successful!');
    console.log('   Result:', result.rows[0]);
    console.log('');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }

  // List all tables
  console.log('📋 Listing all tables...');
  let tablesResult;
  try {
    tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    
    if (tablesResult.rows.length === 0) {
      console.log('   ℹ️  No tables found. Run `npm run db:sync:turso` to create tables.\n');
    } else {
      console.log(`   Found ${tablesResult.rows.length} table(s):\n`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.name}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Failed to list tables:', error);
    process.exit(1);
  }

  // Get row counts for each table
  if (tablesResult.rows.length > 0) {
    console.log('📊 Table statistics:\n');
    
    for (const row of tablesResult.rows) {
      const tableName = row.name as string;
      try {
        const countResult = await client.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0]?.count ?? 0;
        console.log(`   ${tableName.padEnd(25)} ${String(count).padStart(6)} rows`);
      } catch (error) {
        console.log(`   ${tableName.padEnd(25)} Error: ${error}`);
      }
    }
    console.log('');
  }

  // Check database version/info
  console.log('ℹ️  Database information:');
  try {
    const versionResult = await client.execute('SELECT sqlite_version() as version');
    console.log(`   SQLite version: ${versionResult.rows[0]?.version}`);
    
    const pragmaResult = await client.execute('PRAGMA compile_options');
    console.log(`   Compile options: ${pragmaResult.rows.length} options available`);
  } catch (error) {
    console.error('   Could not retrieve database info:', error);
  }

  console.log('\n✅ Connection test completed successfully!\n');
  
  if (tablesResult.rows.length === 0) {
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run db:sync:turso (to create schema)');
    console.log('   2. Set DB_PROVIDER=turso in your .env.local');
    console.log('   3. Run: npm run dev\n');
  } else {
    console.log('📝 Next steps:');
    console.log('   1. Set DB_PROVIDER=turso in your .env.local');
    console.log('   2. Run: npm run dev\n');
  }
}

// Run the test
testConnection().catch((error) => {
  console.error('💥 Unexpected error during connection test:', error);
  process.exit(1);
});
