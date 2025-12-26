# EQUA Frontend Fixes Summary

## Date: 2025-12-09

This document summarizes the fixes applied to the EQUA-FRONTEND repository to address four critical problems.

---

## Problem 1: Incorrect Minting Rate Tiers ✅ FIXED

### Issue
The minting rates were not correctly configured per the specification. User #1 was getting 10,000 EQUA per day instead of 100,000 EQUA per day.

### Root Cause
The `ELEVATED_MINT_TIERS` array in `src/utils/registration.ts` only had 4 tiers, ending at user #101 with all subsequent users getting 100 EQUA per day. The specification required 11 tiers with decreasing rates down to 0.0005 EQUA per day.

### Fix
Updated `src/utils/registration.ts` with the complete tier structure:

```typescript
export const ELEVATED_MINT_TIERS: ElevatedMintTier[] = [
  { minUser: 1, maxUser: 1, equaPerAttempt: 100000, elevatedAttempts: 100 },        // User #1: 100,000 EQUA/day × 100 days
  { minUser: 2, maxUser: 10, equaPerAttempt: 10000, elevatedAttempts: 100 },        // Users #2-10: 10,000 EQUA/day × 100 days
  { minUser: 11, maxUser: 100, equaPerAttempt: 1000, elevatedAttempts: 100 },       // Users #11-100: 1,000 EQUA/day × 100 days
  { minUser: 101, maxUser: 1000, equaPerAttempt: 100, elevatedAttempts: 0 },        // Users #101-1000: 100 EQUA/day
  { minUser: 1001, maxUser: 10000, equaPerAttempt: 10, elevatedAttempts: 0 },       // Users #1001-10000: 10 EQUA/day
  { minUser: 10001, maxUser: 100000, equaPerAttempt: 1, elevatedAttempts: 0 },      // Users #10001-100000: 1 EQUA/day
  { minUser: 100001, maxUser: 1000000, equaPerAttempt: 0.1, elevatedAttempts: 0 },  // Users #100001-1000000: 0.1 EQUA/day
  { minUser: 1000001, maxUser: 10000000, equaPerAttempt: 0.01, elevatedAttempts: 0 }, // Users #1000001-10000000: 0.01 EQUA/day
  { minUser: 10000001, maxUser: 100000000, equaPerAttempt: 0.001, elevatedAttempts: 0 }, // Users #10000001-100000000: 0.001 EQUA/day
  { minUser: 100000001, maxUser: 1000000000, equaPerAttempt: 0.0005, elevatedAttempts: 0 }, // Users #100000001-1000000000: 0.0005 EQUA/day
  { minUser: 1000000001, maxUser: Infinity, equaPerAttempt: 0.0005, elevatedAttempts: 0 }, // Users #1000000001+: continue at 0.0005 EQUA/day
];
```

### Verification
- Tested tier calculations for sample users across all ranges
- All users now receive correct minting amounts per specification
- Build passes successfully

---

## Problem 2: Balance Display Showing Base Units ✅ VERIFIED WORKING

