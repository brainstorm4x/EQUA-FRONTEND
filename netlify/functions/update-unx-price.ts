/**
 * Netlify Scheduled Function: Update UNX Price Oracle
 * 
 * Schedule: Hourly (0 * * * *)
 * 
 * Tasks:
 * 1. Fetch component prices from Pyth Hermes API
 * 2. Calculate weighted UNX basket price
 * 3. Update on-chain UNX Oracle PDA
 * 4. Store price snapshot in Netlify Blobs
 * 5. Write UNX snapshot to Turso for long-term performance tracking
 */

import { Handler } from '@netlify/functions';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import crypto from 'crypto';
import {
  fetchComponentReadings,
  componentPricesToArray,
  ComponentPrices,
  ComponentKey,
  ComponentReadings,
  COMPONENT_KEYS,
  FALLBACK_PRICES,
} from './lib/pythPrices';
import {
  getUnxOraclePda,
  floatToFixed,
  calculateBasketPrice,
  BASKET_COMPONENTS,
  PRECISION,
  validateHash
} from './lib/unxOracle';
import { storeUnxPrice, getLatestFxRates, UnxPriceSnapshot } from './lib/blobStorage';
import { UniyaaToken } from './lib/uniyaa_token';
import idl from './lib/uniyaa_token.json';
import {
  storeUnxSnapshotToTurso,
  SEND_MODAL_CURRENCIES,
  computeUsdInflationIndexAsync,
  getLatestComponentBaseline,
} from './lib/tursoStorage';

// ============================================================================
// Environment Variable Validation (runs at module load time)
// ============================================================================

/**
 * Validate required environment variables at startup
 * Throws immediately if any are missing, preventing silent deployment failures
 */
function validateEnvironment(): void {
  const required = [
    'SOLANA_WALLET_PRIVATE_KEY',
    'SOLANA_RPC_ENDPOINT',
    'NEXT_PUBLIC_PROGRAM_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please configure these in Netlify dashboard before deployment.`
    );
  }
  
  console.log('✓ Environment variables validated');
}

// Run validation at module load time
validateEnvironment();

// ============================================================================
// Configuration
// ============================================================================

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get wallet keypair from environment variable
 */
