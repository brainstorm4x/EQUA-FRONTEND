'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { isUserRegistered } from '@/utils/registrationCheck';

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

/**
 * Registration state machine - explicit states for clarity
 */
export enum RegistrationStatus {
  /** Initial state - no wallet connected or check not yet performed */
  UNKNOWN = 'UNKNOWN',
  /** Currently checking registration status on-chain */
  CHECKING = 'CHECKING',
  /** User is registered (UserMetadata account exists on-chain) */
  REGISTERED = 'REGISTERED',
  /** User is not registered (UserMetadata account does not exist) */
  NOT_REGISTERED = 'NOT_REGISTERED',
  /** Error occurred during registration check */
  ERROR = 'ERROR',
}

/**
 * Context state shape
 */
interface RegistrationState {
  status: RegistrationStatus;
  userIndex: number | null;
  elevatedAttemptsUsed: number | null;
  lastCheckedTimestamp: number | null;
  errorMessage: string | null;
}

/**
 * Context actions
 */
type RegistrationAction =
  | { type: 'START_CHECK' }
  | { type: 'SET_REGISTERED'; userIndex: number; elevatedAttemptsUsed: number }
  | { type: 'SET_NOT_REGISTERED' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

/**
 * Context value exposed to consumers
 */
interface RegistrationContextValue extends RegistrationState {
  /** Force a re-check of registration status (bypasses debounce) */
  refetchStatus: () => Promise<void>;
  /** Check if currently in a loading state */
  isLoading: boolean;
  /** Check if status is known (not UNKNOWN or CHECKING) */
  isStatusKnown: boolean;
}

// ============================================================================
// REDUCER - State Machine Logic
// ============================================================================

const initialState: RegistrationState = {
  status: RegistrationStatus.UNKNOWN,
  userIndex: null,
  elevatedAttemptsUsed: null,
  lastCheckedTimestamp: null,
  errorMessage: null,
};

function registrationReducer(
  state: RegistrationState,
  action: RegistrationAction
): RegistrationState {
  switch (action.type) {
    case 'START_CHECK':
      console.log('🔄 [RegistrationContext] State transition: CHECKING');
      return {
        ...state,
        status: RegistrationStatus.CHECKING,
        errorMessage: null,
      };

    case 'SET_REGISTERED':
      console.log('✅ [RegistrationContext] State transition: REGISTERED', {
        userIndex: action.userIndex,
        elevatedAttemptsUsed: action.elevatedAttemptsUsed,
      });
      return {
        status: RegistrationStatus.REGISTERED,
        userIndex: action.userIndex,
        elevatedAttemptsUsed: action.elevatedAttemptsUsed,
        lastCheckedTimestamp: Date.now(),
        errorMessage: null,
      };

    case 'SET_NOT_REGISTERED':
      console.log('ℹ️ [RegistrationContext] State transition: NOT_REGISTERED');
      return {
        status: RegistrationStatus.NOT_REGISTERED,
        userIndex: null,
        elevatedAttemptsUsed: null,
        lastCheckedTimestamp: Date.now(),
        errorMessage: null,
      };

    case 'SET_ERROR':
      console.error('❌ [RegistrationContext] State transition: ERROR', action.error);
      return {
        ...state,
        status: RegistrationStatus.ERROR,
        errorMessage: action.error,
        lastCheckedTimestamp: Date.now(),
      };

    case 'RESET':
      console.log('🔄 [RegistrationContext] State transition: RESET');
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export function RegistrationProvider({ children }: RegistrationProviderProps) {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  const [state, dispatch] = useReducer(registrationReducer, initialState);
  
  // Track ongoing check to prevent duplicate requests
  const checkInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track previous wallet to detect changes
  const prevWalletRef = useRef<string | null>(null);

  /**
   * Core registration check function
   * Fetches UserMetadata from on-chain and updates state
   */
  const checkRegistrationStatus = useCallback(async (
    conn: Connection,
    authority: PublicKey,
    forceCheck: boolean = false
  ): Promise<void> => {
    // Prevent duplicate simultaneous checks
    if (checkInProgressRef.current && !forceCheck) {
      console.log('⏩ [RegistrationContext] Check already in progress, skipping duplicate request');
      return;
    }

    // Cancel any ongoing check if forcing
    if (forceCheck && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    checkInProgressRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    dispatch({ type: 'START_CHECK' });

    try {
      console.log('🔍 [RegistrationContext] Checking registration for:', authority.toBase58());
      
      // Canonical on-chain check via UserMetadata PDA
      const isRegistered = await isUserRegistered(conn, authority);

      // Check if this request was aborted
      if (abortController.signal.aborted) {
        console.log('⚠️ [RegistrationContext] Check was aborted');
        return;
      }

      if (isRegistered) {
        // Fetch metadata details for user index and elevated attempts
        const { fetchUserMetadata } = await import('@/utils/userMetadata');
        const metadata = await fetchUserMetadata(conn, authority);

        if (abortController.signal.aborted) return;

        if (metadata) {
          dispatch({
            type: 'SET_REGISTERED',
            userIndex: metadata.user_index,
            elevatedAttemptsUsed: metadata.elevated_mint_attempts_used,
          });
        } else {
          // Edge case: isUserRegistered returned true but fetchUserMetadata failed
          // Treat as registered but with unknown metadata
          console.warn('⚠️ [RegistrationContext] User registered but metadata fetch failed');
          dispatch({
            type: 'SET_REGISTERED',
            userIndex: 0,
            elevatedAttemptsUsed: 0,
          });
        }
      } else {
        dispatch({ type: 'SET_NOT_REGISTERED' });
      }
    } catch (error) {
      if (abortController.signal.aborted) return;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error during registration check';
      console.error('❌ [RegistrationContext] Registration check failed:', errorMessage);
      dispatch({ type: 'SET_ERROR', error: errorMessage });
    } finally {
      checkInProgressRef.current = false;
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  /**
   * Public refetch function for manual refresh
   */
  const refetchStatus = useCallback(async (): Promise<void> => {
    if (!publicKey || !connected) {
      console.warn('⚠️ [RegistrationContext] Cannot refetch: wallet not connected');
      return;
    }

    console.log('🔄 [RegistrationContext] Manual refetch requested');
    await checkRegistrationStatus(connection, publicKey, true);
  }, [connection, publicKey, connected, checkRegistrationStatus]);

  /**
   * Auto-check registration when wallet connects or changes
   */
  useEffect(() => {
    const currentWallet = publicKey?.toBase58() || null;

    // Reset state if wallet disconnected
    if (!connected || !publicKey) {
      if (state.status !== RegistrationStatus.UNKNOWN) {
        dispatch({ type: 'RESET' });
      }
      prevWalletRef.current = null;
      return;
    }

    // Skip check if wallet hasn't changed and we already have status
    if (
      currentWallet === prevWalletRef.current &&
      state.status !== RegistrationStatus.UNKNOWN &&
      state.status !== RegistrationStatus.ERROR
    ) {
      return;
    }

    prevWalletRef.current = currentWallet;

    // Perform initial check with small delay to batch rapid wallet changes
    const timeoutId = setTimeout(() => {
      checkRegistrationStatus(connection, publicKey, false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [connection, publicKey, connected, state.status, checkRegistrationStatus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Derived state
  const isLoading = state.status === RegistrationStatus.CHECKING;
  const isStatusKnown = 
    state.status === RegistrationStatus.REGISTERED ||
    state.status === RegistrationStatus.NOT_REGISTERED;

  const contextValue: RegistrationContextValue = {
    ...state,
    refetchStatus,
    isLoading,
    isStatusKnown,
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
    </RegistrationContext.Provider>
  );
}

// ============================================================================
// HOOK FOR CONSUMING CONTEXT
// ============================================================================

/**
 * Hook to access registration context
 * @throws Error if used outside RegistrationProvider
 */
export function useRegistrationStatus(): RegistrationContextValue {
  const context = useContext(RegistrationContext);
  
  if (!context) {
    throw new Error('useRegistrationStatus must be used within a RegistrationProvider');
  }
  
  return context;
}

// Export types for consumers
export type { RegistrationContextValue, RegistrationState };
