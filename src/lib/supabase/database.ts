/**
 * EQUA Frontend Supabase Database Operations
 * 
 * Provides database operations with localStorage fallback for offline support.
 * Includes error handling, sync capabilities, and proper logging.
 */

import { supabase, isSupabaseAvailable } from './client';
import type {
  User,
  UserInsert,
  Transfer,
  TransferInsert,
  Referral,
  ReferralInsert,
  DeviceFingerprint,
  DeviceFingerprintInsert,
  StatsOverview,
  PendingOperation,
  LocalTransferStats,
  LocalRegistrationStats,
  LocalRegisteredKey,
  LocalReferrerData,
  LocalReferralEvent,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const SYNC_STATE_KEY = 'equa_sync_state';
const PENDING_OPS_KEY = 'equa_pending_operations';
const MAX_RETRY_COUNT = 3;

// PostgreSQL error codes
const POSTGRES_UNIQUE_VIOLATION = '23505';

// Rate limiting configuration (can be overridden via environment)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || String(24 * 60 * 60 * 1000), 10);
const REFERRAL_RATE_LIMIT = parseInt(process.env.NEXT_PUBLIC_REFERRAL_RATE_LIMIT || '10', 10);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a UUID v4 using crypto API when available
 */
function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Logs errors with context
 */
function logError(context: string, error: unknown): void {
  console.error(`[EQUA DB] ${context}:`, error);
}

/**
 * Logs info messages
 */
function logInfo(message: string): void {
  console.log(`[EQUA DB] ${message}`);
}

// ============================================================================
// localStorage Helpers
// ============================================================================

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logError('Failed to save to localStorage', error);
  }
}

// ============================================================================
// Pending Operations Queue (for offline sync)
// ============================================================================

interface PendingOperationInput {
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: unknown;
}

function getPendingOperations(): PendingOperation[] {
  return getFromStorage<PendingOperation[]>(PENDING_OPS_KEY, []);
}

function savePendingOperations(ops: PendingOperation[]): void {
  setToStorage(PENDING_OPS_KEY, ops);
}

function addPendingOperation(op: PendingOperationInput): void {
  const ops = getPendingOperations();
  ops.push({
    id: generateUUID(),
    type: op.type,
    table: op.table,
    data: op.data as Record<string, unknown>,
    timestamp: Date.now(),
    retryCount: 0,
  });
  savePendingOperations(ops);
}

/**
 * Syncs pending operations when online
 */
