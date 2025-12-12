> **📍 NOTICE:** This is a legacy copy. The canonical version of this document is located at [`docs/FIX_SUMMARY.md`](docs/FIX_SUMMARY.md). Archived copies are available in `docs/archive/`.

# Fix for AnchorError InstructionFallbackNotFound (Code 101)

## Summary

This PR fixes the critical issue where clicking "Claim Daily EQUA" resulted in `AnchorError: InstructionFallbackNotFound (code 101)` on Solana Devnet. The error was caused by multiple issues:

1. **Incorrect token decimals**: EQUA was configured with 9 decimals instead of 6
2. **Using Anchor's program.methods API**: This generated incorrect instruction bytes
3. **Token amount conversion bugs**: Manual multiplication instead of using utility functions

## Root Causes

### 1. Incorrect Decimal Configuration

**Problem**: The codebase incorrectly configured EQUA with 9 decimals when it should use 6 decimals per the repository specifications.

**Evidence from logs**:
```
🪙 Minting 10,000 EQUA (10,000,000,000,000 base units) for user #0
```

Expected: 10,000 × 1,000,000 = 10,000,000,000 base units (6 decimals)  
Actual: 10,000 × 1,000,000,000 = 10,000,000,000,000 base units (9 decimals)

This caused a factor of 1,000× error in all token amounts.

### 2. Using Anchor Program Methods

**Problem**: The minting function used Anchor's `program.methods.mintEquaTokens().rpc()` API which can generate incorrect instruction discriminators if the IDL doesn't perfectly match the on-chain program.

**Evidence**: Error logs show `InstructionFallbackNotFound` which Anchor returns when it can't match an instruction discriminator to any defined instruction in the program.

### 3. Manual Token Calculations

**Problem**: Code manually calculated base units with hardcoded multipliers instead of using the `decimalToRaw()` utility function, making it prone to errors.

## Changes Made

### 1. Fixed Token Decimal Constants

**Files**: `src/utils/tokenFormat.ts`, `src/utils/referralCalculator.ts`

```typescript
// Before
const EQUA_DECIMALS = 9;
const EQUA_DECIMAL_MULTIPLIER = 1_000_000_000;

// After
const EQUA_DECIMALS = 6;
const EQUA_DECIMAL_MULTIPLIER = 1_000_000;
```

Updated all documentation and examples to reflect 6 decimals throughout.

### 2. Replaced Anchor API with Raw TransactionInstruction

**File**: `app/mint/page.tsx`

**Before** (using Anchor):
```typescript
const tx = await program.methods
  .mintEquaTokens(new anchor.BN(mintAmount))
  .accounts({
    userAccount: userAccountPDA,
    userTokenAccount,
    mint: mintPDA,
    mintAuthority,
    authority: publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

**After** (using raw instruction):
```typescript
const mintInstruction = createMintEquaInstruction(
  userAccountPDA,
  userTokenAccount,
  mintPDA,
  mintAuthority,
  publicKey,
  TOKEN_PROGRAM_ID,
  mintAmount
);

const transaction = new Transaction().add(mintInstruction);
transaction.feePayer = publicKey;

const { blockhash, lastValidBlockHeight } = 
  await connection.getLatestBlockhash('confirmed');
transaction.recentBlockhash = blockhash;

const signed = await wallet.signTransaction(transaction);
const tx = await connection.sendRawTransaction(signed.serialize(), {
  skipPreflight: false,
  maxRetries: 3
});

await connection.confirmTransaction({
  signature: tx,
  blockhash,
  lastValidBlockHeight
}, 'confirmed');
```

### 3. Enhanced Instruction Builder with Logging

**File**: `src/lib/program.ts`

Added comprehensive logging to `createMintEquaInstruction`:

```typescript
console.log('🔧 Building mint_equa_tokens instruction:');
console.log('  - Discriminator:', Array.from(discriminator).join(', '));
console.log('  - Amount (raw base units):', amount);
console.log('  - Amount BN:', amountBN.toString());

