/**
 * Custom Authorization Cache for Mobile Wallet Adapter
 * 
 * This implementation stores authorization in memory only (not persisted).
 * This ensures that each browser session requires a fresh authorization approval
 * from the user, preventing the issue where the wallet app returns immediately
 * without showing the approval dialog.
 * 
 * Solana Mobile Wallet Adapter uses this cache to store authorization results
 * between connections. By not persisting to localStorage or IndexedDB, we ensure
 * users see the approval screen every time they connect.
 */

// Type imports for internal use (not exported from main package)
type AuthorizationResult = any; // From @solana-mobile/mobile-wallet-adapter-protocol
type Authorization = any; // From @solana-mobile/wallet-standard-mobile

/**
 * In-memory (non-persistent) authorization cache
 * 
 * Benefits:
 * - Fresh authorization required on each page load
 * - User always sees approval dialog
 * - More secure - no stale authorizations
 * - Fixes issue where wallet returns without approval
 */
export function createInMemoryAuthorizationCache() {
  let authorizationResult: AuthorizationResult | Authorization | undefined;

  return {
    async clear(): Promise<void> {
      console.log('🗑️ [AuthCache] Clearing authorization cache');
      authorizationResult = undefined;
    },
    
    async get(): Promise<AuthorizationResult | Authorization | undefined> {
      console.log('📖 [AuthCache] Getting authorization:', authorizationResult ? 'Cached' : 'None');
      return authorizationResult;
    },
    
    async set(auth: AuthorizationResult | Authorization): Promise<void> {
      console.log('💾 [AuthCache] Setting authorization:', auth);
      authorizationResult = auth;
    },
  };
}

/**
 * No-op authorization cache that never stores anything
 * 
 * This forces a new authorization on EVERY connection attempt,
 * ensuring the approval dialog always appears.
 * 
 * Use this if the in-memory cache still causes issues.
 */
export function createNoOpAuthorizationCache() {
  return {
    async clear(): Promise<void> {
      console.log('🗑️ [AuthCache] NoOp clear');
    },
    
    async get(): Promise<AuthorizationResult | Authorization | undefined> {
      console.log('📖 [AuthCache] NoOp get - always returning undefined');
      return undefined;
    },
    
    async set(_auth: AuthorizationResult | Authorization): Promise<void> {
      console.log('💾 [AuthCache] NoOp set - not storing');
      // Don't store anything
    },
  };
}
