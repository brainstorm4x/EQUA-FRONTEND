/**
 * useGlobalStateStats Hook
 * 
 * Provides real-time global statistics from the on-chain GlobalState account.
 * This is the authoritative source for registered user count and total transactions.
 * Subscribes to account changes for live updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, GLOBAL_STATE_SEED } from '@/lib/constants';
import * as anchor from '@coral-xyz/anchor';

/**
 * GlobalState account layout (matches Rust backend):
 * - discriminator: 8 bytes (Anchor account discriminator)
 * - user_count: u32 (4 bytes) at offset 8
 * - total_transactions: u64 (8 bytes) at offset 12
 * - current_epoch: u64 (8 bytes) at offset 20
 * - compounding_complete: bool (1 byte) at offset 28
 * - last_epoch_update_time: i64 (8 bytes) at offset 29
 * - token_mint: Pubkey (32 bytes) at offset 37
 * - min_sol_balance: u64 (8 bytes) at offset 69
 * - min_slot_gap_for_referrals: u64 (8 bytes) at offset 77
 * Total: 85 bytes
 */

const GLOBAL_STATE_USER_COUNT_OFFSET = 8;
const GLOBAL_STATE_TOTAL_TRANSACTIONS_OFFSET = 12;
const GLOBAL_STATE_CURRENT_EPOCH_OFFSET = 20;

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

export interface UseGlobalStateStatsResult {
  totalUsers: number;
  totalTransactions: number;
  currentEpoch: number;
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
 * Hook to fetch and subscribe to global state statistics
 * 
 * @returns Global stats data and utility functions
 */
export function useGlobalStateStats(): UseGlobalStateStatsResult {
  const { connection } = useConnection();
  
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track subscription ID for cleanup
  const subscriptionIdRef = useRef<number | null>(null);
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetches the current global state data
   */
  const fetchGlobalState = useCallback(async () => {
    try {
      setError(null);
      
      const globalStatePDA = getGlobalStatePDA();
      
      // Fetch account info
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
          setError('GlobalState account not found - possible cluster or program ID mismatch');
          setIsLoading(false);
        }
        return;
      }
      
      // Parse data from account
      const users = parseUserCount(accountInfo.data);
      const transactions = parseTotalTransactions(accountInfo.data);
      const epoch = parseCurrentEpoch(accountInfo.data);
      
      if (isMountedRef.current) {
        setTotalUsers(users);
        setTotalTransactions(transactions);
        setCurrentEpoch(epoch);
        setIsLoading(false);
        
        console.log('✓ Global state fetched:', {
          totalUsers: users,
          totalTransactions: transactions,
          currentEpoch: epoch
        });
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
   * Subscribe to global state account changes for real-time updates
   */
  useEffect(() => {
    // Initial fetch
    setIsLoading(true);
    fetchGlobalState();

    // Set up subscription
    let subscriptionId: number | null = null;
    
    const setupSubscription = () => {
      try {
        const globalStatePDA = getGlobalStatePDA();

        // Subscribe to account changes with 'confirmed' commitment
        subscriptionId = connection.onAccountChange(
          globalStatePDA,
          (accountInfo) => {
            if (accountInfo && accountInfo.data.length > 0 && isMountedRef.current) {
              // Parse updated data
              const users = parseUserCount(accountInfo.data);
              const transactions = parseTotalTransactions(accountInfo.data);
              const epoch = parseCurrentEpoch(accountInfo.data);
              
              setTotalUsers(users);
              setTotalTransactions(transactions);
              setCurrentEpoch(epoch);
              
              console.log('✓ Global state updated (subscription):', {
                totalUsers: users,
                totalTransactions: transactions,
                currentEpoch: epoch
              });
            } else if (!accountInfo && isMountedRef.current) {
              // Account was deleted or doesn't exist on this cluster
              console.error('❌ GlobalState subscription returned null - cluster/program mismatch likely');
              setError('GlobalState subscription lost - check cluster and program ID configuration');
            }
          },
          'confirmed' // Use confirmed commitment for balance between speed and reliability
        );

        subscriptionIdRef.current = subscriptionId;
      } catch (err) {
        console.error('Error setting up global state subscription:', err);
        // Don't set error state here - the initial fetch will handle that
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount or dependency change
    return () => {
      if (subscriptionId !== null) {
        connection.removeAccountChangeListener(subscriptionId);
      }
      subscriptionIdRef.current = null;
    };
  }, [connection, fetchGlobalState]);

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
    isLoading,
    error,
    refresh: fetchGlobalState,
  };
}
