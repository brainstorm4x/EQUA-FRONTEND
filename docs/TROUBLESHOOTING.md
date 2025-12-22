# EQUA Frontend Troubleshooting Guide

This document provides solutions for common issues users may encounter with the EQUA Token frontend.

## Issue: Blank Homepage / White Screen

### Symptoms
- Homepage loads but shows only a blank/white screen
- No components visible, only warnings in browser console
- Preload warnings for images or resources
- Application appears to load but nothing renders

### Root Causes & Solutions

#### 1. Runtime JavaScript Error
**Symptoms:**
- Blank page with no error message
- Console shows uncaught errors or exceptions
- React components fail to render

**Solution:**
- Open browser console (F12) and check for error messages
- Look for errors related to:
  - `Cannot read property of undefined`
  - `X is not a function`
  - Module import failures
  - Hydration mismatches
- If you see errors, try:
  ```bash
  # Clear Next.js cache and rebuild
  rm -rf .next
  npm run build
  npm run dev
  ```
- Check that all environment variables are set correctly (see `.env.local.example`)
- Clear browser cache and reload: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

#### 2. Error Boundaries Not Catching Errors
**Solution:**
- The app now includes error boundaries at multiple levels:
  - `app/error.tsx` - catches client-side page errors
  - `app/global-error.tsx` - catches root layout errors
  - `ErrorBoundary` component in providers
- These should prevent blank screens and show user-friendly error messages
- If you still see a blank page, check browser console for error details

#### 3. Pyth Oracle 404 Errors
**Symptoms:**
- Blank page when Pyth Hermes API is unavailable
- Console shows 404 errors from `https://hermes.pyth.network/`
- Price data fails to load

**Solution:**
- The app is designed to handle Pyth 404s gracefully with fallback prices
- If you experience issues:
  - Check `src/utils/eqxOracle.ts` - it should use fallback prices automatically
  - Verify `NEXT_PUBLIC_ENABLE_PYTH` is not causing issues (default: enabled)
  - The app will use hardcoded fallback prices from November 2025 if Pyth is unavailable
- **Fallback behavior:** App continues to function with static prices when oracle is unavailable

#### 4. Image Preload Warnings
**Symptoms:**
- Console warning: "resource was preloaded using link preload but not used within a few seconds"
- Specific to `/branding/equa-logo.png`

**Solution:**
- This is a non-critical warning and should not cause blank pages
- The warning means the image was preloaded but took time to render
- To silence the warning, ensure:
  - Image exists at `/public/branding/equa-logo.png`
  - Image is used immediately on page load (which it is - in Logo component)
  - Clear browser cache if stale preload data is cached
- **Note:** This warning does not affect functionality

#### 5. Wallet Adapter Loading Issues
**Symptoms:**
- Page blank until wallet adapter fully loads
- Dynamic imports not resolving

**Solution:**
- The app uses dynamic imports with `ssr: false` for wallet components
- If issues persist:
  ```bash
  # Reinstall dependencies with legacy peer deps flag
  rm -rf node_modules package-lock.json
  npm install --legacy-peer-deps
  npm run dev
  ```
- Check that wallet adapter packages are properly installed:
  - `@solana/wallet-adapter-base`
  - `@solana/wallet-adapter-react`
  - `@solana/wallet-adapter-wallets`

#### 6. Loading States and Suspense
**Solution:**
- App now includes loading states:
  - `app/loading.tsx` - global loading UI
  - Loading placeholders for dynamic components
  - Suspense boundaries prevent blank renders during component loading
- If loading spinner shows indefinitely, check:
  - Network connectivity
  - Browser console for stuck promises or errors
  - Solana RPC endpoint availability

### Quick Diagnostic Steps

1. **Check Browser Console (F12 → Console):**
   ```
   - Look for red error messages
   - Check for 404s, network errors, or CORS issues
   - Verify all imports are resolving correctly
   ```

2. **Verify Environment Variables:**
   ```bash
   # Required variables in .env.local
   # Legacy naming (preferred):
   NEXT_PUBLIC_NETWORK=devnet
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   
   # Alternative naming (also supported):
   # NEXT_PUBLIC_SOLANA_NETWORK=devnet
   # NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
   
   # Optional: NEXT_PUBLIC_ENABLE_PYTH=true
   ```

3. **Test in Incognito Mode:**
   - Eliminates browser extension conflicts
   - Ensures clean cache state
   - Rules out localStorage issues

4. **Check Network Tab (F12 → Network):**
   - Verify JavaScript bundles are loading (200 status)
   - Check for failed resource loads (404, 500 errors)
   - Ensure no CORS errors blocking requests

5. **Force Clean Build:**
   ```bash
   rm -rf .next node_modules
   npm install --legacy-peer-deps
   npm run build
   npm run start
   ```

### Development Mode Debugging

If blank page occurs in development:
```bash
# Enable verbose error logging
NODE_ENV=development npm run dev

# Check the terminal output for:
# - Build errors
# - Module resolution failures
# - TypeScript errors
```

### When to Seek Help

