/**
 * Backfill historical `unx_price_snapshots` rows that were silently written
 * with the hardcoded FALLBACK_PRICES literals before per-component carry
 * forward was introduced.
 *
 * Detection rule (intentionally strict, so it produces zero false positives):
 *   a row is treated as a "phantom" carry-forward if EVERY non-USDUSD
 *   component column exactly matches the FALLBACK_PRICES constant to 8
 *   decimals. Real Hermes prints never match those literals to that
 *   precision, so this only flags rows that were 100% fabricated by the
 *   old fallback path.
 *
 * Effect on flagged rows:
 *   - `is_carried_forward = 1`
 *   - `stale_components` = JSON array of every non-USD component key
 *
 * The script is idempotent: running it twice is a no-op (it skips rows that
 * are already flagged). Run with:
 *
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *     npx ts-node scripts/backfill-carried-snapshots.ts [--dry-run]
 */

import { createClient } from '@libsql/client';
import { FALLBACK_PRICES, ComponentKey } from '../netlify/functions/lib/pythPrices';

const TOLERANCE = 1e-8;

interface PhantomRow {
  id: number;
  timestamp: number;
  recordedAt: string;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    process.exit(2);
  }

  const client = createClient({ url, authToken });

  // Skip rows that are already flagged so the script is safe to re-run.
  const result = await client.execute(`
    SELECT
      id, timestamp, recorded_at,
      comp_usdeur, comp_usdcny, comp_usdjpy, comp_usdgbp,
      comp_xauusd, comp_xagusd, comp_xcuusd,
      comp_oilwti, comp_oilbrent
    FROM unx_price_snapshots
    WHERE is_carried_forward = 0 OR is_carried_forward IS NULL
    ORDER BY timestamp ASC
  `);

  // Non-USD basket components and the FALLBACK_PRICES literal each was
  // historically substituted with by the pre-carry-forward writer. Mapping
  // ComponentKey → SQL column → fallback value lets the comparison stay
  // explicit and the stale_components label use the canonical key names.
  const phantomChecks: Array<{
    key: ComponentKey;
    column: string;
    expected: number;
  }> = [
    { key: 'EURUSD',   column: 'comp_usdeur',   expected: FALLBACK_PRICES.EURUSD },
    { key: 'CNHUSD',   column: 'comp_usdcny',   expected: FALLBACK_PRICES.CNHUSD },
    { key: 'JPYUSD',   column: 'comp_usdjpy',   expected: FALLBACK_PRICES.JPYUSD },
    { key: 'GBPUSD',   column: 'comp_usdgbp',   expected: FALLBACK_PRICES.GBPUSD },
    { key: 'XAUUSD',   column: 'comp_xauusd',   expected: FALLBACK_PRICES.XAUUSD },
    { key: 'XAGUSD',   column: 'comp_xagusd',   expected: FALLBACK_PRICES.XAGUSD },
    { key: 'XCUUSD',   column: 'comp_xcuusd',   expected: FALLBACK_PRICES.XCUUSD },
    { key: 'OILWTI',   column: 'comp_oilwti',   expected: FALLBACK_PRICES.OILWTI },
    { key: 'OILBRENT', column: 'comp_oilbrent', expected: FALLBACK_PRICES.OILBRENT },
  ];
  const allKeys = phantomChecks.map((c) => c.key);

  const phantoms: PhantomRow[] = [];

  for (const row of result.rows) {
    const r = row as Record<string, unknown>;

    let allMatch = true;
    for (const { column, expected } of phantomChecks) {
      const value = r[column];
      if (typeof value !== 'number' || Math.abs(value - expected) > TOLERANCE) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      phantoms.push({
        id: r['id'] as number,
        timestamp: r['timestamp'] as number,
        recordedAt: r['recorded_at'] as string,
      });
    }
  }

  console.log(
    `Scanned ${result.rows.length} unflagged rows; found ${phantoms.length} phantoms ` +
    `(all non-USD components exactly match FALLBACK_PRICES literals).`,
  );

  if (phantoms.length > 0) {
    const first = phantoms[0];
    const last = phantoms[phantoms.length - 1];
    console.log(`  First: id=${first.id} timestamp=${first.recordedAt}`);
    console.log(`  Last:  id=${last.id}  timestamp=${last.recordedAt}`);
  }

  if (dryRun) {
    console.log('--dry-run: skipping writes.');
    return;
  }

  if (phantoms.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const staleJson = JSON.stringify(allKeys);

  // Update one row at a time. libSQL handles per-row transactions; bulk
  // updates here are not worth the complexity since this only ever runs once
  // per cluster and the row count is bounded by the snapshot retention.
  let updated = 0;
  for (const p of phantoms) {
    await client.execute({
      sql: `
        UPDATE unx_price_snapshots
        SET is_carried_forward = 1,
            stale_components = ?
        WHERE id = ?
      `,
      args: [staleJson, p.id],
    });
    updated++;
  }

  console.log(`✓ Updated ${updated} phantom rows.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
