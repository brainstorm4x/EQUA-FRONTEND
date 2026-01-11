/**
 * EQX Oracle - On-Chain Oracle Integration
 * 
 * This module reads the EQX (EQUA Index) price directly from the on-chain oracle.
 * The oracle is the single source of truth for EQX pricing, maintained by the backend.
 * 
 * Basket Composition (7 assets):
 * - USD/USD: 23%
 * - USD/EUR: 17%
 * - USD/CNY: 9%
 * - USD/JPY: 5%
 * - USD/GBP: 3%
 * - XAU/USD (Gold): 35%
 * - OIL: 8%
 * 
 * Features:
 * - Direct on-chain oracle reads from EqxOracle PDA
 * - Fixed-point arithmetic (1e8 precision)
 * - No external API dependencies
 * - Single source of truth: blockchain
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { EquaToken } from '@/lib/equa_token';
import { getFxRate } from './fxRateClient';

// ============================================================================
// Configuration
// ============================================================================

/**
 * EQUA Program ID (from backend Anchor.toml)
 */
const EQUA_PROGRAM_ID = new PublicKey('2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4');

/**
 * Fixed-point precision (1e8)
 */
export const PRECISION = 100_000_000;

// ============================================================================
// Basket Component Definitions (7-asset basket from backend)
// ============================================================================

/**
 * Basket component IDs (matches backend enum)
 */
export enum BasketComponent {
  USDUSD = 0,
  USDEUR = 1,
  USDCNY = 2,
  USDJPY = 3,
  USDGBP = 4,
  XAUUSD = 5,
  OIL = 6,
}

/**
 * Component information for display
 */
export interface ComponentInfo {
  id: BasketComponent;
  name: string;
  weight: number;
}

/**
 * EQX basket composition (7 components)
 * Source: brainstorm4x/EQUA backend (post PR #71)
 */
export const BASKET_COMPONENTS: ComponentInfo[] = [
  { id: BasketComponent.USDUSD, name: 'USD/USD', weight: 0.23 },
  { id: BasketComponent.USDEUR, name: 'USD/EUR', weight: 0.17 },
  { id: BasketComponent.USDCNY, name: 'USD/CNY', weight: 0.09 },
  { id: BasketComponent.USDJPY, name: 'USD/JPY', weight: 0.05 },
  { id: BasketComponent.USDGBP, name: 'USD/GBP', weight: 0.03 },
  { id: BasketComponent.XAUUSD, name: 'XAU/USD', weight: 0.35 },
  { id: BasketComponent.OIL, name: 'OIL', weight: 0.08 },
];

// Verify weights sum to 1
const totalWeight = BASKET_COMPONENTS.reduce((sum, c) => sum + c.weight, 0);
if (Math.abs(totalWeight - 1.0) > 0.0001) {
  console.error(`BASKET_COMPONENTS weights do not sum to 1.0: ${totalWeight}`);
}

// ============================================================================
// Types
// ============================================================================

/**
 * EQX Oracle account data (matches backend Rust struct)
 * Seeds: ["eqx-oracle"]
 */
export interface EqxOracleData {
  price: bigint;                      // Fixed-point u64 (1e8 precision)
  lastUpdated: bigint;                // Unix timestamp (i64)
  lastUpdatedSlot: bigint;            // Solana slot (u64)
  componentPricesHash: Uint8Array;    // SHA256 hash [u8; 32]
  weightsHash: Uint8Array;            // SHA256 hash [u8; 32]
  authority: PublicKey;               // Admin authority
  version: number;                    // Version number (u32)
}

// ============================================================================
// PDA Derivation
// ============================================================================

/**
 * Derive EQX Oracle PDA
 * Seeds: ["eqx-oracle"]
 * 
 * @param programId - EQUA program ID
 * @returns [PublicKey, bump] tuple
 */
export function getEqxOraclePda(programId: PublicKey = EQUA_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('eqx-oracle')],
    programId
  );
}

// ============================================================================
// On-Chain Oracle Reading
// ============================================================================

/**
 * Fetch EQX Oracle from on-chain
 * This is the ONLY source of truth for EQX price
 * 
 * @param connection - Solana connection
 * @returns EqxOracleData or null if fetch fails
 */
