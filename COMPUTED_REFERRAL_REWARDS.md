# Computed Referral Rewards Implementation

## Summary

**Date**: December 2025  
**Change**: Frontend now displays computed mint-based rewards instead of stored legacy values

## Problem

The frontend was displaying referral rewards directly from the on-chain `referral_rewards` field, which included legacy signup bonuses (~1,000 EQUA per referral). This resulted in inflated reward displays that didn't reflect the actual mint-based percentage system (1% individual / 2% business).

Example issue:
- Wallet `4CcmA2GL67A7M1dppQo1ouaZv9YR2Vn6LmwxEY2V2ymJ` showed 1,100 EQUA rewards
- Actual mint-based rewards should have been much lower
- Referral count showed "0 referrals" due to localStorage heuristics instead of on-chain scanning

## Solution

### 1. Computed Rewards Function

Created `computeReferralRewards()` in `src/utils/referralRewards.ts`:

```typescript
/**
 * Compute referral rewards from on-chain truth (minted amounts of referred users)
 * - Fetches all referred users via getUsersReferredBy()
 * - Reads each user's minted_amount from their UserAccount
 * - Applies percentage: 1% (individual) or 2% (business)
 * - Sums using BN arithmetic to avoid overflow
 */
async function computeReferralRewards(
  connection: Connection,
  referrerAuthorityPubkey: PublicKey
): Promise<BN | null>
```

### 2. Updated Components

**WalletDashboard.tsx:**
- Replaced direct `referral_rewards` field access with computed rewards
- Replaced localStorage referral count with on-chain `getUsersReferredBy()` count
- Updated display labels to clarify "Mint-Based Rewards"

**ReferralRewards.tsx:**
- Already uses `getReferralStats()` which now computes rewards
- Updated UI labels to show "Mint-Based Rewards"
- Updated info text to explain dynamic computation

### 3. Updated getReferralStats()

Modified to return computed rewards instead of stored field:

```typescript
// Old (legacy):
return {
  referralRewards: userData.referralRewards,  // Stored field with signup bonuses
  referredUsersCount: referredUsers.length,
  referredUsers,
};

// New (computed):
const computedRewards = await computeReferralRewards(connection, userData.authority);
return {
  referralRewards: computedRewards || new BN(0),  // Computed from minted amounts
  referredUsersCount: referredUsers.length,
  referredUsers,
};
```

## Key Features

✅ **On-Chain Truth**: Rewards computed from actual minted amounts, not stored field  
✅ **Dynamic Updates**: Values change automatically as referred users mint more  
✅ **No Legacy Bonuses**: Signup bonuses automatically excluded from display  
✅ **Accurate Counts**: Referral count from on-chain scanning, not localStorage  
✅ **Overflow Safe**: Uses BN arithmetic throughout  
✅ **Dynamic Decimals**: Uses mint decimals (6) consistently  

## Current Limitations

⚠️ **No referral_type field**: Backend UserAccount doesn't yet include `referral_type` field, so all rewards calculated at 1% (individual rate). When backend adds this field, frontend will automatically apply 2% for business referrals.

⚠️ **No referral_events_count field**: Backend doesn't track number of mint events per referred user. Frontend computes total rewards from cumulative `minted_amount`.

## Testing

All tests updated and passing (22/22):
- ✅ `computeReferralRewards()` with multiple referred users
- ✅ `getReferralStats()` with computed rewards
- ✅ Correct account structure (136 bytes, no locked_until)
- ✅ Correct field offsets (referral_rewards at byte 120)

## Files Modified

1. `src/utils/referralRewards.ts` - Added `computeReferralRewards()`, updated `getReferralStats()`
2. `src/components/WalletDashboard.tsx` - Use computed rewards and on-chain count
3. `src/components/ReferralRewards.tsx` - Updated UI labels
4. `__tests__/referralRewards.test.ts` - Updated tests for new behavior
5. `docs/REFERRAL_REWARDS_IMPLEMENTATION.md` - Documented changes

## Migration Notes

### For Backend Developers

When adding `referral_type` field to UserAccount:
1. Update IDL with new field
2. Frontend will automatically detect and use it via:
   ```typescript
   // TODO in computeReferralRewards():
   const rewardPercent = userData.referralType === 'business' 
     ? BUSINESS_REFERRAL_PERCENT  // 2%
     : INDIVIDUAL_REFERRAL_PERCENT; // 1%
   ```

### For Frontend Developers

**Deprecated Functions:**
- `getReferralRewardsBalance()` - Returns LEGACY stored value, use `computeReferralRewards()` instead
- `getReferrerData()` from `referralRateLimit.ts` - Used for localStorage count, use `getUsersReferredBy()` instead

**Recommended Usage:**
```typescript
import { getReferralStats } from '@/utils/referralRewards';

// Get computed rewards and on-chain count
const stats = await getReferralStats(connection, userAccountPDA);
console.log('Computed rewards:', stats.referralRewards.toString());
console.log('On-chain count:', stats.referredUsersCount);
```

## Performance Considerations

**RPC Calls**: Computing rewards requires:
1. 1 call to `getProgramAccounts()` (filtered by referrer)
2. N calls to `getAccountInfo()` where N = number of referred users

**Optimization**: Results are not cached in this implementation. Consider adding caching for production with appropriate TTL.

## Acceptance Criteria Status

✅ Referral rewards displayed for a referrer equal the sum of minted amounts of referred users multiplied by 1%  
✅ Referral count reflects actual on-chain referred users  
✅ No reliance on legacy signup bonus values  
✅ No hardcoded minting rate; values change automatically with minted amounts  
✅ Decimals handled dynamically (6 decimals via mint)  
✅ BN arithmetic used to avoid overflow  
