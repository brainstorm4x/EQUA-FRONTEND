/**
 * useGlobalStateStats Hook
 * 
 * Provides global statistics from the on-chain GlobalState account.
 * This is the authoritative source for registered user count and total transactions.
 * Reads through a CDN-cached Netlify function (see get-global-state.ts).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, GLOBAL_STATE_SEED } from '@/lib/constants';
import * as anchor from '@coral-xyz/anchor';
import { INITIAL_PRICE_USD, PRICE_SCALE, priceIndexToUsd } from '@/utils/priceCalculator';

/**
 * GlobalState account layout (matches Rust backend, post-2026-06-01 schema):
 * - discriminator: 8 bytes (Anchor account discriminator)
 * - user_count: u32 (4 bytes) at offset 8
 * - total_transactions: u64 (8 bytes) at offset 12
 * - current_epoch: u64 (8 bytes) at offset 20
 * - compounding_complete: bool (1 byte) at offset 28
 * - last_epoch_update_time: i64 (8 bytes) at offset 29
 * - token_mint: Pubkey (32 bytes) at offset 37
 * - min_sol_balance: u64 (8 bytes) at offset 69
 * - min_slot_gap_for_referrals: u64 (8 bytes) at offset 77
 * - admin: Pubkey (32 bytes) at offset 85  ← added 2026-06-01 (H2)
 * - tier9_start_timestamp: i64 (8 bytes) at offset 117  ← added 2026-06-01 (H3)
 * - count_day: u64 (8 bytes) at offset 125      ← participation price model
 * - payers_today: u64 (8 bytes) at offset 133
 * - price_index: u64 (8 bytes) at offset 141    (USD × 1e9)
 * Total: 149 bytes
 *
 * Backward-compat: accounts not yet migrated are shorter. Parsers below
 * tolerate the short layout by returning 0 for fields beyond the buffer
 * length (and the initial $0.01 for the price).
 */

const GLOBAL_STATE_USER_COUNT_OFFSET = 8;
const GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET = 12;
const GLOBAL_STATE_CURRENT_EPOCH_OFFSET = 20;
const GLOBAL_STATE_TIER9_START_TIMESTAMP_OFFSET = 117;
const GLOBAL_STATE_PAYERS_TODAY_OFFSET = 133;
const GLOBAL_STATE_PRICE_INDEX_OFFSET = 141;

/**
 * Parses a u64 that fits in a JS number (prices and daily counts do).
 * Returns `fallback` when the account is too short (not yet migrated).
 */
function parseU64(accountData: Buffer | Uint8Array, offset: number, fallback: number): number {
  if (!accountData || accountData.length < offset + 8) {
    return fallback;
  }
  const value = new anchor.BN(accountData.slice(offset, offset + 8), 'le');
  return value.gt(new anchor.BN(Number.MAX_SAFE_INTEGER)) ? Number.MAX_SAFE_INTEGER : value.toNumber();
}

/**
 * Parses user count (u32) from GlobalState account data
 * @param accountData - Raw account data
 * @returns User count or 0 if invalid
 */
function parseUserCount(accountData: Buffer | Uint8Array): number {
  if (!accountData || accountData.length < GLOBAL_STATE_USER_COUNT_OFFSET + 4) {
    return 0;
  }
  
  try {
    const userCountBN = new anchor.BN(
      accountData.slice(GLOBAL_STATE_USER_COUNT_OFFSET, GLOBAL_STATE_USER_COUNT_OFFSET + 4),
      'le'
    );
    const count = userCountBN.toNumber();
    
    // Sanity check: If count is unreasonably large, treat as invalid data
    // Maximum reasonable: 10 billion users
    if (count > 10_000_000_000) {
      console.warn('⚠️ Implausible user count detected:', count, '- treating as invalid data');
      return 0;
    }
    
    return count;
  } catch (error) {
    console.error('Error parsing user count:', error);
    return 0;
  }
}

/**
 * Parses total transactions (u64) from GlobalState account data
 * @param accountData - Raw account data
 * @returns Total transactions or 0 if invalid
 */
