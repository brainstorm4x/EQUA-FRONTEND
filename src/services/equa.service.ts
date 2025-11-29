import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Request Caching and Deduplication
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  promise?: Promise<T>;
}

// Cache configuration
const CACHE_TTL_MS = 10000; // 10 second TTL for user data
const PRICE_CACHE_TTL_MS = 30000; // 30 second TTL for price data

export class EquaService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  constructor(private program: Program) {}

  /**
   * Get cached value or null if expired/missing
   */
  private getCached<T>(key: string, ttl: number = CACHE_TTL_MS): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set cache value
   */
  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Deduplicate identical concurrent requests
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = CACHE_TTL_MS
  ): Promise<T> {
    // Check cache first
    const cached = this.getCached<T>(key, ttl);
    if (cached !== null) return cached;
    
    // Check for pending request with same key
    const pending = this.pendingRequests.get(key);
    if (pending) return pending;
    
    // Create new request
    const promise = requestFn().then(result => {
      this.setCache(key, result);
      this.pendingRequests.delete(key);
      return result;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }

  async isUserRegistered(userPda: PublicKey): Promise<boolean> {
    const cacheKey = `registered:${userPda.toBase58()}`;
    
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const account = await this.program.account.userAccount.fetch(userPda);
        return !!account;
      } catch {
        return false;
      }
    });
  }

  async getUserAccount(userPda: PublicKey) {
    const cacheKey = `userAccount:${userPda.toBase58()}`;
    
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        return await this.program.account.userAccount.fetch(userPda);
      } catch (error) {
        console.error('Error fetching user account:', error);
        return null;
      }
    });
  }

  async getGlobalState(globalStatePda: PublicKey) {
    const cacheKey = `globalState:${globalStatePda.toBase58()}`;
    
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        return await this.program.account.globalState.fetch(globalStatePda);
      } catch (error) {
        console.error('Error fetching global state:', error);
        return null;
      }
    }, PRICE_CACHE_TTL_MS); // Longer TTL for global state
  }

  async initializeUser(
    userPda: PublicKey,
    authority: PublicKey,
    globalStatePda: PublicKey,
    referrer?: PublicKey
  ) {
    const now = Math.floor(Date.now() / 1000);
    const registrationTime = new BN(now);
    const lockUntil = new BN(now + 1000);

    const result = await this.program.methods
      .initializeUser(
        referrer || PublicKey.default,
        registrationTime,
        lockUntil
      )
      .accounts({
        userAccount: userPda,
        authority: authority,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    // Invalidate related caches after mutation
    this.invalidateUser(userPda);
    this.invalidateGlobalState(globalStatePda);
    
    return result;
  }

  async mintEqua(
    userPda: PublicKey,
    authority: PublicKey,
    globalStatePda: PublicKey
  ) {
    const dailyMintAmount = new BN(1000);
    
    const result = await this.program.methods
      .mintEqua(dailyMintAmount)
      .accounts({
        userAccount: userPda,
        authority: authority,
        globalState: globalStatePda,
      })
      .rpc();
    
    // Invalidate related caches after mutation
    this.invalidateUser(userPda);
    this.invalidateGlobalState(globalStatePda);
    
    return result;
  }

  // Memoized price calculation
  private priceCache: { value: number; timestamp: number; transactions: number } | null = null;
  
  async getCurrentPrice(globalStatePda: PublicKey): Promise<number> {
    const globalState = await this.getGlobalState(globalStatePda);
    if (!globalState) return 0.01;

    const transactions = globalState.totalTransactions?.toNumber() || 0;
    
    // Check if we have a cached price for the same transaction count
    if (this.priceCache && this.priceCache.transactions === transactions) {
      return this.priceCache.value;
    }
    
    const basePrice = 0.01;
    const increment = 0.0001;
    const price = basePrice + (transactions * increment);
    
    // Cache the price calculation
    this.priceCache = { value: price, timestamp: Date.now(), transactions };
    
    return price;
  }

  async getTimeUntilNextMint(userPda: PublicKey): Promise<number> {
    const userAccount = await this.getUserAccount(userPda);
    if (!userAccount) return 0;

    const lastMintTime = userAccount.lastMintTime?.toNumber() || 0;
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastMint = now - lastMintTime;
    const twentyFourHours = 24 * 60 * 60;

    if (timeSinceLastMint >= twentyFourHours) {
      return 0;
    }

    return twentyFourHours - timeSinceLastMint;
  }

  async getMintsThisMonth(userPda: PublicKey): Promise<number> {
    const userAccount = await this.getUserAccount(userPda);
    if (!userAccount) return 0;

    return userAccount.totalMints?.toNumber() || 0;
  }

  /**
   * Batch fetch multiple user accounts at once
   * More efficient than individual requests
   */
  async batchGetUserAccounts(userPdas: PublicKey[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Check cache first
    const uncachedPdas: PublicKey[] = [];
    for (const pda of userPdas) {
      const cacheKey = `userAccount:${pda.toBase58()}`;
      const cached = this.getCached(cacheKey);
      if (cached !== null) {
        results.set(pda.toBase58(), cached);
      } else {
        uncachedPdas.push(pda);
      }
    }
    
    // Fetch uncached accounts in parallel
    if (uncachedPdas.length > 0) {
      const fetchPromises = uncachedPdas.map(async (pda) => {
        try {
          const account = await this.program.account.userAccount.fetch(pda);
          const cacheKey = `userAccount:${pda.toBase58()}`;
          this.setCache(cacheKey, account);
          return { pda: pda.toBase58(), account };
        } catch {
          return { pda: pda.toBase58(), account: null };
        }
      });
      
      const fetchedAccounts = await Promise.all(fetchPromises);
      for (const { pda, account } of fetchedAccounts) {
        results.set(pda, account);
      }
    }
    
    return results;
  }

  /**
   * Invalidate user-related caches
   */
  invalidateUser(userPda: PublicKey): void {
    const base58 = userPda.toBase58();
    this.cache.delete(`registered:${base58}`);
    this.cache.delete(`userAccount:${base58}`);
  }

  /**
   * Invalidate global state cache
   */
  invalidateGlobalState(globalStatePda: PublicKey): void {
    this.cache.delete(`globalState:${globalStatePda.toBase58()}`);
    this.priceCache = null;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.priceCache = null;
    this.pendingRequests.clear();
  }
}
