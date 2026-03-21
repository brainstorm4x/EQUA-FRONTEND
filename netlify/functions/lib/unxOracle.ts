/**
 * UNX Oracle - On-Chain Oracle Integration
 * 
 * This module reads the UNX (UNIA Index) price directly from the on-chain oracle.
 * The oracle is the single source of truth for UNX pricing, maintained by the backend.
 * 
 * Basket Composition (7 assets):
 * - USD/USD: 23%
 * - EUR/USD: 17%
 * - CNH/USD: 9%
 * - JPY/USD: 5%
 * - GBP/USD: 3%
 * - XAU/USD (Gold): 35%
 * - OIL: 8%
 * 
 * Features:
 * - Direct on-chain oracle reads from UnxOracle PDA
 * - Fixed-point arithmetic (1e8 precision)
 * - No external API dependencies
 * - Single source of truth: blockchain
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { UniaToken } from './unia_token';

// ============================================================================
// Configuration
// ============================================================================

/**
 * UNIA Program ID (from backend Anchor.toml)
 */
const UNIA_PROGRAM_ID = new PublicKey('B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2');

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
 * UNX basket composition (7 components)
 * Source: brainstorm4x/EQUA backend (post PR #71)
 */
export const BASKET_COMPONENTS: ComponentInfo[] = [
  { id: BasketComponent.USDUSD, name: 'USD/USD', weight: 0.23 },
  { id: BasketComponent.USDEUR, name: 'EUR/USD', weight: 0.17 },
  { id: BasketComponent.USDCNY, name: 'CNH/USD', weight: 0.09 },
  { id: BasketComponent.USDJPY, name: 'JPY/USD', weight: 0.05 },
  { id: BasketComponent.USDGBP, name: 'GBP/USD', weight: 0.03 },
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
 * UNX Oracle account data (matches backend Rust struct)
 * Seeds: ["unx-oracle"]
 */
export interface UnxOracleData {
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
 * Derive UNX Oracle PDA
 * Seeds: ["unx-oracle"]
 * 
 * @param programId - UNIA program ID
 * @returns [PublicKey, bump] tuple
 */
export function getUnxOraclePda(programId: PublicKey = UNIA_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('unx-oracle')],
    programId
  );
}

// ============================================================================
// On-Chain Oracle Reading
// ============================================================================

/**
 * Fetch UNX Oracle from on-chain
 * This is the ONLY source of truth for UNX price
 * 
 * @param connection - Solana connection
 * @returns UnxOracleData or null if fetch fails
 */
export async function fetchUnxOracle(
  connection: Connection
): Promise<UnxOracleData | null> {
  try {
    // Create minimal provider (no wallet needed for read-only)
    const provider = new AnchorProvider(
      connection,
      {} as Wallet,
      { commitment: 'confirmed' }
    );
    
    // Load program with IDL
    const idl = await import('./unia_token.json');
    const program = new Program<UniaToken>(
      idl as any,
      provider
    );
    
    // Derive PDA
    const [oraclePda] = getUnxOraclePda(UNIA_PROGRAM_ID);
    
    // Fetch account
    const account = await program.account.unxOracle.fetch(oraclePda);
    
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
    console.error('Error fetching UNX Oracle from on-chain:', error);
    return null;
  }
}

/**
 * Get current UNX price in USD (fixed-point u64)
 * 
 * @param connection - Solana connection
 * @returns UNX price as bigint (1e8 precision) or null if fetch fails
 */
export async function getUnxPrice(connection: Connection): Promise<bigint | null> {
  const oracle = await fetchUnxOracle(connection);
  return oracle ? oracle.price : null;
}

/**
 * Get current UNX price in USD (float)
 * 
 * @param connection - Solana connection
 * @returns UNX price as float or null if fetch fails
 */
export async function getUnxPriceFloat(connection: Connection): Promise<number | null> {
  const oracle = await fetchUnxOracle(connection);
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
// Price Calculation Utilities
// ============================================================================

/**
 * Calculate weighted basket price from component prices
 * 
 * @param componentPrices - Array of 7 component prices [USDUSD, EURUSD, CNHUSD, JPYUSD, GBPUSD, XAUUSD, OIL]
 * @returns Weighted basket price
 */
export function calculateBasketPrice(componentPrices: number[]): number {
  if (componentPrices.length !== 7) {
    throw new Error(`Expected 7 component prices, got ${componentPrices.length}`);
  }
  
  let basketPrice = 0;
  for (let i = 0; i < 7; i++) {
    basketPrice += componentPrices[i] * BASKET_COMPONENTS[i].weight;
  }
  
  return basketPrice;
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

// ============================================================================
// Hash Validation Utilities
// ============================================================================

/**
 * Validate SHA-256 hash is exactly 32 bytes
 * @param hash - Hex string
 * @param name - Hash name for error messages
 */
export function validateHash(hash: string, name: string): void {
  const buffer = Buffer.from(hash, 'hex');
  if (buffer.length !== 32) {
    throw new Error(
      `${name} must be exactly 32 bytes, got ${buffer.length}. ` +
      `Hex string: ${hash}`
    );
  }
}