function parseTotalTransactions(accountData: Buffer | Uint8Array): number {
  if (!accountData || accountData.length < GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET + 8) {
    return 0;
  }
  
  try {
    const totalTransactionsBN = new anchor.BN(
      accountData.slice(GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET, GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET + 8),
      'le'
    );
    
    // Check if value exceeds JavaScript's safe integer range
    if (totalTransactionsBN.gt(new anchor.BN(Number.MAX_SAFE_INTEGER))) {
      console.warn('⚠️ Total transactions exceeds MAX_SAFE_INTEGER, using safe value');
      return Number.MAX_SAFE_INTEGER;
    }
    
    return totalTransactionsBN.toNumber();
  } catch (error) {
    console.error('Error parsing total transactions:', error);
    return 0;
  }
}

/**
 * Parses current epoch (u64) from GlobalState account data
 * @param accountData - Raw account data
 * @returns Current epoch or 0 if invalid
 */
function parseCurrentEpoch(accountData: Buffer | Uint8Array): number {
  if (!accountData || accountData.length < GLOBAL_STATE_CURRENT_EPOCH_OFFSET + 8) {
    return 0;
  }
  
  try {
    const currentEpochBN = new anchor.BN(
      accountData.slice(GLOBAL_STATE_CURRENT_EPOCH_OFFSET, GLOBAL_STATE_CURRENT_EPOCH_OFFSET + 8),
      'le'
    );
    
    // Check if value exceeds JavaScript's safe integer range
    if (currentEpochBN.gt(new anchor.BN(Number.MAX_SAFE_INTEGER))) {
      console.warn('⚠️ Current epoch exceeds MAX_SAFE_INTEGER, using safe value');
      return Number.MAX_SAFE_INTEGER;
    }
    
    return currentEpochBN.toNumber();
  } catch (error) {
    console.error('Error parsing current epoch:', error);
    return 0;
  }
}

/**
 * Parses the on-chain Tier 9 start timestamp (i64 at offset 117).
 *
 * Returns `0` when:
 *   - The account data is shorter than 125 bytes (pre-2026-06-01 layout)
 *   - The field is the sentinel `0` (Tier 9 hasn't begun yet)
 *   - Parsing fails for any reason
 *
 * Treat `0` as "no Tier 9 cap data available — fall back to conservative
 * defaults" in the price calculator.
 */
function parseTier9StartTimestamp(accountData: Buffer | Uint8Array): number {
  if (!accountData || accountData.length < GLOBAL_STATE_TIER9_START_TIMESTAMP_OFFSET + 8) {
    return 0;
  }
  try {
    const ts = new anchor.BN(
      accountData.slice(
        GLOBAL_STATE_TIER9_START_TIMESTAMP_OFFSET,
        GLOBAL_STATE_TIER9_START_TIMESTAMP_OFFSET + 8,
      ),
      'le',
    );
    if (ts.gt(new anchor.BN(Number.MAX_SAFE_INTEGER))) {
      console.warn('⚠️ tier9_start_timestamp exceeds MAX_SAFE_INTEGER');
      return 0;
    }
    return ts.toNumber();
  } catch (error) {
    console.error('Error parsing tier9_start_timestamp:', error);
    return 0;
  }
}

export interface UseGlobalStateStatsResult {
  totalUsers: number;
  totalTransactions: number;
  currentEpoch: number;
  /** Unix seconds when total_transactions first crossed TIER_8_END_TX_COUNT.
   *  0 means Tier 9 has not begun yet (or pre-migration GlobalState). */
  tier9StartTimestamp: number;
  /** On-chain UNIYAA price in USD (GlobalState.price_index). */
  priceUsd: number;
  /** Senders counted so far in the current UTC day. */
  payersToday: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Cached global state PDA to avoid repeated derivation
 */
let cachedGlobalStatePDA: PublicKey | null = null;

function getGlobalStatePDA(): PublicKey {
  if (!cachedGlobalStatePDA) {
    [cachedGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_STATE_SEED)],
      PROGRAM_ID
    );
  }
  return cachedGlobalStatePDA;
}

/**
 * Cached GlobalState endpoint (same-origin Netlify function, CDN-cached for
 * ~10 s). Every visitor shares one RPC read per cache window. Can be
 * overridden via NEXT_PUBLIC_GLOBAL_STATE_URL for local dev.
 */
