'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  createProgram,
  getGlobalStatePDA,
  getMintPDA,
  getMintAuthorityPDA,
  getUserAccountPDA,
  getUserBalance,
  getSPLTokenBalance,
  getGlobalState,
} from '@/lib/program';
import { isUserRegistered } from '@/utils/registrationCheck';

// ============================================================================
// STATE MACHINE: Program Initialization States
// ============================================================================

/**
 * Possible states for the program initialization lifecycle
 */
enum ProgramState {
  /** No wallet connected - initial/disconnected state */
  DISCONNECTED = 'DISCONNECTED',
  /** Wallet connected, initializing program */
  INITIALIZING = 'INITIALIZING',
  /** Program successfully initialized and ready */
  READY = 'READY',
  /** Program initialization failed */
  ERROR = 'ERROR',
}

/**
 * Categorizes errors for better error handling and user messaging
 */
enum ErrorCategory {
  /** Network connectivity issues (timeout, offline, RPC unreachable) */
  NETWORK = 'NETWORK',
  /** Wallet-related issues (not connected, signing failed) */
  WALLET = 'WALLET',
  /** Program/contract issues (invalid program ID, account not found) */
  PROGRAM = 'PROGRAM',
  /** Unknown/uncategorized errors */
  UNKNOWN = 'UNKNOWN',
}

interface ProgramErrorInfo {
  message: string;
  category: ErrorCategory;
  canRetry: boolean;
  technicalDetails?: string;
}

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

/**
 * Categorizes an error based on its message and type
 */
function categorizeError(error: unknown): ProgramErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  
  // Network-related errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('ERR_NETWORK') ||
    errorName === 'NetworkError'
  ) {
    return {
      message: 'Network connection issue. Please check your internet connection and try again.',
      category: ErrorCategory.NETWORK,
      canRetry: true,
      technicalDetails: errorMessage,
    };
  }
  
  // Wallet-related errors
  if (
    errorMessage.includes('wallet') ||
    errorMessage.includes('WalletNotConnectedError') ||
    errorMessage.includes('User rejected')
  ) {
    return {
      message: 'Wallet connection issue. Please reconnect your wallet and try again.',
      category: ErrorCategory.WALLET,
      canRetry: true,
      technicalDetails: errorMessage,
    };
  }
  
  // Program/contract errors
  if (
    errorMessage.includes('program') ||
    errorMessage.includes('Account does not exist') ||
    errorMessage.includes('Invalid account')
  ) {
    return {
      message: 'Program initialization failed. Please contact support if this persists.',
      category: ErrorCategory.PROGRAM,
      canRetry: false,
      technicalDetails: errorMessage,
    };
  }
  
  // Unknown errors
  return {
    message: 'An unexpected error occurred. Please try again.',
    category: ErrorCategory.UNKNOWN,
    canRetry: true,
    technicalDetails: errorMessage,
  };
}

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  
  // State machine state
  const [programState, setProgramState] = useState<ProgramState>(ProgramState.DISCONNECTED);
  const [errorInfo, setErrorInfo] = useState<ProgramErrorInfo | null>(null);
  
  const [userAccountPDA, setUserAccountPDA] = useState<PublicKey | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Track previous wallet key to detect changes
  const prevWalletKeyRef = useRef<string | null>(null);

  // Derive user account PDA when wallet connects
  useEffect(() => {
    isMountedRef.current = true;
    
    if (publicKey) {
      const [pda] = getUserAccountPDA(publicKey);
      setUserAccountPDA(pda);
      console.log('✅ Derived user account PDA:', pda.toBase58(), 'for authority:', publicKey.toBase58());
    } else {
      setUserAccountPDA(null);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [publicKey]);

  // Function to initialize the program (can be called for retry)
  const initializeProgram = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      if (isMountedRef.current) {
        setProgramState(ProgramState.DISCONNECTED);
        setProgram(null);
        setErrorInfo(null);
      }
      return;
    }

    if (isMountedRef.current) {
      setProgramState(ProgramState.INITIALIZING);
      setErrorInfo(null);
    }

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
        setProgramState(ProgramState.READY);
        setErrorInfo(null);
        console.log('✅ Program initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to create program:', error);
      
      if (isMountedRef.current) {
        setProgram(null);
        setProgramState(ProgramState.ERROR);
        const categorizedError = categorizeError(error);
        setErrorInfo(categorizedError);
        
        // Log structured error info in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error Category:', categorizedError.category);
          console.error('Can Retry:', categorizedError.canRetry);
          console.error('Technical Details:', categorizedError.technicalDetails);
        }
      }
    }
  }, [connection, wallet]);

  // Create program when wallet connects (async handled properly)
  // Optimized to only reinitialize when wallet actually changes
  useEffect(() => {
    const currentWalletKey = wallet.publicKey?.toBase58() || null;
    
    // Skip if wallet hasn't changed and we already have a program
    // Note: `program` is intentionally excluded from deps to prevent infinite loops.
    // Including `program` would cause: initProgram() sets program → triggers effect → calls initProgram() again
    // Instead, we use prevWalletKeyRef to track when the wallet actually changes.
    // The `connection` dependency is handled via `initializeProgram` which includes it.
    if (currentWalletKey === prevWalletKeyRef.current && program !== null) {
      return;
    }
    
    prevWalletKeyRef.current = currentWalletKey;
    
    if (!wallet.publicKey || !wallet.signTransaction) {
      setProgramState(ProgramState.DISCONNECTED);
      setProgram(null);
      setErrorInfo(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- program excluded to prevent infinite loop; connection handled via initializeProgram dependency
  }, [wallet.publicKey, wallet.signTransaction, initializeProgram]);

  // Compute isReady based on both PDA and program state
  const isReady = useMemo(() => {
    return userAccountPDA !== null && programState === ProgramState.READY && program !== null;
  }, [userAccountPDA, programState, program]);

  // Memoize PDAs - these are deterministic and never change
  const globalStatePDA = useMemo(() => getGlobalStatePDA()[0], []);
  const mintPDA = useMemo(() => getMintPDA()[0], []);
  const mintAuthority = useMemo(() => getMintAuthorityPDA()[0], []);

  // Memoized callback functions with stable references
  const checkRegistration = useCallback(
    async (userPubkey: PublicKey): Promise<boolean> => {
      // ✅ Use canonical registration check (UserMetadata)
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
    userAccountPDA,
    isReady,
    // Enhanced state information
    programState,
    isProgramLoading: programState === ProgramState.INITIALIZING,
    programError: errorInfo?.message ?? null,
    errorCategory: errorInfo?.category ?? null,
    canRetryError: errorInfo?.canRetry ?? true,
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
    userAccountPDA,
    isReady,
    programState,
    errorInfo,
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
