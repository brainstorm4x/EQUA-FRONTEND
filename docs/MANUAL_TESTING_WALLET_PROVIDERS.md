# Manual Testing Guide: Wallet Provider Separation

## Overview
This guide covers manual testing for the wallet provider separation that fixes mobile wallet connection issues.

## Changes Summary
- **Separated desktop and mobile wallet flows** into independent providers
- **Desktop Provider**: PhantomWalletAdapter + SolflareWalletAdapter, autoConnect: true
- **Mobile Provider**: SolanaMobileWalletAdapter only, autoConnect: false
- **Smart Router**: Detects platform and routes to appropriate provider

## Prerequisites

### Desktop Testing
- **Browser**: Chrome, Firefox, or Brave
- **Wallet Extension**: Phantom or Solflare browser extension installed
- **Network**: Wallet set to Devnet

### Mobile Testing
- **Device**: Android phone or iPhone
- **Browser**: Chrome (Android) or Safari (iOS)
- **Wallet App**: Phantom or Solflare mobile app installed
- **Network**: Wallet app set to Devnet

## Desktop Testing (No Regression)

### Test 1: Extension Detection
1. Open browser with Phantom extension installed
2. Navigate to application
3. **Expected Console Log**: `[DesktopWalletProvider] Initializing desktop wallet adapters`
4. ✅ **Pass Criteria**: Correct provider loads

### Test 2: Wallet Modal Display
1. Click "Select Wallet" button
2. Modal opens
3. **Expected**: Shows "Phantom" and "Solflare" options
4. **NOT Expected**: "Mobile Wallet Adapter" should NOT appear
5. ✅ **Pass Criteria**: Only desktop wallets shown

### Test 3: Phantom Connection
1. Click "Select Wallet" → Choose "Phantom"
2. **Expected**: Phantom extension popup appears
3. Click "Connect" in popup
4. **Expected**: Connection succeeds
5. **Expected**: Button shows wallet address (e.g., "ABC...XYZ")
6. ✅ **Pass Criteria**: Seamless connection

### Test 4: Solflare Connection
1. Disconnect if connected
2. Click "Select Wallet" → Choose "Solflare"
3. **Expected**: Solflare extension popup appears
4. Click "Connect" in popup
5. **Expected**: Connection succeeds
6. ✅ **Pass Criteria**: Seamless connection

### Test 5: Auto-Reconnect
1. Connect wallet
2. Refresh page
3. **Expected**: Wallet auto-reconnects (autoConnect: true)
4. **Expected**: No manual "Connect" click needed
5. ✅ **Pass Criteria**: Auto-reconnect works

## Mobile Testing (Fix Verification)

### Test 6: Mobile Browser Detection
1. Open Chrome on Android (or Safari on iOS)
2. Navigate to application
3. **Expected Console Log**: `[MobileWalletProvider] Initializing Mobile Wallet Adapter`
4. **Expected Console Log**: `[WalletProvider] Platform detected: { mobile: true, isInAppBrowser: false, willUseMobileProvider: true }`
5. ✅ **Pass Criteria**: Correct provider loads

### Test 7: Wallet Modal Display (Mobile)
1. Tap "Select Wallet" button
2. Modal opens
3. **Expected**: Shows ONLY "Mobile Wallet Adapter"
4. **NOT Expected**: Phantom/Solflare desktop adapters should NOT appear
5. ✅ **Pass Criteria**: Only mobile adapter shown

### Test 8: Deep Link Trigger (KEY FIX)
1. Tap "Select Wallet" → Tap "Mobile Wallet Adapter"
2. ✅ **CRITICAL**: Android "Open with" dialog appears (or iOS equivalent)
3. **Expected**: Lists installed wallet apps (Phantom, Solflare, etc.)
4. ✅ **Pass Criteria**: Deep link dialog appears (THIS WAS BROKEN BEFORE)

### Test 9: Phantom Mobile Connection
1. From "Open with" dialog, select "Phantom"
2. ✅ **CRITICAL**: Phantom app opens with connection request
3. **Expected**: Shows "EQUA Token" wants to connect
4. Tap "Connect" in Phantom app
5. ✅ **CRITICAL**: Browser automatically returns
6. **Expected**: Shows "Connected" status
7. **Expected**: Button shows wallet address
8. ✅ **Pass Criteria**: Complete connection flow works

### Test 10: Solflare Mobile Connection
1. Disconnect if connected
2. Repeat Test 8-9 but choose "Solflare"
3. ✅ **Pass Criteria**: Complete connection flow works

### Test 11: No Auto-Reconnect (Mobile Behavior)
1. Connect wallet on mobile
2. Refresh page
3. **Expected**: Wallet does NOT auto-reconnect (autoConnect: false)
4. **Expected**: User must manually tap "Connect" again
5. ✅ **Pass Criteria**: No auto-reconnect (this is correct mobile behavior)

## In-App Browser Testing (Edge Case)

