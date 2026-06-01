#!/usr/bin/env node
/**
 * wipe-performance-data.mjs
 *
 * One-shot teardown of the retired UNX/performance pipeline. After 2026-06-01
 * UNIYAA is priced in USD directly from the on-chain transaction counter —
 * the off-chain UNX writer + daily aggregator + performance tables no longer
 * exist in the codebase, and the data they wrote is now orphaned.
 *
 * This script DROPS the orphaned Turso tables (so they don't appear in
 * subsequent backups / observability) and DELETES every blob in the
 * orphaned Netlify Blobs store. It is idempotent: re-running on an
 * already-cleaned store is a no-op.
 *
 *   Turso tables dropped:
 *     - unx_price_snapshots     (hourly UNX snapshots — writer deleted)
 *     - unx_daily_performance   (daily UNX rollups — writer deleted)
 *
 *   Netlify Blobs stores wiped:
 *     - unx-prices              (hourly snapshot blobs keyed by YYYY-MM-DD-HH)
 *
 * Explicitly LEAVES UNTOUCHED:
 *   - fx-rates blob store (still in use for multi-currency display)
 *   - Any other Turso tables / Blobs stores
 *   - On-chain `unx_oracle` PDA (sits as dead state until next contract upgrade)
 *
 * USAGE:
 *
 *   # 1. Dry-run (default) — shows what WOULD be touched, touches nothing.
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *   NETLIFY_SITE_ID=... NETLIFY_ACCESS_TOKEN=... \
 *     node scripts/wipe-performance-data.mjs
 *
 *   # 2. Actually drop + delete (requires --confirm).
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *   NETLIFY_SITE_ID=... NETLIFY_ACCESS_TOKEN=... \
 *     node scripts/wipe-performance-data.mjs --confirm
 *
 * The script never reads credentials from .env files — pass them explicitly
 * so you can't accidentally wipe a prod store while debugging locally.
 */

import { createClient } from '@libsql/client';
import { getStore } from '@netlify/blobs';

const CONFIRM = process.argv.includes('--confirm');

// Each entry is a hard-coded identifier matching /^[a-z_]+$/ — never user input.
const TURSO_TABLES_TO_DROP = [
  'unx_price_snapshots',
  'unx_daily_performance',
];

const BLOB_STORES_TO_WIPE = [
  'unx-prices',
];

// Defence-in-depth: reject any sneaked-in non-identifier table name before
// we interpolate into SQL.
for (const name of TURSO_TABLES_TO_DROP) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Refusing to operate on suspicious table name: ${name}`);
  }
}

// ----------------------------------------------------------------------------
// Pretty banner
// ----------------------------------------------------------------------------
console.log('');
console.log('================================================================');
console.log('  WIPE PERFORMANCE DATA');
console.log('  Mode:', CONFIRM ? '\x1b[31mLIVE — WILL DELETE\x1b[0m' : '\x1b[33mDRY RUN — read only\x1b[0m');
console.log('================================================================');
console.log('');

// ----------------------------------------------------------------------------
// Credential check
// ----------------------------------------------------------------------------
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuth = process.env.TURSO_AUTH_TOKEN;
const netlifySite = process.env.NETLIFY_SITE_ID;
const netlifyToken = process.env.NETLIFY_ACCESS_TOKEN;

if (!tursoUrl || !tursoAuth) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set.');
  console.error('       Get these from Netlify env (Site Settings → Environment Variables)');
  console.error('       or your Turso dashboard.');
  process.exit(2);
}
if (!netlifySite || !netlifyToken) {
  console.error('ERROR: NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN must be set.');
  console.error('       SITE_ID: Netlify Dashboard → Site Settings → General → API ID');
  console.error('       ACCESS_TOKEN: https://app.netlify.com/user/applications (Personal access tokens)');
  process.exit(2);
}

console.log('Turso URL:        ', maskUrl(tursoUrl));
console.log('Netlify Site ID:  ', netlifySite);
console.log('');

// ----------------------------------------------------------------------------
// Turso: inspect + wipe
// ----------------------------------------------------------------------------
const turso = createClient({ url: tursoUrl, authToken: tursoAuth });

console.log('--- Turso ---------------------------------------------------------');
for (const table of TURSO_TABLES_TO_DROP) {
  let count = 0;
  let exists = true;
  try {
    const res = await turso.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    count = Number(res.rows[0]?.n ?? 0);
  } catch (err) {
    exists = false;
    console.log(`  ${table.padEnd(28)} (already gone or unreadable: ${shortErr(err)})`);
    continue;
  }
  console.log(`  ${table.padEnd(28)} ${count} rows`);

  if (CONFIRM && exists) {
    await turso.execute(`DROP TABLE IF EXISTS ${table}`);
    console.log(`    \x1b[31m→ DROP TABLE\x1b[0m  (${count} rows discarded)`);
  } else if (!CONFIRM) {
    console.log(`    → would DROP TABLE (discards ${count} rows + schema)`);
  }
}

// ----------------------------------------------------------------------------
// Netlify Blobs: inspect + wipe
// ----------------------------------------------------------------------------
console.log('');
console.log('--- Netlify Blobs -------------------------------------------------');
for (const storeName of BLOB_STORES_TO_WIPE) {
  let store;
  try {
    store = getStore({ name: storeName, siteID: netlifySite, token: netlifyToken });
  } catch (err) {
    console.log(`  ${storeName.padEnd(20)} (could not open: ${shortErr(err)})`);
    continue;
  }

  let keys = [];
  try {
    const list = await store.list();
    keys = (list.blobs ?? []).map((b) => b.key);
  } catch (err) {
    console.log(`  ${storeName.padEnd(20)} (list failed: ${shortErr(err)})`);
    continue;
  }
  console.log(`  ${storeName.padEnd(20)} ${keys.length} blobs`);

  if (CONFIRM && keys.length > 0) {
    let deleted = 0, errored = 0;
    for (const key of keys) {
      try {
        await store.delete(key);
        deleted++;
      } catch (err) {
        errored++;
        if (errored <= 3) console.log(`    ! delete ${key} failed: ${shortErr(err)}`);
      }
    }
    console.log(`    \x1b[31m→ deleted ${deleted}\x1b[0m${errored ? ` (${errored} errors)` : ''}`);
  } else if (CONFIRM) {
    console.log(`    → nothing to delete`);
  } else {
    console.log(`    → would delete all ${keys.length} blobs`);
    if (keys.length > 0) {
      const sample = keys.slice(0, 3);
      console.log(`    sample keys: ${sample.join(', ')}${keys.length > 3 ? ', …' : ''}`);
    }
  }
}

// ----------------------------------------------------------------------------
// Footer
// ----------------------------------------------------------------------------
console.log('');
console.log('================================================================');
if (CONFIRM) {
  console.log('  Wipe complete. Next hourly tick of update-unx-price will');
  console.log('  bootstrap fresh data (and snapshot-daily-performance the');
  console.log('  next daily roll-up).');
} else {
  console.log('  DRY RUN. Re-run with --confirm to actually delete.');
}
console.log('================================================================');

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function maskUrl(u) {
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return '<unparseable>';
  }
}

function shortErr(err) {
  const m = err instanceof Error ? err.message : String(err);
  return m.length > 120 ? m.slice(0, 117) + '...' : m;
}
