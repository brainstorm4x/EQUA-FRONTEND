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
import { fetchComponentPrices, componentPricesToArray } from './lib/pythPrices';
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
import { storeUnxSnapshotToTurso, SEND_MODAL_CURRENCIES, computeUsdInflationIndexAsync } from './lib/tursoStorage';

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

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('Starting UNX price oracle update...');
  
  try {
    // 1. Fetch component prices
    console.log('Fetching component prices from Pyth Hermes API...');
    const { prices: componentPrices, source } = await fetchComponentPrices();
    const componentPricesArray = componentPricesToArray(componentPrices);
    
    console.log('Component prices:', componentPrices);
    console.log('Source:', source);
    
    // 2. Calculate basket price
    const basketPrice = calculateBasketPrice(componentPricesArray);
    const basketPriceFixed = floatToFixed(basketPrice);
    
    console.log(`Calculated basket price: ${basketPrice} USD (${basketPriceFixed} fixed-point)`);
    
    // 3. Update on-chain oracle
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
    
    // 4. Get current slot
    const slot = await connection.getSlot();
    
    // 5. Store price snapshot in blobs (best-effort — non-fatal)
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

    // 6. Write to Turso for long-term performance tracking (best-effort — non-fatal)
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
          XAUUSD: componentPrices.XAUUSD,
          EURUSD: componentPrices.EURUSD,
          OIL: componentPrices.OIL,
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
