import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Hook for managing user account state
 * This is a stub that can be expanded with more functionality
 */

interface UserAccountState {
  isRegistered: boolean;
  balance: number;
  mintedAmount: number;
  referralCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useUserAccount(userAccountPubkey?: PublicKey | null) {
  const { connected } = useWallet();
  const [state, setState] = useState<UserAccountState>({
    isRegistered: false,
    balance: 0,
    mintedAmount: 0,
    referralCount: 0,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Reset state when wallet disconnects
    if (!connected) {
      setState({
        isRegistered: false,
        balance: 0,
        mintedAmount: 0,
        referralCount: 0,
        isLoading: false,
        error: null,
      });
    }
  }, [connected]);

  /**
   * Refresh user account data
   * To be implemented with actual program account fetching
   */
  const refresh = async () => {
    if (!userAccountPubkey) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Implement actual account fetching logic
      // const accountInfo = await connection.getAccountInfo(userAccountPubkey);
      // Parse and update state accordingly

      console.log('Refreshing user account:', userAccountPubkey.toBase58());

      // Placeholder: Set loading to false after "fetching"
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error fetching user account:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  /**
   * Update balance manually
   * Useful for optimistic updates
   */
  const updateBalance = (newBalance: number) => {
    setState((prev) => ({ ...prev, balance: newBalance }));
  };

  /**
   * Mark user as registered
   */
  const markAsRegistered = () => {
    setState((prev) => ({ ...prev, isRegistered: true }));
  };

  return {
    ...state,
    refresh,
    updateBalance,
    markAsRegistered,
  };
}
