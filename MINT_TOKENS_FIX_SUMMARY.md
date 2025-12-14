# Fix Summary: mint_tokens AccountNotSigner Issue

## Problem Statement
Minting was failing with `AnchorError AccountNotSigner` on the authority account during `MintTokens` instruction execution. This issue occurred because:

1. **Account Count Mismatch:** Frontend was passing 7 accounts while backend expected 8 accounts (missing `referrerAccount`)
2. **Signing Method Issue:** Using `signTransaction + sendRawTransaction` instead of `wallet.sendTransaction` prevented proper signature marking by wallet adapters
3. **Documentation Gaps:** Token-2022 requirement and mint instruction signature not properly documented

## Root Causes

### 1. Frontend-Backend IDL Desync
The backend `mint_tokens` instruction evolved to include a `referrerAccount` parameter (8th account), but the frontend was still using the old 7-account signature:

**Old (7 accounts):**
```
0. user_account
1. user_metadata
2. user_token_account
3. mint
4. mint_authority
5. authority (signer)
6. token_program
```

**New (8 accounts - correct):**
```
0. user_account
1. user_metadata
2. user_token_account
3. mint
4. mint_authority
5. referrer_account (NEW)
6. authority (signer)
7. token_program
```

### 2. Signing Method
The frontend was using `wallet.signTransaction()` followed by `connection.sendRawTransaction()`, which can fail to properly mark the authority as a signer in some wallet adapters. The correct approach is to use `wallet.sendTransaction()` which handles signing and submission atomically.

### 3. Token Program Validation
The backend specifically requires Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`), but this wasn't validated at instruction build time, leading to potential configuration errors.

## Solution Implemented

### Code Changes

#### 1. `src/lib/program.ts`
- **Added `getReferrerAccountPDA()` utility:** Derives the referrer's UserAccount PDA from their wallet address
- **Updated `createMintTokensInstruction()`:** Now accepts `referrerAccount` as 6th parameter (8 accounts total)
- **Implemented preflight assertions:**
  - Validates Token-2022 is being used
  - Ensures authority is provided
  - Logs referrer account handling
- **Referrer account writable flag:** Only marked as writable when a valid referrer is present (not `PublicKey.default`)

#### 2. `app/mint/page.tsx`
- **Replaced signing method for registration:** Changed from `signTransaction + sendRawTransaction` to `wallet.sendTransaction()`
- **Replaced signing method for minting:** Changed from `signTransaction + sendRawTransaction` to `wallet.sendTransaction()`
- **Automatic referrer detection:** Reads the `referral` field from UserAccount data using `USER_ACCOUNT_REFERRAL_OFFSET` constant and derives the referrer's UserAccount PDA
- **Enhanced error logging:** Added try-catch blocks around `sendTransaction` calls to surface wallet adapter errors
- **Used named constants:** Replaced magic numbers with `USER_ACCOUNT_REFERRAL_OFFSET` and `USER_ACCOUNT_REFERRAL_SIZE`

#### 3. `src/lib/constants.ts`
- **Added Token program address constants:**
  - `TOKEN_2022_PROGRAM_ADDRESS`
  - `STANDARD_TOKEN_PROGRAM_ADDRESS`
- **Added UserAccount structure offset constants:**
  - `USER_ACCOUNT_REFERRAL_OFFSET = 40`
  - `USER_ACCOUNT_REFERRAL_SIZE = 32`
  - Plus other field offsets for consistency
- **Updated comments:** Emphasized Token-2022 requirement

#### 4. `docs/TROUBLESHOOTING.md`
- **Added "Token Program Configuration" section:** Documents Token-2022 requirement and why Standard SPL Token won't work
- **Added "Mint Tokens Instruction Signature" section:** Documents the 8-account structure and referrerAccount handling
- **Added "Deprecated Features" section:** Documents the removed `locked_until` field
- **Example usage:** Provides code examples for proper mint instruction building

### Testing Updates

#### 1. `__tests__/lib/mintInstruction.test.ts`
- Updated all test cases to use 8-account signature
- Added `referrerAccount = PublicKey.default` for tests without referrers
- Updated account count assertions from 7 to 8
- Verified referrer account flags (writable when present, read-only when PublicKey.default)

#### 2. `scripts/e2e-register-mint.ts`
- Updated to use 8-account signature with `PublicKey.default` as referrerAccount
- Updated comments to reflect 8-account structure

## Verification

### Tests
✅ All mint instruction tests pass (8/8)
✅ TypeScript compilation successful
✅ Next.js production build successful
✅ CodeQL security analysis: 0 vulnerabilities

### Manual Testing Required
- [ ] Register a new user and verify transaction succeeds
- [ ] Mint tokens as a user without a referrer (should use PublicKey.default)
- [ ] Mint tokens as a user with a referrer (should use referrer's UserAccount PDA)
- [ ] Verify authority signature is properly enforced by wallet adapter
- [ ] Test with different wallet adapters (Phantom, Solflare)

## Technical Details

### UserAccount Structure (136 bytes)
```
Offset  Size  Field
------  ----  -----
0       8     discriminator
8       32    authority (wallet public key)
40      32    referral (referrer wallet public key or PublicKey.default)
72      32    token_account
104     8     minted_amount (u64)
112     8     mint_start (i64)
120     8     referral_rewards (u64)
128     8     last_mint_time (i64)
```

### Referrer Account Handling
1. **Read referral field:** Extract bytes 40-72 from UserAccount data
2. **Check if referrer exists:** Compare with `PublicKey.default`
3. **Derive referrer PDA:** If referrer exists, derive their UserAccount PDA using `getUserAccountPDA(referrerWallet)`
4. **Mark as writable:** Set `isWritable: true` only if referrer is not `PublicKey.default`

### Token Program Validation
```typescript
// Preflight check in createMintTokensInstruction
if (tokenProgram.toBase58() !== TOKEN_2022_PROGRAM_ADDRESS) {
  throw new Error('mint_tokens requires Token-2022 program');
}
```

## Migration Notes

### For Developers
1. **Update function calls:** Any code calling `createMintTokensInstruction` must now pass `referrerAccount` as the 6th parameter
2. **Use wallet.sendTransaction:** Replace manual signing patterns with `wallet.sendTransaction(transaction, connection, options)`
3. **Import constants:** Use `USER_ACCOUNT_REFERRAL_OFFSET` instead of magic number 40

### For Users
- No action required - changes are backward compatible
- Existing registered users can mint normally
- New users benefit from improved error messages and validation

## Coordination with Other Repos

### Backend (brainstorm4x/EQUA)
- ✅ No changes required - backend already expects 8-account signature
- ✅ Token-2022 requirement already enforced
- ✅ UserMetadata field already present

### Mobile (brainstorm4x/EQUA-MOBILE-APP)
- ✅ No changes required for mint flow (delegates to Phantom wallet)
- 📝 Update documentation to emphasize Token-2022
- 📝 Update documentation to remove references to `locked_until`

## Related Issues Fixed
- Authority AccountNotSigner error during minting
- Account count mismatch causing instruction deserialization failures
- Missing referrer account in mint instruction
- Inconsistent token program validation
- Magic numbers for UserAccount field offsets

## Follow-up Actions
1. Update mobile app documentation
2. Monitor Devnet mint transactions for any issues
3. Add integration tests for referrer scenarios
4. Consider adding UserAccount field access helpers to reduce offset usage

---

**Date:** 2024-12-14  
**Author:** GitHub Copilot  
**Status:** Complete - Ready for Testing  
**Related PRs:** copilot/fix-minting-issue
