# Registration Error Fix - Technical Details

## Issue Description
Users were getting the following error during registration:

```
Error: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x7d0

Program log: AnchorError caused by account: referral_account. 
Error Code: ConstraintMut. Error Number: 2000. 
Error Message: A mut constraint was violated.
```

## Root Cause
The frontend was building the `initialize_user` instruction with **11 accounts**, but the Anchor IDL specifies only **9 accounts**. This mismatch caused transaction simulation to fail.

### What Was Wrong
The frontend instruction builder included two extra accounts:
1. `user_metadata` (at index 1)
2. `referrer_metadata` (at index 5)

These accounts are NOT in the backend IDL and were causing all subsequent accounts to be at wrong indices.

## The Fix

### Before (INCORRECT - 11 accounts)
```typescript
createInitializeUserInstruction(
  userAccount,       // 0
  userMetadata,      // 1 ❌ NOT IN IDL
  authority,         // 2
  globalState,       // 3
  referralAccount,   // 4 ❌ WRONG INDEX (should be 3)
  referrerMetadata,  // 5 ❌ NOT IN IDL
  userTokenAccount,  // 6 ❌ WRONG INDEX (should be 4)
  mint,              // 7 ❌ WRONG INDEX (should be 5)
  // ... rest of accounts at wrong indices
)
```

### After (CORRECT - 9 accounts)
```typescript
createInitializeUserInstruction(
  userAccount,       // 0 ✅ user_account
  authority,         // 1 ✅ authority
  globalState,       // 2 ✅ global_state
  referralAccount,   // 3 ✅ referral_account (writable!)
  userTokenAccount,  // 4 ✅ user_token_account
  mint,              // 5 ✅ mint
  associatedTokenProgram, // 6 ✅ associated_token_program
  tokenProgram,      // 7 ✅ token_program
  referrer,          // ARG: referrer pubkey
  mintStart,         // ARG: mint_start timestamp
  lockedUntil        // ARG: locked_until timestamp
)
// System program is added automatically at index 8
```

## IDL Account Order (Source of Truth)
According to `/public/idl/equa_token.json`:

```json
{
  "name": "initialize_user",
  "accounts": [
    { "name": "user_account", "writable": true },
    { "name": "authority", "writable": true, "signer": true },
    { "name": "global_state", "writable": true },
    { "name": "referral_account", "writable": true },  // ← MUST BE WRITABLE
    { "name": "user_token_account", "writable": true },
    { "name": "mint" },
    { "name": "associated_token_program" },
    { "name": "token_program" },
    { "name": "system_program" }
  ],
  "args": [
    { "name": "referral", "type": "pubkey" },
    { "name": "mint_start", "type": "i64" },
    { "name": "locked_until", "type": "i64" }
  ]
}
```

## Files Changed

### 1. Core Instruction Builder
- `src/lib/program.ts` (lines 313-373)
- `lib/program.ts` (lines 233-300)

**Changes:**
- Removed `userMetadata` parameter
- Removed `referrerMetadata` parameter
- Removed `userType` parameter (not in IDL args)
- Moved `referrer` to be 9th parameter (before timestamp args)
- Reduced accounts array from 11 to 9 items
- Updated account order to match IDL exactly

### 2. Call Sites Updated
- `app/mint/page.tsx` (lines 571-618)
- `scripts/e2e-register-mint.ts` (lines 155-167)

**Changes:**
- Removed `getUserMetadataPDA()` calls for registration
- Removed `referrerMetadataPubkey` derivation
- Updated function calls to use new 11-parameter signature

### 3. Test Files Updated
- `__tests__/registration/initializeUserInstruction.test.ts`

**Changes:**
- Updated all test calls to match new signature
- Moved `referrer` argument before timestamps
- All 5 test cases now pass

## Critical Account: `referral_account`

The `referral_account` at **index 3** MUST be marked as `isWritable: true` because:

1. When a user registers with a referral, the backend needs to increment the referrer's referral count
2. When a user self-refers (no referral), the account is `PublicKey.default` but still must be writable per IDL
3. The Anchor program validates this constraint at runtime

```typescript
// In the instruction builder
{ pubkey: referralAccount, isSigner: false, isWritable: true }, // ✅ CRITICAL
```

## Referral Flow

### With Referral Code
```typescript
// User provides referrer wallet address
const referrerPubkey = new PublicKey(referrerWalletAddress);

// Derive the referrer's user_account PDA
const [referralAccountPubkey] = getUserAccountPDA(referrerPubkey);

// Pass to instruction
createInitializeUserInstruction(
  ...,
  referralAccountPubkey,  // Referrer's user_account (writable)
  ...,
  referrerPubkey,         // Referrer's wallet (argument)
  ...
);
```