If none of the above solutions work:
1. Note the exact browser and version
2. Copy all console error messages
3. Check browser Network tab for failed requests
4. Document steps to reproduce the issue
5. Report to the development team with all diagnostic info

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

## Issue: Wallet Connection Errors

### Symptoms
- "WalletConnectionError: Unexpected error" when clicking "Select Wallet"
- Phantom wallet listed twice in wallet selection modal
- Console spam with wallet errors during Fast Refresh
- Phantom not connecting even when installed

### Root Causes

#### 1. Phantom Double Registration
**Cause:** Both the injected Phantom provider (`window.solana`) and the PhantomWalletAdapter are active, causing double registration.

**Solution:** The wallet provider now detects injected Phantom and avoids double registration. The adapter automatically uses the injected provider when available.

#### 2. Phantom Wallet Locked or Not Installed
**Cause:** Phantom extension is installed but wallet is locked, or not installed at all.

**Solution:** 
- **Locked**: The app now displays a warning banner: "Phantom wallet detected but locked. Please unlock your wallet to connect."
- **Not Installed**: On desktop, you'll see: "Phantom wallet not detected. Please install the Phantom browser extension from phantom.app"
- **Mobile**: Prompts to download from app store (iOS/Android)

#### 3. Network Mismatch (Devnet vs Mainnet)
**Cause:** Your wallet is connected to mainnet but the app is configured for devnet (or vice versa).

**Solution:** 
- Check the expected network in `.env.local`:
  ```bash
  NEXT_PUBLIC_NETWORK=devnet
  NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
  ```
- Change your wallet's network in wallet settings to match
- The app will show a warning: "Connection error. Please ensure your wallet is connected to devnet network."

#### 4. Console Spam During Fast Refresh
**Cause:** Wallet errors are logged repeatedly when Next.js Fast Refresh occurs in development.

**Solution:** Error logging is now throttled to once every 5 seconds to prevent console spam.

### Wallet Readiness Checks

The app now includes automatic readiness detection:

1. **On Load**: Checks if Phantom is injected and ready
2. **Locked Wallet**: Detects locked wallet and shows user guidance
3. **Network Check**: Validates wallet is on the correct network
4. **Clear Errors**: User-friendly error messages instead of cryptic wallet adapter errors

### Troubleshooting Steps

1. **Phantom Not Connecting:**
   - Check if Phantom extension is installed (look for Phantom icon in browser toolbar)
   - Click the Phantom icon and ensure wallet is unlocked
   - Check wallet network matches app network (devnet for testing, mainnet for production)

2. **Double Wallet Entry:**
   - Update to latest version (this issue is now fixed)
   - You should see only ONE "Phantom" entry in the wallet selection modal

3. **Connection Timeout:**
   - Check browser console for specific error messages
   - Ensure you're not blocking wallet popups in browser settings
   - Try disconnecting and reconnecting the wallet
   - Refresh the page

4. **Network Mismatch:**
   - Open Phantom wallet settings
   - Navigate to "Network" settings
   - Change to the network the app is using (check app banner or console logs)
   - Disconnect and reconnect wallet

### Expected Behavior

After the fix:
- ✅ Phantom appears only ONCE in wallet selection
- ✅ Clear error messages when wallet is locked/missing
- ✅ Network mismatch warnings guide users to fix
- ✅ No console spam during development Fast Refresh
- ✅ Solflare and other wallets work normally

---

## Issue: Pyth Hermes API 404 Errors

### Symptoms
Console shows repeated 404 errors from Pyth Hermes API endpoint.

### Root Causes
- Using deprecated GET endpoint instead of POST
- Feed IDs sent with incorrect format (with `0x` prefix)
- Rate limiting (HTTP 429)
- Invalid or unavailable feed IDs
- Network configuration mismatch

### Solution

**The Pyth integration has been updated to use the stable POST endpoint.**

1. **Temporary Disable**: Set `NEXT_PUBLIC_ENABLE_PYTH=false` in `.env.local` if you're in an environment without Hermes access (firewall, VPN, etc.)

2. **Configure Network** (optional): Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_PYTH_ENV=mainnet-beta
   ```

3. **Error Handling**: The system automatically falls back to:
   - Pyth Network via POST (primary)
   - CoinGecko API (fallback)
   - Hardcoded fallback prices (last resort)

### Technical Details

The fix includes:
- Switched from GET `https://hermes.pyth.network/v2/updates/price/latest` (404) to POST `https://hermes.pyth.network/api/latest_price_feeds` (stable)
- Feed IDs are now sent without `0x` prefix as required by Hermes
- Response parsing updated to handle array format from POST endpoint
- Session-based warning throttling (warns only once per session about Pyth errors)

### Testing the Fix

Run the oracle tests to verify:
```bash
npm test -- __tests__/pricing/eqxOracle.test.ts
```

Should see:
```
✓ should use Pyth when available
✓ should use POST request with correct shape for Hermes API
```

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

## Issue: Preflight Validation Error - 11 vs 12 Account Mismatch