export async function fetchEqxOracle(
  connection: Connection
): Promise<EqxOracleData | null> {
  try {
    // Create minimal provider (no wallet needed for read-only)
    const provider = new AnchorProvider(
      connection,
      {} as Wallet,
      { commitment: 'confirmed' }
    );
    
    // Load program with IDL
    const idl = await import('@/../../public/idl/equa_token.json');
    const program = new Program<EquaToken>(
      idl as any,
      provider
    );
    
    // Derive PDA
    const [oraclePda] = getEqxOraclePda(EQUA_PROGRAM_ID);
    
    // Fetch account
    const account = await program.account.eqxOracle.fetch(oraclePda);
    
    return {
      price: BigInt(account.price.toString()),
      lastUpdated: BigInt(account.lastUpdated.toString()),
      lastUpdatedSlot: BigInt(account.lastUpdatedSlot.toString()),
      componentPricesHash: new Uint8Array(account.componentPricesHash),
      weightsHash: new Uint8Array(account.weightsHash),
      authority: account.authority,
      version: account.version,
    };
  } catch (error) {
    console.error('Error fetching EQX Oracle from on-chain:', error);
    return null;
  }
}

/**
 * Get current EQX price in USD (fixed-point u64)
 * 
 * @param connection - Solana connection
 * @returns EQX price as bigint (1e8 precision) or null if fetch fails
 */
export async function getEqxPrice(connection: Connection): Promise<bigint | null> {
  const oracle = await fetchEqxOracle(connection);
  return oracle ? oracle.price : null;
}

/**
 * Get current EQX price in USD (float)
 * 
 * @param connection - Solana connection
 * @returns EQX price as float or null if fetch fails
 */
export async function getEqxPriceFloat(connection: Connection): Promise<number | null> {
  const oracle = await fetchEqxOracle(connection);
  return oracle ? fixedToFloat(oracle.price) : null;
}

// ============================================================================
// Fixed-Point Conversion Utilities
// ============================================================================

/**
 * Convert fixed-point to float
 * 
 * @param fixedPoint - Fixed-point value (1e8 precision)
 * @returns Float value
 */
export function fixedToFloat(fixedPoint: bigint | number): number {
  const value = typeof fixedPoint === 'bigint' ? Number(fixedPoint) : fixedPoint;
  return value / PRECISION;
}

/**
 * Convert float to fixed-point
 * 
 * @param float - Float value
 * @returns Fixed-point value (1e8 precision)
 */
export function floatToFixed(float: number): bigint {
  return BigInt(Math.round(float * PRECISION));
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Multi-format EQUA price data
 */
export interface MultiFormatEquaPrice {
  eqx: number;                      // Price in EQX
  usd: number;                      // Price in USD
  localCurrency: number;            // Price in user's local currency
  localCurrencyCode: string;        // Currency code
  eqxValue: number;                 // Current EQX index value (1 EQX = this many USD)
  source: 'on-chain-oracle';        // Always on-chain oracle
  fxRate?: number;                  // FX rate used for conversion
  fxSource?: string;                // Source of FX rate (exchangerate-api, cache, fallback, static)
  fxAge?: number;                   // Age of FX rate in milliseconds
  fxIsStale?: boolean;              // Whether FX rate is stale (>24h old)
}

/**
 * Get EQUA price in multiple formats
 * 
 * @param equaPriceUSD - EQUA price in USD (from price calculator)
 * @param localCurrencyCode - User's local currency code
 * @param connection - Solana connection
 * @returns Multi-format price data
 */
export async function getEquaPriceMultiFormat(
  equaPriceUSD: number,
  localCurrencyCode: string,
  connection: Connection
): Promise<MultiFormatEquaPrice> {
  const eqxPriceFloat = await getEqxPriceFloat(connection);
  
  // Fallback to 1.0 if oracle read fails (should rarely happen)
  const eqxValue = eqxPriceFloat || 1.0;
  
  // Fetch real-time FX rate
  const fxData = await getFxRate(localCurrencyCode);
  
  return {
    eqx: equaPriceUSD / eqxValue,
    usd: equaPriceUSD,
    localCurrency: equaPriceUSD * fxData.rate,
    localCurrencyCode,
    eqxValue,
    source: 'on-chain-oracle',
    fxRate: fxData.rate,
    fxSource: fxData.source,
    fxAge: fxData.age,
    fxIsStale: fxData.isStale,
  };
}

/**
 * Format EQX price for display
 * 
 * @param eqxPrice - EQX price
 * @returns Formatted string
 */
export function formatEQXPrice(eqxPrice: number): string {
  if (eqxPrice < 0.0001) {
    return `${eqxPrice.toExponential(2)} EQX`;
  }
  if (eqxPrice < 1) {
    return `${eqxPrice.toFixed(6)} EQX`;
  }
  if (eqxPrice < 1000) {
    return `${eqxPrice.toFixed(4)} EQX`;
  }
  return `${eqxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} EQX`;
}

/**
 * Get basket composition (for display/documentation only)
 * The actual calculation happens on-chain
 * 
 * @returns Basket components
 */
export function getBasketComposition(): ComponentInfo[] {
  return BASKET_COMPONENTS;
}
