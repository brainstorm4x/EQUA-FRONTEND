# Registration State Management Migration Guide

## Overview

This guide documents the migration from component-level registration checks to centralized `RegistrationContext` state management.

## What Changed

### Before (Problems)
- ❌ Multiple components calling `isUserRegistered()` independently
- ❌ Race conditions during wallet connect/registration
- ❌ Inconsistent state across components
- ❌ Optimistic local updates causing desyncs
- ❌ "Mint EQUA" button redirecting after successful registration

### After (Solutions)
- ✅ Single source of truth via `RegistrationContext`
- ✅ Request deduplication prevents race conditions
- ✅ Explicit state machine with clear transitions
- ✅ 100% on-chain verification (zero localStorage)
- ✅ Transaction confirmation polling for auto-updates
- ✅ Components subscribe to context, never call RPC directly

---

## Architecture

### State Machine

```
UNKNOWN (initial)
   ↓
   ↓ (wallet connects)
   ↓
CHECKING (fetching UserMetadata PDA)
   ↓
   ├─→ REGISTERED (account exists)
   │
   ├─→ NOT_REGISTERED (account missing)
   │
   └─→ ERROR (network failure)
```

### Provider Hierarchy

```tsx
<ConnectionProvider>
  <SolanaWalletProvider>
    <WalletModalProvider>
      <RegistrationProvider>  ← NEW
        {children}
      </RegistrationProvider>
    </WalletModalProvider>
  </SolanaWalletProvider>
</ConnectionProvider>
```

---

## Files Created

### 1. `src/contexts/RegistrationContext.tsx`
**Purpose**: Centralized registration state management

**Exports**:
- `RegistrationProvider` - Wrap your app with this
- `useRegistrationStatus()` - Hook to access registration state
- `RegistrationStatus` - Enum for state machine states

**State Shape**:
```typescript
interface RegistrationState {
  status: RegistrationStatus;           // Current state
  userIndex: number | null;             // User registration number
  elevatedAttemptsUsed: number | null;  // Elevated mint attempts
  lastCheckedTimestamp: number | null;  // Last check time
  errorMessage: string | null;          // Error details
}
```

**Methods**:
- `refetchStatus()` - Force re-check registration
- `isLoading` - True when checking
- `isStatusKnown` - True when REGISTERED or NOT_REGISTERED

### 2. `src/hooks/useRegistrationPolling.ts`
**Purpose**: Auto-poll registration after transaction submission

**Usage**:
```typescript
const { startPolling, stopPolling, isPolling } = useRegistrationPolling({
  maxAttempts: 30,
  intervalMs: 2000,
  onConfirmed: () => {
    console.log('Registration confirmed!');
    router.push('/dashboard');
  },
  onTimeout: () => {
    setError('Registration confirmation timed out');
  }
});

// After sending registration transaction
await sendTransaction(tx);
startPolling(); // Starts automatic polling
```

---

## Migration Checklist

### Phase 1: Provider Integration ✅
- [x] Created `src/contexts/RegistrationContext.tsx`
- [x] Created `src/hooks/useRegistrationPolling.ts`
- [x] Updated `src/providers/WalletProvider.tsx` to wrap with `RegistrationProvider`
- [x] Verified provider hierarchy is correct

### Phase 2: Component Updates (IN PROGRESS)
- [ ] Update `app/mint/page.tsx` to use `useRegistrationStatus()`
- [ ] Remove manual `isUserRegistered()` calls from mint page
- [ ] Update `src/components/WalletDashboard.tsx` to use context
- [ ] Remove any localStorage registration state
- [ ] Update other components that check registration

### Phase 3: Testing & Validation
- [ ] Test fresh wallet connection
- [ ] Test registration flow with polling
- [ ] Test wallet switching
- [ ] Test "Mint EQUA" button stability
- [ ] Test rapid connect/disconnect
- [ ] Test network errors during check

---

## Component Migration Examples

### Before: Manual Registration Check

```typescript
// ❌ OLD PATTERN - Don't use this
import { isUserRegistered } from '@/utils/registrationCheck';

function MyComponent() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    
    setIsChecking(true);
    isUserRegistered(connection, publicKey).then((result) => {
      setIsRegistered(result);
      setIsChecking(false);
    });
  }, [publicKey, connection]);

  if (isChecking) return <div>Checking...</div>;
  if (!isRegistered) return <div>Please register</div>;
  
  return <div>Dashboard content</div>;
}
```

### After: Using RegistrationContext

```typescript
// ✅ NEW PATTERN - Use this
import { useRegistrationStatus, RegistrationStatus } from '@/contexts/RegistrationContext';

function MyComponent() {
  const { status, isLoading, userIndex } = useRegistrationStatus();

  // State machine-based rendering
  if (isLoading || status === RegistrationStatus.CHECKING) {
    return <div>Checking registration...</div>;
  }

  if (status === RegistrationStatus.NOT_REGISTERED) {
    return <div>Please register</div>;
  }

  if (status === RegistrationStatus.REGISTERED) {
    return (
      <div>
        <p>User #{userIndex}</p>
        <p>Dashboard content</p>
      </div>
    );
  }

  if (status === RegistrationStatus.ERROR) {
    return <div>Error checking registration</div>;
  }

  return null;
}
```

### Registration Flow with Polling