### Symptoms
Registration fails with a preflight validation error:
```
❌ PREFLIGHT CHECK FAILED: associated_token_program at wrong index!
  Index 8 should be ASSOCIATED_TOKEN_PROGRAM_ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
  But got: [different address]
  This will cause "InvalidProgramId" error on associated_token_program account.
```

OR runtime error during registration:
```
AnchorError caused by account: associated_token_program
Error Code: InvalidProgramId (3008)
Left: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
Right: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
```

### Root Cause
The backend's `InitializeUser` instruction evolved from 11 accounts to 12 accounts by adding `business_registry` at index 8. A legacy frontend preflight check was still enforcing the old 11-account layout, expecting:
- Index 8 = `associated_token_program` (OLD - incorrect)
- Index 9 = `token_program` (OLD - incorrect)

But the correct 12-account layout requires:
- Index 8 = `business_registry` (NEW)
- Index 9 = `associated_token_program` (NEW - correct)
- Index 10 = `token_program` (NEW - correct)

### Solution
**This issue has been fixed in the latest version.** The legacy preflight validation has been removed.

**For Users:**
1. Clear your browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Ensure you're using the latest version of the app
3. Try registration again

**For Developers:**
1. Pull the latest code from the repository
2. Ensure `createInitializeUserInstruction` in `src/lib/program.ts` has only ONE preflight check
3. The preflight should validate indices 9 and 10 (not 8 and 9)
4. Run `node scripts/validate_registration.mjs` to verify the 12-account structure

**Verification:**
```bash
# Verify the fix
node scripts/validate_registration.mjs

# Should show:
✓ IDL has 12 accounts for initialize_user
✓ IDL has business_registry at index 8
✓ IDL specifies correct ASSOCIATED_TOKEN_PROGRAM_ID at index 9
✓ IDL has token_program at index 10
✓ Preflight validates ASSOCIATED_TOKEN_PROGRAM_ID at index 9
```

---

## Issue: InitializeUser InvalidProgramId on associated_token_program

### Symptoms
Registration fails with an Anchor error:
```
AnchorError caused by account: associated_token_program
Error Code: InvalidProgramId
Error Message: Program ID is not valid
Left: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
Right: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
```

### Root Cause
The instruction accounts are being passed in the wrong order, causing:
- Token-2022 program ID to be passed where Associated Token Program ID is expected
- This creates a program ID mismatch that Anchor detects and rejects

### Solution
**For Developers:** Check the `createInitializeUserInstruction` call site parameter order.

The function signature is:
```typescript
createInitializeUserInstruction(
  userAccount,
  userMetadata,
  authority,
  globalState,
  referralAccount,
  referrerMetadata,
  userTokenAccount,
  mint,
  associatedTokenProgram,  // ← Must be ASSOCIATED_TOKEN_PROGRAM_ID
  tokenProgram,             // ← Must be TOKEN_PROGRAM_ID (Token-2022)
  mintStart,
  referrer,
  userType
)
```

**Correct usage (12-account structure with business_registry):**
```typescript
const [businessRegistryPDA] = getBusinessRegistryPDA();

const instruction = createInitializeUserInstruction(
  userAccountPDA,
  userMetadataPDA,
  publicKey,
  globalStatePDA,
  referralAccountPubkey,
  referrerMetadataPubkey,
  userTokenAccount,
  mintPDA,
  businessRegistryPDA,           // ← Index 8 in instruction.keys
  ASSOCIATED_TOKEN_PROGRAM_ID,   // ← Index 9 in instruction.keys
  TOKEN_PROGRAM_ID,              // ← Index 10 in instruction.keys
  now,
  referrerPubkey,
  userType
);
```

### Preflight Validation
The `createInitializeUserInstruction` function includes automatic preflight checks in development mode:
```
✅ Preflight validation passed:
  - Index 9 = ASSOCIATED_TOKEN_PROGRAM_ID (ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL)
  - Index 10 = TOKEN_PROGRAM_ID (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
```

If you see a preflight check failure, the parameters are in the wrong order at the call site.

### Token Program Configuration
EQUA uses **Token-2022** (not Standard SPL Token):
- TOKEN_PROGRAM_ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- ASSOCIATED_TOKEN_PROGRAM_ID: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

**Always import from `src/lib/constants.ts`:**
```typescript
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/program';
```

**Never import directly from `@solana/spl-token`** in feature code - this bypasses Token-2022 configuration.

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

# Note: Alternative naming also supported:
# NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
# NEXT_PUBLIC_SOLANA_NETWORK=devnet

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

## Issue: InvalidProgramId Error During Registration

### Symptoms
- Registration fails with AnchorError: InvalidProgramId
- Console shows error like:
  ```
  AnchorError: InvalidProgramId on account: associated_token_program
  Left: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  Right: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (Associated Token Program)
  ```
- Or error stating token_program mismatch between mint owner and configured program

### Root Causes

#### 1. Mint Created with Wrong Token Program
EQUA requires Token-2022. The frontend is hardcoded to use Token-2022 only.

**Solution:**
If your mint was created with Standard SPL Token, you must recreate it with Token-2022. The EQUA backend only supports Token-2022.