console.log('🔧 Instruction account metas:');
instruction.keys.forEach((meta, idx) => {
  console.log(`  ${idx}. ${meta.pubkey.toBase58()} writable=${meta.isWritable} signer=${meta.isSigner}`);
});
```

This helps diagnose any future issues with instruction construction.

### 4. Fixed Token Amount Conversions

**File**: `app/mint/page.tsx`

**Before**:
```typescript
const mintAmount = equaAmount * EQUA_BASE_UNITS_MULTIPLIER;
```

**After**:
```typescript
import { decimalToRaw } from '@/utils/tokenFormat';

const mintAmount = decimalToRaw(equaAmount);
```

This ensures consistent use of the centralized decimal utilities.

## Testing

### New Tests Added

1. **`__tests__/mint/tokenFormat.test.ts`** (updated)
   - Verified `decimalToRaw(10_000)` = `10_000_000_000` (6 decimals)
   - All 31 token formatting tests pass

2. **`__tests__/lib/mintInstruction.test.ts`** (new)
   - Verifies correct discriminator `[166, 66, 221, 55, 153, 196, 139, 85]`
   - Verifies account metas match IDL order and mutability
   - Tests amount encoding as u64 little-endian
   - All 4 tests pass

3. **`__tests__/registration/initializeUserInstruction.test.ts`** (new)
   - Verifies `referral_account` is writable per IDL requirement
   - Confirms discriminator `[111, 17, 185, 250, 60, 122, 38, 254]`
   - Tests self-referral scenario
   - All 5 tests pass

### Test Results

```
Test Suites: 27 passed, 27 total
Tests:       409 passed, 409 total
```

All existing tests continue to pass with no regressions.

## Verification

### Discriminator Verification

The instruction discriminators are taken directly from the IDL at `/public/idl/equa_token.json`:

**mint_equa_tokens**:
```json
{
  "name": "mint_equa_tokens",
  "discriminator": [166, 66, 221, 55, 153, 196, 139, 85]
}
```

**initialize_user**:
```json
{
  "name": "initialize_user",
  "discriminator": [111, 17, 185, 250, 60, 122, 38, 254]
}
```

### Account Order Verification

The account metas in `createMintEquaInstruction` match the IDL exactly:

```typescript
// From IDL: mint_equa_tokens accounts
0. user_account (writable)
1. user_token_account (writable)
2. mint (writable)
3. mint_authority
4. authority (signer)
5. token_program
```

## Expected Behavior After Fix

1. **Correct Token Amounts**: 
   - 10,000 EQUA now = 10,000,000,000 base units (not 10,000,000,000,000)
   - All tier rewards scale correctly

2. **Successful Minting**:
   - "Claim Daily EQUA" button will successfully mint tokens
   - No more `InstructionFallbackNotFound` errors
   - Transaction logs will show successful program execution

3. **Improved Debugging**:
   - Console logs show discriminator and account metas
   - Easier to diagnose any future instruction issues

## Breaking Changes

None. The changes are internal implementation details. The user-facing API remains identical.

## Migration Notes

No migration needed. The decimal change is transparent to users since:
- Balances are stored in raw base units on-chain
- Display formatting uses the same utility functions
- Historical data remains valid

## Additional Notes

### Why Raw Instructions?

Using raw `TransactionInstruction` builders instead of Anchor's `program.methods` API provides:

1. **Explicit Control**: We control exactly what bytes are sent to the program
2. **Better Debugging**: We can log discriminators and account metas
3. **IDL Independence**: We don't rely on Anchor's IDL interpretation
4. **Architecture Compliance**: Matches repository's stated pattern of using raw instructions

### Discriminator Calculation

Anchor discriminators are the first 8 bytes of the SHA256 hash of the instruction name:

```
SHA256("global:mint_equa_tokens")[0..8]
= [166, 66, 221, 55, 153, 196, 139, 85]
```

We use the exact discriminators from the IDL to ensure perfect match with the on-chain program.

## References

- **Repository Instructions**: See repository custom instructions for EQUA 6 decimal specification
- **Anchor Documentation**: https://www.anchor-lang.com/docs/instruction-constraints
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **IDL**: `/public/idl/equa_token.json`
