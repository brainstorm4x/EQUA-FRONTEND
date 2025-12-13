/**
 * useEquaBalance Hook
 * 
 * Provides real-time EQUA token balance for the connected wallet.
 * Subscribes to SPL token account changes to update balance automatically.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, AccountInfo } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getMintPDA, getSPLTokenBalance } from '@/lib/program';
import * as anchor from '@coral-xyz/anchor';

// SPL Token account layout constants
// See: https://docs.rs/spl-token/latest/spl_token/state/struct.Account.html
const SPL_TOKEN_BALANCE_OFFSET = 64; // Balance field offset in SPL Token account
const SPL_TOKEN_BALANCE_LENGTH = 8;  // Balance field length (u64)

/**
 * Parses SPL token balance from account data
 * @param accountData - Raw account data from SPL token account
 * @returns Balance as number in base units
 */
function parseTokenBalance(accountData: Buffer | Uint8Array): number {
  if (!accountData || accountData.length < SPL_TOKEN_BALANCE_OFFSET + SPL_TOKEN_BALANCE_LENGTH) {
    return 0;
  }
  
  const balanceRaw = new anchor.BN(
    accountData.slice(SPL_TOKEN_BALANCE_OFFSET, SPL_TOKEN_BALANCE_OFFSET + SPL_TOKEN_BALANCE_LENGTH), 
    'le'
  );
  return balanceRaw.toNumber();
}

export interface UseEquaBalanceResult {
  balance: number; // Balance in base units (raw)
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to EQUA token balance
 * 
 * @returns Balance data and utility functions
 */
export function useEquaBalance(): UseEquaBalanceResult {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track subscription ID for cleanup
  const subscriptionIdRef = useRef<number | null>(null);
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetches the current token balance
   */
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      
      const [mintPDA] = getMintPDA();
      const tokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Check if token account exists
      const accountInfo = await connection.getAccountInfo(tokenAccount);
      
      if (!accountInfo) {
        // Token account doesn't exist yet (user hasn't registered or received tokens)
        setBalance(0);
        setIsLoading(false);
        return;
      }
      
      // Parse balance from account data using helper function
      const balanceNumber = parseTokenBalance(accountInfo.data);
      
      if (isMountedRef.current) {
        setBalance(balanceNumber);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching EQUA balance:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch balance');
        setBalance(0);
        setIsLoading(false);
      }
    }
  }, [publicKey, connected, connection]);

  /**
   * Subscribe to token account changes for real-time updates
   */
  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Initial fetch
    setIsLoading(true);
    fetchBalance();

    try {
      const [mintPDA] = getMintPDA();
      const tokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Subscribe to account changes
      const subscriptionId = connection.onAccountChange(
        tokenAccount,
        (accountInfo) => {
          if (accountInfo && accountInfo.data.length > 0 && isMountedRef.current) {
            // Parse updated balance using helper function
            const balanceNumber = parseTokenBalance(accountInfo.data);
            setBalance(balanceNumber);
          }
        },
        'confirmed'
      );

      subscriptionIdRef.current = subscriptionId;

      // Cleanup subscription on unmount or dependency change
      return () => {
        if (subscriptionIdRef.current !== null) {
          connection.removeAccountChangeListener(subscriptionIdRef.current);
          subscriptionIdRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error setting up balance subscription:', err);
      setError('Failed to subscribe to balance updates');
      setIsLoading(false);
    }
  }, [publicKey, connected, connection, fetchBalance]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    balance,
    isLoading,
    error,
    refresh: fetchBalance,
  };
}
