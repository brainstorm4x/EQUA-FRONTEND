# End-to-End Testing Guide for EQUA Token (Devnet)

This guide provides step-by-step instructions for performing comprehensive end-to-end testing of the EQUA registration and minting flows on Solana devnet.

---

## Prerequisites

### 1. Wallet Setup
- Install Phantom, Solflare, or another Solana wallet
- Switch to **Devnet** network in wallet settings
- Get devnet SOL from faucet: https://faucet.solana.com
  - Minimum: 0.1 SOL (recommended: 0.5 SOL for multiple tests)

### 2. Environment
- Modern web browser (Chrome, Firefox, Edge)
- Developer tools enabled (F12)
- Good internet connection

### 3. Admin Prerequisites
- Program deployed to devnet at: `BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL`
- Global state initialized
- Mint account created
- Verify using: `node test_e2e_devnet.mjs`

---

## Test Suite 1: Infrastructure Verification

### Test 1.1: Run Automated Checks

```bash
# From project root
npm install --legacy-peer-deps
node test_e2e_devnet.mjs
```

**Expected Output:**
```
✅ Program Deployed
✅ Global State Initialized
✅ Mint Account Created
✅ Token Program Identified
```

**If any checks fail:**
- See TROUBLESHOOTING.md section "For Program Administrators"
- Ensure all deployment steps completed

### Test 1.2: Verify Accounts on Solana Explorer

1. **Program Account:**
   - URL: https://explorer.solana.com/address/BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL?cluster=devnet
   - Should show: Executable: Yes, Owner: BPF Loader

2. **Mint Account:**
   - URL: https://explorer.solana.com/address/3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4?cluster=devnet
   - Should show: Owner: Token Program or Token-2022
   - Note: Record which token program is the owner

3. **Global State:**
   - URL: https://explorer.solana.com/address/4dt3EfdbD63e4vCDz5CiK2ee14v7hotet7tJt5GGi6Kf?cluster=devnet
   - Should show: Owner: Program ID
   - Should have data

---

## Test Suite 2: Fresh User Registration (No Referrer)

### Test 2.1: Prepare Fresh Wallet

1. Create new wallet or use existing with no EQUA history
2. Fund with devnet SOL: `solana airdrop 0.5 <YOUR_ADDRESS> --url devnet`
3. Verify balance: Wallet should show ~0.5 SOL

### Test 2.2: Connect Wallet to DApp

1. Open browser to: http://localhost:3000 (or deployed URL)
2. Open browser console (F12) → Console tab
3. Click "Connect Wallet" button
4. Select your wallet
5. Approve connection

**Expected Console Output:**
```
✅ Wallet connected: <YOUR_ADDRESS>
🔑 Generated new user account: <USER_ACCOUNT_ADDRESS>
```

### Test 2.3: Perform Registration

1. Navigate to /mint page
2. Verify UI shows "Register Now" button
3. Click "Register Now"
4. Approve transaction in wallet

**Monitor Console for:**
```
📝 Creating registration transaction...
📝 User Account: <USER_ACCOUNT>
📝 Authority (Wallet): <YOUR_WALLET>
📝 Global State PDA: 4dt3EfdbD63e4vCDz5CiK2ee14v7hotet7tJt5GGi6Kf
📝 User Token Account: <ATA_ADDRESS>
📝 Mint PDA: 3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4
✅ Registration successful! <SIGNATURE>
```

**Expected UI Changes:**
- Success message with transaction signature
- "Mint 1000 EQUA" button appears
- Balance shows: 0 EQUA
- Cooldown timer not shown (first time)

### Test 2.4: Verify Registration on Chain

1. Click transaction signature link or manually visit:
   - https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet

2. Verify transaction details:
   - Status: Success
   - Instructions: 2 (if ATA created) or 1 (if ATA existed)
   - Accounts modified: User account, ATA, Global state

3. Check user's ATA:
   - Find ATA address in console output
   - Visit: https://explorer.solana.com/address/<ATA>?cluster=devnet
   - Should show: Balance: 0 EQUA, Owner: Your wallet

### Test 2.5: Record Results

- [ ] Registration transaction succeeded
- [ ] User account created
- [ ] ATA created with correct token program
- [ ] Global state user count incremented
- [ ] Balance shows 0 EQUA
- [ ] Transaction signature: ________________

---

## Test Suite 3: Minting Flow

### Test 3.1: First Mint (After Registration)

**Prerequisites:** Completed Test Suite 2

1. Verify "Claim Daily EQUA" button is enabled and green
2. Click "Claim Daily EQUA"
3. Approve transaction in wallet

**Monitor Console for:**
```
🪙 Creating mint transaction...
🪙 User Account: <USER_ACCOUNT>
🪙 User Token Account: <ATA>
✅ ATA verified, proceeding with mint
📤 Transaction sent: <SIGNATURE>
✅ Minting successful! <SIGNATURE>
💰 New balance: 1000
⏰ Updated last mint time: <TIMESTAMP>
```

**Expected UI Changes:**
- Success message with transaction signature
- Balance updates to: 1,000 EQUA
- Cooldown timer appears showing 24h countdown
- Mint button becomes disabled/gray

