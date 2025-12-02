This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## EQUA Token - Solana DApp

A decentralized application for minting and managing EQUA tokens on the Solana blockchain.

## Installation

Due to peer dependency conflicts with Solana wallet adapters, install dependencies using:

```bash
npm install --legacy-peer-deps
```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Features

- **Solana Integration**: Built on Solana blockchain using Token-2022 standard
- **Wallet Support**: Phantom, Solflare, and other popular Solana wallets
- **Token Minting**: Mint EQUA tokens with dynamic pricing
- **Time-Locked Rewards**: First 100 users get special 2-year locked rewards
- **Referral System**: Earn bonuses for referring new users
- **Account Type Selection**: Register as Individual or Business account
- **SOL Balance Gate**: Minimum 0.05 SOL required for registration
- **Elevated Mint Tiers**: Early users get higher mint limits

## Registration Guide

### Account Types

Users can register as either:
- **Individual** - Personal user accounts
- **Business** - Business/organization accounts

> **Note:** KYC (Know Your Customer) for individuals and KYB (Know Your Business) for organizations will be required in a future update but is **not enforced** at this time. Users can register and mint immediately.

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

### Elevated Mint Tiers

Early users benefit from elevated minting rates:

| User # | EQUA per Attempt | Elevated Attempts |
|--------|------------------|-------------------|
| 1 | 100,000 EQUA | 100 attempts |
| 2-10 | 10,000 EQUA | 100 attempts |
| 11-100 | 1,000 EQUA | 100 attempts |
| 101+ | 100 EQUA | Standard rate |

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
  - `RegistrationForm.tsx` - Account registration with type selection and referral
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
- **Token Standard**: SPL Token (Standard) - *See note below*
- **Program ID**: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`

> **Note:** The program ID can be overridden using the `NEXT_PUBLIC_EQUA_PROGRAM_ID` environment variable.
> **Note:** The codebase is currently configured for Standard SPL Token Program. If your deployed mint uses Token-2022, see [AUDIT_REPORT.md](AUDIT_REPORT.md#16-how-to-switch-to-token-2022-if-needed) for configuration instructions.

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

## Database Setup

The EQUA frontend supports two database providers:
- **SQLite** (default for development) - Local file-based database
- **Supabase** (for production) - Cloud-hosted PostgreSQL

### Local Development with SQLite

By default, the app uses SQLite for local development. This allows you to develop offline without needing Supabase credentials.

1. **Initialize the database:**
   ```bash
   npm run db:setup
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

The SQLite database is stored at `.data/equa.sqlite` and is automatically gitignored.

### Switching to Supabase

To use Supabase instead of SQLite:

1. **Set environment variables in `.env.local`:**
   ```bash
   DB_PROVIDER=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Restart the development server**

### Database Schema

See [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) for the complete database schema documentation.

### Running Tests

```bash
# Run all tests (uses SQLite by default)
npm test

# Run database-specific tests
npm run test:db

# Run tests with coverage
npm run test:coverage
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
