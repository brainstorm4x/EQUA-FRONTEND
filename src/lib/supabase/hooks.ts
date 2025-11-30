/**
 * EQUA Frontend Supabase Hooks
 * 
 * React hooks for easy integration with Supabase in components.
 * Includes automatic sync, connection status, and data fetching.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseAvailable } from './client';
import { 
  syncPendingOperations, 
  getPendingOperationsCount,
  getStatsOverview,
  getTotalTransfers,
  getRegistrationStats,
  isWalletRegistered,
} from './database';
import type { StatsOverview, LocalRegistrationStats } from './types';

// ============================================================================
// Connection Status Hook
// ============================================================================

export interface UseSupabaseConnectionResult {
  isOnline: boolean;
  isChecking: boolean;
  pendingOperations: number;
  lastChecked: number | null;
  checkConnection: () => Promise<void>;
}

export function useSupabaseConnection(): UseSupabaseConnectionResult {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsChecking(true);
    try {
      const online = await isSupabaseAvailable();
      if (isMountedRef.current) {
        setIsOnline(online);
        setPendingOperations(getPendingOperationsCount());
        setLastChecked(Date.now());
      }
    } catch {
      if (isMountedRef.current) {
        setIsOnline(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Check on mount
    checkConnection();

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkConnection, 30000);

    // Listen for online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [checkConnection]);

  return {
    isOnline,
    isChecking,
    pendingOperations,
    lastChecked,
    checkConnection,
  };
}

// ============================================================================
// Auto Sync Hook
// ============================================================================

export interface UseAutoSyncResult {
  isSyncing: boolean;
  lastSyncResult: { synced: number; failed: number } | null;
  syncNow: () => Promise<void>;
}

export function useAutoSync(enabled: boolean = true): UseAutoSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const isMountedRef = useRef(true);

  const syncNow = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsSyncing(true);
    try {
      const result = await syncPendingOperations();
      if (isMountedRef.current) {
        setLastSyncResult(result);
      }
    } catch {
      // Sync failed silently
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!enabled) return;

    // Sync on mount
    syncNow();

    // Sync periodically (every 60 seconds)
    const interval = setInterval(syncNow, 60000);

    // Sync when coming back online
    const handleOnline = () => syncNow();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [enabled, syncNow]);

  return {
    isSyncing,
    lastSyncResult,
    syncNow,
  };
}

// ============================================================================
// Stats Hook
// ============================================================================

export interface UseStatsResult {
  stats: StatsOverview | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStatsOverview();
      if (isMountedRef.current) {
        setStats(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    refresh();

    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);

    // Listen for transfer events
    const handleTransfer = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('equa_transfer_recorded', handleTransfer);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('equa_transfer_recorded', handleTransfer);
      }
    };
  }, [refresh]);

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Transfer Count Hook
// ============================================================================

export interface UseTransferCountResult {
  count: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useTransferCount(): UseTransferCountResult {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    try {
      const total = await getTotalTransfers();
      if (isMountedRef.current) {
        setCount(total);
      }
    } catch {
      // Keep existing count on error
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    refresh();

    // Listen for transfer events
    const handleTransfer = (event: CustomEvent) => {
      if (isMountedRef.current) {
        setCount(event.detail?.totalTransfers || count + 1);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('equa_transfer_recorded', handleTransfer as EventListener);
    }

    return () => {
      isMountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('equa_transfer_recorded', handleTransfer as EventListener);
      }
    };
  }, [refresh, count]);

  return {
    count,
    isLoading,
    refresh,
  };
}

// ============================================================================
// Registration Stats Hook
// ============================================================================

export interface UseRegistrationStatsResult {
  stats: LocalRegistrationStats | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useRegistrationStats(): UseRegistrationStatsResult {
  const [stats, setStats] = useState<LocalRegistrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    try {
      const data = await getRegistrationStats();
      if (isMountedRef.current) {
        setStats(data);
      }
    } catch {
      // Keep existing stats on error
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  return {
    stats,
    isLoading,
    refresh,
  };
}

// ============================================================================
// Wallet Registration Check Hook
// ============================================================================

export interface UseWalletRegistrationResult {
  isRegistered: boolean | null;
  isChecking: boolean;
  check: () => Promise<void>;
}

export function useWalletRegistration(walletAddress: string | null): UseWalletRegistrationResult {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isMountedRef = useRef(true);

  const check = useCallback(async () => {
    if (!walletAddress || !isMountedRef.current) {
      setIsRegistered(null);
      return;
    }
    
    setIsChecking(true);
    try {
      const registered = await isWalletRegistered(walletAddress);
      if (isMountedRef.current) {
        setIsRegistered(registered);
      }
    } catch {
      if (isMountedRef.current) {
        setIsRegistered(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    isMountedRef.current = true;
    check();

    return () => {
      isMountedRef.current = false;
    };
  }, [check]);

  return {
    isRegistered,
    isChecking,
    check,
  };
}

// ============================================================================
// Combined Supabase Provider Hook
// ============================================================================

export interface UseSupabaseResult {
  connection: UseSupabaseConnectionResult;
  sync: UseAutoSyncResult;
  stats: UseStatsResult;
}

export function useSupabase(): UseSupabaseResult {
  const connection = useSupabaseConnection();
  const sync = useAutoSync(connection.isOnline);
  const stats = useStats();

  return {
    connection,
    sync,
    stats,
  };
}
