# Network Diagnostics UI

This document describes the Network Diagnostics Banner feature added to the EQUA frontend.

## Overview

The Network Diagnostics Banner appears at the top of the wallet dashboard and provides real-time feedback about the health of the blockchain connection.

## Banner States

### 1. Healthy State (Green)

When all network checks pass, a green banner appears showing:
- ✅ "On-chain connection healthy"
- Expandable to show details:
  - Cluster type (e.g., Devnet, Mainnet, Localnet)
  - RPC endpoint URL
  - Program ID
  - Token Program ID
  - GlobalState status (✓ Found)
  - Mint status (✓ Found)

**Features:**
- Minimized by default to avoid cluttering the UI
- Click to expand and view full configuration details
- Can be dismissed by the user

**Example:**
```
┌─────────────────────────────────────────────────────┐
│ ✅ On-chain connection healthy               [▶]   │
└─────────────────────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────────────────────┐
│ ✅ On-chain connection healthy               [▼]   │
│                                                      │
│   Cluster: Devnet                                   │
│   RPC: https://api.devnet.solana.com               │
│   Program ID: GR1Xr...wok7C                        │
│   Token Program: TokenzQd...xuEb                    │
│   GlobalState: ✓ Found                              │
│   Mint: ✓ Found                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Error State (Red)

When configuration mismatches are detected, a red warning banner appears with:
- ⚠️ "Network Configuration Issues Detected"
- Current configuration details
- Specific error messages
- Actionable steps to fix each issue

**Features:**
- Always visible until dismissed
- Shows all detected issues
- Provides specific remediation steps for each error
- Links to troubleshooting documentation

**Example Scenarios:**

#### GlobalState Missing
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Network Configuration Issues Detected          [✕] │
│                                                          │
│ Your wallet may not sync properly. Check details below: │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Cluster: Localnet                                   │ │
│ │ RPC: http://localhost:8899                          │ │
│ │ Program ID (env): GR1Xr...wok7C                    │ │
│ │ Token Program: TokenzQd...xuEb                      │ │
│ │ GlobalState: ✗ Missing                              │ │
│ │ Mint: ✗ Missing                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ● GlobalState account not found at [address]            │
│   ┌──────────────────────────────────────────────────┐ │
│   │ How to fix:                                      │ │
│   │ 1. Program may not be initialized on this cluster│ │
│   │ 2. Verify program is deployed to Localnet        │ │
│   │ 3. Run program initialization if you're deployer │ │
│   │ 4. Switch to the correct cluster/RPC endpoint    │ │
│   └──────────────────────────────────────────────────┘ │
│                                                          │
│ Need help? Check the troubleshooting guide or ensure    │
│ your wallet is connected to the correct network.        │
└─────────────────────────────────────────────────────────┘
```

#### Program ID Mismatch
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Network Configuration Issues Detected          [✕] │
│                                                          │
│ ● Program ID mismatch: env has [ID1], but IDL has [ID2] │
│   ┌──────────────────────────────────────────────────┐ │
│   │ How to fix:                                      │ │
│   │ 1. Update NEXT_PUBLIC_PROGRAM_ID to match       │ │
│   │    deployed program                               │ │
│   │ 2. Ensure correct IDL in public/idl/             │ │
│   │ 3. Redeploy program if needed and update both    │ │
│   └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Mint Owner Mismatch (Token Program)
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Network Configuration Issues Detected          [✕] │
│                                                          │
│ ● Mint owner (TokenkegQ...) does not match configured   │
│   TOKEN_PROGRAM_ID (TokenzQd...)                        │
│   ┌──────────────────────────────────────────────────┐ │
│   │ How to fix:                                      │ │
│   │ 1. Check NEXT_PUBLIC_TOKEN_STANDARD env variable │ │
│   │ 2. Set to "standard" for SPL Token or leave     │ │
│   │    unset for Token-2022                          │ │
│   │ 3. Mint on-chain uses: Standard SPL Token        │ │
│   │ 4. Update env to match on-chain mint program     │ │
│   └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Diagnostic Checks Performed

The banner runs the following checks automatically:

1. **Cluster Detection**: Determines which Solana cluster the RPC endpoint connects to
2. **Cluster Alignment**: Verifies RPC cluster matches env configuration
3. **Program ID Validation**: Compares env program ID with IDL address
4. **GlobalState Existence**: Checks if GlobalState PDA exists on chain
5. **Mint Existence**: Checks if Mint PDA exists on chain
6. **Token Program Validation**: Verifies mint owner matches configured token program

## Implementation Details

### Components
- **NetworkDiagnosticsBanner.tsx**: Main UI component
- **useNetworkDiagnostics.ts**: React hook performing diagnostics
- **networkDiagnostics.ts**: Utility functions for cluster detection

### Integration
The banner is added to `WalletDashboard.tsx` at the top, before the balance card:

```tsx
<NetworkDiagnosticsBanner />
```

### Performance
- Diagnostics run once on mount and when connection changes
- Uses memoization to avoid repeated PDA computations
- Lazy loads IDL only when needed
- No performance impact on normal operations

## User Experience

### Happy Path (No Issues)
1. User connects wallet
2. Green banner appears briefly at top
3. Banner can be expanded to see details
4. User can dismiss it to focus on main UI
5. Banner reappears on page reload but remains dismissible

### Error Path (Configuration Issues)
1. User connects wallet on wrong cluster
2. Red banner appears with clear error message
3. User reads actionable steps
4. User follows steps to fix (e.g., change RPC endpoint)
5. Page reloads, diagnostics run again
6. Green banner shows successful connection

## Developer Benefits

1. **Easier Debugging**: Instantly see which cluster/program is in use
2. **Clear Error Messages**: No more guessing why balance is stale
3. **Actionable Steps**: Each error includes specific fix instructions
4. **Self-Documenting**: Shows actual configuration in use

## Related Documentation

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Detailed troubleshooting guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Environment configuration

## Testing

Comprehensive test coverage includes:
- Cluster detection from various RPC endpoints
- Healthy state detection
- Missing account detection
- Program ID mismatch detection
- Token program mismatch detection
- RPC connection error handling

All tests pass with 100% coverage of diagnostic logic.
