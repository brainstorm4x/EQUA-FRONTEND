# Manual Testing Guide - Route Protection & Error Handling

This guide provides step-by-step instructions for manually testing the changes made to fix route protection and error handling.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Have a Solana wallet extension installed (Phantom or Solflare)
3. Have at least 0.1 SOL in your wallet for testing
4. Use two different wallets:
   - **Wallet A**: Unregistered wallet (never used before)
   - **Wallet B**: Registered wallet (previously registered)

---

## Test Case #1: Home Page Text Fix

**Objective**: Verify that the home page displays "SPL Token-2022" instead of "SPL Token"

**Steps**:
1. Navigate to `http://localhost:3000/`
2. Scroll down to the "Stats" section at the bottom
3. Look for the "Token Standard" field

**Expected Result**:
- ✅ The text should read "SPL Token-2022" (NOT "SPL Token")

**Screenshot**: Take a screenshot of the stats section showing "SPL Token-2022"

---

## Test Case #2: Unregistered User Cannot Access /mint

**Objective**: Verify that unregistered users are redirected from /mint to home page

**Steps**:
1. Disconnect all wallets (if connected)
2. OR use **Wallet A** (unregistered wallet)
3. Navigate directly to `http://localhost:3000/mint` in the browser
4. Observe what happens

**Expected Results**:
- ✅ You should be automatically redirected to `http://localhost:3000/` (home page)
- ✅ Console should show: `💡 No wallet connected, redirecting to home` OR `💡 User not registered, redirecting to home`
- ✅ You should briefly see a loading spinner with "Checking registration status..."

**Screenshot**: Take a screenshot of the browser URL showing you were redirected to home page

---

## Test Case #3: Registered User is Redirected to /mint from Home

**Objective**: Verify that registered users are automatically redirected from home to mint page

**Steps**:
1. Connect **Wallet B** (registered wallet)
2. Navigate to `http://localhost:3000/` (home page)
3. Observe what happens

**Expected Results**:
- ✅ You should be automatically redirected to `http://localhost:3000/mint` (mint page)
- ✅ Console should show: `✅ User already registered, redirecting to mint page`
- ✅ You should briefly see a loading spinner with "Loading..."
- ✅ You should end up on the mint page showing your EQUA balance

**Screenshot**: Take a screenshot of the browser URL showing you're on /mint page

---

## Test Case #4: Registered User Can Access /mint

**Objective**: Verify that registered users can access the mint page directly

**Steps**:
1. Ensure **Wallet B** (registered wallet) is connected
2. Navigate directly to `http://localhost:3000/mint`
3. Wait for the page to load

**Expected Results**:
- ✅ You should stay on the mint page (no redirect)
- ✅ Console should show: `✅ User registered, allowing access to mint page`
- ✅ You should see your EQUA balance and the mint button
- ✅ No redirect should occur

**Screenshot**: Take a screenshot of the mint page loaded successfully

---

## Test Case #5: No Wallet Connected - /mint Redirect

**Objective**: Verify that users without a wallet are redirected from /mint

**Steps**:
1. Disconnect all wallets
2. Navigate to `http://localhost:3000/mint`
3. Observe what happens

**Expected Results**:
- ✅ You should be redirected to home page
- ✅ Console should show: `💡 No wallet connected, redirecting to home`

---

## Test Case #6: Specific Registration Error - Insufficient SOL

**Objective**: Verify that specific error messages appear for insufficient SOL balance

**Setup**: This requires a wallet with less than 0.05 SOL

**Steps**:
1. Connect a wallet with **less than 0.05 SOL**
2. Go to home page (you'll be there if unregistered)
3. Try to register (click "Register Now" button)
4. Observe the error message

**Expected Results**:
- ✅ Button should show "⚠️ Insufficient SOL Balance"
- ✅ Error message should appear: "⚠️ Insufficient SOL Balance. You have X SOL. You need at least 0.05 SOL to register."
- ✅ Message should include instructions to fund wallet

**Screenshot**: Take a screenshot of the insufficient balance error

---

## Test Case #7: Specific Registration Error - Wallet Rejection

**Objective**: Verify that specific error message appears when user rejects transaction

**Steps**:
1. Connect **Wallet A** (unregistered, with sufficient SOL)
2. Fill in registration form (account type, referral if needed)
3. Click "✅ Register Now"
4. When the wallet popup appears, **REJECT/CANCEL** the transaction
5. Observe the error message

**Expected Results**:
- ✅ Error message should appear: "❌ Transaction rejected. Please approve the transaction in your wallet to continue."
- ✅ Message should be clear and actionable

**Screenshot**: Take a screenshot of the rejection error

---

## Test Case #8: Specific Registration Error - Network Timeout

**Objective**: Verify that specific error message appears for network issues

**Note**: This is harder to test manually. It would require:
- Slow network connection
- Or blockhash expiration during transaction

**Expected Result** (if it occurs):
- ✅ Error message should include: "❌ Network timeout. Please check your connection and try again."

---

## Test Case #9: Specific Registration Error - Account Already Exists

**Objective**: Verify that specific error message appears for duplicate registration

**Steps**:
1. Connect **Wallet B** (already registered)
2. Navigate to home page (you should be redirected to /mint - that's the new protection!)
3. If you somehow bypass the protection and try to register again

**Expected Results**:
- ✅ Should be redirected to /mint automatically (new protection prevents this)
- ✅ If error occurs: "❌ Account already exists. You may already be registered. Try refreshing the page."

---

## Test Case #10: Specific Registration Error - Simulation Failure

**Objective**: Verify that simulation failure shows helpful error

**Note**: This typically happens with:
- Invalid referral code
- Insufficient SOL for transaction
- Account state mismatch

**Expected Result** (if it occurs):
- ✅ Error message should include: "❌ Transaction simulation failed. This may be due to insufficient SOL or invalid referral code. Please check and try again."

---

## Console Logging Verification

**During all tests, check the browser console for:**

### Home Page (unregistered user):
```
💡 User not registered, staying on home page
```

### Home Page (registered user):
```
✅ User already registered, redirecting to mint page
```

### Mint Page (no wallet):
```
💡 No wallet connected, redirecting to home
```

### Mint Page (unregistered user):
```
💡 User not registered, redirecting to home
```

### Mint Page (registered user):
```
✅ User registered, allowing access to mint page
```

---

## Success Criteria Checklist

Mark each item as you verify it:

- [ ] Home page displays "SPL Token-2022" ✅
- [ ] Unregistered user redirected from /mint to home ✅
- [ ] Registered user redirected from home to /mint ✅
- [ ] Registered user can access /mint page ✅
- [ ] No wallet redirected from /mint to home ✅
- [ ] Insufficient SOL error shows specific message ✅
- [ ] Wallet rejection error shows specific message ✅
- [ ] All console logs appear as expected ✅
- [ ] No page crashes or errors ✅
- [ ] Loading states appear briefly during checks ✅

---

## Notes

- All redirects should happen smoothly with a brief loading indicator
- No infinite redirect loops should occur
- Console messages help developers debug issues
- Error messages are user-friendly and actionable
- On-chain checks ensure accuracy (no localStorage required)

---

## Reporting Issues

If you encounter any issues during testing:

1. Note the exact steps you took
2. Take screenshots of the error
3. Copy the full console log output
4. Note which wallet you were using
5. Note your SOL balance
6. Report in the PR or issue tracker

