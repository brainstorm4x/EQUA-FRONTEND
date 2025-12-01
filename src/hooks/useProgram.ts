'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
createProgram,
getGlobalStatePDA,
getMintPDA,
getMintAuthorityPDA,
isUserRegistered,
getUserBalance,
getSPLTokenBalance,
getGlobalState,
getOrCreateKeypair,
} from '@/lib/program';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Debounced RPC calls
// ============================================================================

// Maximum time to wait for program initialization (in milliseconds)
const PROGRAM_INIT_TIMEOUT_MS = 15000;

/**
 * Creates a debounced function that delays invoking func until after wait ms
 * have elapsed since the last time the debounced function was invoked.
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [userAccountKeypair, setUserAccountKeypair] = useState<Keypair | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [isProgramLoading, setIsProgramLoading] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Track previous wallet key to detect changes
  const prevWalletKeyRef = useRef<string | null>(null);

  // Initialize user account keypair (runs once on mount)
  useEffect(() => {
    isMountedRef.current = true;
    
    if (typeof window !== 'undefined') {
      const keypair = getOrCreateKeypair();
      setUserAccountKeypair(keypair);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Function to initialize the program (can be called for retry)
  const initializeProgram = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setProgram(null);
      setIsProgramLoading(false);
      setProgramError(null);
      return;
    }

    setIsProgramLoading(true);
    setProgramError(null);

    try {
      console.log('🔄 Creating program instance...');

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Program initialization timed out. Please check your network connection and try again.'));
        }, PROGRAM_INIT_TIMEOUT_MS);
      });

      // Race between program creation and timeout
      const prog = await Promise.race([
        createProgram(connection, wallet),
        timeoutPromise
      ]);

      if (isMountedRef.current) {
        setProgram(prog);
        setProgramError(null);
        console.log('✅ Program initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to create program:', error);
      if (isMountedRef.current) {
        setProgram(null);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize program. Please try again.';
        setProgramError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsProgramLoading(false);
      }
    }
  }, [connection, wallet]);

  // Create program when wallet connects (async handled properly)
  // Optimized to only reinitialize when wallet actually changes
  useEffect(() => {
    const currentWalletKey = wallet.publicKey?.toBase58() || null;
    
    // Skip if wallet hasn't changed and we already have a program
    // Note: program is intentionally excluded from deps to prevent infinite loops
    // The prevWalletKeyRef tracks actual wallet changes
    if (currentWalletKey === prevWalletKeyRef.current && program !== null) {
      return;
    }
    
    prevWalletKeyRef.current = currentWalletKey;
    
    if (!wallet.publicKey || !wallet.signTransaction) {
      setProgram(null);
      setIsProgramLoading(false);
      setProgramError(null);
      return;
    }

    let cancelled = false;
    
    async function initProgram() {
      if (cancelled) return;
      await initializeProgram();
    }
    
    initProgram();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey, wallet.signTransaction, initializeProgram]);

  // Compute isReady based on both keypair and program initialization
  const isReady = useMemo(() => {
    return userAccountKeypair !== null && program !== null;
  }, [userAccountKeypair, program]);

  // Memoize PDAs - these are deterministic and never change
  const globalStatePDA = useMemo(() => getGlobalStatePDA()[0], []);
  const mintPDA = useMemo(() => getMintPDA()[0], []);
  const mintAuthority = useMemo(() => getMintAuthorityPDA()[0], []);

  // Memoized callback functions with stable references
  const checkRegistration = useCallback(
    async (userPubkey: PublicKey): Promise<boolean> => {
      return await isUserRegistered(connection, userPubkey);
    },
    [connection]
  );

  const getBalance = useCallback(
    async (userPubkey: PublicKey): Promise<number> => {
      return await getUserBalance(connection, userPubkey);
    },
    [connection]
  );

  const getTokenBalance = useCallback(
    async (tokenAccount: PublicKey): Promise<number> => {
      return await getSPLTokenBalance(connection, tokenAccount);
    },
    [connection]
  );

  const fetchGlobalState = useCallback(async () => {
    return await getGlobalState(connection, globalStatePDA);
  }, [connection, globalStatePDA]);

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(() => ({
    program,
    connection,
    wallet,
    publicKey,
    userAccountKeypair,
    isReady,
    isProgramLoading,
    programError,
    retryProgramInit: initializeProgram,
    globalStatePDA,
    mintPDA,
    mintAuthority,
    checkRegistration,
    getBalance,
    getTokenBalance,
    fetchGlobalState,
  }), [
    program,
    connection,
    wallet,
    publicKey,
    userAccountKeypair,
    isReady,
    isProgramLoading,
    programError,
    initializeProgram,
    globalStatePDA,
    mintPDA,
    mintAuthority,
    checkRegistration,
    getBalance,
    getTokenBalance,
    fetchGlobalState,
  ]);
}
