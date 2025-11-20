'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import * as program from '@/lib/program';

export function useProgram() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  // ✅ FIX: Memoize wallet object to prevent re-creation
  const wallet = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      return null;
    }

    return {
      publicKey,
      signTransaction,
      signAllTransactions,
    };
  }, [publicKey, signTransaction, signAllTransactions]);

  const isReady = useMemo(() => {
    return wallet !== null && connection !== null;
  }, [wallet, connection]);

  // ✅ FIX: Wrap functions in useCallback to prevent re-creation
  const isUserRegistered = useCallback(
    (userPubkey: PublicKey) => program.isUserRegistered(connection, userPubkey),
    [connection]
  );

  const getUserBalance = useCallback(
    (userPubkey: PublicKey) => program.getUserBalance(connection, userPubkey),
    [connection]
  );

  const getGlobalState = useCallback(
    (globalStatePDA: PublicKey) => program.getGlobalState(connection, globalStatePDA),
    [connection]
  );

  return {
    wallet,
    connection,
    isReady,
    // PDA derivation functions (these are pure functions, safe to return directly)
    getGlobalStatePDA: program.getGlobalStatePDA,
    getMintPDA: program.getMintPDA,
    getMintAuthorityPDA: program.getMintAuthorityPDA,
    // Memoized functions
    isUserRegistered,
    getUserBalance,
    getGlobalState,
  };
}
