# Mobile Wallet Connection Flow Fix

## Problem Statement

After PR #278, when using Mobile Wallet Adapter on mobile browsers:
1. User clicks "Select Wallet" button which changes to "Connect" without opening modal
2. User must click "Connect" to see installed apps
3. After selecting app, it opens but returns immediately **without asking for approval**

On desktop:
1. Same button behavior — "Select Wallet" changes to "Connect" without modal
2. Expected: clicking "Select Wallet" should directly open the wallet selection modal

## Root Causes

### 1. Persistent Authorization Cache
The default `createDefaultAuthorizationResultCache()` from `@solana-mobile/wallet-adapter-mobile`
persists authorization results to browser storage. When a user has previously connected,
the cached authorization is reused and the wallet app auto-approves without showing
the approval dialog.

### 2. Hardcoded App Identity URI
The `appIdentity.uri` was hardcoded to `https://equa.live`. When testing on Netlify
previews or other environments, the URI mismatch could cause authorization issues
since the wallet app uses the URI to identify the requesting dApp.

## Solutions Implemented

### Solution 1: In-Memory Authorization Cache

**File**: `src/utils/walletAuthCache.ts`

Created custom authorization cache that stores authorization in memory only:

```tsx
export function createInMemoryAuthorizationCache() {
  let cachedAuth: unknown;
  return {
    async clear() { cachedAuth = undefined; },
    async get() { return cachedAuth; },
    async set(auth: unknown) { cachedAuth = auth; },
  };
}
```

**File**: `src/providers/MobileExternalWalletProvider.tsx`

Updated provider to use in-memory cache:

```tsx
authorizationResultCache: createInMemoryAuthorizationCache(),
```

### Solution 2: Dynamic App Identity URI

Updated `appIdentity.uri` to use the actual window location instead of a hardcoded
value, so the wallet app properly identifies the dApp on any deployment environment:

```tsx
function getAppIdentityUri(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.protocol}//${window.location.host}`;
}
```

## Files Changed

1. **src/utils/walletAuthCache.ts** — In-memory authorization cache implementation
2. **src/providers/MobileExternalWalletProvider.tsx** — Uses in-memory cache and dynamic URI

## Expected Behavior After Fix

### Desktop
- "Select Wallet" → opens modal with Phantom/Solflare → select wallet → extension popup

### Mobile External Browser
- "Select Wallet" → opens modal → select installed wallet app → deep link to wallet app
  → wallet app shows approval dialog → user approves → returns to browser → connected
