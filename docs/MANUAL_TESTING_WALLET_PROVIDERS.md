# Manual Testing Guide: Unified Wallet Provider with Mobile Support

## Overview
This guide covers manual testing for the unified wallet provider that uses Phantom and Solflare's built-in mobile support via deep links.

## Changes Summary
- **Removed SolanaMobileWalletAdapter** (incompatible with mobile web browsers)
- **Unified Provider**: PhantomWalletAdapter + SolflareWalletAdapter for both desktop and mobile
- **Auto-Detection**: Wallet adapters automatically detect mobile browsers and use deep links
- **No Separate Mobile Adapter**: Phantom and Solflare handle mobile via deep links internally

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

## Desktop Testing

### Test 1: Extension Detection
1. Open browser with Phantom extension installed
2. Navigate to application
3. **Expected Console Log**: `[WalletProvider] Creating wallet adapters...`
4. **Expected Console Log**: `Phantom and Solflare auto-detect mobile and use deep links`
5. ✅ **Pass Criteria**: Provider initializes with 2 adapters

### Test 2: Wallet Modal Display
1. Click "Select Wallet" button
2. Modal opens
3. **Expected**: Shows "Phantom" and "Solflare" options
4. ✅ **Pass Criteria**: Both wallets shown

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
3. **Expected**: Wallet auto-reconnects (autoConnect: false by default, but can be enabled)
4. ✅ **Pass Criteria**: Auto-reconnect behavior works as configured

## Mobile Testing (Fix Verification)

### Test 6: Mobile Browser Detection
1. Open Chrome on Android (or Safari on iOS)
2. Navigate to application
3. **Expected Console Log**: `[WalletProvider] Creating wallet adapters...`
4. **Expected Console Log**: `Phantom and Solflare auto-detect mobile and use deep links`
5. **Expected Console Log**: `Is Mobile: true`
6. ✅ **Pass Criteria**: Same adapters load, mobile detection logged

### Test 7: Wallet Modal Display (Mobile)
1. Tap "Select Wallet" button
2. Modal opens
3. **Expected**: Shows "Phantom" and "Solflare" options (same as desktop)
4. ✅ **Pass Criteria**: Both wallets shown

### Test 8: Deep Link Trigger (KEY FIX)
1. Tap "Select Wallet" → Tap "Phantom" or "Solflare"
2. ✅ **CRITICAL**: Deep link triggers automatically
3. **Expected**: Phantom/Solflare app opens with connection request
4. ✅ **Pass Criteria**: Deep link works (NO WebSocket errors)

### Test 9: Phantom Mobile Connection
1. Tap "Phantom" in wallet modal
2. ✅ **CRITICAL**: Phantom app opens with connection request via deep link
3. **Expected**: Shows connection request for app
4. Tap "Connect" in Phantom app
5. ✅ **CRITICAL**: Browser automatically returns
6. **Expected**: Shows "Connected" status
7. **Expected**: Button shows wallet address
8. ✅ **Pass Criteria**: Complete connection flow works

### Test 10: Solflare Mobile Connection
1. Disconnect if connected
2. Repeat Test 9 but tap "Solflare"
3. ✅ **Pass Criteria**: Complete connection flow works

### Test 11: No Auto-Reconnect (Mobile Behavior)
1. Connect wallet on mobile
2. Refresh page
3. **Expected**: Wallet does NOT auto-reconnect (autoConnect: false by default)
4. **Expected**: User must manually tap "Connect" again
5. ✅ **Pass Criteria**: No auto-reconnect (this is correct mobile behavior)

## In-App Browser Testing (Edge Case)

### Test 12: Phantom In-App Browser
1. Open Phantom app
2. Use built-in browser to navigate to application
3. **Expected**: Standard wallet adapters load
4. **Reason**: In-app browser has `window.solana` injected
5. Click "Select Wallet" → Choose "Phantom"
6. **Expected**: Instant connection (no deep link needed)
7. ✅ **Pass Criteria**: In-app browser connection works

### Test 13: Solflare In-App Browser
1. Open Solflare app
2. Use built-in browser to navigate to application
3. **Expected**: Standard wallet adapters load
4. **Reason**: In-app browser has `window.solflare` injected
5. ✅ **Pass Criteria**: In-app browser connection works

## Error Handling

### Test 14: Desktop - No Extension Installed
1. Use browser without wallet extension
2. Click "Select Wallet" → Choose "Phantom"
3. **Expected Warning**: "Wallet extension not detected. Please install Phantom or Solflare."
4. ✅ **Pass Criteria**: Clear error message

### Test 15: Mobile - No Wallet App Installed
1. Use device without wallet apps
2. Tap "Select Wallet" → Tap "Phantom" or "Solflare"
3. **Expected Warning**: Wallet app opens or error message shown
4. ✅ **Pass Criteria**: Clear error message or app store redirect

### Test 16: Wrong Network
1. Set wallet to Mainnet (app expects Devnet)
2. Connect wallet
3. **Expected Warning**: "Failed to connect to wallet. Please ensure your wallet app is open and set to devnet."
4. ✅ **Pass Criteria**: Network mismatch detected

## Console Logging (Debugging)

### Provider Initialization Logs
```
[WalletProvider] Initializing wallet provider...
  📍 Network: devnet
  📍 RPC Endpoint: https://api.devnet.solana.com
  📍 User Agent: [user agent string]
  📍 Is Mobile: [true/false]
[WalletProvider] Creating wallet adapters...
📱 Phantom and Solflare auto-detect mobile and use deep links
  ✅ Phantom adapter created: Phantom
  ✅ Solflare adapter created: Solflare
[WalletProvider] Total adapters: 2
✅ [WalletProvider] Wallet provider initialized with 2 adapters (mobile auto-detection enabled)
  1. Phantom
  2. Solflare
```

## Accessibility Testing

### Test 17: Screen Reader Support
1. Enable screen reader (VoiceOver on iOS, TalkBack on Android)
2. Navigate to application
3. Loading state: Should announce "Loading wallet..." with proper role
4. ✅ **Pass Criteria**: Loading state is accessible

## Troubleshooting

### Issue: Modal closes but nothing happens (Mobile)
- **Solution**: Phantom and Solflare now handle deep links automatically
- **Check**: Ensure wallet app is installed and updated
- **Check**: Console logs for errors

### Issue: "Missing signature" or "WebSocket" errors (Mobile)
- **Before Fix**: This was the bug with SolanaMobileWalletAdapter
- **After Fix**: These errors should NOT occur
- **If still occurring**: Check that package was properly updated (no @solana-mobile/wallet-adapter-mobile)

### Issue: Auto-reconnect behavior
- **Note**: autoConnect is set to false by default
- **Check**: Ensure browser extension/app is unlocked

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

✅ **Desktop**: All flows work with browser extensions
✅ **Mobile**: Deep linking works - wallet apps open automatically
✅ **Console**: Correct provider logs show 2 adapters with mobile auto-detection
✅ **Unified**: Same adapters work across all platforms

## Before/After Comparison

### Before (Broken)
```
Mobile User → Taps wallet button
→ "Missing signature" error ❌
→ WebSocket connection failed ❌
→ User stuck, can't connect
```

### After (Fixed)
```
Mobile User → Taps "Phantom" or "Solflare"
→ Deep link triggers automatically ✅
→ Wallet app opens with connection request ✅
→ User approves
→ Returns to browser, connected ✅
→ No WebSocket or signature errors ✅
```
