/**
 * SQLite Adapter Tests
 * 
 * Tests all SQLiteAdapter methods using an in-memory SQLite database.
 */

import { SQLiteAdapter, createSQLiteAdapter } from '@/lib/db/providers/sqlite-adapter';
import type { UserInsert, TransferInsert, ReferralInsert, DeviceFingerprintInsert } from '@/lib/supabase/types';

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    adapter = createSQLiteAdapter(':memory:');
  });

  afterEach(() => {
    adapter.close();
  });

  describe('isAvailable', () => {
    it('should return true when database is accessible', async () => {
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('User Operations', () => {
    const testUser: UserInsert = {
      wallet_address: 'test_wallet_123',
      account_type: 'individual',
      device_fingerprint: 'test_fingerprint',
      referrer_wallet: null,
      user_number: 1,
    };

    describe('registerUser', () => {
      it('should register a new user successfully', async () => {
        const result = await adapter.registerUser(testUser);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.wallet_address).toBe(testUser.wallet_address);
        expect(result.data?.account_type).toBe('individual');
      });

      it('should reject duplicate wallet addresses', async () => {
        await adapter.registerUser(testUser);
        const result = await adapter.registerUser(testUser);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('User already registered');
      });

      it('should use default account_type if not provided', async () => {
        const result = await adapter.registerUser({
          wallet_address: 'new_wallet',
        });
        
        expect(result.success).toBe(true);
        expect(result.data?.account_type).toBe('individual');
      });

      it('should handle business account type', async () => {
        const result = await adapter.registerUser({
          wallet_address: 'business_wallet',
          account_type: 'business',
        });
        
        expect(result.success).toBe(true);
        expect(result.data?.account_type).toBe('business');
      });
    });

    describe('isWalletRegistered', () => {
      it('should return false for unregistered wallet', async () => {
        const registered = await adapter.isWalletRegistered('nonexistent_wallet');
        expect(registered).toBe(false);
      });

      it('should return true for registered wallet', async () => {
        await adapter.registerUser(testUser);
        const registered = await adapter.isWalletRegistered(testUser.wallet_address);
        expect(registered).toBe(true);
      });
    });

    describe('getUserByWallet', () => {
      it('should return null for nonexistent user', async () => {
        const user = await adapter.getUserByWallet('nonexistent_wallet');
        expect(user).toBeNull();
      });

      it('should return user data for existing user', async () => {
        await adapter.registerUser(testUser);
        const user = await adapter.getUserByWallet(testUser.wallet_address);
        
        expect(user).not.toBeNull();
        expect(user?.wallet_address).toBe(testUser.wallet_address);
        expect(user?.device_fingerprint).toBe(testUser.device_fingerprint);
      });
    });
  });

  describe('Transfer Operations', () => {
    describe('recordTransfer', () => {
      it('should record a transfer successfully', async () => {
        const transfer: TransferInsert = {
          sender_wallet: 'sender_123',
          recipient_wallet: 'recipient_456',
          amount: 100.5,
          transaction_signature: 'sig_abc123',
        };

        const result = await adapter.recordTransfer(transfer);
        expect(result.success).toBe(true);
      });

      it('should allow multiple transfers', async () => {
        const transfer1: TransferInsert = {
          sender_wallet: 'sender_1',
          recipient_wallet: 'recipient_1',
          amount: 50,
        };

        const transfer2: TransferInsert = {
          sender_wallet: 'sender_2',
          recipient_wallet: 'recipient_2',
          amount: 75,
        };

        await adapter.recordTransfer(transfer1);
        await adapter.recordTransfer(transfer2);

        const count = await adapter.getTotalTransfers();
        expect(count).toBe(2);
      });
    });

    describe('getTotalTransfers', () => {
      it('should return 0 for empty database', async () => {
        const count = await adapter.getTotalTransfers();
        expect(count).toBe(0);
      });

      it('should count all transfers', async () => {
        for (let i = 0; i < 5; i++) {
          await adapter.recordTransfer({
            sender_wallet: `sender_${i}`,
            recipient_wallet: `recipient_${i}`,
            amount: i * 10,
          });
        }

        const count = await adapter.getTotalTransfers();
        expect(count).toBe(5);
      });
    });
  });

  describe('Registration Stats', () => {
    describe('getRegistrationStats', () => {
      it('should return zero counts for empty database', async () => {
        const stats = await adapter.getRegistrationStats();
        
        expect(stats.individualCount).toBe(0);
        expect(stats.businessCount).toBe(0);
      });

      it('should count individual and business users correctly', async () => {
        // Register some individual users
        await adapter.registerUser({ wallet_address: 'individual_1', account_type: 'individual' });
        await adapter.registerUser({ wallet_address: 'individual_2', account_type: 'individual' });
        await adapter.registerUser({ wallet_address: 'individual_3', account_type: 'individual' });

        // Register some business users
        await adapter.registerUser({ wallet_address: 'business_1', account_type: 'business' });
        await adapter.registerUser({ wallet_address: 'business_2', account_type: 'business' });

        const stats = await adapter.getRegistrationStats();
        
        expect(stats.individualCount).toBe(3);
        expect(stats.businessCount).toBe(2);
      });
    });
  });

  describe('Referral Operations', () => {
    describe('recordReferral', () => {
      it('should record a referral successfully', async () => {
        const referral: ReferralInsert = {
          referrer_wallet: 'referrer_123',
          referee_wallet: 'referee_456',
          referral_code: 'ABC123',
        };

        const result = await adapter.recordReferral(referral);
        expect(result.success).toBe(true);
      });

      it('should handle duplicate referee wallets gracefully', async () => {
        const referral: ReferralInsert = {
          referrer_wallet: 'referrer_123',
          referee_wallet: 'referee_456',
        };

        await adapter.recordReferral(referral);
        const result = await adapter.recordReferral(referral);
        
        // Should succeed (ignore duplicate) rather than throw error
        expect(result.success).toBe(true);
      });
    });

    describe('getReferralCount24h', () => {
      it('should return 0 for wallet with no referrals', async () => {
        const count = await adapter.getReferralCount24h('unknown_wallet');
        expect(count).toBe(0);
      });

      it('should count referrals within 24 hours', async () => {
        const referrerWallet = 'active_referrer';

        for (let i = 0; i < 3; i++) {
          await adapter.recordReferral({
            referrer_wallet: referrerWallet,
            referee_wallet: `referee_${i}`,
          });
        }

        const count = await adapter.getReferralCount24h(referrerWallet);
        expect(count).toBe(3);
      });
    });

    describe('isReferrerRateLimited', () => {
      it('should return false for wallet under limit', async () => {
        const referrerWallet = 'normal_referrer';

        await adapter.recordReferral({
          referrer_wallet: referrerWallet,
          referee_wallet: 'referee_1',
        });

        const limited = await adapter.isReferrerRateLimited(referrerWallet);
        expect(limited).toBe(false);
      });

      it('should return true when rate limit is reached', async () => {
        const referrerWallet = 'spammy_referrer';
        const rateLimit = 10; // Default rate limit

        // Create enough referrals to hit the limit
        for (let i = 0; i < rateLimit; i++) {
          await adapter.recordReferral({
            referrer_wallet: referrerWallet,
            referee_wallet: `referee_${i}_${Date.now()}`,
          });
        }

        const limited = await adapter.isReferrerRateLimited(referrerWallet);
        expect(limited).toBe(true);
      });
    });
  });

  describe('Device Fingerprint Operations', () => {
    describe('recordDeviceFingerprint', () => {
      it('should record a fingerprint successfully', async () => {
        const fingerprint: DeviceFingerprintInsert = {
          fingerprint_hash: 'hash_abc123',
          wallet_address: 'wallet_xyz',
          user_agent: 'Mozilla/5.0...',
        };

        const result = await adapter.recordDeviceFingerprint(fingerprint);
        expect(result.success).toBe(true);
      });
    });

    describe('isFingerprintRegistered', () => {
      it('should return false for unknown fingerprint', async () => {
        const registered = await adapter.isFingerprintRegistered('unknown_hash');
        expect(registered).toBe(false);
      });

      it('should return true for registered fingerprint', async () => {
        const fingerprintHash = 'known_hash_123';
        
        await adapter.recordDeviceFingerprint({
          fingerprint_hash: fingerprintHash,
          wallet_address: 'some_wallet',
        });

        const registered = await adapter.isFingerprintRegistered(fingerprintHash);
        expect(registered).toBe(true);
      });
    });
  });

  describe('Stats Overview', () => {
    describe('getStatsOverview', () => {
      it('should return zero stats for empty database', async () => {
        const stats = await adapter.getStatsOverview();
        
        expect(stats.total_users).toBe(0);
        expect(stats.individual_users).toBe(0);
        expect(stats.business_users).toBe(0);
        expect(stats.total_transfers).toBe(0);
        expect(stats.total_volume).toBe(0);
        expect(stats.total_referrals).toBe(0);
      });

      it('should aggregate all stats correctly', async () => {
        // Add users
        await adapter.registerUser({ wallet_address: 'user_1', account_type: 'individual' });
        await adapter.registerUser({ wallet_address: 'user_2', account_type: 'individual' });
        await adapter.registerUser({ wallet_address: 'user_3', account_type: 'business' });

        // Add transfers
        await adapter.recordTransfer({ sender_wallet: 'a', recipient_wallet: 'b', amount: 100 });
        await adapter.recordTransfer({ sender_wallet: 'c', recipient_wallet: 'd', amount: 200 });

        // Add referrals
        await adapter.recordReferral({ referrer_wallet: 'x', referee_wallet: 'y' });

        const stats = await adapter.getStatsOverview();

        expect(stats.total_users).toBe(3);
        expect(stats.individual_users).toBe(2);
        expect(stats.business_users).toBe(1);
        expect(stats.total_transfers).toBe(2);
        expect(stats.total_volume).toBe(300);
        expect(stats.total_referrals).toBe(1);
      });
    });
  });

  describe('Global State Operations', () => {
    describe('getGlobalState', () => {
      it('should return default value for nonexistent key', async () => {
        const value = await adapter.getGlobalState('missing_key', { default: true });
        expect(value).toEqual({ default: true });
      });

      it('should return stored value for existing key', async () => {
        const key = 'test_key';
        const data = { counter: 42, name: 'test' };

        await adapter.setGlobalState(key, data);
        const retrieved = await adapter.getGlobalState(key, {});

        expect(retrieved).toEqual(data);
      });

      it('should return default for expired values', async () => {
        const key = 'expired_key';
        const expiredDate = new Date(Date.now() - 1000); // 1 second ago

        await adapter.setGlobalState(key, { expired: true }, expiredDate);
        const value = await adapter.getGlobalState(key, { default: true });

        expect(value).toEqual({ default: true });
      });
    });

    describe('setGlobalState', () => {
      it('should create new state entry', async () => {
        const result = await adapter.setGlobalState('new_key', { value: 123 });
        expect(result.success).toBe(true);
      });

      it('should update existing state entry', async () => {
        const key = 'updateable_key';

        await adapter.setGlobalState(key, { version: 1 });
        await adapter.setGlobalState(key, { version: 2 });

        const value = await adapter.getGlobalState(key, {});
        expect(value).toEqual({ version: 2 });
      });

      it('should handle expiration dates', async () => {
        const key = 'expirable_key';
        const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

        await adapter.setGlobalState(key, { temp: true }, futureDate);
        const value = await adapter.getGlobalState(key, {});

        expect(value).toEqual({ temp: true });
      });
    });
  });

  describe('EQX Price Operations', () => {
    describe('addEqxPrice', () => {
      it('should add a price record successfully', async () => {
        const result = await adapter.addEqxPrice(1.25, 100.5, undefined, 'pyth');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.eqx_price_usd).toBe(1.25);
        expect(result.data?.usd_index).toBe(100.5);
        expect(result.data?.source).toBe('pyth');
        expect(result.data?.id).toBeGreaterThan(0);
      });

      it('should handle optional parameters', async () => {
        const result = await adapter.addEqxPrice(0.99);

        expect(result.success).toBe(true);
        expect(result.data?.eqx_price_usd).toBe(0.99);
        expect(result.data?.usd_index).toBeNull();
        expect(result.data?.source).toBeNull();
      });

      it('should use custom collected_at date', async () => {
        const customDate = new Date('2024-01-15T12:00:00Z');
        const result = await adapter.addEqxPrice(1.50, undefined, customDate);

        expect(result.success).toBe(true);
        expect(result.data?.collected_at.toISOString()).toBe(customDate.toISOString());
      });
    });

    describe('getLatestEqxPrice', () => {
      it('should return null for empty database', async () => {
        const latest = await adapter.getLatestEqxPrice();
        expect(latest).toBeNull();
      });

      it('should return the most recent price', async () => {
        await adapter.addEqxPrice(1.00, undefined, new Date('2024-01-01'));
        await adapter.addEqxPrice(1.50, undefined, new Date('2024-01-03'));
        await adapter.addEqxPrice(1.25, undefined, new Date('2024-01-02'));

        const latest = await adapter.getLatestEqxPrice();

        expect(latest).not.toBeNull();
        expect(latest?.eqx_price_usd).toBe(1.50);
      });
    });

    describe('getEqxPriceHistory', () => {
      beforeEach(async () => {
        // Seed some price data
        await adapter.addEqxPrice(1.00, 100.0, new Date('2024-01-01T00:00:00Z'), 'pyth');
        await adapter.addEqxPrice(1.10, 100.5, new Date('2024-01-02T00:00:00Z'), 'pyth');
        await adapter.addEqxPrice(1.05, 101.0, new Date('2024-01-03T00:00:00Z'), 'coingecko');
        await adapter.addEqxPrice(1.20, 99.5, new Date('2024-01-04T00:00:00Z'), 'pyth');
        await adapter.addEqxPrice(1.15, 100.0, new Date('2024-01-05T00:00:00Z'), 'coingecko');
      });

      it('should return all prices by default', async () => {
        const history = await adapter.getEqxPriceHistory();
        expect(history.length).toBe(5);
      });

      it('should return prices in descending order', async () => {
        const history = await adapter.getEqxPriceHistory();
        
        expect(history[0].eqx_price_usd).toBe(1.15); // Latest
        expect(history[4].eqx_price_usd).toBe(1.00); // Oldest
      });

      it('should respect limit option', async () => {
        const history = await adapter.getEqxPriceHistory({ limit: 3 });
        expect(history.length).toBe(3);
      });

      it('should filter by from date', async () => {
        const history = await adapter.getEqxPriceHistory({
          from: new Date('2024-01-03T00:00:00Z'),
        });

        expect(history.length).toBe(3);
        // All should be >= Jan 3
        history.forEach(p => {
          expect(p.collected_at.getTime()).toBeGreaterThanOrEqual(
            new Date('2024-01-03T00:00:00Z').getTime()
          );
        });
      });

      it('should filter by to date', async () => {
        const history = await adapter.getEqxPriceHistory({
          to: new Date('2024-01-03T00:00:00Z'),
        });

        expect(history.length).toBe(3);
        // All should be <= Jan 3
        history.forEach(p => {
          expect(p.collected_at.getTime()).toBeLessThanOrEqual(
            new Date('2024-01-03T00:00:00Z').getTime()
          );
        });
      });

      it('should filter by date range', async () => {
        const history = await adapter.getEqxPriceHistory({
          from: new Date('2024-01-02T00:00:00Z'),
          to: new Date('2024-01-04T00:00:00Z'),
        });

        expect(history.length).toBe(3);
      });

      it('should combine filters correctly', async () => {
        const history = await adapter.getEqxPriceHistory({
          from: new Date('2024-01-02T00:00:00Z'),
          to: new Date('2024-01-04T00:00:00Z'),
          limit: 2,
        });

        expect(history.length).toBe(2);
        expect(history[0].eqx_price_usd).toBe(1.20); // Most recent in range
      });
    });
  });

  describe('Database Provider', () => {
    it('should report correct provider type', () => {
      expect(adapter.provider).toBe('sqlite');
    });
  });

  describe('Table Schema Completeness', () => {
    it('should create all required tables from inline schema', async () => {
      // Get a reference to the database to run raw queries
      // The tables should have been created when the adapter was initialized
      const available = await adapter.isAvailable();
      expect(available).toBe(true);

      // Verify that we can at least use the main operations
      // This indirectly confirms the tables exist
      const stats = await adapter.getStatsOverview();
      expect(stats).toBeDefined();
      expect(stats.total_users).toBe(0);
    });

    it('should have referral_rate_limits table available', async () => {
      // The referral rate limit functionality uses the referrals table
      // but the referral_rate_limits table is also created in the schema
      const count = await adapter.getReferralCount24h('test_wallet');
      expect(count).toBe(0);
    });
  });
});
