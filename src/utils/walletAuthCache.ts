/**
 * Custom Authorization Cache for Mobile Wallet Adapter
 * 
 * This implementation stores authorization in memory only (not persisted).
 * This ensures that each browser session requires a fresh authorization approval
 * from the user, preventing the issue where the wallet app returns immediately
 * without showing the approval dialog.
 * 
 * The default cache from @solana-mobile/wallet-adapter-mobile persists
 * authorizations to browser storage (localStorage/IndexedDB), which causes
 * the wallet app to auto-approve on subsequent visits without user interaction.
 */

/**
 * In-memory (non-persistent) authorization cache
 * 
 * Benefits:
 * - Fresh authorization required on each page load
 * - User always sees approval dialog in wallet app
 * - More secure - no stale authorizations
 */
export function createInMemoryAuthorizationCache() {
  let cachedAuth: unknown;

  return {
    async clear(): Promise<void> {
      cachedAuth = undefined;
    },
    
    async get(): Promise<unknown> {
      return cachedAuth;
    },
    
    async set(auth: unknown): Promise<void> {
      cachedAuth = auth;
    },
  };
}