function getWalletKeypair(): Keypair {
  const privateKeyBase58 = process.env.SOLANA_WALLET_PRIVATE_KEY;
  
  if (!privateKeyBase58) {
    throw new Error('SOLANA_WALLET_PRIVATE_KEY environment variable not set');
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to decode wallet private key: ${error}`);
  }
}

/**
 * Calculate SHA-256 hash of component prices
 */
function hashComponentPrices(prices: number[]): string {
  const pricesString = prices.map(p => p.toFixed(8)).join(',');
  return crypto.createHash('sha256').update(pricesString).digest('hex');
}

/**
 * Calculate SHA-256 hash of basket weights
 */
function hashWeights(): string {
  const weightsString = BASKET_COMPONENTS.map(c => c.weight.toFixed(2)).join(',');
  return crypto.createHash('sha256').update(weightsString).digest('hex');
}

/**
 * Maximum fraction of basket weight that can be carry-forwarded before the
 * snapshot is tagged as `source: 'fallback'`. Anything below this still
 * carries forward but is tagged `'hermes'` because the basket price is
 * substantially live. `staleComponents` always lists the specific carry-
 * forwarded feeds regardless of the source label.
 */
const FALLBACK_WEIGHT_THRESHOLD = 0.10;

/**
 * Look up a component's basket weight from its ComponentKey. Relies on
 * COMPONENT_KEYS order matching the BasketComponent enum slot order
 * (verified at module load time).
 */
function weightOf(key: ComponentKey): number {
  const idx = COMPONENT_KEYS.indexOf(key);
  return idx >= 0 ? BASKET_COMPONENTS[idx].weight : 0;
}

/**
 * Resolve final component prices for this hour's snapshot.
 *
 * For each component:
 *   - if Hermes returned a fresh reading, use it;
 *   - otherwise carry forward the most recent known-fresh value from Turso;
 *   - if Turso is empty (first-ever deploy), fall back to FALLBACK_PRICES.
 *
 * Source labeling (weight-aware as of 2026-06-01):
 *   - `'hermes'`  when no carry-forward happened, OR when carry-forwarded
 *                 weight is below FALLBACK_WEIGHT_THRESHOLD (i.e. the basket
 *                 price is substantially live). This handles the case where
 *                 only the retired XCU slot (weight 0) or a small feed is
 *                 missing.
 *   - `'fallback'` when carry-forwarded weight exceeds the threshold. The
 *                  basket is materially stale in this case.
 *   - `staleComponents` is the per-feed truth and is populated regardless of
 *     the snapshot-level label.
 */
async function resolveComponentPrices(
  readings: ComponentReadings,
  missingKeys: ComponentKey[],
): Promise<{
  componentPrices: ComponentPrices;
  staleComponents: ComponentKey[];
  source: 'hermes' | 'fallback';
  baselineAgeMs: number | null;
}> {
  // Fast path: everything is fresh.
  if (missingKeys.length === 0) {
    return {
      componentPrices: extractFreshPrices(readings),
      staleComponents: [],
      source: 'hermes',
      baselineAgeMs: null,
    };
  }

  // Try to fetch the latest baseline from Turso.
  let baseline = null;
  try {
    baseline = await getLatestComponentBaseline();
  } catch (err) {
    console.warn(
      'Could not load component baseline from Turso for carry-forward; ' +
      'falling back to FALLBACK_PRICES for missing components:',
      err instanceof Error ? err.message : String(err),
    );
  }

  const composed: ComponentPrices = extractFreshPrices(readings);
  const now = Date.now();
  let oldestCarriedAt: number | null = null;

  for (const key of missingKeys) {
    let carriedValue: number | null = null;
    let carriedAt: number | null = null;

    if (baseline) {
      const v = baseline.prices[key];
      if (typeof v === 'number' && isFinite(v)) {
        carriedValue = v;
        carriedAt = baseline.freshAt[key];
      }
    }

    if (carriedValue == null) {
      carriedValue = FALLBACK_PRICES[key];
      console.warn(
        `Component ${key} has no carry-forward source (Turso empty or column NULL); ` +
        `using FALLBACK_PRICES literal ${carriedValue}. This is expected on first-ever deploy only.`,
      );
    }

    composed[key] = carriedValue;
    if (carriedAt != null && (oldestCarriedAt == null || carriedAt < oldestCarriedAt)) {
      oldestCarriedAt = carriedAt;
    }
  }

  const missingWeight = missingKeys.reduce((sum, k) => sum + weightOf(k), 0);
  const source: 'hermes' | 'fallback' =
    missingWeight < FALLBACK_WEIGHT_THRESHOLD ? 'hermes' : 'fallback';

  return {
    componentPrices: composed,
    staleComponents: [...missingKeys],
    source,
    baselineAgeMs: oldestCarriedAt != null ? now - oldestCarriedAt : null,
  };
}

/**
 * Pull just the numeric value out of each reading. Missing readings get a
 * harmless 0 here — the caller is expected to overwrite them via carry-forward
 * before using the result. Kept as a separate step so the carry-forward pass
 * has a single uniform target structure to mutate.
 */
function extractFreshPrices(readings: ComponentReadings): ComponentPrices {
  return {
    USDUSD: readings.USDUSD.value ?? 0,
    EURUSD: readings.EURUSD.value ?? 0,
    CNHUSD: readings.CNHUSD.value ?? 0,
    JPYUSD: readings.JPYUSD.value ?? 0,
    GBPUSD: readings.GBPUSD.value ?? 0,
    XAUUSD: readings.XAUUSD.value ?? 0,
    XAGUSD: readings.XAGUSD.value ?? 0,
    XCUUSD: readings.XCUUSD.value ?? 0,
    OILWTI: readings.OILWTI.value ?? 0,
    OILBRENT: readings.OILBRENT.value ?? 0,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('Starting UNX price oracle update...');
  
  try {
    // 1. Fetch per-component readings from Pyth Hermes.
    //    Each reading is independently graded as 'hermes' (fresh + in-confidence)
    //    or 'missing' (stale, low-confidence, parse-failed, or HTTP failure).
    console.log('Fetching component readings from Pyth Hermes API...');
    const readings = await fetchComponentReadings();

    const missingKeys: ComponentKey[] = COMPONENT_KEYS.filter(
      (k) => readings[k].status === 'missing',
    );

    // 2. Resolve final component prices via carry-forward.
    //    Fresh components keep their Hermes value. Missing ones inherit the
    //    most recently *known-fresh-for-that-component* value from Turso. If
    //    Turso is empty (first-ever deploy) we fall back to FALLBACK_PRICES
    //    so the system can bootstrap — that single path is explicit and
    //    logged, never silent substitution.
    const { componentPrices, staleComponents, source, baselineAgeMs } =
      await resolveComponentPrices(readings, missingKeys);

    if (staleComponents.length > 0) {
      console.warn(
        `Carry-forward write: ${staleComponents.length}/${COMPONENT_KEYS.length} ` +
        `components stale [${staleComponents.join(', ')}]; reusing prior values ` +
        `(baseline age ~${Math.round((baselineAgeMs ?? 0) / 60000)} min). ` +
        `Reasons: ${staleComponents.map((k) => `${k}=${readings[k].reason ?? 'unknown'}`).join(', ')}`,
      );
    } else {
      console.log(`✓ All ${COMPONENT_KEYS.length} components fresh from Hermes`);
    }

    const componentPricesArray = componentPricesToArray(componentPrices);

    // 3. Calculate basket price from the resolved component mix.
    const basketPrice = calculateBasketPrice(componentPricesArray);
    const basketPriceFixed = floatToFixed(basketPrice);

    console.log(`Calculated basket price: ${basketPrice} USD (${basketPriceFixed} fixed-point)`);

    // 4. Update on-chain oracle
    console.log('Updating on-chain UNX Oracle...');
    
    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
    const wallet = getWalletKeypair();
    
    // Create provider
    const provider = new AnchorProvider(
      connection,
      new Wallet(wallet),
      { commitment: 'confirmed' }
    );
    
    // Load program
    const program = new Program<UniyaaToken>(
      idl as any,
      provider
    );
    
    // Get oracle PDA
    const [oraclePda] = getUnxOraclePda(PROGRAM_ID);
    console.log('Oracle PDA:', oraclePda.toString());
    
    // Calculate hashes
    const componentPricesHash = hashComponentPrices(componentPricesArray);
    const weightsHash = hashWeights();
    
    console.log('Component prices hash:', componentPricesHash);
    console.log('Weights hash:', weightsHash);
    
    // Validate hashes before conversion
    validateHash(componentPricesHash, 'Component prices hash');
    validateHash(weightsHash, 'Weights hash');
    
    // Build update instruction
    // Note: This requires the update_unx_price instruction to exist in the IDL
    // The unxOracle PDA is auto-derived by Anchor from the seeds defined in the IDL
    try {
      // Convert types for Anchor
      const priceAsBN = new BN(basketPriceFixed.toString());
      
      // Convert hashes to number arrays (guaranteed 32 bytes by validation above)
      const componentHashBuffer = Buffer.from(componentPricesHash, 'hex');
      const weightsHashBuffer = Buffer.from(weightsHash, 'hex');
      
      const tx = await program.methods
        .updateUnxPrice(
          priceAsBN,
          Array.from(componentHashBuffer),  // Guaranteed [number; 32]
          Array.from(weightsHashBuffer)     // Guaranteed [number; 32]
        )
        .accounts({
          authority: wallet.publicKey,
        })
        .rpc();
      
      console.log('Oracle updated successfully. Transaction signature:', tx);
    } catch (error) {
      console.warn('Failed to update on-chain oracle (instruction may not exist or authority mismatch):', error);
      console.log('Continuing with blob storage...');
    }
    
    // 5. Get current slot
    const slot = await connection.getSlot();

    // 6. Store price snapshot in blobs (best-effort — non-fatal)
    console.log('Storing price snapshot to Netlify Blobs...');

    const snapshot: UnxPriceSnapshot = {
      timestamp: Date.now(),
      price: basketPrice,
      priceFixed: basketPriceFixed.toString(),
      slot,
      components: componentPrices,
      componentPricesHash,
      weightsHash,
      source,
    };

    let blobsWriteSuccess = false;
    try {
      await storeUnxPrice(snapshot);
      blobsWriteSuccess = true;
      console.log('✓ UNX price snapshot stored to Netlify Blobs');
    } catch (blobsError) {
      console.warn(
        '⚠ Blobs write failed — snapshot not persisted. ' +
        'Ensure NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN are set in Netlify environment variables.',
        blobsError
      );
    }

    // 7. Write to Turso for long-term performance tracking (best-effort — non-fatal)
    console.log('Writing UNX price snapshot to Turso...');
    try {
      // Fetch latest FX rates from blobs (already written by update-fx-rates function).
      // Use null-safe fallback so a blob failure does not abort the Turso write.
      let fxRates = null;
      try {
        fxRates = await getLatestFxRates();
      } catch (fxErr) {
        console.warn('Could not fetch FX rates for Turso snapshot, currency prices will default to USD:', fxErr);
      }

      // Best-effort: fetch on-chain totalTransactions to determine UNIYAA USD price tier.
      // Defaults to 0 (initial price tier) if the fetch fails.
      let totalTransactions = 0;
      try {
        const [globalStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('global-state')],
          PROGRAM_ID
        );
        const globalState = await program.account.globalState.fetch(globalStatePda);
        totalTransactions = (globalState as any).totalTransactions?.toNumber?.() ?? 0;
      } catch (txFetchErr) {
        console.warn('Could not fetch totalTransactions for Turso snapshot, defaulting to 0:', txFetchErr);
      }

      // Calculate UNIYAA price in USD from the tier-based formula.
      const { UniyaaPriceCalculator } = await import('../../src/utils/priceCalculator');
      const uniyaaPriceUsd = UniyaaPriceCalculator.calculatePrice(totalTransactions);

      // Build UNIYAA price map for all 16 send-modal currencies.
      // Rates in fxRates.rates are expressed as "1 USD = X <currency>".
      const currencyPrices: Record<string, number> = {};
      for (const currency of SEND_MODAL_CURRENCIES) {
        if (currency === 'USD') {
          currencyPrices['USD'] = uniyaaPriceUsd;
        } else {
          const rate = fxRates?.rates?.[currency];
          currencyPrices[currency] = rate != null ? uniyaaPriceUsd * rate : uniyaaPriceUsd;
        }
      }

      const tursoResult = await storeUnxSnapshotToTurso({
        timestamp: snapshot.timestamp,
        unxPriceUsd: basketPrice,
        uniyaaPriceUsd,
        uniyaaPriceUnx: basketPrice > 0 ? uniyaaPriceUsd / basketPrice : 0,
        currencyPrices,
        components: componentPrices,
        totalTransactions,
        source,
        usdInflationIndex: await computeUsdInflationIndexAsync(snapshot.timestamp),
        isCarriedForward: staleComponents.length > 0,
        staleComponents,
      });

      if (!tursoResult.success) {
        console.warn('⚠ Turso write reported failure:', tursoResult.error);
      }
    } catch (tursoError) {
      console.warn(
        '⚠ Turso write failed — long-term snapshot not persisted. ' +
        'Ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in Netlify environment variables.',
        tursoError
      );
    }

    console.log('UNX price oracle update completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        blobsWriteSuccess,
        price: basketPrice,
        priceFixed: basketPriceFixed.toString(),
        slot,
        source,
        timestamp: snapshot.timestamp,
        sampleComponents: {
          XAUUSD:   componentPrices.XAUUSD,
          XAGUSD:   componentPrices.XAGUSD,
          XCUUSD:   componentPrices.XCUUSD,
          EURUSD:   componentPrices.EURUSD,
          OILWTI:   componentPrices.OILWTI,
          OILBRENT: componentPrices.OILBRENT,
        },
      }),
    };
  } catch (error) {
    console.error('Error updating UNX price oracle:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Export as scheduled function (runs hourly)
export { handler };
export const config = {
  schedule: '0 * * * *', // Hourly at minute 0
};