const GLOBAL_STATE_URL =
  process.env.NEXT_PUBLIC_GLOBAL_STATE_URL || '/.netlify/functions/get-global-state';

/** How often the hook re-reads the cached endpoint. */
const POLL_INTERVAL_MS = 20_000;

/**
 * Reads the raw GlobalState bytes from the cached endpoint.
 * Returns null when the endpoint is unavailable (e.g. plain `next dev`,
 * where Netlify functions don't run) so the caller can read RPC directly.
 */
async function fetchCachedGlobalStateData(): Promise<Buffer | null> {
  try {
    const response = await fetch(GLOBAL_STATE_URL);
    if (!response.ok) return null;
    const body = await response.json();
    if (typeof body?.data !== 'string') return null;
    return Buffer.from(body.data, 'base64');
  } catch {
    return null;
  }
}

/**
 * Hook to fetch global state statistics
 *
 * Reads the CDN-cached endpoint and re-reads it every POLL_INTERVAL_MS. It
 * does NOT open a websocket subscription on GlobalState: that account changes
 * on every counted transfer, so a per-visitor subscription would push every
 * transfer to every open tab and bill each push.
 *
 * @returns Global stats data and utility functions
 */
export function useGlobalStateStats(): UseGlobalStateStatsResult {
  const { connection } = useConnection();
  
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [tier9StartTimestamp, setTier9StartTimestamp] = useState<number>(0);
  const [priceUsd, setPriceUsd] = useState<number>(INITIAL_PRICE_USD);
  const [payersToday, setPayersToday] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetches the current global state data: cached endpoint first, then a
   * direct RPC read if the endpoint is unavailable.
   */
  const fetchGlobalState = useCallback(async () => {
    try {
      setError(null);
      
      let data = await fetchCachedGlobalStateData();

      if (!data) {
        const globalStatePDA = getGlobalStatePDA();
        const accountInfo = await connection.getAccountInfo(globalStatePDA);

        if (!accountInfo) {
          // Global state account doesn't exist yet
          // This likely means wrong cluster or program not initialized
          console.error(
            '❌ GlobalState account not found at',
            globalStatePDA.toBase58(),
            '\nThis usually indicates:',
            '\n  1. Wrong cluster/RPC endpoint (check NEXT_PUBLIC_RPC_ENDPOINT)',
            '\n  2. Wrong program ID (check NEXT_PUBLIC_PROGRAM_ID)',
            '\n  3. Program not initialized on this cluster'
          );
          if (isMountedRef.current) {
            setTotalUsers(0);
            setTotalTransactions(0);
            setCurrentEpoch(0);
            setTier9StartTimestamp(0);
            setError('GlobalState account not found - possible cluster or program ID mismatch');
            setIsLoading(false);
          }
          return;
        }
        data = accountInfo.data;
      }

      // Parse data from account
      const users = parseUserCount(data);
      const transactions = parseTotalTransactions(data);
      const epoch = parseCurrentEpoch(data);
      const tier9Ts = parseTier9StartTimestamp(data);
      const priceIndex = parseU64(data, GLOBAL_STATE_PRICE_INDEX_OFFSET, INITIAL_PRICE_USD * PRICE_SCALE);
      const payers = parseU64(data, GLOBAL_STATE_PAYERS_TODAY_OFFSET, 0);

      if (isMountedRef.current) {
        setTotalUsers(users);
        setTotalTransactions(transactions);
        setCurrentEpoch(epoch);
        setTier9StartTimestamp(tier9Ts);
        setPriceUsd(priceIndexToUsd(priceIndex));
        setPayersToday(payers);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching global state:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch global state');
        setIsLoading(false);
      }
    }
  }, [connection]);

  /**
   * Initial fetch, then re-read the cached endpoint on an interval
   */
  useEffect(() => {
    setIsLoading(true);
    fetchGlobalState();

    const interval = setInterval(fetchGlobalState, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchGlobalState]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    totalUsers,
    totalTransactions,
    currentEpoch,
    tier9StartTimestamp,
    priceUsd,
    payersToday,
    isLoading,
    error,
    refresh: fetchGlobalState,
  };
}