### Test 3.2: Verify Mint on Chain

1. Click transaction signature link
2. Verify transaction details:
   - Status: Success
   - Instructions: 1 (mint_equa_tokens)
   - Token balance changes: ATA balance +1,000 EQUA

3. Check ATA balance:
   - Visit: https://explorer.solana.com/address/<ATA>?cluster=devnet
   - Should show: Balance: 1,000 EQUA

### Test 3.3: Test Cooldown Enforcement

1. Wait 10 seconds after minting
2. Try clicking mint button again

**Expected Behavior:**
- Button remains disabled
- Hover shows countdown: "Cooldown: 23h 59m 50s"
- Error if clicked: "Please wait <TIME> before minting again"

### Test 3.4: Test Cooldown Countdown

1. Keep page open for 1 minute
2. Observe countdown timer

**Expected Behavior:**
- Timer updates every second
- Shows hours, minutes, seconds remaining
- Button remains disabled throughout

### Test 3.5: Record Results

- [ ] Minting transaction succeeded
- [ ] Balance updated to 1,000 EQUA
- [ ] Cooldown timer started
- [ ] Mint button disabled during cooldown
- [ ] Countdown updates correctly
- [ ] Transaction signature: ________________

---

## Test Suite 4: Error Scenarios

### Test 4.1: Mint Without Registration

1. Use different wallet (not registered)
2. Connect to dApp
3. Navigate to /mint
4. Should see "Register Now" button, not mint button

**Expected:** Cannot mint without registration

### Test 4.2: Double Registration

1. Use wallet from Test Suite 2 (already registered)
2. Disconnect and reconnect wallet
3. Navigate to /mint

**Expected:** Should see mint button, not register button

### Test 4.3: Insufficient SOL

1. Create wallet with only 0.001 SOL
2. Try to register

**Expected:** Transaction fails with clear error about insufficient funds

### Test 4.4: Network Interruption

1. Start registration transaction
2. Immediately disconnect internet
3. Reconnect after 10 seconds

**Expected:** Transaction may fail or succeed (depends on timing)
**Result should be clear in UI**

### Test 4.5: Record Results

- [ ] Cannot mint without registration
- [ ] No duplicate registrations allowed
- [ ] Clear error for insufficient SOL
- [ ] Network errors handled gracefully

---

## Test Suite 5: Referral System (Optional - Requires Code Modification)

### Test 5.1: Setup Referrer

1. Register User A (referrer) using Test Suite 2
2. Record User A's user account address from console
3. Record User A's wallet address

### Test 5.2: Modify Code for Referral Test

**File:** `src/app/mint/page.tsx`

**Find the `handleRegister` function and locate the `createInitializeUserInstruction` call:**
```typescript
const instruction = program.createInitializeUserInstruction(
  userAccountKeypair.publicKey,
  publicKey,
  globalStatePDA,
  userAccountKeypair.publicKey,  // Self-referral
  userTokenAccount,
  mintPDA,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  program.TOKEN_PROGRAM_ID,
  now,
  now,
  PublicKey.default  // No referrer
);
```

**Change to:**
```typescript
const referrerUserAccount = new PublicKey('<USER_A_USER_ACCOUNT>');
const referrerWallet = new PublicKey('<USER_A_WALLET>');

const instruction = program.createInitializeUserInstruction(
  userAccountKeypair.publicKey,
  publicKey,
  globalStatePDA,
  referrerUserAccount,  // User A's user account
  userTokenAccount,
  mintPDA,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  program.TOKEN_PROGRAM_ID,
  now,
  now,
  referrerWallet  // User A's wallet
);
```

### Test 5.3: Register User B with Referral

1. Use fresh wallet (User B)
2. Fund with devnet SOL
3. Connect to dApp
4. Register

**Monitor for:**
- User B registration succeeds
- Check User A's account for referral reward (if implemented in backend)

### Test 5.4: Revert Code Changes

After testing, revert the code changes to default (self-referral)

### Test 5.5: Record Results

- [ ] User B registered with referrer
- [ ] User A received referral reward (if applicable)
- [ ] Both accounts functioning normally
- [ ] Code reverted to default

---

## Test Suite 6: Token Program Verification

### Test 6.1: Identify Token Program

From Test 1.2, note which token program owns the mint:
- [ ] Standard Token Program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
- [ ] Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

### Test 6.2: Verify Frontend Configuration

1. Check `src/lib/constants.ts`
2. Verify it imports the matching token program

**If Standard Token:**
```typescript
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
export { TOKEN_PROGRAM_ID };
```

**If Token-2022:**
```typescript
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;
```

### Test 6.3: Test ATA Compatibility

1. From any registered user, check their ATA address
2. Verify ATA was created with correct token program
3. Verify ATA owner matches mint's token program

**Check on Explorer:**
- ATA should be owned by same token program as mint
- Otherwise, tokens cannot be received

### Test 6.4: Record Results

- [ ] Token program identified
- [ ] Frontend configuration matches
- [ ] ATAs created with correct token program
- [ ] No program ID mismatches

---

## Test Suite 7: UI/UX Testing

