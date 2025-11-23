# Troubleshooting Minting Errors

## Common Issues and Solutions

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

**Solution**: Wait 24 hours since your last mint before trying again.

### 6. "Transaction simulation failed"

**Problem**: The transaction failed during Solana's pre-flight simulation. This can have multiple causes:

**Common Solutions**:
1. **Check SOL Balance**: Ensure you have at least 0.01 SOL for transaction fees
2. **Verify Accounts**: Make sure all required accounts (mint, global state, token account) exist
3. **Check Constraints**: The smart contract might have validation logic that's failing (e.g., mint limits, cooldowns, lock periods)
4. **Network Issues**: Try refreshing the page and reconnecting your wallet
5. **RPC Issues**: The devnet RPC might be slow or congested. Try again in a few minutes.

### 7. Wallet shows "This transaction reverted during simulation"

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

## Getting Help

If none of these solutions work:

1. Check the browser console for detailed error logs
2. Copy the full error message
3. Note which step is failing (registration or minting)
4. Contact the program administrator with this information

## For Program Administrators

Initial setup checklist:
1. ☐ Deploy the smart contract to devnet
2. ☐ Call `initialize` to create global state
3. ☐ Run `create_mint.ts` to create the token mint
4. ☐ Verify accounts exist using Solana Explorer
5. ☐ Fund a test wallet with devnet SOL
6. ☐ Test registration flow
7. ☐ Test minting flow
