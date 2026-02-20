# Mobile Wallet Connection Flow Fix

## Problem Statement

On mobile external browsers (Chrome/Safari on Android), connecting to wallet apps
via Mobile Wallet Adapter (MWA) deep linking was unreliable — the wallet app would
open but return immediately without completing the authorization handshake.

## Root Cause

MWA v1 uses a **local WebSocket server** (`ws://localhost:{port}`) for communication
between the dApp and the wallet app. The flow is:

1. `transact()` starts a WebSocket server on a random localhost port
2. Opens a deep link (`solana-wallet://...`) to the wallet app
3. Wallet app connects back to the WebSocket to exchange auth messages
4. After completion, control returns to the browser

**The problem**: When the deep link opens the wallet app, Chrome on Android puts the
browser tab in the background. Android may suspend or kill the tab's WebSocket server.
When the wallet app tries to connect back, the server is dead, so authorization fails
and the wallet returns without connecting.

## Solution

Instead of manually creating a `SolanaMobileWalletAdapter` in `MobileExternalWalletProvider`,
we now use the same standard adapter configuration as desktop (PhantomWalletAdapter +
SolflareWalletAdapter) and let the upstream `@solana/wallet-adapter-react` WalletProvider
handle MWA detection and creation automatically.

The upstream WalletProvider already:
- Detects Android mobile browser via user agent
- Creates a `SolanaMobileWalletAdapter` with correct app identity (`window.location`)
  and default persistent authorization cache
- Adds it to the adapter list alongside Phantom/Solflare
- Handles the MWA deep-link lifecycle (beforeunload suppression, autoConnect, etc.)
- Uses `getUriForAppIdentity()` which returns `window.location.protocol + host`

### Key Changes

1. **Standard adapters**: `MobileExternalWalletProvider` now uses `PhantomWalletAdapter`
   and `SolflareWalletAdapter`, same as desktop and mobile in-app providers.

2. **autoConnect enabled**: `autoConnect={true}` allows silent reconnection when
   returning from the wallet app (if the authorization was cached).

3. **Upstream MWA handling**: The `@solana/wallet-adapter-react` WalletProvider
   automatically adds MWA when it detects Android mobile web, with correct defaults.

### Why This Works Better

- The upstream WalletProvider has battle-tested MWA lifecycle management
- No duplicate or conflicting MWA adapter instances
- Standard adapters are available for wallet-standard detection
- `autoConnect` + persistent cache enables reconnection after deep link round-trip
- Mobile registration code (`mobileRegistration.ts`) handles the "Missing signature"
  error by using `signTransaction()` instead of `sendTransaction()`

## Architecture

```
WalletProvider Router (src/providers/WalletProvider.tsx)
├── Desktop → DesktopWalletProvider (Phantom + Solflare, autoConnect=false)
├── Mobile In-App → MobileInAppWalletProvider (Phantom + Solflare, autoConnect=true)
└── Mobile External → MobileExternalWalletProvider (Phantom + Solflare, autoConnect=true)
                      └── @solana/wallet-adapter-react auto-adds MWA on Android
```

All three providers now use the same adapter set. The key differences are:
- **Desktop**: `autoConnect=false` (user must explicitly connect)
- **Mobile In-App**: `autoConnect=true` (wallet is pre-injected)
- **Mobile External**: `autoConnect=true` (reconnect after deep link return)

## Files Changed

- `src/providers/MobileExternalWalletProvider.tsx` — Standard adapters + autoConnect
