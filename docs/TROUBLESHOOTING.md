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
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
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
The EQUA backend uses Token-2022, but if your mint was created with Standard SPL Token, there will be a mismatch.

**Solution:**
The EQUA frontend is now configured to use Token-2022 by default (matching the backend). If you need to use Standard SPL Token:
```bash
# In .env.local
NEXT_PUBLIC_TOKEN_STANDARD=standard
```

Or update `src/lib/constants.ts`:
```typescript
// Force Standard SPL Token (not recommended - backend uses Token-2022)
export const TOKEN_PROGRAM_ID = SPL_TOKEN_PROGRAM_ID;
```

#### 2. Frontend Configured for Wrong Token Program
By default, the frontend uses Token-2022 to match the EQUA backend deployment.

**Solution:**
1. Check mint owner on Solana Explorer
2. Verify it matches the configured token program:
   - Standard SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
   - Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
3. If mismatch, either:
   - Set `NEXT_PUBLIC_TOKEN_STANDARD=standard` (if mint uses Standard)
   - Recreate mint with Token-2022 (recommended for EQUA)

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
  Mint owner: [actual owner address] ([Standard SPL Token or Token-2022])
  Expected (TOKEN_PROGRAM_ID): [configured address] ([Standard SPL Token or Token-2022])
  
  Fix: Update TOKEN_PROGRAM_ID in src/lib/constants.ts to match the mint owner,
  or set NEXT_PUBLIC_TOKEN_STANDARD environment variable
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

**Do not change this unless you are testing with a different token program.** Using Standard SPL Token will cause `InvalidProgramId` errors during minting.

### Verification
The application validates Token-2022 configuration at startup. Check your browser console for:
```
✅ Token program IDs validated at startup:
  - TOKEN_PROGRAM_ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
  - ASSOCIATED_TOKEN_PROGRAM_ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```

If you see an error, the configuration is incorrect and must be fixed before using the app.

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
