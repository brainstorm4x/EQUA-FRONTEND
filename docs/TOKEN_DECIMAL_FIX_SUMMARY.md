# Token Decimal Handling Fix Summary

**Date**: December 2024  
**Branch**: `copilot/fix-token-decimal-handling`  
**Status**: ✅ Complete

## Problem Statement

The EQUA token frontend had a critical mismatch in decimal handling:

- **Frontend**: Hardcoded as 9 decimals (`EQUA_DECIMALS = 9`, multiplier `1e9`)
- **On-chain mint**: Actually uses 6 decimals (verified at program `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`)

### Impact

This 1000x multiplier mismatch caused:

1. **Transfer failures**: Token-2022 error `0x1` (insufficient funds) when users tried to send tokens, because the frontend calculated amounts 1000x too large
2. **Balance display errors**: Balances showed incorrect values
3. **Incomplete tracking**: Transfer count only incremented on successful outbound sends, ignoring inbound transfers
4. **Poor error messages**: Generic "Failed to send EQUA" without surfacing actual transaction logs

## Solution Overview

### 1. Centralized Mint Metadata Configuration

**File**: `src/lib/constants.ts`

```typescript
// Token Mint Configuration
export const EQUA_DECIMALS = 6;  // Corrected from 9
export const EQUA_DECIMAL_MULTIPLIER = Math.pow(10, EQUA_DECIMALS);
```

**File**: `src/lib/program.ts`

Added functions to fetch and validate mint metadata from on-chain:

- `getMintMetadata(connection, mintAddress)`: Fetches mint decimals, supply, authorities
- `getEquaMintDecimals(connection)`: Fetches EQUA mint decimals with validation and fallback to 6

### 2. Dynamic Decimals in Token Format Utilities

**File**: `src/utils/tokenFormat.ts`

Updated all utilities to accept optional `tokenDecimals` parameter:

```typescript
// Before (hardcoded 9 decimals)
rawToDecimal(1_000_000_000) // → 1

// After (dynamic, defaults to 6)
rawToDecimal(1_000_000, 6)  // → 1
rawToDecimal(1_000_000_000, 9) // → 1 (if needed for testing)
```

Added new precision-safe parsing using BigInt:

```typescript
parseDecimalStringToRaw("1.5", 6)  // → 1500000n (avoids float issues)
```

Functions updated:
- `formatEquaRaw(rawAmount, options)` - Added `tokenDecimals` option
- `formatEquaBalance(rawAmount, tokenDecimals)` - Made decimals dynamic
- `parseEquaFormatted(formattedAmount, tokenDecimals)` - Made decimals dynamic
- `rawToDecimal(rawAmount, tokenDecimals)` - Made decimals dynamic
- `decimalToRaw(decimalAmount, tokenDecimals)` - Made decimals dynamic
- `parseDecimalStringToRaw(decimalString, tokenDecimals)` - NEW, uses BigInt

### 3. WalletDashboard Send Flow Improvements

**File**: `src/components/WalletDashboard.tsx`

#### Changes:
1. **Removed hardcoded decimals**:
   ```typescript
   // REMOVED: const EQUA_DECIMALS = 9;
   // REMOVED: const EQUA_MULTIPLIER = Math.pow(10, EQUA_DECIMALS);
   ```

2. **Fetch mint decimals on load**:
   ```typescript
   const [mintDecimals, setMintDecimals] = useState<number>(6);
   
   useEffect(() => {
     const decimals = await getEquaMintDecimals(connection);
     setMintDecimals(decimals);
   }, [publicKey, connected, connection]);
   ```

3. **Re-fetch balance before transaction**:
   ```typescript
   const currentBalance = await getSPLTokenBalance(connection, senderTokenAccount);
   ```

4. **Use BigInt for amount parsing**:
   ```typescript
   const amountInBaseUnits = parseDecimalStringToRaw(amount, mintDecimals);
   
   if (amountInBaseUnits > BigInt(currentBalance)) {
     throw new Error(`Insufficient balance. You have ${balanceInEqua.toFixed(6)} EQUA available.`);
   }
   ```

5. **Safe BigInt to Number conversion**:
   ```typescript
   if (amountInBaseUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
     throw new Error('Transfer amount exceeds maximum safe value');
   }
   ```

### 4. Enhanced Error Handling

**File**: `src/components/WalletDashboard.tsx`

Improved error messages by surfacing SendTransactionError logs:

```typescript
if (err instanceof SendTransactionError) {
  const logs = await err.getLogs(connection);
  console.error('Transaction logs:', logs);
  
  if (logs) {
    const logsString = logs.join('\n');
    if (logsString.includes('insufficient funds') || logsString.includes('0x1')) {
      errorMessage = 'Insufficient funds. Please check your balance and try again.';
    } else if (logsString.includes('custom program error')) {
      // Extract and display error code
      const errorMatch = logsString.match(/custom program error: (0x[0-9a-fA-F]+)/);
      if (errorMatch) {
        errorMessage = `Transaction failed with error code ${errorMatch[1]}...`;
      }
    }
  }
}
```

