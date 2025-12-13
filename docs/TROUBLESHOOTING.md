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

---

## Issue: Home Page Balance Shows "--"

### Symptoms
- Balance displays "--" on home page even when wallet is connected and has EQUA tokens
- Mint page shows correct balance but home page doesn't

### Root Cause
The home page component was not properly subscribing to SPL token balance updates.

### Solution
Use the `useEquaBalance` hook in components that need to display balance:

```typescript
import { useEquaBalance } from '@/hooks/useEquaBalance';
import { formatEquaBalance } from '@/utils/tokenFormat';

const { balance, isLoading, error } = useEquaBalance();

// Display balance
{balance > 0 ? formatEquaBalance(balance) : '--'}
```

---

## Issue: Pyth Hermes API 404 Errors

### Symptoms
Console shows repeated 404 errors from Pyth Hermes API endpoint.

### Root Causes
- Missing `parsed=true` query parameter
- Rate limiting (HTTP 429)
- Invalid or unavailable feed IDs
- Network configuration mismatch

### Solution

1. **Temporary Disable**: Set `NEXT_PUBLIC_ENABLE_PYTH=false` in `.env.local`

2. **Configure Network**: Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_PYTH_ENV=mainnet-beta
   ```

3. **Error Handling**: The system automatically falls back to:
   - Pyth Network (primary)
   - CoinGecko API (fallback)
   - Hardcoded fallback prices (last resort)

---

## Issue: Referral Validation Broken

### Symptoms
- Entering a valid referrer public key shows "not registered" error
- Referrer is actually registered and visible on blockchain
- "Register Now" button remains disabled after removing invalid referrer

### Root Cause
Validation was checking the wallet public key directly instead of deriving the UserAccount PDA.

### Solution
The system now correctly derives the UserAccount PDA before validation:

```typescript
// CORRECT - derives UserAccount PDA first
const [referrerUserAccountPDA] = getUserAccountPDA(referrerPubkey);
const accountInfo = await connection.getAccountInfo(referrerUserAccountPDA);
```

### How to Verify
1. Register user with wallet A
2. Use wallet A's public key as referrer when registering with wallet B
3. Validation should succeed

---

## Issue: Account Parsing Offset Bug

### Symptoms
Console warnings like:
```
⚠️ Account data too short (136 bytes) for timestamp at offset 136
```

### Root Cause
Incorrect byte offsets for parsing UserAccount fields.

### Solution
Use the `decodeUserAccount` function:

```typescript
import { decodeUserAccount } from '@/utils/safeAccountParsing';

const decoded = decodeUserAccount(accountData);
if (decoded) {
  console.log('Last mint time:', decoded.lastMintTime);
  console.log('Minted amount:', decoded.mintedAmount);
}
```

**Correct UserAccount Structure** (136 bytes):
```
discriminator:     0-7    (8 bytes)
authority:         8-39   (32 bytes)
referral:          40-71  (32 bytes)
token_account:     72-103 (32 bytes)
minted_amount:     104-111 (8 bytes)
mint_start:        112-119 (8 bytes)
referral_rewards:  120-127 (8 bytes)
last_mint_time:    128-135 (8 bytes)
```

---

## Issue: Transfer Count Remains Zero

### Symptoms
After sending EQUA, the transfer count doesn't increment on the home page.

### Solution
The `recordTransfer` function is now automatically called and:
1. Increments transfer count in localStorage
2. Dispatches events for real-time UI updates
3. Logs transaction signature

### Verify
Check browser console for:
```
✓ Transfer recorded to localStorage
```

---

## Environment Variables Reference

Add these to `.env.local`:

```bash
# Program Configuration
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet

# Oracle Configuration
NEXT_PUBLIC_ENABLE_PYTH=true
NEXT_PUBLIC_PYTH_ENV=mainnet-beta

# Rate Limiting
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=86400000
NEXT_PUBLIC_REFERRAL_RATE_LIMIT=10

# Cooldown
NEXT_PUBLIC_MINT_COOLDOWN_SECONDS=86400
```

**Note**: Restart dev server after changing environment variables.

---

## Debugging Tips

### Check Account Data
```typescript
import { getUserAccountPDA } from '@/lib/program';
import { decodeUserAccount } from '@/utils/safeAccountParsing';

const [pda] = getUserAccountPDA(walletPublicKey);
const account = await connection.getAccountInfo(pda);
const decoded = decodeUserAccount(account?.data);
console.log(decoded);
```

### Clear LocalStorage
```javascript
// In browser console
Object.keys(localStorage)
  .filter(key => key.startsWith('equa_'))
  .forEach(key => localStorage.removeItem(key));
```

### Verify RPC Connection
```bash
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```
