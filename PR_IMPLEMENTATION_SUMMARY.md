# UserMetadata Decoding Fix - PR Summary

## Overview
Fixed UserMetadata account decoding to align with the canonical 96-byte on-chain Rust struct, resolving "Invalid user_index" errors and enabling proper registration gating.

## Problem
- Frontend assumed 16-byte UserMetadata layout with incorrect field offsets
- user_index read from offset 8 (actually part of user_account Pubkey field)
- Produced garbage values like 3,614,518,954, blocking registration and minting
- Missing UserMetadata threw errors instead of gating users to registration

## Solution

### 1. Core Decoding Fix (`src/utils/userMetadata.ts`)
```typescript
// BEFORE
MIN_ACCOUNT_SIZE = 16
USER_INDEX_OFFSET = 8    // WRONG - reads from user_account field
ELEVATED_ATTEMPTS_OFFSET = 12

// AFTER
MIN_ACCOUNT_SIZE = 96    // Match 96-byte on-chain struct
USER_INDEX_OFFSET = 41   // Correct offset after discriminator + user_account + user_type
ELEVATED_ATTEMPTS_OFFSET = 45
```

**Validation added:**
- user_index ∈ [1, 100,000,000]
- elevated_mint_attempts_used ∈ [0, 1000]

**Error logging enhanced:**
- `ACCOUNT_NOT_FOUND` - User not registered
- `INVALID_ACCOUNT_SIZE` - Buffer size mismatch
- `INVALID_USER_INDEX` - Value out of range
- `INVALID_ELEVATED_ATTEMPTS` - Value out of range
- `NETWORK_ERROR` - RPC failure

### 2. Gating Logic Fix (`app/mint/page.tsx`)
```typescript
// BEFORE: Shows error when UserMetadata missing
if (!metadata) {
  setError('Unable to fetch user registration data...');
  setUserMetadata(null);
  return; // User still appears "registered"
}

// AFTER: Show registration form when UserMetadata missing
if (!metadata) {
  setRegistered(false);  // Clear registration state
  setUserMetadata(null);
  console.log('💡 UserMetadata not found - user needs to register');
  return; // Shows registration form
}
```

### 3. Test Coverage (`__tests__/userMetadata.test.ts`)
**17 comprehensive tests, all passing:**
- ✅ Valid 96-byte buffers (users #1, #100, #1000, #100000)
- ✅ Account size validation (reject < 96 bytes)
- ✅ Invalid user_index rejection (0, > 100M, garbage values)
- ✅ Invalid elevated_attempts rejection (> 1000)
- ✅ Account not found scenarios
- ✅ Network error handling
- ✅ **Regression test**: Verify offset 41 used, not offset 8

## Verification Results

### Automated Tests
```bash
npm test -- __tests__/userMetadata.test.ts
# ✅ 17/17 tests passing
```

### Verification Script
```bash
node verify-usermetadata-fix.js
# ✅ Test 1: User #1 (elevated tier)                    - PASS
# ✅ Test 2: User #100 (last elevated tier)             - PASS
# ✅ Test 3: User #1000 (standard tier)                 - PASS
# ✅ Test 4: Reject invalid account size (16 bytes)     - PASS
# ✅ Test 5: Reject garbage user_index (3,614,518,954)  - PASS
# ✅ Test 6: Verify correct offsets                     - PASS
```

### Build Verification
```bash
npm run build
# ✓ Compiled successfully
# ✓ Generating static pages (11/11)
```

## Impact

### User Experience Improvements
| Scenario | Before | After |
|----------|--------|-------|
| **Registered user** | ❌ "Invalid user_index: 3614518954" | ✅ Metadata loads, can mint |
| **Unregistered user** | ❌ Error message, blocked | ✅ Registration form shown |
| **Network failure** | ❌ Generic error | ✅ Structured NETWORK_ERROR log |
| **Invalid data** | ❌ Silent failure | ✅ Clear validation error (INVALID_USER_INDEX, etc.) |

### Technical Improvements
- ✅ Decoder aligned with canonical 96-byte on-chain struct
- ✅ PDA seeds match backend: `[b"user-meta", authority]`
- ✅ Structured error logging for debugging
- ✅ Fail-fast validation with clear error types
- ✅ Comprehensive test coverage with regression protection

## Files Changed
1. **`src/utils/userMetadata.ts`** - Core decoding logic (96-byte layout, correct offsets)
2. **`app/mint/page.tsx`** - Gating logic (show registration form when unregistered)
3. **`__tests__/userMetadata.test.ts`** - 17 comprehensive tests (new file)
4. **`USERMETADATA_FIX_SUMMARY.md`** - Detailed technical documentation (new file)
5. **`.gitignore`** - Exclude verification script

## Testing Recommendations

### Manual Testing Required
1. **Registered user:**
   - Connect wallet with existing UserMetadata
   - Verify user_index and elevated_attempts display correctly
   - Verify mint works when cooldown expired

2. **Unregistered user:**
   - Connect wallet without UserMetadata
   - Verify registration form shown (not error)
   - Complete registration, verify metadata created

3. **Error scenarios:**
   - Network disconnect → NETWORK_ERROR logged
   - Invalid account → INVALID_ACCOUNT_SIZE logged

## Technical Reference

### Account Layout
```
Offset  Size  Field                         Notes
------  ----  -----------------------------  ---------------------------
0-7     8     discriminator                  Anchor account discriminator
8-39    32    user_account                   Pubkey of user's wallet
40      1     user_type                      0=individual, 1=business
41-44   4     user_index                     ← TIER DETERMINATION (was offset 8)
45-48   4     elevated_mint_attempts_used    ← ATTEMPT TRACKING (was offset 12)
49      1     kyc_verified                   Future use
50      1     captcha_passed                 Future use
51-82   32    device_fingerprint             Sybil prevention
83-90   8     last_referral_slot             Referral cooldown
91-94   4     referrals_made                 Referral count
95      1     version                        Schema version
------  ----
Total:  96 bytes (was incorrectly assumed to be 16)
```

## Security & Safety
- ✅ No changes to Token-2022 configuration
- ✅ No changes to PDA derivation logic
- ✅ No changes to instruction building
- ✅ Backward compatible with existing accounts
- ✅ Fail-fast validation prevents invalid state

## Out of Scope
- ❌ Mobile app changes (separate task)
- ❌ Backend modifications (backend is source of truth)
- ❌ IDL updates (frontend manually decodes UserMetadata)

## Conclusion
This minimal-change fix aligns the frontend UserMetadata decoder with the canonical on-chain 96-byte Rust struct, enabling:
- ✅ Accurate tier determination based on user_index
- ✅ Correct elevated attempt tracking
- ✅ Graceful gating for unregistered users
- ✅ Better error diagnostics for troubleshooting

All changes are surgical, focused, and validated with comprehensive tests.
