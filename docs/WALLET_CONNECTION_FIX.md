# Mobile Wallet Connection Flow Fix

## Problem Statement

After PR #278, on mobile external browsers (Chrome/Safari on Android):
- User selects wallet app from modal, wallet app opens via deep link
- Wallet app immediately returns to browser without connecting

On desktop (before latest fix):
- "Select Wallet" changed to "Connect" without opening modal

## Root Cause Analysis

### Desktop Issue (Fixed in earlier commit)
The auto-select logic (`wallets.length === 1`) was incorrectly firing on desktop
when unsupported wallets were filtered out, changing the button from "Select Wallet"
to "Connect" without opening the modal. Reverted to standard `WalletMultiButton`.

### Mobile Deep Link Issue

The Mobile Wallet Adapter (MWA) uses deep linking to communicate with wallet apps:

1. `connect()` → `transact()` opens wallet app via deep link
2. Browser page may be **suspended or destroyed** while wallet app is in foreground
3. Wallet app processes authorization → user approves
4. Deep link returns to browser → page may **reload from scratch**
5. Need `autoConnect` with **persistent cache** to silently reconnect

**The in-memory authorization cache was losing state on page reload**, preventing
step 5 from succeeding. The auth token granted by the wallet app was lost.

### Hardcoded App Identity URI
The `appIdentity.uri` was hardcoded to `https://equa.live`. On Netlify previews
or localhost, the wallet app received a URI that didn't match the actual origin,
which could cause authorization issues.

## Solutions Implemented

### 1. Default Persistent Authorization Cache

Reverted to `createDefaultAuthorizationResultCache()` which uses localStorage.
This survives page reloads, allowing silent reconnection after returning from
the wallet app.

### 2. Enable autoConnect

Changed `autoConnect={false}` to `autoConnect={true}` for MobileExternalWalletProvider.
This enables the `@solana/wallet-adapter-react` WalletProvider to silently reconnect
using the cached authorization token when the page reloads after returning from
the wallet app.

### 3. Dynamic App Identity URI

Uses `window.location` to set `appIdentity.uri` dynamically, ensuring the wallet
app correctly identifies the requesting dApp on any deployment.

## Expected Flow After Fix

### Desktop
1. "Select Wallet" → modal opens
2. Select Phantom/Solflare → extension popup
3. Approve → connected

### Mobile External Browser (Chrome/Safari)
1. "Select Wallet" → modal opens
2. Select wallet app → deep link opens wallet app
3. Wallet app shows approval dialog
4. User approves → returns to browser
5. Page reloads → autoConnect silently reconnects using cached auth token
6. User is connected and can register

## Files Changed

1. **src/providers/MobileExternalWalletProvider.tsx** — Default persistent cache + autoConnect + dynamic URI

## Why autoConnect Is Essential for Mobile

The `@solana/wallet-adapter-react` WalletProvider has special handling for MWA:

```javascript
// When walletName is MWA and environment is mobile,
// the beforeunload listener is SKIPPED
if (walletName === SolanaMobileWalletAdapterWalletName && getIsMobile(adapters)) {
    isUnloadingRef.current = false;
    return; // No beforeunload listener
}
```

Combined with `autoConnect={true}`:
- `walletName` persists in localStorage ("Mobile Wallet Adapter")
- On page reload, the adapter is pre-selected
- `autoConnect` triggers `adapter.autoConnect()` → silent connect
- Cached auth token is used → user is reconnected without opening wallet app

## Why In-Memory Cache Doesn't Work for Mobile

```
connect() → transact() → deep link to wallet
                          ↓
                   Browser page destroyed
                          ↓
                   In-memory cache = GONE
                          ↓
                   User returns to browser
                          ↓
                   Page reloads, fresh context
                          ↓
                   autoConnect → cache.get() → undefined
                          ↓
                   Silent connect fails → NOT connected
```

With localStorage cache:
```
connect() → transact() → deep link to wallet
                          ↓
                   Browser page destroyed
                          ↓
                   localStorage persists
                          ↓
                   User returns to browser
                          ↓
                   Page reloads, fresh context
                          ↓
                   autoConnect → cache.get() → auth token from localStorage
                          ↓
                   Silent connect succeeds → CONNECTED ✓
```