### Issue
The balance display on the Mint EQUA Token page was showing incorrect amounts in base units instead of EQUA tokens (e.g., showing 100,000,000 instead of 100 EQUA for user #1).

### Investigation
Reviewed the balance display code in `app/mint/page.tsx` at line 1139:
```typescript
<p className="text-white font-bold text-5xl text-center mb-2">
  {formatEquaBalance(balance)}
</p>
```

The balance is fetched from the SPL token account (line 261-262) using `getTokenBalance()`, which returns the raw base units. This is then passed to `formatEquaBalance()` in `src/utils/tokenFormat.ts`, which correctly converts from base units (6 decimals) to EQUA tokens.

### Finding
The code was already correct. The balance display uses `formatEquaBalance()` which:
1. Takes balance in base units (e.g., 100_000_000)
2. Divides by 1,000,000 (EQUA_DECIMAL_MULTIPLIER)
3. Returns formatted EQUA amount (e.g., "100")

### Status
✅ **No changes needed** - Balance display already functions correctly and shows EQUA tokens, not base units.

---

## Problem 3: Mint Transaction Error (Instruction Fallback) ✅ FIXED

### Issue
When clicking "Mint Daily EQUA" button, users received this error:
```
Simulation failed.
Message: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x65.
Logs: [
  "Program GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C invoke [1]",
  "Program log: AnchorError occurred. Error Code: InstructionFallbackNotFound. Error Number: 101."
]
```

### Root Cause
The code was using the wrong instruction. The on-chain program has two minting instructions:
1. **`mint_equa`** - High-level daily minting with cooldown logic (discriminator: `[151, 97, 251, 10, 45, 109, 190, 115]`)
2. **`mint_equa_tokens`** - Low-level token minting (discriminator: `[166, 66, 221, 55, 153, 196, 139, 85]`)

The frontend was using `mint_equa_tokens` (6 accounts) when it should have been using `mint_equa` (2 accounts).

Error code 0x65 (101) = `InstructionFallbackNotFound` means the discriminator didn't match any known instruction.

### Fix
Updated `createMintEquaInstruction()` in both:
- `lib/program.ts`
- `src/lib/program.ts`

**Old signature** (6 accounts):
```typescript
createMintEquaInstruction(
  userAccount, userTokenAccount, mint, mintAuthority, authority, tokenProgram, amount
)
```

**New signature** (2 accounts):
```typescript
createMintEquaInstruction(
  userAccount, authority, amount
)
```

**Changed discriminator**: `[166, 66, 221, 55, 153, 196, 139, 85]` → `[151, 97, 251, 10, 45, 109, 190, 115]`

**Updated accounts**:
```typescript
keys: [
  { pubkey: userAccount, isSigner: false, isWritable: true },
  { pubkey: authority, isSigner: true, isWritable: false },
]
```

Also created a new `createMintEquaTokensInstruction()` function to preserve the old low-level instruction for potential future use.

### Files Changed
- `lib/program.ts`
- `src/lib/program.ts`
- `app/mint/page.tsx` (updated instruction call)
- `scripts/e2e-register-mint.ts`
- `__tests__/lib/mintInstruction.test.ts`

### Verification
- All tests pass ✅
- Build succeeds ✅
- Instruction now uses correct discriminator and account structure

---

## Problem 4: Pyth Network 404 Error ✅ FIXED

### Issue
Console showed 404 error when fetching Pyth price feeds:
```
Failed to load resource: the server responded with a status of 404 ()
https://hermes.pyth.network/api/get_latest_price_feeds?ids%5B%5D=0x765de...
```

### Root Cause
The code was using an outdated Pyth Hermes API endpoint:
- **Old**: `/api/get_latest_price_feeds`
- **Correct**: `/v2/updates/price/latest`

The response format also changed between API versions.

### Fix
Updated `src/utils/eqxOracle.ts`:

**1. Updated API endpoint** (line 158):
```typescript
// Old
const PYTH_HERMES_API = 'https://hermes.pyth.network/api/get_latest_price_feeds';

// New
const PYTH_HERMES_API = 'https://hermes.pyth.network/v2/updates/price/latest';
```

**2. Updated response parsing** (line 192):
```typescript
// Old
if (!response.data || !Array.isArray(response.data)) { ... }
for (const feed of response.data) { ... }

// New
if (!response.data || !response.data.parsed || !Array.isArray(response.data.parsed)) { ... }
for (const feed of response.data.parsed) { ... }
```

The Hermes V2 API returns:
```json
{
  "binary": { "data": [...], "encoding": "hex" },
  "parsed": [...]
}
```

### Feed IDs Verified
All feed IDs in the error message match the code - no changes needed:
- XAU/USD (Gold): `0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9` ✅
- WTI/USD (Oil): `0x925c4ef7ee2b7b4c19a23b04d80187b3e687b3e6e65a97cf93bf3cce8db3b8a2` ✅
- COPPER/USD: `0x1ff1261f8c1aef0e8736e26a28e1330a645e3e21203d1e609f87df918d6af510` ✅
- WHEAT/USD: `0xb1830a04e1e59bf3cbd0f93a2e6b321acd5e7d89892c0becc49b265eada2c694` ✅
- EUR/USD: `0x2d0366e8361c110a1fcf6b3023a1d4e17f63b3a2e10b8ca8bb144dbe7b8a7de0` ✅
- CNY/USD: `0x60964c6f8ec3a8283bbc2fa9a5a321d996bb099c7ccafca443c1a89fa919e05d` ✅
- JPY/USD: `0xac5c83fbd5b1b125d7d4aa5e7ddf14e354ae3836e47ac5b2e87fea9cb7c9b7af` ✅
- GBP/USD: `0xcf094b0624b532422629f3cffe918d512a529bbc1794cb15d3a0128c541f71b8` ✅

### Verification
- Build passes successfully ✅
- API endpoint now points to correct v2 URL
- Response parsing handles new format

---

## Summary of Changes

### Files Modified
1. `src/utils/registration.ts` - Added complete 11-tier minting rate structure
2. `lib/program.ts` - Changed to `mint_equa` instruction with correct discriminator
3. `src/lib/program.ts` - Changed to `mint_equa` instruction with correct discriminator
4. `app/mint/page.tsx` - Updated instruction call to use 2-account signature
5. `src/utils/eqxOracle.ts` - Updated Pyth API endpoint to v2 and response parsing
6. `scripts/e2e-register-mint.ts` - Updated for new instruction signature
7. `__tests__/lib/mintInstruction.test.ts` - Updated tests for new instruction

### Testing Results
- ✅ Build succeeds
- ✅ Type checking passes (main source code)
- ✅ Mint instruction tests pass (4/4)
- ✅ Tier calculation verification passes (11/11)

### Deployment Notes
1. All changes are backward compatible with the on-chain program
2. The `mint_equa` instruction is the correct instruction for daily minting
3. Users will now mint the correct amounts per their tier
4. Pyth price feeds should load without 404 errors
5. Balance display was already correct and requires no user action

---

## Next Steps for Manual Testing

1. **Test Minting for User #1**:
   - Register as first user
   - Verify daily mint amount is 100,000 EQUA
   - Check balance displays "100,000" not "100,000,000,000"

2. **Test Minting Transaction**:
   - Click "Mint Daily EQUA" button
   - Verify no "InstructionFallbackNotFound" error
   - Confirm transaction succeeds on Solana Explorer

3. **Test Pyth Price Feeds**:
   - Open browser DevTools → Network tab
   - Navigate to pages using EQX oracle
   - Verify no 404 errors for hermes.pyth.network
   - Confirm prices load successfully

4. **Test Different User Tiers**:
   - Register users at different positions (e.g., #5, #50, #150, #1500)
   - Verify each receives correct daily EQUA amount per tier
