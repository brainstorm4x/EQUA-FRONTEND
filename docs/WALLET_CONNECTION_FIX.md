# Mobile Wallet Connection Flow Fix

## Problem Statement

After PR #278, when using Mobile Wallet Adapter on mobile browsers:
1. User clicks "Select Wallet" button which changes to "Connect"
2. User must click "Connect" again to see installed apps
3. After selecting app, it opens but returns immediately **without asking for approval**

## Expected Behavior

1. When "Select Wallet" is clicked, immediately show "Connect" (bypass adapter selection modal)
2. User clicks "Connect" once to trigger connection flow
3. Wallet app opens and **requests approval to connect**
4. After approval, returns to registration page with wallet connected

## Root Causes

### 1. Two-Step Connection Flow
The `WalletMultiButton` component has two states:
- **`no-wallet`**: When no wallet adapter is selected → Shows "Select Wallet" → Opens modal
- **`has-wallet`**: When wallet adapter is selected → Shows "Connect" → Calls `connect()`

With only one adapter (Mobile Wallet Adapter), the modal selection step is unnecessary overhead.

### 2. Persistent Authorization Cache
The default `createDefaultAuthorizationResultCache()` from `@solana-mobile/wallet-adapter-mobile` persists authorization results to browser storage (localStorage/IndexedDB).

When a user connects once:
1. Authorization is granted and cached
2. On subsequent visits, cached authorization is reused
3. Wallet app returns immediately without showing approval dialog
4. Users think connection failed because they never see the approval screen

## Solutions Implemented

### Solution 1: Auto-Select Single Wallet Adapter

**File**: `src/components/ui/WalletButton.tsx`

Added `useEffect` hook that automatically selects the wallet adapter when:
- Only ONE wallet adapter is available
- No wallet is currently selected
- Not already connected

```tsx
useEffect(() => {
  if (wallets.length === 1 && !wallet && !connected) {
    console.log('🔗 [WalletButton] Auto-selecting single wallet adapter:', wallets[0].adapter.name);
    select(wallets[0].adapter.name);
  }
}, [wallets, wallet, select, connected]);
```

**Result**: 
- Button immediately shows "Connect" instead of "Select Wallet"
- User only needs to click once
- Modal selection step is bypassed

### Solution 2: In-Memory Authorization Cache

**File**: `src/utils/walletAuthCache.ts`

Created custom authorization cache that stores authorization in memory only (not persisted to browser storage):

```tsx
export function createInMemoryAuthorizationCache() {
  let authorizationResult: AuthorizationResult | Authorization | undefined;

  return {
    async clear(): Promise<void> {
      authorizationResult = undefined;
    },
    async get(): Promise<AuthorizationResult | Authorization | undefined> {
      return authorizationResult;
    },
    async set(auth: AuthorizationResult | Authorization): Promise<void> {
      authorizationResult = auth;
    },
  };
}
```

**File**: `src/providers/MobileExternalWalletProvider.tsx`

Updated provider to use in-memory cache:

```tsx
authorizationResultCache: createInMemoryAuthorizationCache(),
```

**Result**:
- Fresh authorization required on each browser session
- Wallet app always shows approval dialog
- Authorization clears when page is refreshed or browser is closed
- More secure - no stale authorizations

## Testing

### Automated Tests

**File**: `__tests__/components/WalletButton-autoselect.test.tsx`

Created comprehensive test suite covering:
- ✅ Auto-selects wallet when only one adapter is available
- ✅ Does NOT auto-select when wallet is already selected
- ✅ Does NOT auto-select when already connected
- ✅ Does NOT auto-select when multiple wallets are available
- ✅ Renders WalletMultiButton component correctly

All tests pass successfully.

### Manual Testing Required

To fully verify the fix, manual testing on mobile device is needed:

1. **Environment**: Mobile device with mobile browser (Chrome/Safari)
2. **Prerequisites**: Phantom or Solflare wallet app installed
3. **Test Steps**:
   - Open EQUA website in mobile browser
   - Verify button shows "Connect" (not "Select Wallet")
   - Click "Connect" button once
   - Verify wallet app opens
   - **CRITICAL**: Verify approval dialog appears in wallet app
   - Approve connection
   - Verify browser returns with wallet connected

## Benefits

### User Experience
- **Fewer clicks**: One click instead of three (Select Wallet → Select Adapter → Connect)
- **Clearer flow**: Button text "Connect" is more intuitive than "Select Wallet"
- **Security**: Users always see approval dialog, confirming what permissions they're granting

### Technical
- **Simpler flow**: Bypasses unnecessary modal step when only one adapter exists
- **Better security**: No stale authorizations persisting across sessions
- **Debugging**: Console logs show when auto-selection occurs

## Impact on Other Environments

### Desktop Browser (Phantom/Solflare Extensions)
- **No impact**: Multiple adapters available, so auto-select doesn't trigger
- Modal still shows both Phantom and Solflare options as expected

### Mobile In-App Browser (Phantom/Solflare In-App)
- **No impact**: Multiple adapters available (injected wallet detected)
- Existing behavior preserved

### Mobile External Browser (Chrome/Safari)
- **Fixed**: Only one adapter (Mobile Wallet Adapter), auto-selects
- Fresh authorization on each session
- **This is the fixed scenario**

## Files Changed

1. **src/components/ui/WalletButton.tsx** - Added auto-select logic
2. **src/utils/walletAuthCache.ts** - Created in-memory authorization cache
3. **src/providers/MobileExternalWalletProvider.tsx** - Use in-memory cache
4. **__tests__/components/WalletButton-autoselect.test.tsx** - Test coverage

## Compatibility

- ✅ Next.js 14 (App Router)
- ✅ @solana/wallet-adapter-react ^0.15.35
- ✅ @solana/wallet-adapter-react-ui ^0.9.35
- ✅ @solana-mobile/wallet-adapter-mobile ^2.2.5
- ✅ TypeScript compilation passes
- ✅ Production build succeeds

## Future Considerations

### Alternative: NoOp Authorization Cache

If in-memory cache still causes issues (e.g., connection re-establishment after navigating away), we can use the `createNoOpAuthorizationCache()` which never stores anything:

```tsx
authorizationResultCache: createNoOpAuthorizationCache(),
```

This forces a fresh authorization on EVERY connection attempt.

### Alternative: Auto-Connect

Could enable `autoConnect={true}` on `SolanaWalletProvider` to automatically reconnect when returning to the page. However, this might not work well with mobile deep linking.

## References

- [PR #278](https://github.com/brainstorm4x/EQUA-FRONTEND/pull/278) - Original environment isolation changes
- [Solana Mobile Wallet Adapter Documentation](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Wallet Adapter React Documentation](https://github.com/solana-labs/wallet-adapter)
