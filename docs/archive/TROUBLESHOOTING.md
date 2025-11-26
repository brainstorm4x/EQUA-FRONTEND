# Troubleshooting Minting Errors

## Common Issues and Solutions

### 0. Debug logs not appearing / Inconsistent behavior

**Problem**: Code changes don't seem to take effect, debug logs don't appear in console, or the UI behaves inconsistently between deployments.

**Symptoms**:
- Console.log statements added to code don't show up
- Registration/minting behaves differently than expected
- Changes to one file don't affect the running application

**Root Cause**: This can occur if there are duplicate directories in the codebase (e.g., both `app/` and `src/app/` directories exist, but only one is being used by Next.js).

**Solution**:
1. Check which directory Next.js is actually using:
   - Look at `tsconfig.json` for any `exclude` paths
   - Run `npm run build` and check the output for `Route (app)` listings
2. Ensure only ONE app directory exists at the root level
3. Clear Next.js cache: `rm -rf .next`
4. Rebuild: `npm run build`
5. If using development mode, restart dev server: `npm run dev`

**Prevention**: See `DIRECTORY-CONSOLIDATION.md` for details on how this issue was resolved.

### 1. "EQUA token mint has not been created yet"

**Problem**: The mint account does not exist on the Solana blockchain.

**Solution**: The program administrator needs to run the mint creation script:

```bash
cd /path/to/EQUA-FRONTEND
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="~/.config/solana/id.json"
npx ts-node create_mint.ts
```

See `MINT_CREATION_INSTRUCTIONS.md` for detailed instructions.

### 2. "Global state has not been initialized"

**Problem**: The global state account does not exist on the Solana blockchain.

**Solution**: The program administrator needs to call the `initialize` instruction on the smart contract before users can register or mint.

### 3. "Your token account does not exist"

**Problem**: The Associated Token Account (ATA) was not created during registration.

**Solutions**:
- Try disconnecting and reconnecting your wallet
- Clear your browser's local storage and register again
- If the issue persists, this might indicate a bug in the smart contract's registration logic

### 4. "Tokens are currently locked"

**Problem**: Your tokens have a lock period (typically 2 years for early users).

**Solution**: Wait until the lock period expires. You can check your lock expiration date in your user account data.

### 5. "Minting only allowed once every 24 hours"

**Problem**: The smart contract enforces a 24-hour cooldown between mints.

**Solution**: Wait 24 hours since your last mint before trying again. The UI now shows a countdown timer indicating when you can mint again.

### 6. "ConstraintMut" error on referral_account during registration

**Problem**: Registration fails with a Solana error mentioning "ConstraintMut" and "referral_account".

**Symptoms**:
- Error message: "A has_one constraint was violated"
- Transaction simulation fails
- Error logs mention `referral_account`

**Root Cause**: The on-chain program requires `referral_account` to be marked as writable (mutable) in the transaction, but the frontend was passing `PublicKey.default` which cannot be marked writable.

**Solution**: This has been fixed in the consolidated codebase. The registration now uses the user's own account as `referral_account` for self-referral cases:
```typescript
// Correct: User's own account can be marked writable
referralAccount: userAccountKeypair.publicKey
// Data argument still indicates no referrer:
referrer: PublicKey.default
```

If you still see this error after updating:
1. Clear browser cache and local storage
2. Pull latest code from repository
3. Rebuild: `npm run build`
4. Try registration again

**Technical Details**: See `DIRECTORY-CONSOLIDATION.md` for the full technical explanation.

### 7. "Transaction simulation failed"

**Problem**: The transaction failed during Solana's pre-flight simulation. This can have multiple causes:

**Common Solutions**:
1. **Check SOL Balance**: Ensure you have at least 0.01 SOL for transaction fees
2. **Verify Accounts**: Make sure all required accounts (mint, global state, token account) exist
3. **Check Constraints**: The smart contract might have validation logic that's failing (e.g., mint limits, cooldowns, lock periods)
4. **Network Issues**: Try refreshing the page and reconnecting your wallet
5. **RPC Issues**: The devnet RPC might be slow or congested. Try again in a few minutes.

### 8. Wallet shows "This transaction reverted during simulation"

This is the wallet's way of saying the transaction failed simulation (same as issue #6 above).

**Additional Solutions**:
- Check the browser console (F12) for detailed error messages
- Look for specific error codes (e.g., 6001, 6006) which map to specific contract errors
- Verify your wallet has enough SOL for both transaction fees and any required payments

## Checking Account Status

You can verify if the required accounts exist using this script:

```bash
cd /path/to/EQUA-FRONTEND
node check_devnet_accounts.mjs
```

## Error Code Reference

Based on the smart contract IDL:

- **6000**: `UserCountOverflow` - Maximum number of users reached
- **6001**: `TokensLocked` - Your tokens are locked and cannot be transferred/minted
- **6002**: `MintOverflow` - Minted amount would overflow
- **6003**: `TransactionOverflow` - Transaction count overflow
- **6004**: `RewardOverflow` - Referral reward overflow
- **6005**: `InsufficientBalance` - Not enough tokens for transfer
- **6006**: `MintCooldown` - Must wait 24 hours between mints

### 8. Token Program Mismatch Errors

**Problem**: Errors like "incorrect program id for instruction" or ATA creation fails

**Cause**: Frontend and backend are using different token programs (Standard Token vs Token-2022)

**Solution**: 
1. Check which token program the mint account uses on Solana Explorer
2. Verify `src/lib/constants.ts` uses the matching token program:
   - For Standard Token: `import { TOKEN_PROGRAM_ID } from '@solana/spl-token'`
   - For Token-2022: `import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'`
3. Contact the program administrator if mismatch is detected

**How to Check**:
```bash
# View mint account on Solana Explorer
# Check the "Owner" field:
# - TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA = Standard Token
# - TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb = Token-2022
```

### 9. Legacy Account Issues

**Problem**: Errors about account already existing or wrong discriminator

**Cause**: Old test accounts from previous versions with different structure

**Solution**:
1. Clear browser localStorage: `localStorage.removeItem('equa_user_keypair')`
2. Generate new user account keypair
3. Try registering with fresh account
4. If issue persists, use a different wallet

## Getting Help

If none of these solutions work:

1. Check the browser console for detailed error logs
2. Copy the full error message
3. Note which step is failing (registration or minting)
4. Check the transaction signature on Solana Explorer for detailed error logs
5. Review the AUDIT_REPORT.md for comprehensive troubleshooting
6. Contact the program administrator with this information

## For Program Administrators

### Initial Setup Checklist:
1. ☐ Deploy the smart contract to devnet
2. ☐ Call `initialize` to create global state
3. ☐ Run `create_mint.ts` to create the token mint
4. ☐ **IMPORTANT**: Verify frontend token program matches deployed mint
5. ☐ Verify accounts exist using Solana Explorer
6. ☐ Fund a test wallet with devnet SOL
7. ☐ Test registration flow end-to-end
8. ☐ Test minting flow end-to-end
9. ☐ Test cooldown mechanism (24 hours)
10. ☐ Review AUDIT_REPORT.md for comprehensive guidance

### Token Program Configuration:

The frontend is currently configured for **Standard SPL Token Program**.

**To verify which token program your mint uses:**
```bash
# Check mint account owner on Solana Explorer
# Mint PDA: 3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4
# Or run: node test_e2e_devnet.mjs
```

**If you need Token-2022 instead:**
1. Update `src/lib/constants.ts`:
```typescript
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;
```
2. Rebuild: `npm run build`
3. Test thoroughly

See AUDIT_REPORT.md Section 16 for detailed instructions.
