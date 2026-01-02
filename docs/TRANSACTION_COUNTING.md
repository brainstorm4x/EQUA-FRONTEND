# Transaction Counting Architecture

## Overview

This document explains the architectural decision to use on-chain GlobalState for transaction counting instead of parsing raw SPL token transfers.

## Implementation Status

✅ **COMPLETE** - All components use authoritative GlobalState data

## Architecture Comparison

### Old Approach (Deprecated)
- **Method**: Parse raw SPL token transfer signatures from blockchain
- **Storage**: localStorage for caching
- **Source**: `syncTransfersFromChain()` in `src/utils/transferTracking.ts`
- **Status**: ⚠️ Deprecated (kept for local testing only)

### New Approach (Current)
- **Method**: Read directly from GlobalState.total_transactions field
- **Storage**: On-chain account data (single source of truth)
- **Source**: `getGlobalTransactionCount()` in `src/utils/transferTracking.ts`
- **UI Hook**: `useGlobalStateStats()` in `src/hooks/useGlobalStateStats.ts`
- **Status**: ✅ Active (production)

## Why the Change?

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| **Sybil Resistance** | ❌ Vulnerable (counts unregistered users) | ✅ Immune (backend enforces registration) |
| **Performance** | ❌ Slow (100+ RPC calls) | ✅ Fast (1 RPC call) |
| **Accuracy** | ❌ May drift from backend | ✅ Always accurate (same counter) |
| **Complexity** | ❌ Complex filtering logic | ✅ Simple account read |
| **Maintenance** | ❌ Requires filtering rules | ✅ No filtering needed |

## Migration Guide

### Old Code (Deprecated)
```typescript
import { syncTransfersFromChain } from '@/utils/transferTracking';

// ❌ Don't use this anymore
const count = await syncTransfersFromChain(connection, tokenAccount);
```

### New Code (Current)
```typescript
import { getGlobalTransactionCount } from '@/utils/transferTracking';

// ✅ Use this instead
const count = await getGlobalTransactionCount(connection);
```

### React Components
```typescript
// ❌ Old approach (never use in UI)
import { getTotalTransfers } from '@/utils/transferTracking';
const count = getTotalTransfers(); // localStorage only!

// ✅ New approach (always use in UI)
import { useGlobalStateStats } from '@/hooks/useGlobalStateStats';
const { totalTransactions } = useGlobalStateStats();
```

## Testing

Run tests:
```bash
npm test -- __tests__/globalState.test.ts
```

Run example:
```bash
npx tsx examples/getGlobalTransactionCount.ts
```
