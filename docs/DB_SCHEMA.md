# EQUA Frontend Database Schema

This document describes the database schema used by the EQUA frontend application. The schema is based on the Supabase implementation and is designed to be compatible with both Supabase (PostgreSQL) and SQLite for local development.

## Tables

### users
Stores registered wallet addresses and their metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| wallet_address | TEXT | NOT NULL, UNIQUE | User's Solana wallet address |
| account_type | TEXT | NOT NULL, DEFAULT 'individual' | Either 'individual' or 'business' |
| device_fingerprint | TEXT | NULL | Device fingerprint for Sybil prevention |
| referrer_wallet | TEXT | NULL | Wallet address of the referrer |
| user_number | INTEGER | NULL | Sequential user number |
| registration_metadata | JSONB/TEXT | DEFAULT '{}' | Additional registration data |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | When the user registered |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update time |

**Indexes:**
- `idx_users_wallet_address` on `wallet_address`
- `idx_users_referrer` on `referrer_wallet`
- `idx_users_account_type` on `account_type`
- `idx_users_created_at` on `created_at`

### transfers
Tracks EQUA token transfers between users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| sender_wallet | TEXT | NOT NULL | Sender's wallet address |
| recipient_wallet | TEXT | NOT NULL | Recipient's wallet address |
| amount | DECIMAL(20,9) | NOT NULL | Transfer amount |
| transaction_signature | TEXT | UNIQUE | Solana transaction signature |
| transfer_metadata | JSONB/TEXT | DEFAULT '{}' | Additional transfer data |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | When the transfer occurred |

**Indexes:**
- `idx_transfers_sender` on `sender_wallet`
- `idx_transfers_recipient` on `recipient_wallet`
- `idx_transfers_created_at` on `created_at`
- `idx_transfers_signature` on `transaction_signature`

### referrals
Tracks referral relationships and events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| referrer_wallet | TEXT | NOT NULL | Referrer's wallet address |
| referee_wallet | TEXT | NOT NULL, UNIQUE | Referred user's wallet address |
| referral_code | TEXT | NULL | Referral code used |
| reward_amount | DECIMAL(20,9) | DEFAULT 0 | Reward amount |
| is_rate_limited | BOOLEAN | DEFAULT false | Whether this was rate limited |
| referral_metadata | JSONB/TEXT | DEFAULT '{}' | Additional referral data |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | When the referral occurred |

**Indexes:**
- `idx_referrals_referrer` on `referrer_wallet`
- `idx_referrals_referee` on `referee_wallet`
- `idx_referrals_code` on `referral_code`
- `idx_referrals_created_at` on `created_at`

### referral_rate_limits
Tracks referral rate limiting per wallet (24-hour window).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| referrer_wallet | TEXT | NOT NULL | Referrer's wallet address |
| referral_count | INTEGER | NOT NULL, DEFAULT 1 | Number of referrals in window |
| window_start | TIMESTAMP | NOT NULL, DEFAULT NOW | Window start time |
| window_end | TIMESTAMP | NOT NULL | Window end time (24h from start) |
| is_rate_limited | BOOLEAN | DEFAULT false | Whether rate limit is reached |
| rate_limit_metadata | JSONB/TEXT | DEFAULT '{}' | Additional metadata |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Created timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp |

**Indexes:**
- `idx_rate_limits_referrer` on `referrer_wallet`
- `idx_rate_limits_window` on `window_start, window_end`

### analytics
Stores aggregated analytics and statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| metric_name | TEXT | NOT NULL | Name of the metric |
| metric_value | DECIMAL(20,9) | NOT NULL, DEFAULT 0 | Metric value |
| metric_type | TEXT | NOT NULL, DEFAULT 'counter' | Type: 'counter', 'gauge', or 'histogram' |
| dimensions | JSONB/TEXT | DEFAULT '{}' | Additional dimensions |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT NOW | When recorded |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Created timestamp |

**Indexes:**
- `idx_analytics_metric` on `metric_name`
- `idx_analytics_type` on `metric_type`
- `idx_analytics_recorded_at` on `recorded_at`

### price_history
Stores historical EQUA price data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| price_usd | DECIMAL(20,9) | NOT NULL | Price in USD |
| epoch_number | INTEGER | NOT NULL | Epoch number |
| phase | TEXT | NOT NULL | Current phase |
| total_transactions | INTEGER | NOT NULL, DEFAULT 0 | Total transactions |
| price_metadata | JSONB/TEXT | DEFAULT '{}' | Additional price data |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT NOW | When recorded |

**Indexes:**
- `idx_price_history_recorded_at` on `recorded_at`
- `idx_price_history_epoch` on `epoch_number`

