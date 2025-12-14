This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## EQUA Token - Solana DApp

A decentralized application for minting and managing EQUA tokens on the Solana blockchain.

**On-Chain Architecture:**
- All user data stored **ON-CHAIN ONLY**
- NO external database - blockchain is the single source of truth
- NO PII stored anywhere - complete privacy by design

## Installation

Due to peer dependency conflicts with Solana wallet adapters, install dependencies using:

```bash
npm install --legacy-peer-deps
```

## Environment Setup

The repository is pre-configured for **development mode by default**. A `.env.local` file is included with development-optimized settings (Devnet, SQLite, debug logging).

For detailed environment configuration and production deployment, see [Development Environment Setup](./docs/DEVELOPMENT_ENVIRONMENT.md).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Features

- **Solana Integration**: Built on Solana blockchain using Token-2022 (SPL Token Extensions)
- **On-Chain Only**: All data stored on blockchain - no external database
- **Wallet Support**: Phantom, Solflare, and other popular Solana wallets
- **Token Minting**: Mint EQUA tokens with dynamic pricing
- **Time-Locked Rewards**: First 100 users get special 2-year locked rewards
- **Referral System**: Earn bonuses for referring new users
- **SOL Balance Gate**: Minimum 0.05 SOL required for registration
- **Elevated Mint Tiers**: Early users get higher mint limits

## Registration Guide

### Referral Requirements

| User Range | Referral Required? |
|------------|-------------------|
| Users 1-100 | No - Optional referral |
| Users 101+ | Yes - Must provide a valid registered user's wallet address |

When registering as user #101 or later, you must provide a referral from an existing registered user. The UI will validate that the referral address belongs to a registered user before allowing registration.

### SOL Balance Requirement

**Minimum Balance: 0.05 SOL**

Before registering, ensure your connected wallet has at least 0.05 SOL to cover:
- Transaction fees
- Account rent
- Token account creation

If your balance is below this threshold, the registration button will be disabled and an error banner will be shown with instructions.

### Network Configuration

**Token Program:** EQUA uses **Token-2022** (next generation SPL Token) for enhanced features.

**Important for Developers:**
- Always use `ASSOCIATED_TOKEN_PROGRAM_ID` for ATA creation and Associated Token Program operations
- Always pass `tokenProgram=TOKEN_PROGRAM_ID` (Token-2022) in instruction accounts
- Never swap these parameters - the order matters for Anchor program validation
- Import both constants from `src/lib/constants.ts` to ensure Token-2022 compatibility

**Program IDs:**
```
TOKEN_PROGRAM_ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb (Token-2022)
ASSOCIATED_TOKEN_PROGRAM_ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```

**InitializeUser Account Structure:**
The `InitializeUser` instruction requires exactly **12 accounts** in this order:
1. `user_account` - User's PDA account
2. `user_metadata` - User's metadata PDA
3. `authority` - User's wallet (signer)
4. `global_state` - Global state PDA
5. `referral_account` - Referrer's user account PDA (or self if no referral)
6. `referrer_metadata` - Referrer's metadata PDA (or self if no referral)
7. `user_token_account` - User's associated token account
8. `mint` - EQUA token mint PDA
9. **`business_registry`** - Business registry PDA (added in latest version)
10. `associated_token_program` - Associated Token Program
11. `token_program` - Token-2022 Program
12. `system_program` - System Program

⚠️ **Important:** The `business_registry` account at index 8 is required. Omitting it or using the old 11-account structure will cause `InvalidProgramId` errors.

### Elevated Mint Tiers

Early users benefit from elevated minting rates:

| User # | EQUA per Attempt | Elevated Attempts |
|--------|------------------|-------------------|
| 1 | 100,000 EQUA | 100 attempts |
| 2-10 | 10,000 EQUA | 100 attempts |
| 11-100 | 1,000 EQUA | 100 attempts |
| 101-1,000 | 100 EQUA | Standard rate |
| 1,001-10,000 | 10 EQUA | Standard rate |
| 10,001-100,000 | 1 EQUA | Standard rate |
| 100,001-1,000,000 | 0.1 EQUA | Standard rate |
| 1,000,001-10,000,000 | 0.01 EQUA | Standard rate |
| 10,000,001-100,000,000 | 0.001 EQUA | Standard rate |
| 100,000,001+ | 0.0005 EQUA | Standard rate |

The registration and minting UI displays:
- Your current mint tier
- Remaining elevated attempts (if applicable)
- Maximum EQUA per attempt
- Upcoming mint schedule for all tiers

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Blockchain**: Solana (Devnet), Anchor Framework
- **Styling**: Tailwind CSS
- **Wallet Integration**: Solana Wallet Adapter

