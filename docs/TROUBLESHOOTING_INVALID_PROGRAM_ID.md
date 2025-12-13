# Troubleshooting: InvalidProgramId on associated_token_program

## The Error

If you see this error in browser console logs during registration or minting:

```
AnchorError: InvalidProgramId on account: associated_token_program
Left: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022 program ID)
Right: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
```

## Root Cause

This error occurs when the **wrong program ID is passed at the wrong instruction account slot**. The Anchor program expects:

- **Index 8 (associated_token_program)**: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (Associated Token Program)
- **Index 9 (token_program)**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (Token-2022 Program)

The error message indicates Token-2022 was passed at index 8, when it should be at index 9.

## Why This Happens

### Problem 1: Importing from wrong source

**❌ WRONG** - Imports standard SPL Token program ID:
```typescript
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
```

This gives you:
- `TOKEN_PROGRAM_ID` = `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` (Standard SPL Token)
- `ASSOCIATED_TOKEN_PROGRAM_ID` = `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (Correct)

**✅ CORRECT** - Use centralized constants that export Token-2022:
```typescript
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/constants';
```

This gives you:
- `TOKEN_PROGRAM_ID` = `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (Token-2022 ✓)
- `ASSOCIATED_TOKEN_PROGRAM_ID` = `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` (Correct ✓)

### Problem 2: Passing programs in wrong order

Even if you have the correct program IDs, passing them to `createInitializeUserInstruction` in the wrong order will cause this error.

**Correct order (11 accounts)**:
```typescript
createInitializeUserInstruction(
  userAccount,                  // 0. user_account
  userMetadata,                 // 1. user_metadata
  authority,                    // 2. authority
  globalState,                  // 3. global_state
  referralAccount,              // 4. referral_account
  referrerMetadata,             // 5. referrer_metadata
  userTokenAccount,             // 6. user_token_account
  mint,                         // 7. mint
  ASSOCIATED_TOKEN_PROGRAM_ID,  // 8. associated_token_program ← ATokenGP...
  TOKEN_PROGRAM_ID,             // 9. token_program ← TokenzQ... (Token-2022)
  now,                          // mint_start timestamp
  referrer,                     // referral pubkey
  userType                      // 0=individual, 1=business
);
```

## Runtime Guards

As of this fix, `createInitializeUserInstruction` includes runtime guards that will throw descriptive errors if:

1. Wrong `associated_token_program` is passed (index 8)
2. Wrong `token_program` is passed (index 9)

Example guard error:
```
❌ CRITICAL: Invalid token_program!
  Expected (index 9): TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  Received: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
  EQUA mint on Devnet uses Token-2022, not standard SPL Token.
  Fix: Pass TOKEN_PROGRAM_ID from src/lib/constants.ts (exports Token-2022)
```

These guards catch the error **before** sending the transaction to the blockchain, saving gas fees and providing clear guidance.

## How to Fix

### In Your Code

1. **Always import from centralized constants**:
   ```typescript
   import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/constants';
   ```

2. **Never import directly from `@solana/spl-token`** for TOKEN_PROGRAM_ID (use `@/lib/constants` instead)

3. **Pass programs in correct order** to `createInitializeUserInstruction`

4. **Before transactions, validate mint owner**:
   ```typescript
   import { validateMintOwner } from '@/lib/program';
   await validateMintOwner(connection, mintPDA);
   ```

### In Tests

Update tests to expect Token-2022:
```typescript
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/constants';

expect(instruction.keys[8].pubkey.toBase58()).toBe('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'); // ATA
expect(instruction.keys[9].pubkey.toBase58()).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'); // Token-2022
```

## EQUA Token Program Architecture

### Token Program: Token-2022
The EQUA mint on Devnet is created using the **Token-2022 program** (not standard SPL Token).

```
Mint PDA: [derived from "equa-mint" seed]
Owner: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
```

### Associated Token Program: Standard
The Associated Token Program is the **same for both standard SPL Token and Token-2022**:

```
Associated Token Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```

### Why Token-2022?

Token-2022 (Token Extensions Program) provides:
- Extended functionality for custom token behaviors
- Future extensibility for EQUA tokenomics
- Better support for DeFi integrations

## Related Files

- `src/lib/constants.ts` - Centralized program ID exports
- `src/lib/program.ts` - Instruction builders with runtime guards
- `__tests__/registration/initializeUserInstruction.test.ts` - Tests for program ID validation
- `public/idl/equa_token.json` - IDL with 11-account initialize_user definition

## Migration Notes

If you're updating from older code:

1. **IDL Update**: `initialize_user` now requires 11 accounts (added `user_metadata` and `referrer_metadata`)
2. **Args Update**: Added `user_type` (u8) argument after `mint_start`
3. **Import Update**: All `TOKEN_PROGRAM_ID` imports should use `@/lib/constants`, not `@solana/spl-token`

## Verification

Run tests to verify correct integration:
```bash
npm test -- __tests__/registration/initializeUserInstruction.test.ts
npm test -- __tests__/integration/splTokenImport.test.ts
```

Run E2E test script:
```bash
npx ts-node scripts/e2e-register-mint.ts
```

The script will:
1. Validate mint owner is Token-2022
2. Register a user with self-referral (11-account instruction)
3. Mint tokens and verify balance
4. Log all instruction metas for inspection