### Test 12: Phantom In-App Browser
1. Open Phantom app
2. Use built-in browser to navigate to application
3. **Expected Console Log**: `[WalletProvider] Platform detected: { mobile: true, isInAppBrowser: true, willUseMobileProvider: false }`
4. **Expected**: DesktopWalletProvider loads (NOT MobileWalletProvider)
5. **Reason**: In-app browser has `window.solana` injected
6. Click "Select Wallet" → Choose "Phantom"
7. **Expected**: Instant connection (no deep link needed)
8. ✅ **Pass Criteria**: Desktop provider used correctly

### Test 13: Solflare In-App Browser
1. Open Solflare app
2. Use built-in browser to navigate to application
3. **Expected**: DesktopWalletProvider loads
4. **Reason**: In-app browser has `window.solflare` injected
5. ✅ **Pass Criteria**: Desktop provider used correctly

## Error Handling

### Test 14: Desktop - No Extension Installed
1. Use browser without wallet extension
2. Click "Select Wallet" → Choose "Phantom"
3. **Expected Warning**: "Wallet extension not detected. Please install Phantom or Solflare."
4. ✅ **Pass Criteria**: Clear error message

### Test 15: Mobile - No Wallet App Installed
1. Use device without wallet apps
2. Tap "Select Wallet" → Tap "Mobile Wallet Adapter"
3. **Expected Warning**: "Wallet not ready. Please ensure Phantom or Solflare mobile app is installed and unlocked."
4. ✅ **Pass Criteria**: Clear error message

### Test 16: Wrong Network
1. Set wallet to Mainnet (app expects Devnet)
2. Connect wallet
3. **Expected Warning**: "Failed to connect to wallet. Please ensure your wallet app is open and set to devnet."
4. ✅ **Pass Criteria**: Network mismatch detected

## Console Logging (Debugging)

### Desktop Logs
```
[DesktopWalletProvider] Initializing desktop wallet adapters
```

### Mobile Logs
```
[MobileWalletProvider] Initializing Mobile Wallet Adapter
[WalletProvider] Platform detected: {
  mobile: true,
  isInAppBrowser: false,
  willUseMobileProvider: true
}
```

### In-App Browser Logs
```
[WalletProvider] Platform detected: {
  mobile: true,
  isInAppBrowser: true,
  willUseMobileProvider: false
}
```

## Accessibility Testing

### Test 17: Screen Reader Support
1. Enable screen reader (VoiceOver on iOS, TalkBack on Android)
2. Navigate to application
3. Loading state: Should announce "Loading wallet..." with proper role
4. ✅ **Pass Criteria**: Loading state is accessible

## Troubleshooting

### Issue: Modal closes but nothing happens (Mobile)
- **Before Fix**: This was the bug - modal closed, no deep link
- **After Fix**: "Open with" dialog should appear
- **If still broken**: Check console logs, ensure MobileWalletProvider is loading

### Issue: Desktop auto-reconnect not working
- **Check**: Ensure DesktopWalletProvider is loading (check console)
- **Check**: Browser extension is unlocked
- **Note**: autoConnect: true is desktop-only

### Issue: Mobile auto-reconnects
- **This is wrong**: Mobile should NOT auto-reconnect (autoConnect: false)
- **Check**: Ensure MobileWalletProvider is loading, not DesktopWalletProvider

## Test Results Template

```
Date: ________
Tester: ________
Environment: ________ (Desktop/Mobile)

Desktop Tests:
[ ] Test 1: Extension Detection
[ ] Test 2: Wallet Modal Display
[ ] Test 3: Phantom Connection
[ ] Test 4: Solflare Connection
[ ] Test 5: Auto-Reconnect

Mobile Tests:
[ ] Test 6: Mobile Browser Detection
[ ] Test 7: Wallet Modal Display (Mobile)
[ ] Test 8: Deep Link Trigger ⭐ KEY FIX
[ ] Test 9: Phantom Mobile Connection
[ ] Test 10: Solflare Mobile Connection
[ ] Test 11: No Auto-Reconnect (Mobile)

Edge Cases:
[ ] Test 12: Phantom In-App Browser
[ ] Test 13: Solflare In-App Browser

Error Handling:
[ ] Test 14: Desktop - No Extension
[ ] Test 15: Mobile - No App
[ ] Test 16: Wrong Network

Accessibility:
[ ] Test 17: Screen Reader Support

Overall Result: PASS / FAIL
Notes: ________
```

## Success Criteria

✅ **Desktop**: No regressions - all existing flows work
✅ **Mobile**: Deep linking works - "Open with" dialog appears
✅ **Console**: Correct provider logs appear
✅ **Separation**: Desktop and mobile flows are independent

## Before/After Comparison

### Before (Broken)
```
Mobile User → Taps "Mobile Wallet Adapter" 
→ Modal closes → NOTHING HAPPENS ❌
→ User stuck, can't connect
```

### After (Fixed)
```
Mobile User → Taps "Mobile Wallet Adapter"
→ "Open with" dialog appears ✅
→ Selects wallet app
→ App opens with connection request ✅
→ User approves
→ Returns to browser, connected ✅
```
