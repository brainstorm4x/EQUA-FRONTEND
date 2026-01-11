# Manual Testing Guide - Transaction Diagnostics

## Overview
This guide provides step-by-step instructions for manually testing the transaction diagnostics implementation to verify it solves the "Unexpected error" issue from Phantom wallet.

## Prerequisites

1. **Phantom Wallet** installed (version 25.46.3 or later)
2. **Devnet SOL** in your wallet (at least 0.1 SOL)
3. **Browser DevTools** open (F12 or Cmd+Option+I)
4. **Console tab** visible in DevTools

## Test Scenarios

### Scenario 1: Successful Registration (Baseline)

**Goal:** Verify diagnostics don't break normal flow

**Steps:**
1. Navigate to the EQUA app on Devnet
2. Open browser console (F12)
3. Click "Register" or "Get Started"
4. Approve the transaction in Phantom
5. Observe console logs

**Expected Output:**
```
🔍 Pre-Transaction Validation: Registration
1️⃣ Validating transaction structure...
✅ Transaction structure valid
Transaction details: { accountCount: 12, instructionCount: 3, ... }

2️⃣ Checking RPC connection health...
✅ RPC healthy (latency: XXms, block: XXXXXX)

3️⃣ Transaction details:
  Fee Payer: [your wallet address]
  Recent Blockhash: [hash]
  Instruction Count: 3
  ...

📤 Registration transaction sent: [signature]
⏳ Confirming transaction...
✅ Registration successful! [signature]
```

**✅ Pass Criteria:**
- Pre-validation logs appear
- Transaction completes successfully
- No errors thrown
- Registration succeeds

---

### Scenario 2: Registration with Insufficient SOL

**Goal:** Verify detailed error logging for insufficient balance

**Steps:**
1. Create a new Phantom wallet (or use a wallet with <0.05 SOL)
2. Navigate to the EQUA app
3. Open browser console
4. Click "Register"
5. Approve the transaction in Phantom
6. Observe console logs

**Expected Output:**
```
🔍 Pre-Transaction Validation: Registration
✅ Transaction structure valid
✅ RPC healthy

❌ Registration Transaction Failed
Error Type: WalletSendTransactionError
Message: Transaction simulation failed: insufficient funds
Code: 4001
Transaction Logs:
  0. Program GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C invoke [1]
  1. Program log: Instruction: InitializeUser
  2. Program log: Error: InsufficientFundsForRent
  ...
Signature: [signature]
Explorer: https://explorer.solana.com/tx/[signature]?cluster=devnet

🔍 Additional Context
Transaction type: Registration (initialize_user)
Wallet adapter: Phantom
Connection endpoint: https://api.devnet.solana.com
```

**✅ Pass Criteria:**
- Detailed error message (not "Unexpected error")
- Error type logged (WalletSendTransactionError)
- Transaction logs visible
- Signature and explorer link provided
- Additional context logged (wallet, RPC, transaction type)

---

### Scenario 3: User Rejects Transaction

**Goal:** Verify handling of user-rejected transactions

**Steps:**
1. Navigate to the EQUA app on Devnet
2. Open browser console
3. Click "Register" or "Mint"
4. **Reject** the transaction in Phantom
5. Observe console logs

**Expected Output:**
```
🔍 Pre-Transaction Validation: [Registration/Minting]
✅ Transaction structure valid
✅ RPC healthy

❌ [Registration/Minting] Transaction Failed
Error Type: WalletSendTransactionError
Message: User rejected the request
Code: 4001

🔍 Additional Context
Transaction type: [Registration/Minting]
Wallet adapter: Phantom
Connection endpoint: https://api.devnet.solana.com
```

**✅ Pass Criteria:**
- Clear "User rejected" message
- No confusing error details
- Graceful handling

---

### Scenario 4: Minting (Successful)

**Goal:** Verify minting flow with diagnostics

**Steps:**
1. Register an account (if not already registered)
2. Open browser console
3. Click "Claim Daily EQUA" or "Mint"
4. Approve the transaction in Phantom
5. Observe console logs

**Expected Output:**
```
🔍 Running preflight diagnostics...
[Account verification logs...]
✅ All preflight checks passed

🔍 Pre-Transaction Validation: Minting (mint_tokens)
✅ Transaction structure valid (15 accounts, 1 instruction)
✅ RPC healthy

📝 Mint instruction accounts (15 accounts):
  0. user_account: [address]
  1. user_metadata: [address]
  ...

📤 Transaction sent: [signature]
⏳ Confirming mint transaction...
✅ Minting successful! [signature]
```

**✅ Pass Criteria:**
- Pre-validation runs
- Mint instruction details logged
- Transaction succeeds
- No errors

---

### Scenario 5: Minting with Cooldown Active

**Goal:** Verify error handling for cooldown violations

**Steps:**
1. Complete a successful mint
2. Immediately try to mint again (within 24 hours)
3. Open browser console
4. Click "Mint"
5. Observe console logs

**Expected Output:**
```
⏰ Please wait [time remaining] before minting again
```

**✅ Pass Criteria:**
- Clear cooldown message
- No transaction sent (blocked before wallet)
- Time remaining displayed

---

## Verification Checklist

After testing all scenarios, verify:

- [ ] Pre-transaction validation runs before every wallet interaction
- [ ] Validation logs show transaction structure (accounts, instructions, size)
- [ ] RPC health check runs and shows latency
- [ ] Error messages are detailed (not "Unexpected error")
- [ ] Error type is logged (WalletSendTransactionError, etc.)
- [ ] Transaction logs are visible when available
- [ ] Signature and explorer link provided for submitted transactions
- [ ] Additional context logged (wallet adapter, RPC endpoint, transaction type)
- [ ] No performance degradation (validation is fast)
- [ ] Normal flows still work (registration, minting)
- [ ] Error flows provide actionable information

## Common Issues and Solutions

### Issue: No logs appearing
**Solution:** Ensure browser console is open and showing "All levels" (not just Errors)

### Issue: "Buffer is not defined" error
**Solution:** This PR should have fixed this. If it still appears, the browser-safe conversion failed.

### Issue: Stack overflow on large transactions
**Solution:** This PR should have fixed this with chunking. If it still appears, transaction is >10KB.

### Issue: Explorer link goes to wrong network
**Solution:** Currently hardcoded to devnet. Change cluster parameter for other networks.

## Success Criteria

The implementation is successful if:

1. ✅ All test scenarios pass
2. ✅ Error messages are actionable (identify root cause)
3. ✅ No performance degradation
4. ✅ No browser compatibility issues
5. ✅ Normal flows unchanged (zero user-facing impact)

## Reporting Results

When testing is complete, report results with:

1. **Browser & Version** (e.g., Chrome 120.0)
2. **Phantom Version** (e.g., 25.46.3)
3. **Network** (Devnet)
4. **Test Results** (Pass/Fail for each scenario)
5. **Console Logs** (screenshots or copy/paste)
6. **Issues Found** (if any)

## Example Report

```
Browser: Chrome 120.0.6099.130
Phantom: 25.46.3
Network: Devnet

Results:
✅ Scenario 1: Successful Registration - PASSED
✅ Scenario 2: Insufficient SOL - PASSED (detailed error logged)
✅ Scenario 3: User Rejection - PASSED (clear message)
✅ Scenario 4: Successful Minting - PASSED
✅ Scenario 5: Cooldown Active - PASSED

Issues: None

Sample Logs:
[Screenshots or copy/paste of console output]
```
