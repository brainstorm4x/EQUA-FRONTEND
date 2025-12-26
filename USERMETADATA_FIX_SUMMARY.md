# UserMetadata Decoding Fix - Implementation Summary

## Problem
The frontend's `src/utils/userMetadata.ts` was decoding UserMetadata accounts using incorrect offsets and a minimum account size of 16 bytes, causing:
- Garbage `user_index` values (e.g., 3,614,518,954) 
- "Invalid user_index" errors blocking registration and minting
- Unregistered users unable to access mint page gracefully

## Root Cause
The decoder assumed a simplified 16-byte layout:
```
Offset 8-11:  user_index (WRONG - this is actually part of user_account field)
Offset 12-15: elevated_mint_attempts_used (WRONG)
```

The actual on-chain Rust struct is 96 bytes:
```rust
#[account]
pub struct UserMetadata {
    pub user_account: Pubkey,          // 32 bytes (offset 8-39)
    pub user_type: u8,                 // 1 byte  (offset 40)
    pub user_index: u32,               // 4 bytes (offset 41-44) ← KEY FIELD
    pub elevated_mint_attempts_used: u32, // 4 bytes (offset 45-48) ← KEY FIELD
    pub kyc_verified: bool,            // 1 byte  (offset 49)
    pub captcha_passed: bool,          // 1 byte  (offset 50)
    pub device_fingerprint: [u8; 32],  // 32 bytes (offset 51-82)
    pub last_referral_slot: u64,       // 8 bytes (offset 83-90)
    pub referrals_made: u32,           // 4 bytes (offset 91-94)
    pub version: u8,                   // 1 byte  (offset 95)
}
// Total: 8 (discriminator) + 88 (data) = 96 bytes
```

## Solution

### 1. Updated `src/utils/userMetadata.ts`
**Changes:**
- ✅ Set `MIN_ACCOUNT_SIZE = 96` (was 16)
- ✅ Set `USER_INDEX_OFFSET = 41` (was 8)
- ✅ Set `ELEVATED_ATTEMPTS_OFFSET = 45` (was 12)
- ✅ Added structured error logging with error types:
  - `ACCOUNT_NOT_FOUND` - User not registered
  - `INVALID_ACCOUNT_SIZE` - Wrong buffer size
  - `INVALID_USER_INDEX` - user_index outside valid range
  - `INVALID_ELEVATED_ATTEMPTS` - elevated_attempts outside valid range
  - `NETWORK_ERROR` - RPC connection failure

**Validation:**
- user_index must be in range [1, 100,000,000]
- elevated_mint_attempts_used must be in range [0, 1000]
- Account must be exactly 96 bytes

### 2. Updated `app/mint/page.tsx`
**Changes:**
- ✅ When UserMetadata is missing, set `registered = false` instead of showing error
- ✅ Display registration form instead of error message for unregistered users
- ✅ Graceful fallback: missing UserMetadata → prompt user to register

**Before:**
```typescript
if (!metadata) {
  setError('Unable to fetch user registration data...');
  setUserMetadata(null);
  return; // Still shows as "registered"
}
```

**After:**
```typescript
if (!metadata) {
  setRegistered(false); // Clear registration state
  setUserMetadata(null);
  console.log('💡 UserMetadata not found - user needs to register');
  return; // Show registration form
}
```

### 3. Added Comprehensive Tests (`__tests__/userMetadata.test.ts`)
**Coverage:**
- ✅ Valid 96-byte buffers with various user_index values (1, 100, 1000, 100000)
- ✅ Account size validation (reject < 96 bytes)
- ✅ Invalid user_index values (0, > 100M, garbage values)
- ✅ Invalid elevated_attempts values (> 1000)
- ✅ Account not found scenarios
- ✅ Network error handling
- ✅ **Regression test**: Verify offset 41 is used, not offset 8 (garbage at offset 8 is ignored)

