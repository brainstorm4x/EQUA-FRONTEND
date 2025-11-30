# EQUA Frontend Supabase Integration

This directory contains the Supabase integration for the EQUA Frontend application, providing persistent data storage with localStorage fallback for offline support.

## Setup

### 1. Execute the SQL Schema

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard: https://qpmpybciyqdoxctvlyqn.supabase.co
2. Navigate to **SQL Editor**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run** to execute

This will create all necessary tables, indexes, RLS policies, functions, and views.

### 2. Environment Variables (Optional)

The Supabase credentials are already configured, but for better security in production, set these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qpmpybciyqdoxctvlyqn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered wallet addresses and metadata |
| `transfers` | EQUA token transfers between users |
| `referrals` | Referral relationships |
| `referral_rate_limits` | Rate limiting for referrals (24h window) |
| `analytics` | Aggregated metrics and statistics |
| `price_history` | Historical EQUA price data |
| `device_fingerprints` | Device tracking for Sybil prevention |
| `global_state` | Cached state data for frontend |

### Views

| View | Purpose |
|------|---------|
| `stats_overview` | Aggregated statistics (users, transfers, etc.) |
| `recent_activity` | Last 100 activities |

### Functions

| Function | Purpose |
|----------|---------|
| `get_referral_count_24h(wallet)` | Get referral count in last 24 hours |
| `is_wallet_registered(wallet)` | Check if wallet is registered |
| `upsert_global_state(key, value, expires)` | Insert or update global state |

## Usage

### Basic Operations

```typescript
import { 
  registerUser, 
  isWalletRegistered, 
  recordTransfer,
  getStatsOverview 
} from '@/lib/supabase';

// Register a new user
const result = await registerUser({
  wallet_address: 'ABC123...',
  account_type: 'individual',
  device_fingerprint: 'fingerprint_hash',
});

// Check if wallet is registered
const isRegistered = await isWalletRegistered('ABC123...');

// Record a transfer
await recordTransfer({
  sender_wallet: 'ABC123...',
  recipient_wallet: 'XYZ789...',
  amount: 100.5,
  transaction_signature: 'sig...',
});

// Get overall stats
const stats = await getStatsOverview();
console.log(stats.total_users, stats.total_transfers);
```

### React Hooks

```typescript
import { 
  useSupabase, 
  useStats, 
  useTransferCount,
  useWalletRegistration 
} from '@/lib/supabase';

function MyComponent() {
  // Full Supabase status
  const { connection, sync, stats } = useSupabase();
  
  // Just stats
  const { stats: overview, isLoading } = useStats();
  
  // Just transfer count
  const { count: transfers } = useTransferCount();
  
  // Check wallet registration
  const { isRegistered, isChecking } = useWalletRegistration(walletAddress);
  
  return (
    <div>
      <p>Online: {connection.isOnline ? 'Yes' : 'No'}</p>
      <p>Pending Syncs: {connection.pendingOperations}</p>
      <p>Total Users: {overview?.total_users}</p>
      <p>Total Transfers: {transfers}</p>
    </div>
  );
}
```

## Offline Support

The integration includes automatic localStorage fallback:

1. **Write Operations**: Data is saved to both Supabase and localStorage
2. **Offline Mode**: Operations queue locally and sync when online
3. **Read Operations**: Try Supabase first, fall back to localStorage

### Syncing Pending Operations

```typescript
import { syncPendingOperations, getPendingOperationsCount } from '@/lib/supabase';

// Check pending operations
const count = getPendingOperationsCount();
console.log(`${count} operations pending sync`);

// Manually trigger sync
const { synced, failed } = await syncPendingOperations();
console.log(`Synced: ${synced}, Failed: ${failed}`);
```

### Auto Sync Hook

```typescript
import { useAutoSync } from '@/lib/supabase';

function App() {
  const { isSyncing, lastSyncResult, syncNow } = useAutoSync(true);
  
  return (
    <button onClick={syncNow} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}
```

## Security

- **Row Level Security (RLS)**: All tables have RLS enabled
- **Public Read**: Stats and public data are readable by everyone
- **Controlled Write**: Insert operations are open (anonymous users can register)
- **Update Restrictions**: Updates are limited based on wallet ownership

## Error Handling

All operations return structured results:

```typescript
const { success, error, user } = await registerUser(data);

if (!success) {
  console.error('Registration failed:', error);
} else {
  console.log('Registered:', user.wallet_address);
}
```

## Testing

Clear all local data for testing:

```typescript
import { clearAllLocalData } from '@/lib/supabase';

// Clear all localStorage keys
clearAllLocalData();
```

## File Structure

```
src/lib/supabase/
├── index.ts      # Main exports
├── client.ts     # Supabase client initialization
├── database.ts   # Database operations with fallback
├── hooks.ts      # React hooks
└── types.ts      # TypeScript type definitions

supabase/
└── schema.sql    # Database schema SQL
```

## Troubleshooting

### "Table not found" Error
Run the SQL schema in Supabase SQL editor first.

### Offline Operations Not Syncing
Check if:
1. Browser is online (`navigator.onLine`)
2. Supabase URL is reachable
3. Anon key is valid

### Data Not Persisting
localStorage might be full or disabled. Check browser settings.
