# Implementation Notes: Registration Fix for Consolidated Backend

## Summary
Updated frontend to match the consolidated `initialize_user` instruction in the deployed EQUA backend program (7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP on Devnet).

## Changes Made

### 1. Updated `createInitializeUserInstruction` Functions
**Files:** `src/lib/program.ts` and `lib/program.ts`

**Before (9 accounts):**
```typescript
createInitializeUserInstruction(
  userAccount,
  authority,
  globalState,
  referralAccount,
  userTokenAccount,
  mint,
  associatedTokenProgram,
  tokenProgram,
  mintStart,
  lockedUntil,
  referrer
)
```

**After (11 accounts + user_type):**
```typescript
createInitializeUserInstruction(
  userAccount,         // 0. user_account PDA
  userMetadata,        // 1. user_metadata PDA ← NEW
  authority,           // 2. authority (signer)
  globalState,         // 3. global_state
  referralAccount,     // 4. referral_account
  referrerMetadata,    // 5. referrer_metadata ← NEW
  userTokenAccount,    // 6. user_token_account
  mint,                // 7. mint
  associatedTokenProgram, // 8. associated_token_program
  tokenProgram,        // 9. token_program (Token-2022)
  mintStart,
  lockedUntil,
  referrer,
  userType             // 10. user_type (u8) ← NEW
)
```

**Instruction data layout:**
- Discriminator: `[111, 17, 185, 250, 60, 122, 38, 254]` (8 bytes)
- Referral pubkey: 32 bytes
- Mint start: i64 (8 bytes)
- Locked until: i64 (8 bytes)
- User type: u8 (1 byte) ← NEW

### 2. Updated Registration Flow
**File:** `app/mint/page.tsx`

- Derive `user_metadata` PDA using `getUserMetadataPDA(authority)`
- For referrals:
  - Derive referrer's `user_account` PDA: `getUserAccountPDA(referrerPubkey)`
  - Derive referrer's `user_metadata` PDA: `getUserMetadataPDA(referrerPubkey)`
- For self-registration (no referral):
  - Use `PublicKey.default` for both `referralAccount` and `referrerMetadata`
- Pass `userType = 0` (Individual) as default

### 3. Created Diagnostics Page
**File:** `app/debug/account/page.tsx`

Features:
- Display user account PDA and wallet address
- Show account size (detects legacy <144 byte accounts)
- Parse and display last_mint_time (offset 136)
- Show cooldown status with countdown timer
- Copy buttons for PDAs
- Link back to mint page
- Help section for legacy accounts

### 4. Enhanced Legacy Account UX
**File:** `app/mint/page.tsx`

- Added link to diagnostics page in error message
- Show "How to fix" guidance when legacy account detected

### 5. Updated E2E Test Script
**File:** `scripts/e2e-register-mint.ts`

- Added user_metadata PDA derivation
- Updated instruction call with new parameters

## Testing

### Typecheck
```bash
npm run typecheck
```
✅ All production code passes TypeScript validation

### Build
```bash
npm run build
```
✅ Build succeeds with optimized production bundle
- `/debug/account` route created successfully
- First Load JS: 258 kB for diagnostics page

### Manual Testing on Devnet

**Test Case 1: Fresh Wallet Registration**
1. Connect a fresh wallet (never used on EQUA Devnet)
2. Navigate to `/mint`
3. Fill in registration form
4. Submit registration
5. ✅ Expected: Transaction succeeds, user_account created with 144+ bytes

**Test Case 2: View Diagnostics**
1. Navigate to `/debug/account`
2. Connect wallet
3. ✅ Expected: 
   - Shows account size
   - Displays last_mint_time
   - Shows cooldown status

**Test Case 3: Legacy Account Detection**
1. Connect a wallet with legacy 136-byte account
2. Try to mint
3. ✅ Expected:
   - Error message displays
   - Link to diagnostics shown
   - Guidance on how to fix

## Program Details
- **Program ID:** `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- **Network:** Solana Devnet
- **Token Program:** Token-2022 (not standard SPL Token)

## PDA Seeds
- `user_account`: `["user-account", authority]`
- `user_metadata`: `["user-meta", authority]`
- `global_state`: `["global-state"]`
- `mint`: `["equa-mint"]`
- `mint_authority`: `["mint-authority"]`

## Account Structure
```
UserAccount (144 bytes):
  0-7:    discriminator
  8-39:   authority (Pubkey)
  40-71:  referral (Pubkey)
  72-103: token_account (Pubkey)
  104-111: minted_amount (u64)
  112-119: mint_start (i64)
  120-127: locked_until (i64)
  128-135: total_mints (u64)
  136-143: last_mint_time (i64) ← Used for cooldown
```

## Next Steps
1. Deploy to Devnet and test with fresh wallet
2. Verify registration succeeds
3. Test minting flow
4. Confirm diagnostics page displays correct info
5. Validate legacy account detection and messaging

## Rollback Plan
If issues arise:
1. Revert commit `e5abc77`
2. The mint_tokens instruction (7-account version) is unchanged and will continue working
3. Only registration will fail - existing users can still mint

## Known Limitations
- No automated migration for legacy accounts (136 bytes → 144 bytes)
- Users with legacy accounts must use fresh wallet or contact support
- This is expected during Devnet development phase
