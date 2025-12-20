# On-Chain Canonical Sync Implementation

## Overview

This document describes the implementation of on-chain canonical synchronization for the EQUA frontend minting logic. The changes ensure that all user tier determination, minting limits, and attempt tracking use on-chain UserMetadata as the single source of truth, eliminating localStorage fallbacks and local tier calculations.

## Problem Statement

Previously, the frontend used multiple sources for determining user registration order and minting tier:
1. localStorage for caching user_number
2. Fallback to totalUsers count when user_number was unavailable
3. Local tier calculation using hardcoded ELEVATED_MINT_TIERS

This created inconsistencies and potential desynchronization with the canonical backend state.

## Solution

### 1. UserMetadata Utility (`src/utils/userMetadata.ts`)

Created a new utility module for fetching and decoding UserMetadata accounts from on-chain:

```typescript
export interface UserMetadata {
  user_index: number;                    // User's registration order (1-based)
  elevated_mint_attempts_used: number;   // Number of elevated attempts used
}
```

**Account Structure:**
- Offset 0-7: Discriminator (8 bytes)
- Offset 8-11: user_index (u32, little-endian)
- Offset 12-15: elevated_mint_attempts_used (u32, little-endian)
- Minimum account size: 16 bytes

**Key Functions:**
- `fetchUserMetadata(connection, authority)` - Fetch and decode UserMetadata
- `hasUserMetadata(connection, authority)` - Check if account exists
- `getUserIndex(connection, authority)` - Get user registration number
- `getElevatedAttemptsUsed(connection, authority)` - Get attempts used

**Validation:**
- user_index must be 1-100,000,000 (sanity check)
- elevated_mint_attempts_used must be 0-1,000 (sanity check)
- Account must exist and have minimum required size

### 2. Mint Page Changes (`app/mint/page.tsx`)

#### State Management
**Removed:**
- `userNumber` state (localStorage-based user registration number)
- `effectiveUserNumber` computed value with fallback logic

**Added:**
- `userMetadata: UserMetadata | null` state (canonical on-chain data)

#### Registration Check (`checkUserRegistration`)
**Before:**
- Read user_number from UserAccount at offset 136-144
- Fallback to localStorage if unavailable
- Further fallback to totalUsers if still unavailable
- Calculate total mints from minted_amount / equaPerMint

**After:**
- Fetch UserMetadata from on-chain using `fetchUserMetadata()`
- Fail-fast if UserMetadata cannot be fetched or is invalid
- Calculate totalMints based on user tier:
  - **Elevated users (1-100)**: Use `metadata.elevated_mint_attempts_used` directly
  - **Standard users (101+)**: Calculate from `minted_amount / equaPerMint`
- Set error state if UserMetadata is unavailable
- No localStorage reads for user_number

**Rationale for totalMints calculation:**
- `elevated_mint_attempts_used` only tracks elevated tier attempts (first 100 users)
- Standard users don't have elevated attempts, so we calculate from total minted amount
- This ensures accurate mint count display for all user tiers

#### Minting Logic (`handleMint`)
**Before:**
```typescript
const mintUserNumber = userNumber > 0 ? userNumber : Math.max(totalUsers || 0, 1);
const userTier = getUserMintTier(mintUserNumber);
const equaAmount = userTier?.equaPerAttempt || DEFAULT_EQUA_PER_MINT;
```

**After:**
```typescript
if (!userMetadata) {
  throw new Error('User metadata not available. Cannot determine minting tier.');
}
const userTier = getUserMintTier(userMetadata.user_index);
if (!userTier) {
  throw new Error('Unable to determine minting tier');
}
const equaAmount = userTier.equaPerAttempt;
```

**Key Changes:**
- Fail-fast if userMetadata is null
- Fail-fast if tier cannot be determined
- No fallback values (DEFAULT_EQUA_PER_MINT removed)
- Use `userMetadata.user_index` as the canonical source

#### Registration (`handleRegisterWithForm`)
**Before:**
- Calculate registrationNumber as totalUsers + 1
- Store to localStorage: `localStorage.setItem('equa_user_number', registrationNumber.toString())`
- Set userNumber state for immediate UI update

**After:**
- Registration persists on-chain only
- No localStorage save for user_number
- UI will fetch UserMetadata on next checkUserRegistration call
- Only fingerprint and registration_complete events stored in localStorage (Sybil prevention)