#### 2. Mint Not Using Token-2022
The frontend is hardcoded to use Token-2022 to match the EQUA backend deployment.

**Solution:**
1. Check mint owner on Solana Explorer
2. Verify it is Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
3. If the mint uses a different token program (e.g., Standard SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`):
   - Recreate the mint with Token-2022
   - EQUA does not support Standard SPL Token

#### 3. Incorrect ASSOCIATED_TOKEN_PROGRAM_ID
Wrong constant passed to instruction builder.

**Solution:**
The app now validates this at startup. Check browser console for:
```
✅ Token program IDs validated at startup:
  - TOKEN_PROGRAM_ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  - ASSOCIATED_TOKEN_PROGRAM_ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```

If you see an error instead, the constants are misconfigured.

### Verification Steps

1. **Check Mint Owner:**
   ```bash
   node scripts/validate_registration.mjs
   ```
   This will verify the mint owner matches your configuration.

2. **View Mint on Solana Explorer:**
   - Devnet: `https://explorer.solana.com/address/[MINT_ADDRESS]?cluster=devnet`
   - Check "Owner Program" field
   - Should match TOKEN_PROGRAM_ID in constants.ts

3. **Inspect Instruction Metas:**
   In registration flow, check console logs:
   ```
   🧪 InitializeUser instruction metas:
   0. [user_account] writable=true signer=false
   ...
   8. [ATokenGP...] writable=false signer=false  ← Must be ATokenGP...
   9. [Tokenkeg...] writable=false signer=false  ← Must match mint owner
   ```

### Prevention

The frontend now includes runtime validation:
- Startup assertion checks TOKEN_PROGRAM_ID and ASSOCIATED_TOKEN_PROGRAM_ID
- Registration flow calls `verifyMintOwner()` before building instructions
- Clear error messages guide you to the fix

If validation fails, you'll see:
```
❌ Mint owner mismatch - this will cause InvalidProgramId errors!
  Mint owner: [actual owner address] ([Token program type])
  Expected: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  
  Fix: Recreate the mint with Token-2022. EQUA only supports Token-2022.
```

### Related Issues
- If you see "Token program provided does not match the token's program owner"
- Check that `TOKEN_PROGRAM_ID` matches the actual mint owner on-chain

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

## Issue: InvalidProgramId Error on Registration (Account Mismatch)

### Symptoms
- Registration fails with `AnchorError` showing "InvalidProgramId" (Error Code: 3008)
- Error message indicates mismatch on `associated_token_program` account
- Transaction simulation or execution fails during `initialize_user` instruction

### Root Cause
This error occurs when the frontend sends a different number of accounts than the backend expects for the `initialize_user` instruction. The backend now requires **12 accounts** (including `business_registry` as the 9th account), but older frontend versions may send only 11 accounts.

When account counts mismatch:
- The backend reads accounts at wrong indices
- Token program IDs appear at incorrect positions
- The program sees Token-2022 (TokenzQdB...) where it expects Associated Token Program (ATokenGP...)

### Expected Account Order (12 accounts)
```
0.  user_account           (PDA, writable)
1.  user_metadata          (PDA, writable)
2.  authority              (signer, writable)
3.  global_state           (PDA, writable)
4.  referral_account       (PDA, writable)
5.  referrer_metadata      (PDA, writable)
6.  user_token_account     (ATA, writable)
7.  mint                   (PDA, read-only)
8.  business_registry      (PDA, read-only) ← NEW
9.  associated_token_program (ATokenGP..., read-only)
10. token_program          (Token-2022 or Standard SPL, read-only)
11. system_program         (11111..., read-only)
```

### Solution
**Update your frontend to the latest version:**

1. Pull the latest code from the repository
2. The fix includes:
   - `business_registry` PDA derivation using seed `"business-registry"`
   - Updated `createInitializeUserInstruction` with 12 accounts
   - Preflight validation to catch mismatches before sending transactions

**For Developers:**
```bash
# Verify the fix is applied
npm run typecheck
node scripts/validate_registration.mjs

# Expected output:
# ✓ IDL has 12 accounts for initialize_user
# ✓ IDL has business_registry at index 8
# ✓ IDL specifies correct ASSOCIATED_TOKEN_PROGRAM_ID at index 9
```

### Verification
After updating, successful registration will show:
```
✅ Preflight validation passed:
  - Index 9 = ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL (associated_token_program)
  - Index 10 = TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (token_program)
```

### Related Issues
- Error Code 3008: InvalidProgramId
- Error Code 0x66: InstructionDidNotDeserialize (previous account count mismatch)
- "Simulation failed" during registration

---

## Token Program Configuration

### EQUA Uses Token-2022
**CRITICAL:** The EQUA backend program requires **Token-2022** (SPL Token Extensions), NOT Standard SPL Token.

- **Token-2022 Program ID:** `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- **Standard SPL Token Program ID:** `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

### Why Token-2022?
Token-2022 provides advanced features and security improvements over the standard SPL Token program. The EQUA smart contract specifically validates that Token-2022 is used in all token operations.

### Configuration
The frontend is configured to use Token-2022 by default in `src/lib/constants.ts`:

```typescript
// Token-2022 is the default
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;
```

**This cannot be changed.** EQUA requires Token-2022 only. Standard SPL Token is not supported.

### Verification
The application validates Token-2022 configuration at startup. Check your browser console for:
```
✅ Token program IDs validated at startup:
  - TOKEN_PROGRAM_ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  - ASSOCIATED_TOKEN_PROGRAM_ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```

If you see an error, the configuration is incorrect and the app will not work properly.

---

## Cluster and Program Alignment

### Overview
For the EQUA frontend to work correctly, several configuration elements must align:

1. **RPC Endpoint** - Must point to the cluster where the program is deployed
2. **Program ID** - Must match the deployed program address
3. **Token Program** - Must match the token program used by the on-chain mint
4. **On-chain State** - GlobalState and Mint accounts must exist on the target cluster

Misalignment causes stale balances, zero transfer counts, and subscription failures.

### Symptoms of Misalignment

- Balance shows `--` or remains at zero after minting
- Transfer count doesn't update after sending EQUA
- GlobalState shows 0 users when you know users are registered
- Console shows errors like "GlobalState account not found"
- Network diagnostics banner shows red warning

### Common Scenarios

#### Scenario 1: Wallet on Devnet, Program on Localnet
**Problem:** Your wallet is connected to Devnet but the program is deployed to Localnet.

**Solution:**
1. Update `.env.local` to point to Localnet:
   ```bash
   NEXT_PUBLIC_RPC_ENDPOINT=http://localhost:8899
   NEXT_PUBLIC_NETWORK=localnet
   ```
2. Or redeploy program to Devnet and update Program ID
3. Restart the dev server: `npm run dev`

#### Scenario 2: Wrong Program ID
**Problem:** `NEXT_PUBLIC_PROGRAM_ID` doesn't match the actual deployed program.

**Solution:**
1. Check your program deployment output for the correct Program ID
2. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_PROGRAM_ID=YourActualProgramIdHere
   ```
3. Ensure `public/idl/equa_token.json` has the same address in the `address` field
4. Restart the dev server: `npm run dev`

#### Scenario 3: Token Program Mismatch
**Problem:** On-chain mint uses Standard SPL Token but frontend is configured for Token-2022 (or vice versa).

**Solution:**
1. Check the mint owner on-chain (use Solana Explorer)
2. If mint owner is `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`:
   ```bash
   NEXT_PUBLIC_TOKEN_STANDARD=standard
   ```
3. If mint owner is `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`:
   ```bash
   # Leave unset or use any value except 'standard'
   NEXT_PUBLIC_TOKEN_STANDARD=token-2022
   ```
4. Restart the dev server: `npm run dev`

#### Scenario 4: Program Not Initialized on Cluster
**Problem:** Program is deployed but GlobalState/Mint accounts haven't been initialized.

**Solution:**
1. If you are the deployer, run the initialization instructions
2. If not, contact the deployer or switch to a cluster where the program is initialized
3. Check Solana Explorer to verify accounts exist at the expected PDAs

### Network Diagnostics Banner

The frontend includes an automatic network diagnostics system that appears at the top of the dashboard when issues are detected.

**Green Banner (Healthy):**
- All checks passed
- Click to expand and view current configuration
- Can be safely dismissed

**Red Banner (Issues Detected):**
- Shows detected mismatches
- Lists current configuration (cluster, RPC, program ID, token program)
- Provides actionable steps to fix each issue
- Shows which accounts are missing (GlobalState, Mint)

### Environment Variables Reference

Key environment variables for cluster alignment:

```bash
# RPC Endpoint (required)
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
# or
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com

# Network/Cluster (optional, for validation)
NEXT_PUBLIC_NETWORK=devnet
# or
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Program ID (required)
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP

# Token Program Selection (optional)
NEXT_PUBLIC_TOKEN_STANDARD=standard  # for SPL Token
# Leave unset or any other value for Token-2022
```

### Validation Checklist

When troubleshooting cluster/program issues:

- [ ] Verify RPC endpoint is accessible (test in browser or with `curl`)
- [ ] Confirm NEXT_PUBLIC_PROGRAM_ID matches deployed program
- [ ] Check IDL address matches NEXT_PUBLIC_PROGRAM_ID
- [ ] Verify token program selection matches on-chain mint owner
- [ ] Confirm GlobalState PDA exists on target cluster
- [ ] Confirm Mint PDA exists on target cluster
- [ ] Check wallet is connected to the intended cluster
- [ ] Review network diagnostics banner for specific issues

### Testing on Different Clusters

**Devnet (recommended for testing):**
```bash
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=<your_devnet_program_id>
```

**Localnet (for local development):**
```bash
NEXT_PUBLIC_RPC_ENDPOINT=http://localhost:8899
NEXT_PUBLIC_NETWORK=localnet
NEXT_PUBLIC_PROGRAM_ID=<your_localnet_program_id>
```

**Mainnet Beta (production):**
```bash
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_NETWORK=mainnet-beta
NEXT_PUBLIC_PROGRAM_ID=<your_mainnet_program_id>
```

**Always restart the development server after changing environment variables.**

---

## Mint Tokens Instruction Signature

### Overview
The `mint_tokens` instruction is used for daily EQUA minting. It requires **8 accounts** in a specific order.

### Account Order (8 accounts)
```
0. user_account         (PDA, writable)
1. user_metadata        (PDA, writable)
2. user_token_account   (ATA, writable)
3. mint                 (PDA, writable)
4. mint_authority       (PDA, read-only)
5. referrer_account     (PDA, writable if referrer present, read-only otherwise)
6. authority            (signer, read-only) ← MUST be signer
7. token_program        (Token-2022, read-only)
```

### Referrer Account Handling
- **If user has a referrer:** `referrer_account` is the referrer's UserAccount PDA (writable)
- **If user has no referrer (self-referral):** `referrer_account` is `PublicKey.default` (read-only)

The frontend automatically determines the correct referrer account by reading the `referral` field from the user's UserAccount.

### Authority as Signer
The `authority` account (index 6) **MUST** be marked as a signer. The frontend uses `wallet.sendTransaction` (not `signTransaction + sendRawTransaction`) to ensure the wallet adapter properly marks the authority as a signer.

### Preflight Validation
The `createMintTokensInstruction` function includes automatic preflight checks:
- Validates Token-2022 program ID is used
- Ensures authority is provided
- Logs referrer account handling

### Example Usage
```typescript
import { 
  createMintTokensInstruction, 
  getUserAccountPDA,
  getUserMetadataPDA 
} from '@/lib/program';

// Derive accounts
const [userAccountPDA] = getUserAccountPDA(walletPublicKey);
const [userMetadataPDA] = getUserMetadataPDA(walletPublicKey);

// Read referrer from UserAccount using constants
// USER_ACCOUNT_REFERRAL_OFFSET = 40, USER_ACCOUNT_REFERRAL_SIZE = 32
const referralPubkey = new PublicKey(
  userAccountData.slice(
    USER_ACCOUNT_REFERRAL_OFFSET, 
    USER_ACCOUNT_REFERRAL_OFFSET + USER_ACCOUNT_REFERRAL_SIZE
  )
);
const referrerAccountPDA = referralPubkey.equals(PublicKey.default) 
  ? PublicKey.default 
  : getUserAccountPDA(referralPubkey)[0];

// Build instruction
const instruction = createMintTokensInstruction(
  userAccountPDA,
  userMetadataPDA,
  userTokenAccount,
  mintPDA,
  mintAuthority,
  referrerAccountPDA,  // 8th account - NEW
  walletPublicKey,     // authority - MUST be signer
  TOKEN_PROGRAM_ID,    // Token-2022
  mintAmount
);

// Send via wallet adapter (ensures proper signing)
const signature = await wallet.sendTransaction(transaction, connection, {
  skipPreflight: false,
  maxRetries: 3
});
```

### Common Errors

#### AccountNotSigner on authority
**Symptom:** Minting fails with "AccountNotSigner" error on authority account.

**Cause:** Using `signTransaction + sendRawTransaction` instead of `wallet.sendTransaction`.

**Solution:** Always use `wallet.sendTransaction` for both registration and minting flows. This ensures the wallet adapter properly marks signers.

#### Missing referrer_account
**Symptom:** Minting fails with account count mismatch or constraint error.

**Cause:** Frontend passing only 7 accounts instead of 8.

**Solution:** Update to latest frontend version which includes `referrer_account` parameter in `createMintTokensInstruction`.

---

## Deprecated Features

### locked_until Field (REMOVED)
**DEPRECATED as of EQUA Whitepaper 2025.**

The `locked_until` field was removed from the UserAccount structure. The account size was reduced from 144 bytes to 136 bytes.

**If you see references to `locked_until` in documentation or code:**
- Ignore them - the field no longer exists
- Update code to use the correct 136-byte UserAccount structure
- Do not attempt to read `locked_until` at offset 136 (this is now out of bounds)

**Correct UserAccount Structure** (136 bytes, without locked_until):
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

## Real-Time Data Architecture

### Overview
The EQUA frontend uses real-time subscriptions to on-chain data for accurate, up-to-date statistics and balances. All UI-critical data is sourced from blockchain accounts with automatic updates via WebSocket subscriptions.

### Authoritative Data Sources

#### 1. Global State (User Count & Total Transactions)
- **Source**: `GlobalState` account PDA derived from `global-state` seed
- **Hook**: `useGlobalStateStats()` in `src/hooks/useGlobalStateStats.ts`
- **Data Structure**:
  ```
  user_count (u32):           offset 8  (4 bytes)
  total_transactions (u64):   offset 12 (8 bytes)
  current_epoch (u64):        offset 20 (8 bytes)
  ```
- **Update Mechanism**: WebSocket subscription with `confirmed` commitment
- **Usage**:
  - `PriceDisplay` component displays total users and transactions
  - Price calculations use `total_transactions` as authoritative source
  - Phase and epoch derived from transaction count

#### 2. Token Balance
- **Source**: SPL Token account (Associated Token Account)
- **Hook**: `useEquaBalance()` in `src/hooks/useEquaBalance.ts`
- **Data Structure**: SPL Token account layout, balance at offset 64 (8 bytes, u64)
- **Update Mechanism**: WebSocket subscription with `confirmed` commitment
- **Usage**:
  - `WalletDashboard` component displays live balance
  - Balance updates automatically after minting, transfers, etc.

### Removed: localStorage-Based Counting
Previous implementation used localStorage (`transferTracking.ts`) for global transaction counts. This has been **removed from UI display** because:
- Not authoritative (only tracks local user's transfers)
- No global visibility
- Can drift from on-chain reality

**Note**: `transferTracking.ts` still exists for:
- Local event dispatching (optimistic UI updates)
- Backward compatibility
- Optional client-side analytics

**For UI display, always use `useGlobalStateStats()` for transaction counts.**

### Transaction Counting: Double-Counting Prevention

#### Important: `transfer_tokens` Instruction Behavior
The EQUA program's `transfer_tokens` instruction **automatically increments** `GlobalState.total_transactions` via an internal call to `update_transaction_count()` in the backend Rust code.

**DO NOT call `recordTransaction` after user-to-user transfers.**

**Why?**
- The `transfer_tokens` instruction already updates the counter on-chain
- Calling `recordTransaction` separately would increment it a second time
- This causes every transfer to be double-counted in the global transaction count

**Correct Implementation:**
```typescript
// ✅ CORRECT: transfer_tokens already increments total_transactions
const signature = await connection.sendRawTransaction(signed.serialize());
await connection.confirmTransaction(...);

// Record transfer for local analytics (optional)
await recordTransfer(amount, signature);

// ❌ INCORRECT: Do NOT call recordTransaction after transfers
// await recordTransaction(connection, signTransaction, publicKey);
```

**When to use `recordTransaction`:**
- Never after `transfer_tokens` (it's already counted)
- Only for other transaction types that don't increment the counter automatically
- As of this writing, all transaction types that need counting already increment it automatically

**Reference:** 
- Backend code: `programs/equa_token/src/lib.rs` - `transfer_tokens` instruction calls `update_transaction_count`
- Frontend fix: Removed `recordTransaction` call from `WalletDashboard.tsx` send flow

### Troubleshooting Real-Time Data

#### Issue: Stale Balance After Transfer
**Symptoms:**
- Balance doesn't update immediately after sending tokens
- Balance shows old value even after transaction confirmation

**Solution:**
- Ensure `useEquaBalance` hook is used (not manual fetching)
- Check browser console for subscription errors
- Verify RPC endpoint supports WebSocket subscriptions
- Balance should update within 1-2 seconds (confirmed commitment)

#### Issue: User Count Not Updating After Registration
**Symptoms:**
- Registered user count doesn't increase after new registration
- PriceDisplay shows stale user count

**Solution:**
- Ensure `useGlobalStateStats` hook is active
- Check if GlobalState account is being updated on-chain
- Verify subscription is established (check console logs)
- User count updates when GlobalState account changes

#### Issue: Transaction Count Mismatch
**Symptoms:**
- Transaction count in UI doesn't match expected value
- Count seems too low or too high

**Root Cause:**
- Using localStorage-based counting (deprecated for UI)
- Not using authoritative on-chain data

**Solution:**
- Ensure `PriceDisplay` uses `totalTransactions` from `useGlobalStateStats`
- DO NOT use `getTotalTransfers()` from `transferTracking.ts` for display
- On-chain `GlobalState.total_transactions` is the single source of truth
- Price calculations automatically use authoritative count

### Migration Notes

#### For Developers
If you're maintaining or extending the codebase:

**DO:**
- Use `useGlobalStateStats()` for user counts and transaction counts
- Use `useEquaBalance()` for token balances
- Trust subscription updates for real-time data
- Add proper cleanup in `useEffect` return functions

**DON'T:**
- Use `getTotalTransfers()` from `transferTracking.ts` for UI display
- Poll RPC endpoints with `setInterval` for account data
- Cache subscription data indefinitely
- Display localStorage-based counts as authoritative

---

## Issue: Balance Not Updating (Token-2022 vs Standard SPL ATA Mismatch)

### Symptoms
- Balance shows `--` or zero even after minting tokens
- Balance updates not reflected in UI after transfers
- Console shows "Token account not found" warnings
- Balance works in one environment but not another

### Root Cause
Token-2022 and Standard SPL Token programs derive **different Associated Token Accounts (ATAs)** for the same mint and owner. If the frontend is configured to watch the wrong token program's ATA, it won't see balance updates even though tokens exist in the correct ATA.

**Example on Devnet:**
- **Token-2022 ATA** (correct): `BQ5iS1ZgytoKwp6XJvgjBrkRcrEPbupZL1TV1VYB9pGX`
- **Standard SPL ATA** (wrong): Different address entirely

### Understanding ATAs and Token Programs

#### What is an ATA?
An Associated Token Account (ATA) is deterministically derived from:
1. The mint address (token type)
2. The owner's wallet address
3. **The token program ID** (Standard SPL Token OR Token-2022)

Changing the token program ID produces a completely different ATA address.

#### EQUA Uses Token-2022
The EQUA backend program uses **Token-2022** (SPL Token Extensions) for advanced features:
- **Token-2022 Program ID**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- **Standard SPL Token Program ID**: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

The frontend MUST derive ATAs using Token-2022 to match the on-chain mint.

### Solution

#### 1. Verify Token Program Configuration
Check that your `.env.local` does NOT set `NEXT_PUBLIC_TOKEN_STANDARD=standard`:

```bash
# CORRECT (uses Token-2022, the default)
# Leave NEXT_PUBLIC_TOKEN_STANDARD unset or set to anything except 'standard'

# INCORRECT (uses Standard SPL Token - will cause balance issues)
NEXT_PUBLIC_TOKEN_STANDARD=standard
```

#### 2. Check Console Diagnostics
The `useEquaBalance` hook logs diagnostic information on first load:

```
🔍 useEquaBalance: ATA Subscription Diagnostics
  Token Program: Token-2022 (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
  Associated Token Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
  Derived ATA: BQ5iS1ZgytoKwp6XJvgjBrkRcrEPbupZL1TV1VYB9pGX
  RPC Endpoint: https://api.devnet.solana.com
  Mint PDA: [mint address]
```

**Verify:**
- Token Program shows "Token-2022" (not "Standard SPL Token")
- Derived ATA matches the expected Token-2022 ATA
- RPC Endpoint points to the correct cluster

#### 3. Verify On-Chain ATA Exists
Check if the Token-2022 ATA has been created:

```bash
# On Devnet
solana account BQ5iS1ZgytoKwp6XJvgjBrkRcrEPbupZL1TV1VYB9pGX --url devnet

# Or use Solana Explorer
https://explorer.solana.com/address/BQ5iS1ZgytoKwp6XJvgjBrkRcrEPbupZL1TV1VYB9pGX?cluster=devnet
```

If the ATA doesn't exist, it will be created during registration or first mint.

#### 4. Clear Cache and Restart
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Restart dev server
npm run dev
```

### Verification Steps

1. **Check Configured Token Program:**
   ```typescript
   // In browser console
   import('@/lib/constants').then(m => {
     console.log('Token Program:', m.TOKEN_PROGRAM_ID.toBase58());
   });
   // Should show: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
   ```

2. **Check Derived ATA:**
   ```typescript
   import { getAssociatedTokenAddressSync } from '@solana/spl-token';
   import { PublicKey } from '@solana/web3.js';
   
   const mint = new PublicKey('[MINT_ADDRESS]');
   const owner = new PublicKey('[YOUR_WALLET_ADDRESS]');
   const token2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
   const ataProgram = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
   
   const ata = getAssociatedTokenAddressSync(mint, owner, false, token2022, ataProgram);
   console.log('Expected Token-2022 ATA:', ata.toBase58());
   ```

3. **Verify Balance Hook is Active:**
   Look for subscription setup logs in console:
   ```
   ℹ️ Token account not found - user may not be registered yet: [ATA]
   ```
   Or:
   ```
   🔍 useEquaBalance: ATA Subscription Diagnostics
   ```

### Common Mistakes

#### Mistake 1: Setting NEXT_PUBLIC_TOKEN_STANDARD=standard
**Problem:** Frontend watches Standard SPL ATA, but tokens are in Token-2022 ATA.

**Fix:** Remove or unset `NEXT_PUBLIC_TOKEN_STANDARD` from `.env.local`.

#### Mistake 2: Using Wrong Token Program in Code
**Problem:** Importing `TOKEN_PROGRAM_ID` directly from `@solana/spl-token` instead of configured constant.

**Fix:** Always import from `@/lib/program` or `@/lib/constants`:
```typescript
// CORRECT
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/program';

// WRONG - bypasses configuration
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
```

#### Mistake 3: Cluster Mismatch
**Problem:** Frontend pointing to localnet but mint exists on devnet.

**Fix:** Verify RPC endpoint in `.env.local`:
```bash
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

### Testing Token Program Configuration

Create a test script to verify configuration:

```typescript
// scripts/verify-token-config.mjs
import { TOKEN_PROGRAM_ID } from './src/lib/constants.ts';

const expectedToken2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

if (TOKEN_PROGRAM_ID.toBase58() === expectedToken2022) {
  console.log('✅ Token program correctly configured for Token-2022');
} else {
  console.error('❌ Token program NOT configured for Token-2022');
  console.error('Expected:', expectedToken2022);
  console.error('Got:', TOKEN_PROGRAM_ID.toBase58());
  process.exit(1);
}
```

### Related Documentation
- See "Token Program Configuration" section above for general Token-2022 setup
- See "Cluster and Program Alignment" section for RPC/network configuration
- See TOKEN_DECIMAL_FIX_SUMMARY.md for decimal handling with Token-2022

---
