# Registration State Persistence

## Overview

The EQUA frontend implements a localStorage-backed registration state persistence mechanism to prevent registration loops caused by RPC lag and network timing issues.

## Problem Statement

Users were experiencing a critical UX issue where:
1. User successfully registers (transaction confirmed on-chain)
2. Page refreshes or RPC metadata fetch temporarily fails
3. User is incorrectly shown the registration form again
4. This creates a confusing loop where the user appears both registered and not registered

## Solution

The fix implements a multi-layered approach to ensure registration state persists reliably:

### 1. localStorage Persistence

Registration state is stored in localStorage using the key pattern:
```typescript
`equa_registered_${publicKey.toBase58()}`
```

This provides:
- **Immediate UI feedback** on page load
- **Resilience** to temporary RPC failures
- **Session persistence** across page refreshes

### 2. Grace Period

After successful registration, a 5-second grace period prevents immediate re-checks:
```typescript
const REGISTRATION_GRACE_PERIOD_MS = 5000;
```

During this period:
- `checkUserRegistration()` is skipped
- Allows on-chain state to propagate across RPC nodes
- Prevents race conditions between registration and verification

### 3. Retry Logic with Exponential Backoff

When localStorage indicates the user is registered but metadata fetch fails, the system retries with exponential backoff:
- Retry 1: 1 second delay
- Retry 2: 2 seconds delay
- Retry 3: 4 seconds delay

Only after all retries fail does the system clear the `registered` state.

### 4. Increased Propagation Delay

The on-chain state propagation delay was increased from 2s to 3s:
```typescript
const CHAIN_STATE_UPDATE_DELAY_MS = 3000;
```

This accounts for slower RPC nodes in the Solana devnet cluster.

## Implementation Details

### Files Modified

1. **app/mint/page.tsx**
   - Added localStorage checks before setting `registered` state
   - Implemented retry logic in `checkUserRegistration()`
   - Added grace period state variable and timeout
   - Clear localStorage on wallet disconnect

2. **app/page.tsx**
   - Added localStorage checks for optimistic UI updates
   - Sync localStorage with on-chain state
   - Keep local state on RPC failures

### State Flow

```
┌─────────────────┐
│ User Registers  │
└────────┬────────┘
         │
         ├─> Transaction Confirmed
         │
         ├─> Set localStorage = 'true'
         │
         ├─> Set justRegistered = true (5s grace period)
         │
         ├─> Wait 3s for on-chain propagation
         │
         ├─> Fetch metadata to verify
         │
         ├─> If fetch fails & localStorage = 'true'
         │   └─> Retry with exponential backoff (3 attempts)
         │
         └─> Update UI state
```

## Testing

Comprehensive test coverage in `__tests__/registration/registrationStatePersistence.test.ts`:

- ✅ localStorage CRUD operations
- ✅ Sync with on-chain state
- ✅ Retry logic with localStorage hints
- ✅ Optimistic UI updates
- ✅ Grace period tracking
- ✅ Edge cases (SSR, corrupted values, multiple wallets)
- ✅ Integration scenarios

**Total: 25 passing tests**

## User Experience Improvements

### Before Fix
1. User registers → Success
2. Page auto-refreshes → Registration form shown (confusing)
3. User clicks "Mint EQUA" on home → Redirected to registration (frustrating)
4. User must manually refresh multiple times

### After Fix
1. User registers → Success
2. Page auto-refreshes → Mint interface shown immediately (localStorage)
3. Background verification confirms registration → State consistent
4. User clicks "Mint EQUA" on home → Shows mint interface (seamless)

## Browser Compatibility

Uses standard localStorage API, supported in:
- ✅ Chrome/Edge 4+
- ✅ Firefox 3.5+
- ✅ Safari 4+
- ✅ Opera 11.5+

SSR-safe with `typeof window !== 'undefined'` checks.

## Cleanup

localStorage is automatically cleaned up when:
- User disconnects wallet
- On-chain check shows user is not registered (after retries)

## Configuration

Constants can be adjusted in `app/mint/page.tsx`:

```typescript
// Propagation delay (milliseconds)
const CHAIN_STATE_UPDATE_DELAY_MS = 3000;

// Grace period (milliseconds)
const REGISTRATION_GRACE_PERIOD_MS = 5000;
```

Retry logic uses fixed exponential backoff (1s, 2s, 4s) with 3 max retries.

## Future Enhancements

Potential improvements for production:
- [ ] Add telemetry to track retry success rates
- [ ] Make retry count/delays configurable
- [ ] Implement retry backoff jitter to prevent thundering herd
- [ ] Add health check for RPC node responsiveness
- [ ] Consider IndexedDB for larger state management

## Related Documentation

- [API Documentation](./API.md) - Backend API reference
- [Transaction Counting](./TRANSACTION_COUNTING.md) - On-chain state tracking
- [Business Registry API](./BUSINESS_REGISTRY_API.md) - Business user registration
- [Netlify Deployment](./NETLIFY_DEPLOYMENT.md) - Deployment guide
