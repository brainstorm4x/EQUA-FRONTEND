# Creating EQUA Token Mint with SPL Token-2022

> **HISTORICAL NOTE (December 2025):** This archived document references the original program ID `BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL`. The program has been redeployed to `GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C`. Please refer to current documentation for up-to-date information.

This guide provides step-by-step instructions for creating the EQUA token mint using the SPL Token-2022 program.

## Prerequisites

1. **Anchor CLI installed** - Required for running the deployment script
2. **Solana CLI configured** - Must be connected to devnet
3. **Wallet with SOL** - Need devnet SOL for transaction fees
4. **Backend deployed** - The EQUA Rust program must be deployed on-chain

## Important: Token-2022 Program ID

The SPL Token-2022 program ID is: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

This is different from the standard SPL Token program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`).

## Steps to Create the Mint

### 1. Verify Backend Configuration

Ensure your Rust backend program is configured to use Token-2022. In your backend code, you should have:

```rust
use anchor_spl::token_2022::Token2022;

#[program]
pub mod equa_token {
    use super::*;
    
    pub fn create_token_mint(ctx: Context<CreateTokenMint>) -> Result<()> {
        // Your mint creation logic using Token2022
    }
}

#[derive(Accounts)]
pub struct CreateTokenMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = mint_authority,
        seeds = [b"equa-mint"],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    
    /// Token-2022 Program
    pub token_program: Program<'info, Token2022>,
    
    // ... other accounts
}
```

### 2. Update Anchor Configuration

Make sure your `Anchor.toml` file points to devnet:

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
equa_token = "BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL"
```

### 3. Build the Backend Program

```bash
# Navigate to your backend directory
cd ../equa_token  # or wherever your Rust program is

# Build the program
anchor build
```

### 4. Deploy the Program (if not already deployed)

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the program ID - it should be: BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
```

### 5. Run the Mint Creation Script

From the frontend repository root:

```bash
# Navigate to the frontend directory
cd /path/to/EQUA-FRONTEND

# Set up Anchor environment
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="~/.config/solana/id.json"

# Run the mint creation script
npx ts-node create_mint.ts
```

The script will:
- Derive the necessary PDAs (mint, mint authority, global state)
- Call the `createTokenMint` instruction with Token-2022 program
- Output the transaction signature and explorer link

### 6. Verify the Mint Creation

After successful execution, you should see:

```
Creating EQUA token mint with Token-2022...
Mint PDA: [your-mint-pda]
Mint Authority: [your-mint-authority-pda]
Token Program: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
✅ Token mint created!
Transaction signature: [tx-signature]
View on explorer: https://explorer.solana.com/tx/[tx-signature]?cluster=devnet
```

Visit the explorer link to verify:
- The mint account was created
- It's owned by the Token-2022 program (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
- The mint authority matches your PDA
- Decimals are set correctly (should be 6)

## Frontend Configuration

The frontend is already configured to use Token-2022:

- `lib/constants.ts` exports `TOKEN_PROGRAM_ID` as `TOKEN_2022_PROGRAM_ID`
- `app/mint/page.tsx` uses Token-2022 for all token operations
- All associated token account operations use Token-2022

## Troubleshooting

### Issue: "Program not found"
**Solution:** Ensure the backend program is deployed and the program ID matches in both frontend and backend.

### Issue: "Account already exists"
**Solution:** The mint has already been created. You can only create it once per program deployment.

### Issue: "Insufficient funds"
**Solution:** Make sure your wallet has devnet SOL. Get some from: https://faucet.solana.com

### Issue: "Incorrect program ID"
**Solution:** Verify that both the backend Rust program and frontend are using Token-2022 program ID consistently.

## Important Notes

1. **One-time operation:** The mint can only be created once per program deployment
2. **PDA-based:** The mint address is deterministic, derived from the seed "equa-mint"
3. **Token-2022 features:** Token-2022 offers additional features like transfer fees, confidential transfers, etc.
4. **Frontend compatibility:** Ensure all frontend code uses `TOKEN_2022_PROGRAM_ID` for consistency

## Migration from Standard SPL Token

If you previously created a mint with the standard SPL Token program:

1. The old mint will remain on-chain but won't work with the Token-2022 backend
2. You'll need to re-deploy your backend program to a new address (or close and recreate accounts)
3. Re-run this mint creation script with Token-2022
4. Users will need to register again with the new mint

## Support

If you encounter issues:
1. Check the Solana Explorer for transaction details
2. Verify your backend program accepts Token-2022
3. Ensure consistent program IDs across backend and frontend
4. Review the transaction logs for specific error messages