#### UI Components
**Before:**
```tsx
{userNumber > 0 && <p>User #{userNumber}</p>}
{userNumber > 0 && userNumber <= 100 && <MintTierCard ... />}
Claim your {getUserMintTier(effectiveUserNumber)?.equaPerAttempt...}
```

**After:**
```tsx
{userMetadata && <p>User #{userMetadata.user_index}</p>}
{userMetadata && userMetadata.user_index <= 100 && <MintTierCard ... />}
Claim your {userMetadata && getUserMintTier(userMetadata.user_index)?.equaPerAttempt...}
```

### 3. Removed Constants

- `DEFAULT_EQUA_PER_MINT = 100` - No longer needed, tier always determined from on-chain
- `MAX_REASONABLE_USER_NUMBER = 1_000_000` - Not used after removing localStorage logic

## Fail-Fast Behavior

The implementation includes multiple fail-fast checkpoints:

1. **UserMetadata Fetch** (`checkUserRegistration`):
   ```typescript
   if (!metadata) {
     setError('Unable to fetch user registration data from blockchain. Please refresh the page.');
     setUserMetadata(null);
     return;
   }
   ```

2. **Mint Validation** (`handleMint`):
   ```typescript
   if (!userMetadata) {
     throw new Error('User metadata not available. Cannot determine minting tier.');
   }
   ```

3. **Tier Determination** (`handleMint`):
   ```typescript
   if (!userTier) {
     throw new Error('Unable to determine minting tier for user #...');
   }
   ```

4. **Environment Config** (`src/lib/constants.ts`):
   - Runtime validation of TOKEN_PROGRAM_ID (must be Token-2022)
   - Runtime validation of ASSOCIATED_TOKEN_PROGRAM_ID
   - Throws Error if configuration is invalid

## Migration Notes

### For Existing Users
- Users registered before this change will have their UserMetadata account created by the backend during next registration
- Once UserMetadata exists on-chain, it becomes the source of truth
- Old localStorage values are ignored (no migration needed)

### For New Users
- UserMetadata is created during initialize_user instruction
- user_index assigned by backend based on GlobalState.user_count
- elevated_mint_attempts_used starts at 0

## Testing Recommendations

1. **New User Registration:**
   - Verify UserMetadata account is created with correct user_index
   - Verify no localStorage writes for user_number
   - Verify UI displays correct tier after registration

2. **Existing User Minting:**
   - Verify UserMetadata is fetched successfully
   - Verify tier calculation uses user_index from on-chain
   - Verify error handling when UserMetadata unavailable

3. **Edge Cases:**
   - User with no UserMetadata (legacy account) - should show error
   - Network failure during metadata fetch - should fail gracefully
   - Invalid user_index values - should be rejected by validation

## Backend Coordination

This frontend implementation assumes the backend has been updated with:

1. **UserMetadata Account Type:**
   ```rust
   pub struct UserMetadata {
       pub user_index: u32,
       pub elevated_mint_attempts_used: u32,
       // ... reserved fields
   }
   ```

2. **PDA Derivation:**
   - Seeds: `[b"user-meta", authority.key().as_ref()]`
   - Derived under PROGRAM_ID

3. **Instructions Updated:**
   - `initialize_user` creates UserMetadata with user_index from GlobalState.user_count + 1
   - `mint_tokens` increments elevated_mint_attempts_used for elevated users
   - Both instructions include user_metadata account in account list

## Files Changed

1. **New Files:**
   - `src/utils/userMetadata.ts` - UserMetadata fetching and decoding

2. **Modified Files:**
   - `app/mint/page.tsx` - Remove localStorage, add UserMetadata state, update tier logic
   - ~~`src/lib/constants.ts`~~ - No changes needed (already has fail-fast validation)
   - ~~`src/utils/registration.ts`~~ - No changes needed (tier logic remains the same)

3. **Documentation:**
   - `ONCHAIN_CANONICAL_SYNC.md` - This document

## Future Enhancements

1. **UserMetadata Caching:**
   - Consider caching UserMetadata in useProgram hook for performance
   - Cache invalidation on registration/minting success

2. **Migration Tool:**
   - Script to verify all registered users have UserMetadata accounts
   - Batch creation for legacy accounts if needed

3. **Analytics:**
   - Track UserMetadata fetch failures
   - Monitor tier distribution across user_index ranges

## Conclusion

This implementation establishes on-chain UserMetadata as the canonical source of truth for user registration order and minting tier determination. All localStorage fallbacks have been removed, and fail-fast behavior ensures operations cannot proceed with stale or missing data.
