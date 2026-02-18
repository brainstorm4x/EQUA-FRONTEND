# Testing Guide - Mobile Wallet Adapter Fix

## Overview
This guide helps verify the Mobile Wallet Adapter fix for the "Signature verification failed" error.

## Prerequisites
- Mobile device (iOS or Android)
- Phantom mobile app installed
- Access to the EQUA frontend (https://equa-frontend.netlify.app)

## Test Scenarios

### Scenario 1: Desktop Registration (Control Test)
**Environment:** Desktop browser with Phantom extension

**Steps:**
1. Open https://equa-frontend.netlify.app in Chrome/Firefox/Safari
2. Click "Register Now"
3. Click "Select Wallet" → Choose Phantom
4. Phantom extension popup appears
5. Click "Approve" in Phantom
6. Verify registration succeeds

**Expected Result:** ✅ Registration completes successfully

**Console Logs to Check:**
```
🔍 [Registration] Wallet adapter detection:
  📍 Wallet name: Phantom
  📍 Is Mobile Wallet Adapter: false
  📍 Is mobile browser (UA): false

🖥️ [Registration] Using desktop transaction flow
✅ [Registration] Transaction sent successfully!
```

---

### Scenario 2: Mobile In-App Browser (Control Test)
**Environment:** Phantom app's built-in browser

**Steps:**
1. Open Phantom mobile app
2. Navigate to Browser tab
3. Go to https://equa-frontend.netlify.app
4. Click "Register Now"
5. Wallet connects automatically (in-app)
6. Approve transaction
7. Verify registration succeeds

**Expected Result:** ✅ Registration completes successfully

**Console Logs to Check:**
```
🔍 [Registration] Wallet adapter detection:
  📍 Wallet name: Phantom
  📍 Is Mobile Wallet Adapter: false
  📍 Is mobile browser (UA): true

📱 [Registration] Standard mobile adapter detected (Phantom/Solflare)
  📝 Using signTransaction() pattern for mobile in-app browser
✅ [MobileRegistration] Transaction confirmed on-chain
```

---

### Scenario 3: Mobile External Browser (THE FIX)
**Environment:** Chrome/Safari on mobile with Phantom app installed

**Steps:**
1. Open Chrome or Safari on mobile device
2. Go to https://equa-frontend.netlify.app
3. Click "Register Now"
4. Click "Select Wallet" → Choose wallet
5. **OBSERVE:** WebSocket connection attempts in console
6. App should deep link to Phantom mobile app
7. Approve transaction in Phantom app
8. Return to browser (auto-redirect)
9. Verify registration succeeds

**Expected Result:** ✅ Registration completes successfully

**Console Logs to Check:**
```
🔍 [Registration] Wallet adapter detection:
  📍 Wallet name: Mobile Wallet Adapter
  📍 Is Mobile Wallet Adapter: true
  📍 Is mobile browser (UA): true

📱 [Registration] Mobile Wallet Adapter detected
  🔗 Using signTransaction() → deep link → wallet app pattern

WebSocket connection to 'ws://localhost:51869/solana-wallet' ...
📱 [MobileRegistration] Calling wallet.signTransaction()...
✅ [MobileRegistration] Transaction signed by wallet
✅ [MobileRegistration] Transaction confirmed on-chain
```

**❌ BEFORE FIX - Error Logs:**
```
❌ [WalletProvider] Wallet error occurred
   Name: WalletSendTransactionError
   Message: Signature verification failed.
            Missing signature for public key [8Fh6...]
```

---

## How to Access Console Logs on Mobile

### iOS Safari
1. Connect iPhone to Mac
2. Open Safari on Mac
3. Go to Develop → [Your iPhone] → [Page Name]
4. Console opens in Mac Safari

### Android Chrome
1. Connect Android to PC
2. Open Chrome on PC
3. Go to chrome://inspect
4. Click "Inspect" on your device's page
5. Console opens in Chrome DevTools

### Alternative: Use Eruda (Built-in)
If available on the site:
1. Look for floating debug button
2. Tap to open console overlay
3. View logs directly on mobile

---

## Verification Checklist

### Pre-Test
- [ ] Mobile device has Phantom app installed
- [ ] Phantom app is set up with wallet
- [ ] Device has enough SOL for transaction fees (0.05+ SOL)
- [ ] Browser developer tools ready (if checking logs)

### During Test
- [ ] Wallet selection modal appears
- [ ] WebSocket connection initiates (MWA only)
- [ ] Deep link to wallet app works (MWA only)
- [ ] Wallet app shows transaction approval
- [ ] Approval redirects back to browser
- [ ] Success message appears

### Post-Test
- [ ] Transaction signature appears in UI
- [ ] Explorer link works (https://explorer.solana.com/tx/...)
- [ ] No error messages in console
- [ ] User can proceed to mint page
- [ ] Registration is persisted (refresh doesn't reset)

---

## Troubleshooting

### Issue: WebSocket Connection Fails
**Symptoms:**
```
WebSocket connection to 'ws://localhost:51869/solana-wallet' failed:
Error in connection establishment: net::ERR_CONNECTION_REFUSED
```

**This is NORMAL.** Mobile Wallet Adapter tries multiple connection methods. The deep link will still work.

---

### Issue: Deep Link Doesn't Open Wallet App
**Check:**
1. Is Phantom app installed?
2. Is it updated to latest version?
3. Try tapping the wallet button again
4. Try restarting the browser

---

### Issue: Transaction Approval Doesn't Return to Browser
**Check:**
1. Wait 30 seconds (sometimes slow)
2. Manually return to browser tab
3. Check if transaction is pending in Phantom app
4. If stuck, reject and try again

---

### Issue: "Signature verification failed" Still Appears
**This means the fix is NOT deployed.** Verify:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check deployment version
4. Verify PR #277 is merged

---

## Success Criteria

The fix is successful if:
1. ✅ Desktop registration works (control test)
2. ✅ Mobile in-app registration works (control test)
3. ✅ **Mobile external browser registration works (the fix)**
4. ✅ Console logs show `[MobileRegistration]` for MWA
5. ✅ No "Signature verification failed" errors
6. ✅ Transaction confirms on-chain

---

## Reporting Results

### Success Report Template
```
✅ Mobile Wallet Adapter fix verified!

Device: [iPhone 14 / Samsung Galaxy S23 / etc.]
OS: [iOS 17.2 / Android 14 / etc.]
Browser: [Chrome 120 / Safari 17 / etc.]
Wallet App: [Phantom 24.4.1 / etc.]

Test Results:
- Desktop: ✅ Pass
- Mobile in-app: ✅ Pass  
- Mobile external (MWA): ✅ Pass

Console logs show correct routing to mobileRegister().
Transaction signature: [tx signature]
Explorer: https://explorer.solana.com/tx/[signature]?cluster=devnet
```

### Failure Report Template
```
❌ Mobile Wallet Adapter fix NOT working

Device: [device info]
OS: [OS version]
Browser: [browser version]
Wallet App: [wallet version]

Error Message:
[paste error from console]

Console Logs:
[paste relevant logs showing routing path]

Steps to Reproduce:
1. [step 1]
2. [step 2]
...
```

---

## Reference Documents
- Full fix history: `docs/MOBILE_WALLET_ADAPTER_FIX_HISTORY.md`
- Quick reference: `docs/MWA_FIX_SUMMARY.md`
- Code changes: `app/mint/page.tsx` (lines 947-967, 1032-1042)

---

Last Updated: 2026-02-18  
PR: #277  
Status: Ready for Testing
