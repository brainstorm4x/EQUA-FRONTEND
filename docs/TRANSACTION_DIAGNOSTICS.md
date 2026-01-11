# Transaction Diagnostics & Wallet Adapter Error Capture

## Overview

This implementation adds comprehensive transaction diagnostics and wallet adapter error capture to help diagnose "Unexpected error" failures from Phantom wallet and other wallet adapters.

## Problem Solved

Prior to this change, wallet adapter errors provided minimal information:
- Generic "Unexpected error" messages
- No error code, logs, or signature
- Unable to determine root cause (wallet issue, transaction encoding, RPC problem, etc.)

## Solution

Added three layers of diagnostic capability:

### 1. Pre-Transaction Validation (`preTransactionValidation`)

Validates transactions BEFORE sending to the wallet adapter:
- Transaction structure (fee payer, blockhash, instructions)
- Account count and flags (writable, signer)
- Estimated transaction size (prevents >1232 byte errors)
- RPC connection health
- Duplicate accounts with conflicting flags

**Usage:**
```typescript
const validationResult = await preTransactionValidation(
  transaction, 
  connection, 
  'Registration'
);

if (!validationResult.canProceed) {
  // Handle validation errors
  console.error('Issues:', validationResult.issues);
}
```

### 2. Wallet Error Extraction (`extractWalletError` / `logWalletError`)

Extracts detailed information from wallet adapter errors:
- Error type (WalletSendTransactionError, WalletSignTransactionError, etc.)
- Error code (if available)
- Transaction logs (if available)
- Transaction signature (if available)
- Nested error unwrapping

**Usage:**
```typescript
try {
  await wallet.sendTransaction(transaction, connection);
} catch (error) {
  const errorDetails = logWalletError(error, 'Transaction Failed');
  // errorDetails contains: errorType, message, code, logs, signature, rawError
}
```

### 3. Transaction Debugging (`logTransactionDetails`)

Logs full transaction structure for debugging:
- Fee payer
- Recent blockhash
- Number of signatures and instructions
- Per-instruction details (program ID, accounts with flags, data)

**Usage:**
```typescript
logTransactionDetails(transaction, 'Registration');
// Logs full transaction structure to console
```

## Integration Points

### `app/mint/page.tsx`

**Registration Flow:**
1. Before `wallet.sendTransaction`: Validates transaction structure
2. On error: Logs detailed wallet error with context (wallet name, RPC endpoint, transaction type)

**Minting Flow:**
1. Before `wallet.sendTransaction`: Validates transaction structure  
2. On error: Logs detailed wallet error with mint amount, user tier, wallet name

### `src/lib/program.ts`

Added instruction validation helpers:
- `validateInstructionDiscriminator()` - Validates 8-byte discriminator
- `validateInitializeUserInstruction()` - Validates initialize_user structure
- `validateMintTokensInstruction()` - Validates mint_tokens structure
- `logInstructionData()` - Logs instruction data for debugging

## What Gets Logged on Error

### Before (Generic Error)
```
❌ wallet.sendTransaction failed during registration: Error: Unexpected error
Error details: {
  message: 'Unexpected error',
  name: undefined,
  code: undefined,
  logs: undefined
}
```

### After (Detailed Diagnostics)
```
🔍 Pre-Transaction Validation: Registration
1️⃣ Validating transaction structure...
✅ Transaction structure valid
Transaction details: { accountCount: 12, instructionCount: 3, ... }

2️⃣ Checking RPC connection health...
✅ RPC healthy (latency: 245ms, block: 123456789)

3️⃣ Transaction details:
  Fee Payer: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
  Recent Blockhash: DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe
  Instruction Count: 3
  Instruction 0:
    Program ID: ComputeBudget111111111111111111111111111111
    Accounts: 0
    Data (bytes): 9
  Instruction 1:
    Program ID: GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C
    Accounts: 12
    ...

❌ Registration Transaction Failed
Error Type: WalletSendTransactionError
Message: Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.
Code: 4001
Transaction Logs:
  0. Program GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C invoke [1]
  1. Program log: Instruction: InitializeUser
  2. Program log: Error: InsufficientFundsForRent
  3. Program GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C consumed 12345 of 400000 compute units
  4. Program GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C failed: custom program error: 0x1
Signature: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW
Explorer: https://explorer.solana.com/tx/5VERv8N.../devnet

🔍 Additional Context
Transaction type: Registration (initialize_user)
Wallet adapter: Phantom
Connection endpoint: https://api.devnet.solana.com
```

## Files Changed

1. **`src/utils/transactionDiagnostics.ts`** (NEW)
   - Core diagnostic utilities
   - 400+ lines of validation and logging logic

2. **`app/mint/page.tsx`** (MODIFIED)
   - Added pre-transaction validation before wallet.sendTransaction
   - Enhanced error logging with logWalletError utility
   - Added transaction context logging

3. **`src/lib/program.ts`** (MODIFIED)
   - Added instruction validation helpers
   - Added discriminator validation
   - Added instruction data logging

4. **`__tests__/utils/transactionDiagnostics.test.ts`** (NEW)
   - Unit tests for diagnostic utilities
   - Tests validation logic, error extraction, instruction validation

## Testing

### Manual Testing Checklist

1. **Registration with Phantom**
   - Attempt registration on Devnet
   - Check browser console for detailed logs
   - Verify pre-transaction validation runs
   - Verify error logs contain actionable information

2. **Minting with Phantom**
   - Attempt minting on Devnet
   - Check browser console for detailed logs
   - Verify pre-transaction validation runs
   - Verify error logs include mint amount and user tier

3. **Error Scenarios**
   - Insufficient SOL balance
   - Invalid referral code
   - Cooldown active
   - Network timeout
   - Verify each scenario produces actionable error message

### Automated Testing

Run unit tests:
```bash
npm test -- __tests__/utils/transactionDiagnostics.test.ts
```

## Performance Impact

- **Negligible**: Validation only runs on transaction submission (rare event)
- **No network calls**: All validation is local (except RPC health check)
- **Async validation**: Does not block UI rendering

## Future Improvements

1. Add Sentry/error tracking integration
2. Add metrics collection (error types, frequencies)
3. Add retry logic based on error type
4. Add transaction simulation before actual submission
5. Add more granular instruction validation

## References

- [Solana Transaction Structure](https://docs.solana.com/developing/programming-model/transactions)
- [Wallet Adapter Errors](https://github.com/solana-labs/wallet-adapter/blob/master/packages/core/base/src/errors.ts)
- [Anchor Error Codes](https://www.anchor-lang.com/docs/errors)
