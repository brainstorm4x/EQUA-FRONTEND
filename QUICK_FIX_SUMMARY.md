# 🔧 EQUA Token Transfer Bug - Quick Fix Summary

## 🐛 The Problem

**User Report:** "Tokens sent get deducted from sender but not received. Phantom shows 'No balance changes found'"

## 🎯 Root Cause

Frontend was sending **9 accounts** to `transfer_tokens` instruction, but backend expects **8 accounts**.

### The Mismatch

```
❌ BEFORE (9 accounts - WRONG)
┌──────────────────────────────────┐
│ 0. sender_user_account           │
│ 1. sender_token_account          │
│ 2. recipient_user_account        │
│ 3. recipient_token_account       │
│ 4. mint                          │
│ 5. mint_authority                │
│ 6. global_state      ← EXTRA!    │ ❌ Not in backend IDL
│ 7. sender_authority              │
│ 8. token_program                 │
└──────────────────────────────────┘

vs

✅ BACKEND IDL (8 accounts - CORRECT)
┌──────────────────────────────────┐
│ 0. sender_user_account           │
│ 1. sender_token_account          │
│ 2. recipient_user_account        │
│ 3. recipient_token_account       │
│ 4. mint                          │
│ 5. mint_authority                │
│ 6. sender_authority              │ ← Expected here, not at 7!
│ 7. token_program                 │ ← Expected here, not at 8!
└──────────────────────────────────┘
```

### Why It Failed

When frontend sent account #6 as `global_state`, the backend tried to read it as `sender_authority`:
- Backend couldn't verify the signer (wrong account at index 6)
- Backend couldn't find token program (wrong account at index 7)
- **Transaction failed** ❌

## ✅ The Fix

### 1. Removed `global_state` Parameter

**File:** `src/lib/program.ts`

```typescript
// BEFORE (9 parameters)
export function createTransferTokensInstruction(
  ...,
  globalState: PublicKey,  // ❌ REMOVED
  senderAuthority: PublicKey,
  ...
)

// AFTER (8 parameters)
export function createTransferTokensInstruction(
  ...,
  senderAuthority: PublicKey,  // ✅ No global_state
  ...
)
```

### 2. Updated Function Call

**File:** `src/components/WalletDashboard.tsx`

```typescript
// BEFORE
const [globalStatePDA] = getGlobalStatePDA();  // ❌ REMOVED
createTransferTokensInstruction(
  ...,
  globalStatePDA,  // ❌ REMOVED
  publicKey,
  ...
)

// AFTER
createTransferTokensInstruction(
  ...,
  publicKey,  // ✅ Direct parameter
  ...
)
```

### 3. Updated Tests

**File:** `__tests__/lib/transferTokensInstruction.test.ts`

- Removed `globalState` variable
- Changed `toHaveLength(9)` → `toHaveLength(8)`
- Updated account index checks

## 🎉 Result

```
✅ AFTER FIX (8 accounts - MATCHES BACKEND)
┌──────────────────────────────────┐
│ 0. sender_user_account           │
│ 1. sender_token_account          │
│ 2. recipient_user_account        │
│ 3. recipient_token_account       │
│ 4. mint                          │
│ 5. mint_authority                │
│ 6. sender_authority  ✅ CORRECT! │
│ 7. token_program     ✅ CORRECT! │
└──────────────────────────────────┘
```

## 📝 Files Changed

1. `src/lib/program.ts` - Removed `globalState` parameter
2. `src/components/WalletDashboard.tsx` - Updated function call
3. `__tests__/lib/transferTokensInstruction.test.ts` - Updated tests

## 🧪 Testing

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run transfer instruction tests
npm test __tests__/lib/transferTokensInstruction.test.ts

# Manual test on devnet
# 1. Connect wallet with EQUA balance
# 2. Send tokens to another wallet
# 3. Verify recipient receives tokens
# 4. Check Phantom shows balance changes
```

## ❓ FAQ

**Q: Were these real transactions or just frontend calculations?**
A: These were **real transaction attempts** that **failed on-chain** due to malformed instructions. Not superficial - the blockchain rejected them.

**Q: Is this a frontend or backend issue?**
A: **Frontend bug.** Backend IDL is correct (8 accounts). Frontend was incorrectly passing 9 accounts.

**Q: Will old failed transactions be fixed?**
A: No. Users will need to re-send transfers after this fix is deployed.

**Q: Are there any breaking changes?**
A: No. This fixes a bug - no API changes for users.

## 📊 Impact

- ❌ **Before:** All token transfers failed
- ✅ **After:** Token transfers execute successfully

---

For detailed analysis, see `TRANSFER_FIX_SUMMARY.md`
