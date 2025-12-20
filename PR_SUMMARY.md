# PR Summary: Synchronize Frontend Minting Logic with Canonical On-Chain Tier Enforcement

## Changes Overview

This PR removes all localStorage usage for user registration order and tier determination, replacing it with on-chain UserMetadata as the single canonical source of truth.

### Files Changed

1. **src/utils/userMetadata.ts** (NEW)
   - Utility for fetching and decoding UserMetadata accounts from Solana
   - Validates user_index (1-100M) and elevated_mint_attempts_used (0-1000)
   - Fail-fast if account doesn't exist or data is invalid

2. **app/mint/page.tsx** (MODIFIED)
   - Removed localStorage reads/writes for `equa_user_number`
   - Added `userMetadata` state to store on-chain metadata
   - Updated `checkUserRegistration()` to fetch UserMetadata
   - Updated `handleMint()` to use `userMetadata.user_index` for tier
   - Fixed `totalMints` calculation:
     - Elevated users (1-100): Use `metadata.elevated_mint_attempts_used`
     - Standard users (101+): Calculate from `minted_amount / equaPerMint`
   - Updated UI components to display `userMetadata.user_index`
   - Removed unused constants: `DEFAULT_EQUA_PER_MINT`, `MAX_REASONABLE_USER_NUMBER`

3. **ONCHAIN_CANONICAL_SYNC.md** (NEW)
   - Comprehensive documentation of the implementation
   - Details account structure, validation, and fail-fast behavior
   - Migration notes and testing recommendations

### Behavior Changes

**Before:**
```
User Registration → Store in localStorage → Use for tier
                  ↓
            Fallback to totalUsers if unavailable
                  ↓
            Use local tier calculation
```

**After:**
```
User Registration → UserMetadata created on-chain
                  ↓
            Fetch UserMetadata PDA
                  ↓
            Use user_index for tier (fail-fast if unavailable)
```

### Critical Validations

1. **UserMetadata Fetch Fail-Fast:**
   - If account doesn't exist: Set error, return early
   - If data invalid: Log error, return null
   - If tier cannot be determined: Throw error in mint handler

2. **Tier Calculation:**
   - Uses `getUserMintTier(userMetadata.user_index)` exclusively
   - No fallback to DEFAULT_EQUA_PER_MINT
   - Requires valid tier or minting fails

3. **Total Mints Display:**
   - Elevated users: Direct from `elevated_mint_attempts_used`
   - Standard users: Calculated from `minted_amount / equaPerMint`
   - Prevents showing 0 mints for standard users who have minted

### Backend Coordination

This PR assumes the backend has UserMetadata account with:
- PDA: `[b"user-meta", authority.as_ref()]`
- Fields: `user_index: u32`, `elevated_mint_attempts_used: u32`
- Created during `initialize_user` with user_index from GlobalState
- Updated during `mint_tokens` for elevated users

### Testing Verification

✅ TypeScript compilation successful
✅ Build successful (npm run build)
✅ No localStorage usage for tier/user_number
✅ Fail-fast behavior implemented
✅ Documentation complete

### Migration Impact

- **New users**: UserMetadata created automatically during registration
- **Existing users**: Will see error until UserMetadata account exists (backend creates)
- **No data loss**: localStorage not deleted, just not read for tier/user_number