### Without Referral (Self-Referral)
```typescript
// No referrer - use default pubkey
const referralAccountPubkey = PublicKey.default;
const referrerPubkey = PublicKey.default;

// Pass to instruction
createInitializeUserInstruction(
  ...,
  referralAccountPubkey,  // PublicKey.default (still writable!)
  ...,
  referrerPubkey,         // PublicKey.default (argument)
  ...
);
```

## Testing Checklist

### Unit Tests ✅
- [x] `initializeUserInstruction.test.ts` passes
- [x] All 5 test cases verify correct account order
- [x] Referral account writability test passes

### Integration Testing (Manual)
- [ ] Connect Phantom wallet to devnet
- [ ] Register user without referral
- [ ] Register second user with first user's referral
- [ ] Verify referral count increments on-chain
- [ ] Test minting EQUA tokens
- [ ] Test transfers between users

### Expected Behavior
1. **Registration without referral:** Transaction succeeds, user_account created
2. **Registration with referral:** Transaction succeeds, referrer's count increments
3. **No more ConstraintMut errors:** All accounts at correct indices

## Pyth Network Price Feeds

The Pyth Network integration is **already correct** and doesn't need changes.

### Endpoint Configuration
```typescript
// Hermes V2 API (correct)
const PYTH_HERMES_API = 'https://hermes.pyth.network/v2/updates/price/latest';
```

### Official Feed IDs Used
From https://pyth.network/developers/price-feed-ids:
- XAU/USD (Gold): `0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9`
- WTI/USD (Oil): `0x925c4ef7ee2b7b4c19a23b04d80187b3e687b3e6e65a97cf93bf3cce8db3b8a2`
- EUR/USD: `0x2d0366e8361c110a1fcf6b3023a1d4e17f63b3a2e10b8ca8bb144dbe7b8a7de0`
- CNY/USD: `0x60964c6f8ec3a8283bbc2fa9a5a321d996bb099c7ccafca443c1a89fa919e05d`
- JPY/USD: `0xac5c83fbd5b1b125d7d4aa5e7ddf14e354ae3836e47ac5b2e87fea9cb7c9b7af`
- GBP/USD: `0xcf094b0624b532422629f3cffe918d512a529bbc1794cb15d3a0128c541f71b8`
- COPPER/USD: `0x1ff1261f8c1aef0e8736e26a28e1330a645e3e21203d1e609f87df918d6af510`
- WHEAT/USD: `0xb1830a04e1e59bf3cbd0f93a2e6b321acd5e7d89892c0becc49b265eada2c694`

### Fallback Mechanism
If Pyth Network is unavailable, the system gracefully falls back to:
1. CoinGecko API (partial data)
2. Hardcoded fallback prices (complete data)

This ensures the app always works even during Pyth outages.

## Security Considerations

### CodeQL Analysis ✅
- No security vulnerabilities detected
- All code changes are safe

### Account Validation
- PDA derivation uses correct seeds
- All accounts properly marked as writable/signer
- No privilege escalation risks

### Transaction Safety
- Proper blockhash handling
- Transaction confirmation with retry logic
- Error handling with user-friendly messages

## Deployment Notes

### Environment Variables
Make sure `.env.local` has:
```bash
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_ENABLE_PYTH=true
```

### Build and Deploy
```bash
# Install dependencies
npm install --legacy-peer-deps

# Type check
npm run typecheck

# Build
npm run build

# Start production server
npm start
```

## Additional Resources

- **Backend Program:** `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- **IDL Location:** `/public/idl/equa_token.json`
- **Test File:** `__tests__/registration/initializeUserInstruction.test.ts`
- **Pyth Docs:** https://hermes.pyth.network/docs/
- **Solana Explorer:** https://explorer.solana.com/address/7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP?cluster=devnet

## Troubleshooting

### Still Getting ConstraintMut Error?
1. Clear browser cache and localStorage
2. Ensure you're using the latest code
3. Check that the IDL file matches the deployed program
4. Verify all accounts are in the correct order

### Pyth Prices Not Loading?
1. Check `NEXT_PUBLIC_ENABLE_PYTH=true` in `.env.local`
2. Verify network connectivity to hermes.pyth.network
3. Check browser console for API errors
4. Fallback prices will be used automatically if Pyth fails

### Transaction Fails with "Insufficient SOL"?
- Need at least 0.05 SOL for registration (transaction fees + account rent)
- Get devnet SOL from: https://faucet.solana.com/

---

**Last Updated:** December 10, 2025  
**PR:** copilot/fix-registration-error-again
