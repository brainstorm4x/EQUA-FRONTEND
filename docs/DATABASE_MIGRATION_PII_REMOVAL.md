# Database Migration Summary - Remove PII, Turso Only

This document summarizes the major changes made to the EQUA Frontend to implement privacy-first architecture with on-chain registration verification and Turso-only database support.

## Overview of Changes

### 1. Core Privacy Principle
**NO PII (Personally Identifiable Information) is stored in the database**
- User registration verification is done **ON-CHAIN ONLY**
- Database is used for anonymous analytics and statistics only
- No wallet addresses or user-identifying information is stored

### 2. Schema Changes (`db/schema_turso.sql`)

#### Removed Tables
- `users` (contained wallet_address field)
- `transfers` (contained sender_wallet and recipient_wallet)
- `referrals` (contained referrer_wallet, referee_wallet, and referral_code)

#### New Anonymous Analytics Tables
- `registration_analytics` - Anonymous registration data with optional state/country
  - NO wallet addresses
  - Includes account_type, state, country, device_fingerprint
  - Used for geographic analytics only

- `transfer_analytics` - Anonymous transfer statistics
  - NO wallet addresses  
  - Only amount and transaction signature (for deduplication)

- `referral_analytics` - Anonymous referral statistics
  - NO wallet addresses or referral codes
  - Just counts and metadata

- `device_fingerprints` - For Sybil prevention
  - NO wallet address linkage
  - Just fingerprint hashes

### 3. Database Type System

Created new type definitions in `src/lib/db/types.ts`:
- Replaced old `User`, `Transfer`, `Referral` types
- New `RegistrationAnalytics`, `TransferAnalytics`, `ReferralAnalytics` types
- All PII fields removed from type definitions

### 4. Database Adapter Changes

#### Removed
- `src/lib/db/providers/sqlite-adapter.ts` - SQLite support removed
- `src/lib/db/providers/supabase-adapter.ts` - Supabase support removed
- `src/lib/supabase/` - Entire Supabase directory removed

#### Updated
- `src/lib/db/providers/turso-adapter.ts` - Completely rewritten
  - Implements new DatabaseAdapter interface
  - All methods now work with anonymous analytics only
  - Removed: `registerUser`, `isWalletRegistered`, `getUserByWallet`
  - Added: `recordRegistrationAnalytics`, `recordTransferAnalytics`, `recordReferralAnalytics`

#### Interface Changes (`src/lib/db/adapter.ts`)
- Removed wallet-based user lookups
- Removed referral rate limiting methods (moved to on-chain)
- Added geographic statistics methods
- Provider type now only 'turso' (removed 'sqlite' and 'supabase')

### 5. Component Updates

#### `src/components/GetStartedButton.tsx`
- Removed database check for registration status
- Now uses **ON-CHAIN VERIFICATION ONLY** via `isUserRegistered()`
- No longer calls `db.isWalletRegistered()`

#### `src/components/RegistrationForm.tsx`
- Added optional state/country input fields
- Updated metadata interface to include geographic data
- Modified `onSuccessfulRegistration` callback to record anonymous analytics
- No wallet addresses passed to database

#### `src/components/WalletDashboard.tsx`
- Updated transfer recording to not include wallet addresses
- Calls `recordTransfer(amount, signature)` instead of passing wallet addresses

#### `src/utils/transferTracking.ts`
- Simplified API to not accept wallet addresses
- Records anonymous transfer analytics via `recordTransferAnalytics()`

### 6. Dependency Cleanup

#### package.json Changes
- Removed: `@supabase/supabase-js`
- Removed: `better-sqlite3`
- Removed: `@types/better-sqlite3`
- Kept: `@libsql/client` (for Turso)

#### Configuration Updates
- `next.config.js` - Removed `'better-sqlite3': false` from webpack fallback
- `.env.example` - Updated to show only Turso configuration
- Removed all SQLite and Supabase environment variable references