### device_fingerprints
Tracks device fingerprints for Sybil prevention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| fingerprint_hash | TEXT | NOT NULL | Hash of device fingerprint |
| wallet_address | TEXT | NOT NULL | Associated wallet address |
| user_agent | TEXT | NULL | User agent string |
| fingerprint_metadata | JSONB/TEXT | DEFAULT '{}' | Additional metadata |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Created timestamp |

**Indexes:**
- `idx_fingerprints_hash` on `fingerprint_hash`
- `idx_fingerprints_wallet` on `wallet_address`

### global_state
Caches global state data for frontend display.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| state_key | TEXT | NOT NULL, UNIQUE | Key identifier |
| state_value | JSONB/TEXT | NOT NULL, DEFAULT '{}' | State value |
| expires_at | TIMESTAMP | NULL | Expiration time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Created timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update timestamp |

**Indexes:**
- `idx_global_state_key` on `state_key`

### eqx_prices (NEW)
Tracks EQX token price history for oracle functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| collected_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When price was collected |
| eqx_price_usd | REAL | NOT NULL | EQX price in USD |
| usd_index | REAL | NULL | USD strength index |
| source | TEXT | NULL | Price source (e.g., 'pyth', 'coingecko') |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created timestamp |

**Indexes:**
- `idx_eqx_prices_collected_at` on `collected_at`
- `idx_eqx_prices_source` on `source`

## Views

### stats_overview
Provides aggregated statistics for the frontend.

| Column | Type | Description |
|--------|------|-------------|
| total_users | INTEGER | Total number of registered users |
| individual_users | INTEGER | Number of individual accounts |
| business_users | INTEGER | Number of business accounts |
| total_transfers | INTEGER | Total number of transfers |
| total_volume | DECIMAL | Total transfer volume |
| total_referrals | INTEGER | Total number of referrals |

### recent_activity
Shows recent user activity (last 100 events).

| Column | Type | Description |
|--------|------|-------------|
| activity_type | TEXT | Either 'registration' or 'transfer' |
| wallet | TEXT | Wallet address involved |
| created_at | TIMESTAMP | When the activity occurred |

## RPC Functions

### get_referral_count_24h(p_referrer_wallet TEXT)
Returns the number of referrals made by a wallet in the last 24 hours.

**Parameters:**
- `p_referrer_wallet`: The referrer's wallet address

**Returns:** INTEGER - Count of referrals in the last 24 hours

### is_wallet_registered(p_wallet_address TEXT)
Checks if a wallet address is registered.

**Parameters:**
- `p_wallet_address`: The wallet address to check

**Returns:** BOOLEAN - True if registered, false otherwise

### upsert_global_state(p_state_key TEXT, p_state_value JSONB, p_expires_at TIMESTAMP)
Inserts or updates a global state entry.

**Parameters:**
- `p_state_key`: The state key
- `p_state_value`: The state value (JSON)
- `p_expires_at`: Optional expiration timestamp

**Returns:** VOID

## Database Operations Used in Application

### User Operations
- `registerUser(data)` - Insert new user
- `isWalletRegistered(walletAddress)` - Check if wallet exists
- `getUserByWallet(walletAddress)` - Get user by wallet

### Transfer Operations
- `recordTransfer(data)` - Insert new transfer
- `getTotalTransfers()` - Count all transfers

### Referral Operations
- `recordReferral(data)` - Insert new referral
- `isReferrerRateLimited(referrerWallet)` - Check rate limit
- `getReferralCount24h(referrerWallet)` - Get 24h referral count

### Device Fingerprint Operations
- `recordDeviceFingerprint(data)` - Insert fingerprint
- `isFingerprintRegistered(fingerprintHash)` - Check if fingerprint exists

### Stats Operations
- `getRegistrationStats()` - Get individual/business counts
- `getStatsOverview()` - Get all stats

### Global State Operations
- `getGlobalState(key, defaultValue)` - Get state by key
- `setGlobalState(key, value, expiresAt)` - Set state (uses RPC)

### EQX Price Operations (NEW)
- `addEqxPrice(priceUsd, usdIndex?, collectedAt?, source?)` - Add price record
- `getLatestEqxPrice()` - Get most recent price
- `getEqxPriceHistory({ from?, to?, limit? })` - Get price history

## Provider Configuration

The database provider is configured via the `DB_PROVIDER` environment variable:

- `sqlite` - Use local SQLite database (default for development/CI)
- `supabase` - Use Supabase cloud database (for production)

```bash
# .env.local
DB_PROVIDER=sqlite  # or 'supabase'
```

When using SQLite, the database file is stored at `.data/equa.sqlite` (gitignored).