## Project Structure

- `/app` - Next.js 14 App Router pages
- `/src/components` - React components
  - `RegistrationForm.tsx` - Account registration with referral support
  - `MintTierCard.tsx` - Elevated mint tier display
  - `KycKybModal.tsx` - KYC/KYB placeholder modal
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility libraries and program logic
- `/src/utils` - Helper utilities
  - `tokenFormat.ts` - EQUA token formatting utilities (6 decimals)
  - `registration.ts` - Registration utilities (SOL balance, referral, mint tiers)
- `/public` - Static assets and IDL files

## Token Formatting

EQUA token uses 6 decimals (1,000,000 base units = 1 EQUA). The `src/utils/tokenFormat.ts` utility provides functions for formatting token amounts:

- `formatEquaRaw(rawAmount, options)` - Format raw token amounts to human-readable strings
- `rawToDecimal(rawAmount)` - Convert raw amounts to decimal numbers
- `decimalToRaw(decimalAmount)` - Convert decimal amounts to raw base units
- `parseEquaFormatted(formattedAmount)` - Parse formatted strings back to raw amounts

Example:
```typescript
import { formatEquaRaw } from '@/utils/tokenFormat';

// Format with all decimals
formatEquaRaw(1_000_000_000) // "1,000.000000"

// Format with trimmed zeros
formatEquaRaw(1_000_000_000, { trimTrailingZeros: true }) // "1,000"

// Format fractional amounts
formatEquaRaw(123_456, { trimTrailingZeros: true }) // "0.123456"
```

## Network Configuration

- **Network**: Solana Devnet
- **Token Standard**: Token-2022 (SPL Token Extensions) - *See note below*
- **Program ID**: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- **InitializeUser**: 12-account instruction (includes `business_registry` PDA)

> **Important:** The program client has been consolidated (December 2025) to fix `InstructionDidNotDeserialize` errors. All code now uses a single program client with the full IDL. See [docs/PROGRAM_ID_MIGRATION.md](docs/PROGRAM_ID_MIGRATION.md) for details.

> **Critical:** The `initialize_user` instruction requires **12 accounts** including the `business_registry` PDA (seed: `"business-registry"`). Older versions sending 11 accounts will fail with InvalidProgramId errors. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for details.

> **Note:** The program ID can be overridden using the `NEXT_PUBLIC_PROGRAM_ID` or `NEXT_PUBLIC_EQUA_PROGRAM_ID` (legacy) environment variable. The runtime validates that the configured ID matches the deployed program.

> **Note:** The EQUA frontend is configured to use Token-2022 (SPL Token Extensions) to match the backend Anchor program. This aligns with the EQUA backend's Token-2022 standardization. If you need to use Standard SPL Token for testing, set `NEXT_PUBLIC_TOKEN_STANDARD=standard` in your `.env.local` file.

### Environment Variables

The frontend supports the following environment variables for configuration:

```bash
# Program ID Configuration (choose one)
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP        # Preferred
NEXT_PUBLIC_EQUA_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP  # Legacy (still supported)

# Network Configuration
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com  # Optional, defaults to devnet
NEXT_PUBLIC_NETWORK=devnet                               # Optional, defaults to devnet

# Note: Alternative naming also supported for compatibility:
# NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
# NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Token Program Configuration
NEXT_PUBLIC_TOKEN_STANDARD=token2022                     # Optional, defaults to token2022; set to 'standard' for SPL Token

# Oracle Configuration
NEXT_PUBLIC_ENABLE_PYTH=true                            # Optional, defaults to true
```

Copy `.env.example` to `.env.local` and customize as needed.

## Troubleshooting

### Common Issues and Solutions

#### Wallet Connection Failures

**Symptom:** "Connection Failed – Retry" error when attempting to connect a wallet.

**Possible Causes and Solutions:**

1. **Wallet Extension Not Installed**
   - Ensure Phantom, Solflare, or another supported wallet extension is installed in your browser
   - For mobile: Install the wallet app from the App Store or Google Play

2. **Wrong Network Selected**
   - Check that your wallet is connected to **Devnet**, not Mainnet
   - In Phantom: Settings → Developer Settings → Testnet Mode → Enable
   - In Solflare: Settings → Network → Devnet

3. **RPC Endpoint Issues**
   - The default RPC endpoint (api.devnet.solana.com) may be rate-limited or temporarily down
   - Try using a custom RPC endpoint in `.env.local`:
     ```bash
     NEXT_PUBLIC_RPC_ENDPOINT=https://your-custom-rpc.com
     # Or use: NEXT_PUBLIC_SOLANA_RPC_HOST=https://your-custom-rpc.com
     ```

