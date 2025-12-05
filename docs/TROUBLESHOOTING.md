# EQUA Frontend Troubleshooting Guide

This document provides solutions for common issues users may encounter with the EQUA Token frontend.

## Issue: Buttons Not Visible (Connect Wallet / Get Started)

### Symptoms
- "Connect Wallet" button is not visible in the navigation bar
- "Get Started" button is not visible on the homepage
- Page loads but interactive elements are missing

### Root Causes & Solutions

#### 1. Browser Cache Issues
**Solution:**
- Hard refresh the page: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Clear browser cache and reload
- Try in incognito/private browsing mode

#### 2. Ad Blockers / Browser Extensions
**Solution:**
- Disable ad blockers (uBlock Origin, AdBlock, etc.)
- Disable privacy extensions that might block JavaScript
- Add `localhost:3000` or your deployment URL to the whitelist
- **Known Issue:** Extensions may block Solana RPC calls, causing `ERR_BLOCKED_BY_CLIENT` errors

#### 3. JavaScript Disabled
**Solution:**
- Ensure JavaScript is enabled in your browser settings
- Check browser console for errors (F12 → Console tab)

#### 4. Network/Firewall Restrictions
**Solution:**
- Ensure access to `https://api.devnet.solana.com`
- Check if corporate firewall is blocking WebSocket connections
- Try on a different network (mobile hotspot, home network, etc.)

#### 5. Outdated Browser
**Solution:**
- Update your browser to the latest version
- Minimum supported versions:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

#### 6. Build Artifacts Issue
**For Developers:**
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
npm run start
```

## Expected Behavior

### Homepage
- ✅ "Select Wallet" button visible in top-right navigation
- ✅ "Get Started →" button visible in hero section
- ✅ Price display showing current EQUA price
- ✅ All three feature cards visible

### After Clicking "Select Wallet"
- ✅ Modal opens with wallet options (Phantom, Solflare, Torus, Ledger)
- ✅ Can select and connect a wallet

### After Clicking "Get Started"
- ✅ Navigates to `/mint` page
- ✅ Shows "Connect Your Wallet" if not connected

## Console Errors (Expected & Safe to Ignore)

These errors are expected when running locally and don't affect functionality:

### 1. `ERR_BLOCKED_BY_CLIENT`
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```
- **Cause:** Ad blocker or browser extension blocking requests
- **Impact:** None - app gracefully falls back to default values
- **Action:** Can be safely ignored or whitelist the domain

### 2. Solana RPC Connection Errors
```
Error fetching price data: Error: failed to get info about account...
```
- **Cause:** Network restrictions or RPC rate limiting
- **Impact:** Price display shows fallback values (still functional)
- **Action:** App continues to work with cached/fallback data

### 3. Font Loading (Can be blocked)
```
Failed to load resource: https://fonts.googleapis.com/...
```
- **Cause:** Privacy extensions blocking Google Fonts
- **Impact:** System fonts used as fallback
- **Action:** Safe to ignore

## Developer Debugging

### Check Component Loading
Open browser DevTools (F12) and run:
```javascript
// Check if components are mounted
document.querySelector('[data-testid="get-started-cta"]') !== null
// Should return: true

// Check if wallet button exists
document.querySelector('button').textContent.includes('Select Wallet')
// Should return: true
```

### Verify Dynamic Imports
Look for console logs:
```
✅ Generated new user account keypair: [address]
✅ Loaded existing user account keypair: [address]
```
If these don't appear, dynamic imports may have failed.

### Check Network Tab
1. Open DevTools → Network tab
2. Reload page
3. Filter by "JS"
4. Verify these chunks load:
   - `_app-pages-browser_src_components_WalletButton_tsx.js`
   - `_app-pages-browser_src_components_GetStartedButton_tsx.js`

## Environment-Specific Issues

### Development (`npm run dev`)
- Buttons should appear within 1-3 seconds after page load
- May see "Loading..." placeholder briefly
- Hot reload may occasionally cause buttons to disappear (refresh page)

### Production (`npm run build && npm run start`)
- Buttons load faster (optimized bundles)
- No "Loading..." placeholder visible in most cases
- Cache-first strategy for better performance

## Getting Help

If buttons are still not visible after trying all solutions:

1. **Check browser console** (F12 → Console) and note any errors
2. **Try a different browser** to isolate the issue
3. **Test on mobile device** to rule out desktop-specific issues
4. **Report the issue** with:
   - Browser name and version
   - Operating system
   - Screenshot of the issue
   - Console errors (if any)
   - Steps to reproduce

## Technical Details

### Component Architecture
- Buttons use Next.js dynamic imports with `ssr: false`
- Loading placeholders show during code-splitting
- Error boundary catches and displays any React errors
- Wallet adapter handles Solana wallet connections

### Performance
- Dynamic imports reduce initial bundle size
- Components load asynchronously after main content
- Average load time: 1-3 seconds on 3G connection
- Optimized for mobile and desktop

### Network Requirements
- **Required:** HTTP/HTTPS access to app domain
- **Optional:** Access to `https://api.devnet.solana.com` (for live data)
- **Optional:** WebSocket support (for real-time updates)

---

**Last Updated:** December 2024
**Version:** 0.1.0
