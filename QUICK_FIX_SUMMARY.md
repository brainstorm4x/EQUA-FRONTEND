# EQUA Frontend - Registration Fix Summary

## What Was Fixed

### The Error
```
Transaction simulation failed: Error processing Instruction 0: custom program error: 0x7d0
Program log: AnchorError caused by account: referral_account. Error Code: ConstraintMut.
```

### The Solution
Fixed the `initialize_user` instruction to match the backend IDL exactly:
- **Before:** 11 accounts (WRONG)
- **After:** 9 accounts (CORRECT)

## Quick Reference

### Function Signature
```typescript
createInitializeUserInstruction(
  userAccount: PublicKey,      // User's account PDA
  authority: PublicKey,        // User's wallet (signer)
  globalState: PublicKey,      // Global state PDA
  referralAccount: PublicKey,  // Referrer's account PDA or PublicKey.default
  userTokenAccount: PublicKey, // User's token account
  mint: PublicKey,             // EQUA mint PDA
  associatedTokenProgram: PublicKey,
  tokenProgram: PublicKey,
  referrer: PublicKey,         // Referrer's wallet or PublicKey.default
  mintStart: number,           // Unix timestamp
  lockedUntil: number          // Unix timestamp
): TransactionInstruction
```

### Account Order (Critical!)
```
0. user_account        (writable)
1. authority           (writable, signer)
2. global_state        (writable)
3. referral_account    (writable) ← MUST BE WRITABLE
4. user_token_account  (writable)
5. mint                (read-only)
6. associated_token_program (read-only)
7. token_program       (read-only)
8. system_program      (read-only)
```

## Pyth Network - Already Correct! ✅

### Endpoint
```
https://hermes.pyth.network/v2/updates/price/latest
```

### Usage
```typescript
// File: src/utils/eqxOracle.ts
const PYTH_HERMES_API = 'https://hermes.pyth.network/v2/updates/price/latest';

// Fetch prices with feed IDs
const params = new URLSearchParams();
feedIds.forEach(id => params.append('ids[]', id));
const response = await axios.get(`${PYTH_HERMES_API}?${params.toString()}`);
```

### Feed IDs (Official from Pyth)
- Gold: `0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9`
- Oil: `0x925c4ef7ee2b7b4c19a23b04d80187b3e687b3e6e65a97cf93bf3cce8db3b8a2`
- EUR/USD: `0x2d0366e8361c110a1fcf6b3023a1d4e17f63b3a2e10b8ca8bb144dbe7b8a7de0`
- And more...

## Testing

### Automated Tests ✅
```bash
npm run typecheck  # All passing
npm test          # Registration tests passing
```

### Manual Testing Required
1. Connect Phantom to devnet
2. Register without referral
3. Register with referral
4. Mint EQUA tokens
5. Transfer tokens

## Files Changed
1. `src/lib/program.ts` - Core fix
2. `lib/program.ts` - Consistency
3. `app/mint/page.tsx` - Call site
4. `scripts/e2e-register-mint.ts` - E2E script
5. `__tests__/registration/initializeUserInstruction.test.ts` - Tests

## Key Takeaway
✅ The registration instruction now perfectly matches the backend IDL  
✅ Pyth endpoints are correct and working  
✅ Ready for manual testing on devnet

For detailed information, see `REGISTRATION_FIX_DETAILS.md`