### Test 7.1: Visual Feedback

- [ ] Loading states show during transactions
- [ ] Success messages appear after successful transactions
- [ ] Error messages are clear and actionable
- [ ] Countdown timer is visible and updates smoothly
- [ ] Button states (enabled/disabled) are clear

### Test 7.2: Responsive Design

- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] All elements visible and functional

### Test 7.3: Browser Compatibility

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Test 7.4: Accessibility

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] Error messages readable

---

## Test Suite 8: Long-Running Tests (Optional)

### Test 8.1: 24-Hour Cooldown Test

1. Mint tokens at Time T
2. Record exact timestamp
3. Return at Time T + 24 hours
4. Verify can mint again
5. Verify countdown shows "Ready to mint!"

### Test 8.2: Multiple Daily Mints

1. Mint on Day 1
2. Mint on Day 2
3. Mint on Day 3
4. Verify balance: 3,000 EQUA
5. Verify each mint respected cooldown

### Test 8.3: Record Results

- [ ] Cooldown enforced for full 24 hours
- [ ] Multiple daily mints work correctly
- [ ] Balance accumulates properly

---

## Reporting Test Results

### Success Criteria

**All tests passed if:**
- ✅ Registration succeeds for fresh wallet
- ✅ ATA created with correct token program
- ✅ Minting succeeds after registration
- ✅ Balance updates to 1,000 EQUA after mint
- ✅ Cooldown enforced for 24 hours
- ✅ No token program mismatches
- ✅ Error messages are clear and helpful
- ✅ UI/UX is smooth and responsive

### If Tests Fail

1. **Check Console Logs:**
   - Press F12 → Console tab
   - Copy all error messages

2. **Check Transaction on Explorer:**
   - Click transaction signature
   - Review error logs
   - Note which instruction failed

3. **Review Troubleshooting:**
   - See TROUBLESHOOTING.md
   - See AUDIT_REPORT.md

4. **Report Issue:**
   - Test suite that failed
   - Expected behavior
   - Actual behavior
   - Console logs
   - Transaction signature
   - Browser/wallet used

### Test Report Template

```markdown
# EQUA E2E Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Network:** Solana Devnet
**Branch:** main

## Infrastructure (Test Suite 1)
- [ ] Program deployed: Pass/Fail
- [ ] Global state initialized: Pass/Fail
- [ ] Mint account created: Pass/Fail
- [ ] Token program: Standard Token / Token-2022

## Registration (Test Suite 2)
- [ ] Fresh user registration: Pass/Fail
- [ ] ATA creation: Pass/Fail
- [ ] Transaction signature: <link>

## Minting (Test Suite 3)
- [ ] First mint: Pass/Fail
- [ ] Balance update: Pass/Fail
- [ ] Cooldown enforcement: Pass/Fail
- [ ] Transaction signature: <link>

## Error Handling (Test Suite 4)
- [ ] Mint without registration: Pass/Fail
- [ ] Double registration: Pass/Fail
- [ ] Insufficient SOL: Pass/Fail

## Token Program (Test Suite 6)
- [ ] Program identified: Pass/Fail
- [ ] Frontend matches: Pass/Fail
- [ ] ATA compatibility: Pass/Fail

## UI/UX (Test Suite 7)
- [ ] Visual feedback: Pass/Fail
- [ ] Responsive design: Pass/Fail
- [ ] Browser compatibility: Pass/Fail

## Issues Found
(List any issues discovered)

## Recommendations
(List any suggested improvements)

## Overall Result
Pass / Fail with conditions / Fail
```

---

## Automated Testing (Future Enhancement)

### Recommended Test Framework

```typescript
// Example structure for future automated tests

import { describe, it, expect, beforeAll } from 'jest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

describe('EQUA Registration Flow', () => {
  let connection: Connection;
  let testWallet: Keypair;
  
  beforeAll(async () => {
    connection = new Connection('https://api.devnet.solana.com');
    testWallet = Keypair.generate();
    // Fund test wallet with airdrop
  });
  
  it('should register fresh user successfully', async () => {
    // Test implementation
  });
  
  it('should create ATA with correct token program', async () => {
    // Test implementation
  });
  
  it('should handle self-referral correctly', async () => {
    // Test implementation
  });
});

describe('EQUA Minting Flow', () => {
  it('should mint 1000 EQUA to registered user', async () => {
    // Test implementation
  });
  
  it('should enforce 24-hour cooldown', async () => {
    // Test implementation
  });
  
  it('should fail for unregistered user', async () => {
    // Test implementation
  });
});
```

---

## Appendix: Useful Commands

### Check Solana Configuration
```bash
solana config get
```

### Switch to Devnet
```bash
solana config set --url devnet
```

### Get Devnet SOL
```bash
solana airdrop 1
```

### Check Balance
```bash
solana balance <ADDRESS> --url devnet
```

### View Account
```bash
solana account <ADDRESS> --url devnet
```

### Check Transaction
```bash
solana confirm <SIGNATURE> --url devnet
```

---

**Happy Testing!** 🚀

For issues or questions, refer to:
- TROUBLESHOOTING.md
- AUDIT_REPORT.md
- README.md