4. **Browser Extension Conflicts**
   - Disable other wallet extensions to prevent conflicts
   - Try connecting in an incognito/private browsing window

5. **Check Console Logs**
   - Open browser DevTools (F12) → Console tab
   - Look for detailed error messages that start with "🔴 Wallet Connection Error"
   - Error logs include error name, message, and additional context

#### Stale Homepage Values

**Symptom:** Homepage shows old Program ID or outdated price/user count values.

**Solutions:**

1. **Hard Refresh the Page**
   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - This clears cached JavaScript and CSS

2. **Verify Environment Variables**
   - Check that `.env.local` exists and contains:
     ```bash
     NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
     ```
   - Restart the development server after changing environment variables:
     ```bash
     npm run dev
     ```

3. **Clear Browser Storage**
   - Open DevTools (F12) → Application tab → Storage
   - Clear localStorage, sessionStorage, and cache
   - Reload the page

4. **Check Program ID in Use**
   - Open DevTools Console and run:
     ```javascript
     localStorage.getItem('equa_current_program_id')
     ```
   - Should show: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`

5. **Verify RPC Connection**
   - Check that the RPC endpoint is responding:
     ```bash
     curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
     ```
   - Should return a valid JSON response with version info

#### Program ID Mismatch

**Symptom:** Transactions fail with "Invalid Program ID" or similar errors.

**Solutions:**

1. **Update Environment Variables**
   - Ensure your `.env.local` has the correct Program ID
   - The current Program ID is: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`

2. **Clear Cached Program Data**
   - Run in browser console:
     ```javascript
     localStorage.clear()
     sessionStorage.clear()
     location.reload()
     ```

3. **Verify Backend Deployment**
   - Confirm the backend smart contract is deployed with the same Program ID
   - Check on Solana Explorer: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

#### Build or Type Errors

**Symptom:** Build fails or TypeScript errors appear.

**Solutions:**

1. **Clean Install Dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. **Type Check**
   ```bash
   npm run typecheck
   ```

3. **Clear Next.js Cache**
   ```bash
   rm -rf .next
   npm run build
   ```

### Getting More Help

If you're still experiencing issues:

1. Check the [CHANGELOG.md](CHANGELOG.md) for recent changes
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for additional guidance
3. Check the browser console for detailed error messages
4. Verify your environment matches the [requirements](#installation)


## Documentation

Comprehensive documentation is available for testing and troubleshooting:

- **[COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md)** - Quick overview and testing status
- **[AUDIT_REPORT.md](AUDIT_REPORT.md)** - Complete technical audit (18,000 words)
- **[E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md)** - Step-by-step testing procedures
- **[TESTING_USER_TYPE_SELECTION.md](TESTING_USER_TYPE_SELECTION.md)** - User type selection testing guide
- **[USER_TYPE_SELECTION_SUMMARY.md](USER_TYPE_SELECTION_SUMMARY.md)** - User type selection implementation details
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### Quick Start Testing

1. **Run Infrastructure Check:**
   ```bash
   node test_e2e_devnet.mjs
   ```

2. **Perform Manual Testing:**
   - See [E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md) for detailed procedures

3. **Troubleshooting:**
   - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Data Storage Architecture

All data is stored **on-chain only** - no external database required.

### On-Chain Data Structures

**GlobalState Account:**
```
- user_count (u32)               ← Total registered users
- total_transactions (u64)       ← Total on-chain transactions
- current_epoch (u64)            ← Current epoch
- token_mint (Pubkey)            ← EQUA token mint address
```

**UserAccount:**
```
- authority (Pubkey)             ← User's wallet address
- referral (Pubkey)              ← Referrer's wallet (on-chain tracking!)
- token_account (Pubkey)         ← User's token account
- minted_amount (u64)            ← Total tokens minted
- mint_start (i64)               ← Registration timestamp
- locked_until (i64)             ← Token lock expiry
- referral_rewards (u64)         ← Referral rewards earned
- last_mint_time (i64)           ← Last mint timestamp
```

### Benefits of On-Chain Storage

- ✅ **Immutable**: Data cannot be altered or deleted
- ✅ **Verifiable**: Anyone can verify registration and referral data
- ✅ **Decentralized**: No central database or single point of failure
- ✅ **Privacy**: No PII collection or storage
- ✅ **Transparent**: All transactions visible on Solana Explorer

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