```typescript
// ✅ Registration page with automatic confirmation polling
import { useRegistrationStatus, RegistrationStatus } from '@/contexts/RegistrationContext';
import { useRegistrationPolling } from '@/hooks/useRegistrationPolling';
import { useRouter } from 'next/navigation';

function RegistrationPage() {
  const router = useRouter();
  const { status, refetchStatus } = useRegistrationStatus();
  const [error, setError] = useState<string | null>(null);

  // Setup polling hook
  const { startPolling, isPolling } = useRegistrationPolling({
    onConfirmed: () => {
      console.log('✅ Registration confirmed on-chain');
      router.push('/dashboard');
    },
    onTimeout: () => {
      setError('Registration confirmation timed out. Please refresh.');
    },
  });

  // Auto-redirect if already registered
  useEffect(() => {
    if (status === RegistrationStatus.REGISTERED) {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleRegister = async () => {
    try {
      // Build and send transaction
      const signature = await sendTransaction(tx);
      console.log('Transaction sent:', signature);

      // Start polling for confirmation
      startPolling();

      // Context will automatically update when confirmed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div>
      <button onClick={handleRegister} disabled={isPolling}>
        {isPolling ? 'Processing...' : 'Register'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

## Key Benefits

### 1. Eliminates Race Conditions
**Before**: Multiple components calling `isUserRegistered()` simultaneously
```typescript
// Component A
isUserRegistered(connection, publicKey); // Call 1

// Component B (at same time)
isUserRegistered(connection, publicKey); // Call 2

// Component C (at same time)
isUserRegistered(connection, publicKey); // Call 3
```

**After**: Context deduplicates requests
```typescript
// All components use same hook
const { status } = useRegistrationStatus();
// Only 1 RPC call is made, result shared across all components
```

### 2. Stable State Across Navigation
**Before**: State lost on navigation, components re-check independently

**After**: Context maintains state across routes
```typescript
// Page A checks registration → REGISTERED
// Navigate to Page B
// Page B immediately knows user is REGISTERED (no re-check)
```

### 3. Transaction Confirmation Handling
**Before**: Manual setTimeout() or polling logic in each component

**After**: `useRegistrationPolling()` hook handles it automatically
```typescript
// Just call startPolling() after transaction
// Hook automatically stops when registration confirmed
```

### 4. Zero Local Storage
**Before**: May have used localStorage for optimistic updates

**After**: 100% on-chain verification, no client-side caching

---

## Testing Procedures

### Test 1: Fresh Wallet Connection
1. Open app with no wallet connected
2. Connect wallet
3. **Expected**: Context auto-checks registration
4. **Log**: `[RegistrationContext] Checking registration for: <wallet>`
5. **Result**: Status updates to REGISTERED or NOT_REGISTERED

### Test 2: Registration Flow
1. Connect unregistered wallet
2. Go to registration page
3. Submit registration transaction
4. **Expected**: `startPolling()` called automatically
5. **Log**: `[RegistrationPolling] Starting polling`
6. **Result**: After confirmation, status updates to REGISTERED
7. **Result**: Auto-redirect to dashboard

### Test 3: Wallet Switching
1. Connect Wallet A (registered)
2. Disconnect and connect Wallet B (not registered)
3. **Expected**: Context resets and re-checks
4. **Log**: `[RegistrationContext] State transition: RESET`
5. **Log**: `[RegistrationContext] Checking registration for: <wallet B>`
6. **Result**: Status updates correctly for Wallet B

### Test 4: "Mint EQUA" Button Stability
1. Register new user
2. Wait for confirmation
3. Navigate to dashboard
4. Click "Mint EQUA" button
5. **Expected**: Stays on mint page, doesn't redirect
6. **Reason**: Context maintains REGISTERED state

### Test 5: Network Errors
1. Disconnect internet
2. Connect wallet
3. **Expected**: Status transitions to ERROR
4. **Log**: `[RegistrationContext] State transition: ERROR`
5. Reconnect internet
6. Call `refetchStatus()`
7. **Expected**: Status updates correctly

---

## Troubleshooting

### Issue: "useRegistrationStatus must be used within a RegistrationProvider"
**Cause**: Component is outside provider hierarchy

**Fix**: Ensure `RegistrationProvider` wraps the component tree in `WalletProvider.tsx`

### Issue: Registration status not updating after transaction
**Cause**: `startPolling()` not called after transaction

**Fix**: Call `startPolling()` immediately after successful transaction
```typescript
const signature = await sendTransaction(tx);
startPolling(); // Add this
```

### Issue: Multiple simultaneous registration checks
**Cause**: Direct calls to `isUserRegistered()` bypassing context

**Fix**: Replace all `isUserRegistered()` calls with `useRegistrationStatus()`

### Issue: Status stuck in CHECKING
**Cause**: Network timeout or RPC failure

**Fix**: Context should auto-transition to ERROR after timeout. If stuck, check:
1. RPC endpoint is reachable
2. Program ID is correct
3. No AbortController conflicts

---

## Performance Notes

### Request Deduplication
- Context uses `checkInProgressRef` to prevent duplicate simultaneous checks
- If a check is already running, subsequent calls are ignored

### Debouncing
- 100ms delay on wallet change detection to batch rapid changes
- Prevents unnecessary RPC calls during wallet initialization

### Caching
- No client-side caching - always fetches fresh state
- `lastCheckedTimestamp` tracks when last check occurred
- Components can check timestamp if they need to know recency

---

## Rollback Plan

If issues arise, rollback by:

1. Remove `RegistrationProvider` from `WalletProvider.tsx`
2. Revert components to use `isUserRegistered()` directly
3. File issue with specific error logs

**Rollback commits**:
```bash
# If needed, revert to pre-migration state
git revert <commit-hash-of-provider-update>
git revert <commit-hash-of-context-creation>
```

---

## Next Steps

1. Update all components to use `useRegistrationStatus()`
2. Remove direct `isUserRegistered()` calls
3. Add polling to registration flow
4. Run full test suite
5. Monitor logs for race condition indicators
6. Deploy to staging for integration testing

---

**Last Updated**: January 16, 2026
**Status**: Phase 1 Complete, Phase 2 In Progress
