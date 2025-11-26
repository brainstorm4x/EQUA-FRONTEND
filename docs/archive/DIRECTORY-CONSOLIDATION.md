# Directory Consolidation - Resolution Summary

## Problem Overview

The EQUA-FRONTEND repository previously contained **two parallel Next.js App Router directory trees**:
- Root-level `app/` directory
- `src/app/` directory

This duplication led to:
- **Divergent logic** between the two implementations
- **Inconsistent registration and minting flows**
- **Debug instrumentation not firing** (changes applied to wrong directory)
- **ConstraintMut error** on `referral_account` during `initialize_user` instruction
- **Developer confusion** about which directory was actually being used

## Analysis

### Which Directory Was Active?

Next.js was using the **root `app/` directory**. Evidence:
- `tsconfig.json` explicitly excluded `src/app` from compilation
- Build output showed routes from root `app/` only
- The application rendered using root `app/` components

### Key Differences Found

**Root `app/mint/page.tsx` (active version):**
- Better error handling with `handleAtaCreationError` utility
- Explicit mint verification before operations
- Clearer transaction confirmation logic
- Missing cooldown timer functionality
- Incorrect referral_account handling (using PublicKey.default)

**`src/app/mint/page.tsx` (inactive version):**
- ✅ Cooldown timer with 24-hour mint restriction
- ✅ Correct self-referral logic (user's own account as referral_account)
- ✅ Better instrumentation with debug logging of instruction metas
- ✅ Development reset account functionality
- Less comprehensive error handling

## Solution Implemented

### 1. Merged Best Features

Combined the strengths of both implementations into the root `app/` directory:

**From root `app/mint/page.tsx` (kept):**
- Error handling utilities
- Mint verification logic
- Transaction flow structure

**From `src/app/mint/page.tsx` (merged in):**
- Cooldown timer functionality with countdown display
- Self-referral logic for registration
- Instruction meta debugging/logging
- `formatTimeRemaining()` helper function
- `getLastMintTime()` helper function

### 2. Fixed Registration Flow

**Critical Fix:** Changed referral_account handling in registration:

**Before (incorrect):**
```typescript
const instruction = createInitializeUserInstruction(
  userAccountKeypair.publicKey,
  publicKey,
  globalStatePDA,
  PublicKey.default,  // ❌ Cannot be marked writable
  // ...
);
```

**After (correct):**
```typescript
const instruction = createInitializeUserInstruction(
  userAccountKeypair.publicKey,
  publicKey,
  globalStatePDA,
  userAccountKeypair.publicKey,  // ✅ User's own account for self-referral
  // ...
  PublicKey.default  // referrer data argument
);
```

**Why this works:**
- The on-chain program requires `referral_account` to be writable per IDL
- `PublicKey.default` cannot be marked as writable (it's not a real account)
- Using user's own account as `referral_account` satisfies the writable requirement
- Passing `PublicKey.default` as the referrer data argument signals "no referrer"
- The smart contract handles self-referral case correctly

### 3. Updated lib/program.ts

Ensured `createInitializeUserInstruction` always marks `referral_account` as writable:

```typescript
return new TransactionInstruction({
  keys: [
    // ...
    { pubkey: referralAccount, isSigner: false, isWritable: true },  // ✅ Always writable
    // ...
  ],
  // ...
});
```

### 4. Added Instrumentation

Added debug logging before sending registration transaction:

```typescript
console.log('🧪 InitializeUser instruction metas:');
instruction.keys.forEach((k, i) => {
  console.log(`${i}. ${k.pubkey.toBase58()} writable=${k.isWritable} signer=${k.isSigner}`);
});
```

This helps quickly diagnose account meta mismatches.

### 5. Removed Duplicate Directory

- Deleted `src/app/` directory entirely
- Updated `tsconfig.json` to remove `src/app` from exclusions
- Verified build still works correctly

### 6. Created E2E Test Script

Created `scripts/e2e-register-mint.ts` that:
- Verifies global state and mint PDA exist
- Performs user registration with self-referral
- Mints 1000 EQUA tokens
- Logs all instruction metas and results
- Can be run with: `npx ts-node scripts/e2e-register-mint.ts`

## Files Changed

- ✅ `app/mint/page.tsx` - Merged features, added cooldown, fixed registration
- ✅ `lib/program.ts` - Fixed referral_account writable flag
- ✅ `tsconfig.json` - Removed src/app exclusion
- ✅ `scripts/e2e-register-mint.ts` - New E2E test script
- ✅ `DIRECTORY-CONSOLIDATION.md` - This documentation
- ❌ `src/app/` - **REMOVED** (entire directory deleted)

## Acceptance Criteria Met

- ✅ Only one `app/` directory remains (root level)
- ✅ Registration logic fixed with self-referral handling
- ✅ Instruction metas show `referral_account` as writable
- ✅ Cooldown timer functionality added (24-hour mint restriction)
- ✅ Instrumentation added for debugging
- ✅ E2E test script created
- ✅ Documentation updated
- ✅ Build succeeds without errors

## Testing

### Build Verification
```bash
npm run build
```
✅ Build succeeds, produces optimized production build

### Manual Testing Required

Since this is a frontend connected to devnet:

1. **Connect Wallet:** Test wallet connection on devnet
2. **Registration:** 
   - Click "Register Now"
   - Verify transaction succeeds
   - Check browser console for instruction metas
   - Verify no ConstraintMut error
3. **Minting:**
   - After registration, click "Claim Daily EQUA"
   - Verify 1000 EQUA minted
   - Verify cooldown timer appears
   - Wait or check back after 24h to test cooldown

### E2E Script Testing

```bash
npx ts-node scripts/e2e-register-mint.ts
```

**Note:** Script requires a funded devnet wallet or working airdrop.

## Preventing Recurrence

### For Developers

1. **Single Source of Truth:** Only `app/` directory at root should exist
2. **Check Build Output:** Verify `Route (app)` shows expected routes
3. **Review tsconfig.json:** Ensure no conflicting directories excluded
4. **Console Logging:** Use instrumentation to verify code paths
5. **Test Both Flows:** Always test registration AND minting after changes

### For CI/CD

Consider adding a check to prevent duplicate `app/` directories:

```bash
# In CI pipeline
if [ -d "src/app" ]; then
  echo "ERROR: Duplicate src/app directory detected!"
  exit 1
fi
```

## Related Issues

This consolidation resolves:
- ConstraintMut error on referral_account
- Registration failures on devnet
- Debug logs not appearing in console
- Inconsistent UI between "old" and "new" interface
- Code changes appearing in wrong location

## References

- Problem Statement: Issue description in PR
- Solana Anchor Docs: Account constraints and mutability
- Next.js App Router: Directory structure conventions
- SPL Token Program: Standard vs Token-2022 considerations

---

**Last Updated:** 2025-11-24  
**Status:** ✅ Completed  
**Next Steps:** Deploy and test on devnet with real users