### 7. Test Cleanup
- Removed: `__tests__/db/sqlite-adapter.test.ts`
- Existing tests continue to work as they don't depend on database

## Migration Path for Existing Deployments

If you have an existing deployment with SQLite or Supabase:

1. **Data Migration is NOT needed** - The old database was just for redundancy
   - Registration status is verified on-chain (source of truth)
   - Old database data can be safely discarded
   - No PII was stored that needs to be migrated

2. **Environment Variables**
   ```bash
   # Remove old variables
   # DB_PROVIDER (no longer used)
   # NEXT_PUBLIC_SUPABASE_URL (no longer used)
   # NEXT_PUBLIC_SUPABASE_ANON_KEY (no longer used)
   
   # Add new variables
   TURSO_DATABASE_URL=http://127.0.0.1:8080  # Local dev
   # or
   TURSO_DATABASE_URL=libsql://your-db.turso.io  # Production
   TURSO_AUTH_TOKEN=your-token-here  # Production only
   ```

3. **Apply New Schema**
   ```bash
   npm run db:sync:turso
   ```

4. **No Code Changes Required** - All changes are backward compatible
   - Registration still works the same way from user perspective
   - On-chain verification is primary (database was always secondary)

## Benefits of This Architecture

1. **Privacy-First**: No PII stored in database, can't be breached or misused
2. **Simplified**: Single database provider (Turso) reduces complexity
3. **Trustless**: Registration verification is on-chain (blockchain is source of truth)
4. **Compliance**: Easier GDPR/privacy law compliance (no personal data stored)
5. **Performance**: Turso provides edge distribution and low latency
6. **Analytics**: Still collect useful anonymous statistics for community insights

## Testing the Changes

```bash
# Type checking
npm run typecheck

# Build test
npm run build

# Run tests
npm test

# Start local development
turso dev --port 8080  # In one terminal
npm run dev           # In another terminal
```

## Files Changed Summary

**Schema:**
- `db/schema_turso.sql` - Complete rewrite with anonymous tables

**Type Definitions:**
- `src/lib/db/types.ts` - NEW file with privacy-first types
- `src/lib/db/adapter.ts` - Updated interface

**Database Layer:**
- `src/lib/db/providers/turso-adapter.ts` - Complete rewrite
- `src/lib/db/client.ts` - Simplified to Turso only
- `src/lib/db/index.ts` - Updated exports
- Removed: `sqlite-adapter.ts`, `supabase-adapter.ts`, `src/lib/supabase/*`

**Components:**
- `src/components/GetStartedButton.tsx` - Removed DB checks
- `src/components/RegistrationForm.tsx` - Added state/country fields
- `src/components/WalletDashboard.tsx` - Updated transfer recording

**Utilities:**
- `src/utils/transferTracking.ts` - Simplified API

**Configuration:**
- `package.json` - Removed SQLite/Supabase dependencies
- `next.config.js` - Removed SQLite webpack config
- `.env.example` - Updated with Turso-only config
- `README.md` - Updated documentation

**Tests:**
- Removed: `__tests__/db/sqlite-adapter.test.ts`

## Future Enhancements

While this migration establishes the privacy-first foundation, future enhancements could include:

1. **Enhanced Analytics** - More geographic insights (regions, continents)
2. **Time-Series Data** - Track registration/transfer trends over time
3. **Aggregated Insights** - Community dashboards without individual tracking
4. **Privacy Audit** - Regular reviews to ensure no PII creeps back in

## Questions or Issues?

If you encounter any issues with the migration:
1. Check that `TURSO_DATABASE_URL` is set correctly
2. Verify Turso server is running (local dev)
3. Run `npm run db:sync:turso` to apply schema
4. Check that you're using `npm install --legacy-peer-deps`
5. Review the console for any database connection errors

The system is designed to be resilient - if the database is unavailable, the app still functions using on-chain data and localStorage for analytics.
