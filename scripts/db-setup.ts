#!/usr/bin/env node
/**
 * EQUA Database Setup Script
 * 
 * Initializes the local SQLite database with the schema.
 * Run with: pnpm db:setup or npm run db:setup
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require('better-sqlite3');

// Configuration
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, 'equa.sqlite');
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

console.log('='.repeat(60));
console.log('EQUA Database Setup');
console.log('='.repeat(60));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating data directory: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check if schema file exists
if (!fs.existsSync(SCHEMA_PATH)) {
  console.error(`Schema file not found: ${SCHEMA_PATH}`);
  process.exit(1);
}

// Read schema
console.log(`Reading schema from: ${SCHEMA_PATH}`);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

// Open/create database
console.log(`Opening database: ${DB_PATH}`);
const db = new BetterSqlite3(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Split schema into statements and execute
console.log('Applying schema...');
const statements = schema
  .split(';')
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 0 && !s.startsWith('--'));

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const stmt of statements) {
  try {
    db.exec(stmt);
    successCount++;
  } catch (error: unknown) {
    const errMsg = String(error);
    // Ignore "already exists" errors - these are expected on re-runs
    if (errMsg.includes('already exists')) {
      skipCount++;
    } else {
      console.error('Schema error:', error);
      errorCount++;
    }
  }
}

// Verify tables were created
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all() as { name: string }[];

console.log('\nDatabase tables:');
tables.forEach((t) => console.log(`  - ${t.name}`));

// Show some stats
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
const transferCount = db.prepare('SELECT COUNT(*) as count FROM transfers').get() as { count: number };
const priceCount = db.prepare('SELECT COUNT(*) as count FROM eqx_prices').get() as { count: number };

console.log('\nCurrent data:');
console.log(`  - Users: ${userCount.count}`);
console.log(`  - Transfers: ${transferCount.count}`);
console.log(`  - EQX Prices: ${priceCount.count}`);

// Close database
db.close();

console.log('\n' + '='.repeat(60));
console.log('Setup complete!');
console.log(`  Statements executed: ${successCount}`);
console.log(`  Statements skipped (already exist): ${skipCount}`);
if (errorCount > 0) {
  console.log(`  Errors: ${errorCount}`);
}
console.log('='.repeat(60));

// Add helpful next steps
console.log('\nNext steps:');
console.log('  1. Set DB_PROVIDER=sqlite in your .env.local');
console.log('  2. Run `npm run dev` to start the development server');
console.log('  3. The app will now use local SQLite instead of Supabase');