### 5. Chain-Driven Transfer Tracking

**File**: `src/utils/transferTracking.ts`

Added `syncTransfersFromChain` to track both inbound and outbound transfers:

```typescript
export async function syncTransfersFromChain(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  // Fetch recent signatures for token account
  const signatures = await connection.getSignaturesForAddress(tokenAccountAddress, { limit: 100 });
  
  // Process signatures, tracking new ones in localStorage
  // Returns updated transfer count
}
```

Features:
- Fetches up to 100 recent signatures from ATA
- Caches processed signatures in localStorage (max 1000)
- Increments count for both sends and receives
- Efficient: avoids array mutation, optimized slice operations

## Testing

### New Tests Added

**File**: `__tests__/mint/tokenFormatDynamic.test.ts` (28 tests)

Comprehensive test coverage for dynamic decimals:
- Formatting with 6 vs 9 decimals
- Conversion functions (rawToDecimal, decimalToRaw) with different decimals
- `parseDecimalStringToRaw` precision testing
- Decimal mismatch scenario demonstrations

### Test Results

```
✓ __tests__/mint/tokenFormat.test.ts (31 tests)
✓ __tests__/mint/tokenFormatDynamic.test.ts (28 tests)

Total: 59/59 tests passing
```

### Validation

- ✅ TypeScript compilation: No new errors
- ✅ Build verification: Successful
- ✅ Code review: 4 issues identified and resolved
- ✅ CodeQL security scan: 0 vulnerabilities

## Before/After Comparison

### Sending 1 EQUA Token

**Before (WRONG)**:
```typescript
const amount = 1;  // User wants to send 1 EQUA
const baseUnits = amount * 1e9;  // → 1,000,000,000 base units
// Tries to send 1000x more tokens than intended!
```

**After (CORRECT)**:
```typescript
const amount = "1";  // User wants to send 1 EQUA
const baseUnits = parseDecimalStringToRaw(amount, 6);  // → 1,000,000n base units
// Sends exactly 1 EQUA token
```

### Balance Display

**Before (WRONG)**:
```typescript
// On-chain balance: 1,000,000 base units (1 EQUA with 6 decimals)
rawToDecimal(1_000_000)  // → 0.001 EQUA (using 9 decimals)
// Shows 1000x less than actual balance!
```

**After (CORRECT)**:
```typescript
// On-chain balance: 1,000,000 base units (1 EQUA with 6 decimals)
rawToDecimal(1_000_000, 6)  // → 1 EQUA (using correct 6 decimals)
// Shows correct balance
```

## Files Modified

1. `src/lib/constants.ts` - Added EQUA_DECIMALS = 6 and EQUA_DECIMAL_MULTIPLIER
2. `src/lib/program.ts` - Added getMintMetadata() and getEquaMintDecimals()
3. `src/utils/tokenFormat.ts` - Updated all functions for dynamic decimals, added parseDecimalStringToRaw()
4. `src/utils/transferTracking.ts` - Added syncTransfersFromChain() for inbound/outbound tracking
5. `src/components/WalletDashboard.tsx` - Fixed send flow, improved error handling
6. `__tests__/mint/tokenFormatDynamic.test.ts` - Added comprehensive test coverage

## Migration Guide

### For Developers

All tokenFormat functions now default to 6 decimals, so existing code using default parameters will work correctly:

```typescript
// These work correctly now (default to 6 decimals)
formatEquaBalance(1_000_000)  // "1"
rawToDecimal(1_000_000)       // 1
decimalToRaw(1)               // 1_000_000

// Explicit decimals can still be specified if needed
formatEquaBalance(1_000_000_000, 9)  // "1" (if testing with 9 decimals)
```

### For Users

No action required. The fix is transparent:
- Transfers will now work correctly
- Balances will display accurately
- Error messages will be more helpful
- Transfer counts will include both sends and receives

## Security Considerations

1. **BigInt validation**: Added check to prevent overflow when converting BigInt to Number
2. **Array mutation prevention**: Fixed signature processing to avoid mutating response arrays
3. **Storage efficiency**: Limited localStorage cache to 1000 signatures to prevent bloat
4. **Error information**: Logs exposed for debugging but sanitized for user display

## Future Improvements

While not in scope for this fix, potential enhancements:

1. Add UI indication when mint decimals differ from expected (6)
2. Implement background polling for new transfers
3. Add user setting to manually refresh transfer count
4. Create migration script to update localStorage data if needed

## References

- On-chain mint program: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- Token program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
- Solana network: Devnet
- Issue: Users unable to send EQUA tokens due to decimal mismatch

## Commits

1. `43f1c6e` - Add mint metadata fetching and update token format utilities
2. `3888271` - Add tests for dynamic decimal handling
3. `8ee8d87` - Address code review feedback - improve efficiency and safety