**Test Results:** 17/17 tests passing ✅

## Verification

### Manual Verification Script
Created `verify-usermetadata-fix.js` demonstrating:
```
✅ Test 1: User #1 (elevated tier)                    - PASS
✅ Test 2: User #100 (last elevated tier)             - PASS
✅ Test 3: User #1000 (standard tier)                 - PASS
✅ Test 4: Reject invalid account size (16 bytes)     - PASS
✅ Test 5: Reject garbage user_index (3,614,518,954)  - PASS
✅ Test 6: Verify correct offsets                     - PASS
```

### Build Verification
```bash
npm run build
# ✓ Compiled successfully
# ✓ Generating static pages (11/11)
```

## Files Changed
1. **`src/utils/userMetadata.ts`** - Core decoding logic with correct offsets
2. **`app/mint/page.tsx`** - Gating logic for unregistered users
3. **`__tests__/userMetadata.test.ts`** - Comprehensive test suite (new file)

## Impact

### Fixes
- ✅ Registered users can now load metadata and mint correctly
- ✅ Unregistered users see registration form instead of error
- ✅ Garbage user_index values (3.6B+) are rejected with clear error
- ✅ Structured error logging helps debug RPC vs decoding vs validation issues

### User Experience
**Before Fix:**
- Error: "Invalid user_index: 3614518954"
- Mint page inaccessible
- No clear action for unregistered users

**After Fix:**
- Registered users: Metadata loads correctly, can mint
- Unregistered users: See registration form with clear CTA
- Invalid data: Clear error messages with type classification

## Testing Recommendations

### Manual Testing (Required)
1. **Registered user:**
   ```
   - Connect wallet with existing UserMetadata account
   - Verify metadata loads (user_index, elevated_attempts shown correctly)
   - Verify mint button is enabled/disabled based on cooldown
   - Attempt to mint - should succeed if cooldown expired
   ```

2. **Unregistered user:**
   ```
   - Connect wallet without UserMetadata account
   - Verify registration form is shown (not error message)
   - Verify CTA to register is clear and actionable
   - Complete registration - verify metadata created correctly
   ```

3. **Edge cases:**
   ```
   - Network failure during metadata fetch → should log NETWORK_ERROR
   - Invalid account data (< 96 bytes) → should log INVALID_ACCOUNT_SIZE
   - Corrupted user_index → should log INVALID_USER_INDEX
   ```

## Technical Details

### PDA Derivation (Unchanged)
```typescript
Seeds: [b"user-meta", authority]
Program: PROGRAM_ID (GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C)
```

### Token Program (Unchanged)
- Token-2022 ONLY (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
- Standard SPL Token NOT supported

### Account Layout Reference
```
Offset  Size  Field                         Type
------  ----  -----------------------------  ------
0-7     8     discriminator                  [u8; 8]
8-39    32    user_account                   Pubkey
40      1     user_type                      u8
41-44   4     user_index                     u32     ← Tier determination
45-48   4     elevated_mint_attempts_used    u32     ← Attempt tracking
49      1     kyc_verified                   bool
50      1     captcha_passed                 bool
51-82   32    device_fingerprint             [u8; 32]
83-90   8     last_referral_slot             u64
91-94   4     referrals_made                 u32
95      1     version                        u8
------  ----
Total:  96 bytes
```

## Future Considerations
1. Consider using Anchor's program coder for automatic deserialization (if IDL updated)
2. Cache UserMetadata in `useProgram` hook for performance
3. Add telemetry for tracking decoding failures by error type
4. Monitor distribution of user_index values for tier balancing

## Conclusion
This fix aligns the frontend decoder with the canonical on-chain Rust struct (96 bytes), enabling:
- Accurate user tier determination
- Correct elevated attempt tracking
- Graceful handling of unregistered users
- Better error diagnostics for troubleshooting

All changes are minimal, focused, and backward-compatible with Token-2022 configuration.