export async function syncPendingOperations(): Promise<{ synced: number; failed: number }> {
  const ops = getPendingOperations();
  if (ops.length === 0) return { synced: 0, failed: 0 };

  const isOnline = await isSupabaseAvailable();
  if (!isOnline) return { synced: 0, failed: ops.length };

  let synced = 0;
  let failed = 0;
  const remainingOps: PendingOperation[] = [];

  for (const op of ops) {
    try {
      if (op.type === 'insert') {
        const { error } = await supabase.from(op.table).insert(op.data);
        if (error) throw error;
        synced++;
      }
    } catch (error) {
      logError(`Failed to sync operation ${op.id}`, error);
      if (op.retryCount < MAX_RETRY_COUNT) {
        remainingOps.push({ ...op, retryCount: op.retryCount + 1 });
      }
      failed++;
    }
  }

  savePendingOperations(remainingOps);
  logInfo(`Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

// ============================================================================
// User Operations
// ============================================================================

// localStorage keys for user data
const REGISTERED_KEYS_KEY = 'equa_registered_public_keys';

interface RegisteredKeysRegistry {
  keys: LocalRegisteredKey[];
  lastUpdated: number;
}

/**
 * Registers a new user
 */
export async function registerUser(data: UserInsert): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Try Supabase first
    const isOnline = await isSupabaseAvailable();
    
    if (isOnline) {
      const { data: user, error } = await supabase
        .from('users')
        .insert(data)
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, the user is already registered
        if (error.code === POSTGRES_UNIQUE_VIOLATION) {
          return { success: false, error: 'User already registered' };
        }
        throw error;
      }

      // Also update localStorage for offline access
      updateLocalRegisteredKeys(data.wallet_address, data.device_fingerprint);
      
      logInfo(`User registered: ${data.wallet_address.slice(0, 8)}...`);
      return { success: true, user };
    }

    // Fallback to localStorage
    updateLocalRegisteredKeys(data.wallet_address, data.device_fingerprint);
    
    // Queue for later sync
    addPendingOperation({
      type: 'insert',
      table: 'users',
      data,
    });

    logInfo(`User registered locally (offline): ${data.wallet_address.slice(0, 8)}...`);
    return { success: true };
  } catch (error) {
    logError('Failed to register user', error);
    
    // Last resort: localStorage only
    updateLocalRegisteredKeys(data.wallet_address, data.device_fingerprint);
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function updateLocalRegisteredKeys(walletAddress: string, fingerprint?: string | null): void {
  const registry = getFromStorage<RegisteredKeysRegistry>(REGISTERED_KEYS_KEY, { keys: [], lastUpdated: 0 });
  
  if (!registry.keys.some(k => k.publicKey === walletAddress)) {
    registry.keys.push({
      publicKey: walletAddress,
      registeredAt: Date.now(),
      deviceFingerprint: fingerprint || undefined,
    });
    registry.lastUpdated = Date.now();
    setToStorage(REGISTERED_KEYS_KEY, registry);
  }
}

/**
 * Checks if a wallet is registered
 */
export async function isWalletRegistered(walletAddress: string): Promise<boolean> {
  try {
    // Check localStorage first (fast)
    const registry = getFromStorage<RegisteredKeysRegistry>(REGISTERED_KEYS_KEY, { keys: [], lastUpdated: 0 });
    if (registry.keys.some(k => k.publicKey === walletAddress)) {
      return true;
    }

    // Check Supabase if online
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (!error && data) {
        // Update localStorage cache
        updateLocalRegisteredKeys(walletAddress);
        return true;
      }
    }

    return false;
  } catch (error) {
    logError('Failed to check wallet registration', error);
    // Fallback to localStorage only
    const registry = getFromStorage<RegisteredKeysRegistry>(REGISTERED_KEYS_KEY, { keys: [], lastUpdated: 0 });
    return registry.keys.some(k => k.publicKey === walletAddress);
  }
}

/**
 * Gets user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const isOnline = await isSupabaseAvailable();
    if (!isOnline) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    logError('Failed to get user', error);
    return null;
  }
}

// ============================================================================
// Transfer Operations
// ============================================================================

const TRANSFER_STATS_KEY = 'equa_transfer_stats';

/**
 * Records a transfer
 */
export async function recordTransfer(data: TransferInsert): Promise<{ success: boolean; error?: string }> {
  try {
    // Update localStorage stats immediately
    updateLocalTransferStats();

    // Dispatch event for UI updates
    if (typeof window !== 'undefined') {
      const stats = getFromStorage<LocalTransferStats>(TRANSFER_STATS_KEY, { totalTransfers: 0, lastUpdated: 0 });
      window.dispatchEvent(new CustomEvent('equa_transfer_recorded', {
        detail: { totalTransfers: stats.totalTransfers }
      }));
    }

    // Try Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { error } = await supabase.from('transfers').insert(data);
      if (error) throw error;
      logInfo('Transfer recorded to Supabase');
      return { success: true };
    }

    // Queue for later sync
    addPendingOperation({
      type: 'insert',
      table: 'transfers',
      data,
    });

    logInfo('Transfer recorded locally (offline)');
    return { success: true };
  } catch (error) {
    logError('Failed to record transfer', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function updateLocalTransferStats(): void {
  const stats = getFromStorage<LocalTransferStats>(TRANSFER_STATS_KEY, { totalTransfers: 0, lastUpdated: 0 });
  stats.totalTransfers += 1;
  stats.lastUpdated = Date.now();
  setToStorage(TRANSFER_STATS_KEY, stats);
}

/**
 * Gets total transfer count
 */
export async function getTotalTransfers(): Promise<number> {
  try {
    // Get local stats
    const localStats = getFromStorage<LocalTransferStats>(TRANSFER_STATS_KEY, { totalTransfers: 0, lastUpdated: 0 });

    // Try to get from Supabase for accuracy
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { count, error } = await supabase
        .from('transfers')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        // Return the higher of Supabase or local (in case of pending syncs)
        return Math.max(count, localStats.totalTransfers);
      }
    }

    return localStats.totalTransfers;
  } catch (error) {
    logError('Failed to get transfer count', error);
    const localStats = getFromStorage<LocalTransferStats>(TRANSFER_STATS_KEY, { totalTransfers: 0, lastUpdated: 0 });
    return localStats.totalTransfers;
  }
}

// ============================================================================
// Registration Stats Operations
// ============================================================================

const REGISTRATION_STATS_KEY = 'equa_registration_stats';

/**
 * Gets registration statistics
 */
export async function getRegistrationStats(): Promise<LocalRegistrationStats> {
  try {
    // Get local stats
    const localStats = getFromStorage<LocalRegistrationStats>(REGISTRATION_STATS_KEY, {
      individualCount: 0,
      businessCount: 0,
      lastUpdated: 0,
    });

    // Try Supabase for accurate counts
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { data, error } = await supabase
        .from('stats_overview')
        .select('individual_users, business_users')
        .single();

      if (!error && data) {
        return {
          individualCount: Math.max(data.individual_users, localStats.individualCount),
          businessCount: Math.max(data.business_users, localStats.businessCount),
          lastUpdated: Date.now(),
        };
      }
    }

    return localStats;
  } catch (error) {
    logError('Failed to get registration stats', error);
    return getFromStorage<LocalRegistrationStats>(REGISTRATION_STATS_KEY, {
      individualCount: 0,
      businessCount: 0,
      lastUpdated: 0,
    });
  }
}

/**
 * Records a registration in stats
 */
export function recordRegistrationStats(accountType: 'individual' | 'business'): void {
  const stats = getFromStorage<LocalRegistrationStats>(REGISTRATION_STATS_KEY, {
    individualCount: 0,
    businessCount: 0,
    lastUpdated: 0,
  });

  if (accountType === 'individual') {
    stats.individualCount += 1;
  } else {
    stats.businessCount += 1;
  }
  stats.lastUpdated = Date.now();

  setToStorage(REGISTRATION_STATS_KEY, stats);
}

// ============================================================================
// Referral Operations
// ============================================================================

const REFERRAL_REGISTRY_KEY = 'equa_referral_rate_limit_registry';

/**
 * Records a referral
 */
export async function recordReferral(data: ReferralInsert): Promise<{ success: boolean; error?: string }> {
  try {
    // Update local rate limiting
    updateLocalReferralTracking(data.referrer_wallet, data.referee_wallet);

    // Try Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { error } = await supabase.from('referrals').insert(data);
      if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error; // Ignore duplicate
      return { success: true };
    }

    // Queue for later sync
    addPendingOperation({
      type: 'insert',
      table: 'referrals',
      data,
    });

    return { success: true };
  } catch (error) {
    logError('Failed to record referral', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function updateLocalReferralTracking(referrerWallet: string, refereeWallet: string): void {
  const registry = getFromStorage<Record<string, LocalReferrerData>>(REFERRAL_REGISTRY_KEY, {});
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  let data = registry[referrerWallet];

  if (!data) {
    data = {
      referrerAddress: referrerWallet,
      referrals: [],
      totalReferrals: 0,
      isRateLimited: false,
      lastUpdated: now,
    };
  }

  // Clean up expired events
  data.referrals = data.referrals.filter(r => r.timestamp > cutoff);

  // Add new referral
  data.referrals.push({
    timestamp: now,
    refereeAddress: refereeWallet,
  });

  data.totalReferrals += 1;
  data.isRateLimited = data.referrals.length >= REFERRAL_RATE_LIMIT;
  data.lastUpdated = now;

  registry[referrerWallet] = data;
  setToStorage(REFERRAL_REGISTRY_KEY, registry);
}

/**
 * Checks if referrer is rate limited
 */
export async function isReferrerRateLimited(referrerWallet: string): Promise<boolean> {
  try {
    // Check local first
    const registry = getFromStorage<Record<string, LocalReferrerData>>(REFERRAL_REGISTRY_KEY, {});
    const data = registry[referrerWallet];
    
    if (data) {
      const now = Date.now();
      const cutoff = now - RATE_LIMIT_WINDOW_MS;
      const validReferrals = data.referrals.filter(r => r.timestamp > cutoff);
      if (validReferrals.length >= REFERRAL_RATE_LIMIT) {
        return true;
      }
    }

    // Check Supabase for more accurate count
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', referrerWallet)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

      if (!error && count !== null) {
        return count >= REFERRAL_RATE_LIMIT;
      }
    }

    return false;
  } catch (error) {
    logError('Failed to check rate limit', error);
    return false;
  }
}

/**
 * Gets referral count in last 24 hours
 */
export async function getReferralCount24h(referrerWallet: string): Promise<number> {
  try {
    // Get local count
    const registry = getFromStorage<Record<string, LocalReferrerData>>(REFERRAL_REGISTRY_KEY, {});
    const data = registry[referrerWallet];
    
    let localCount = 0;
    if (data) {
      const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
      localCount = data.referrals.filter(r => r.timestamp > cutoff).length;
    }

    // Try Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', referrerWallet)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

      if (!error && count !== null) {
        return Math.max(count, localCount);
      }
    }

    return localCount;
  } catch (error) {
    logError('Failed to get referral count', error);
    return 0;
  }
}

// ============================================================================
// Device Fingerprint Operations
// ============================================================================

const FINGERPRINTS_KEY = 'equa_registered_fingerprints';

/**
 * Records a device fingerprint
 */
export async function recordDeviceFingerprint(data: DeviceFingerprintInsert): Promise<{ success: boolean; error?: string }> {
  try {
    // Update localStorage
    const fingerprints = getFromStorage<string[]>(FINGERPRINTS_KEY, []);
    if (!fingerprints.includes(data.fingerprint_hash)) {
      fingerprints.push(data.fingerprint_hash);
      setToStorage(FINGERPRINTS_KEY, fingerprints);
    }

    // Try Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { error } = await supabase.from('device_fingerprints').insert(data);
      if (error && error.code !== POSTGRES_UNIQUE_VIOLATION) throw error;
      return { success: true };
    }

    // Queue for later sync
    addPendingOperation({
      type: 'insert',
      table: 'device_fingerprints',
      data,
    });

    return { success: true };
  } catch (error) {
    logError('Failed to record fingerprint', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Checks if fingerprint exists (for Sybil detection)
 */
export async function isFingerprintRegistered(fingerprintHash: string): Promise<boolean> {
  try {
    // Check localStorage first
    const fingerprints = getFromStorage<string[]>(FINGERPRINTS_KEY, []);
    if (fingerprints.includes(fingerprintHash)) {
      return true;
    }

    // Check Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('id')
        .eq('fingerprint_hash', fingerprintHash)
        .single();

      if (!error && data) {
        // Update localStorage cache
        fingerprints.push(fingerprintHash);
        setToStorage(FINGERPRINTS_KEY, fingerprints);
        return true;
      }
    }

    return false;
  } catch (error) {
    logError('Failed to check fingerprint', error);
    const fingerprints = getFromStorage<string[]>(FINGERPRINTS_KEY, []);
    return fingerprints.includes(fingerprintHash);
  }
}

// ============================================================================
// Stats Overview
// ============================================================================

/**
 * Gets overall statistics
 */
export async function getStatsOverview(): Promise<StatsOverview> {
  const defaultStats: StatsOverview = {
    total_users: 0,
    individual_users: 0,
    business_users: 0,
    total_transfers: 0,
    total_volume: 0,
    total_referrals: 0,
  };

  try {
    // Get local stats
    const localRegStats = getFromStorage<LocalRegistrationStats>(REGISTRATION_STATS_KEY, {
      individualCount: 0,
      businessCount: 0,
      lastUpdated: 0,
    });
    const localTransferStats = getFromStorage<LocalTransferStats>(TRANSFER_STATS_KEY, {
      totalTransfers: 0,
      lastUpdated: 0,
    });

    const localStats: StatsOverview = {
      total_users: localRegStats.individualCount + localRegStats.businessCount,
      individual_users: localRegStats.individualCount,
      business_users: localRegStats.businessCount,
      total_transfers: localTransferStats.totalTransfers,
      total_volume: 0,
      total_referrals: 0,
    };

    // Try Supabase
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { data, error } = await supabase
        .from('stats_overview')
        .select('*')
        .single();

      if (!error && data) {
        // Return max of Supabase or local stats
        return {
          total_users: Math.max(data.total_users, localStats.total_users),
          individual_users: Math.max(data.individual_users, localStats.individual_users),
          business_users: Math.max(data.business_users, localStats.business_users),
          total_transfers: Math.max(data.total_transfers, localStats.total_transfers),
          total_volume: data.total_volume,
          total_referrals: data.total_referrals,
        };
      }
    }

    return localStats;
  } catch (error) {
    logError('Failed to get stats overview', error);
    return defaultStats;
  }
}

// ============================================================================
// Global State Operations
// ============================================================================

/**
 * Gets a global state value
 */
export async function getGlobalState<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { data, error } = await supabase
        .from('global_state')
        .select('state_value, expires_at')
        .eq('state_key', key)
        .single();

      if (!error && data) {
        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return defaultValue;
        }
        return data.state_value as T;
      }
    }

    return defaultValue;
  } catch (error) {
    logError(`Failed to get global state: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Sets a global state value
 */
export async function setGlobalState<T extends Record<string, unknown>>(
  key: string,
  value: T,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const isOnline = await isSupabaseAvailable();
    if (isOnline) {
      const { error } = await supabase.rpc('upsert_global_state', {
        p_state_key: key,
        p_state_value: value,
        p_expires_at: expiresAt?.toISOString() || null,
      });

      if (error) throw error;
      return { success: true };
    }

    return { success: false, error: 'Offline' };
  } catch (error) {
    logError(`Failed to set global state: ${key}`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Cleanup and Maintenance
// ============================================================================

/**
 * Clears all local storage data (for testing/reset)
 */
export function clearAllLocalData(): void {
  const keysToRemove = [
    SYNC_STATE_KEY,
    PENDING_OPS_KEY,
    REGISTERED_KEYS_KEY,
    TRANSFER_STATS_KEY,
    REGISTRATION_STATS_KEY,
    REFERRAL_REGISTRY_KEY,
    FINGERPRINTS_KEY,
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  });

  logInfo('All local data cleared');
}

/**
 * Gets pending operations count
 */
export function getPendingOperationsCount(): number {
  return getPendingOperations().length;
}

// ============================================================================
// Export all operations
// ============================================================================

export const db = {
  // User operations
  registerUser,
  isWalletRegistered,
  getUserByWallet,
  
  // Transfer operations
  recordTransfer,
  getTotalTransfers,
  
  // Registration stats
  getRegistrationStats,
  recordRegistrationStats,
  
  // Referral operations
  recordReferral,
  isReferrerRateLimited,
  getReferralCount24h,
  
  // Fingerprint operations
  recordDeviceFingerprint,
  isFingerprintRegistered,
  
  // Stats
  getStatsOverview,
  
  // Global state
  getGlobalState,
  setGlobalState,
  
  // Sync
  syncPendingOperations,
  getPendingOperationsCount,
  
  // Cleanup
  clearAllLocalData,
};

export default db;
