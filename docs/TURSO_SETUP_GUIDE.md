# Turso Database Setup Guide

This guide provides step-by-step instructions for setting up the Turso database for the EQUA Frontend.

## Prerequisites

- Node.js installed
- Terminal/Command Line access
- Git (for cloning the repository)

## Quick Start (Local Development)

### Step 1: Install Turso CLI

**On macOS/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

**On macOS (via Homebrew):**
```bash
brew install tursodatabase/tap/turso
```

After installation, restart your terminal or run:
```bash
source ~/.bashrc  # or ~/.zshrc on macOS
```

Verify installation:
```bash
turso --version
```

### Step 2: Start Local Turso Server

Open a **new terminal window** and run:
```bash
turso dev --port 8080
```

**Keep this terminal running** - it's your local database server.

You should see output like:
```
Listening on http://127.0.0.1:8080
```

### Step 3: Configure Environment Variables

In your project root, create or edit `.env.local`:

```bash
# Copy the example file
cp .env.example .env.local
```

Add/update these lines in `.env.local`:
```bash
TURSO_DATABASE_URL=http://127.0.0.1:8080
# TURSO_AUTH_TOKEN is not needed for local development
```

### Step 4: Apply Database Schema

In your **main terminal** (not the one running turso dev), run:
```bash
npm run db:sync:turso
```

You should see:
```
✅ Schema applied successfully!
```

### Step 5: Start the Application

```bash
npm run dev
```

Visit http://localhost:3000 to see your application!

## Referral System - On-Chain Tracking

### Important: Referrals are Stored On-Chain

When a user registers, their UserAccount on the Solana blockchain contains the referrer's public key:

```
UserAccount structure (on-chain):
- authority (Pubkey)          ← User's wallet
- referral (Pubkey)            ← Referrer's wallet (stored on-chain!)
- token_account (Pubkey)
- minted_amount (u64)
```

**Key Points:**

✅ **Referrer is stored on-chain** - Every user's referrer is permanently recorded in their UserAccount
✅ **No database needed** - Referral relationships are queryable from the blockchain
✅ **Immutable and verifiable** - Cannot be changed after registration
✅ **Rewards can be calculated** - Query the blockchain to find all users referred by an address

### How to Query Referrals

To find all users referred by an address:

```typescript
// Example: Get referrer from a user account
const userAccount = await connection.getAccountInfo(userAccountPubkey);

// Parse the referral field (at offset 40, after discriminator and authority)
// 8 bytes discriminator + 32 bytes authority = 40 bytes offset
const referralBytes = userAccount.data.slice(40, 72);
const referralPubkey = new PublicKey(referralBytes);

// Check if user was referred
if (!referralPubkey.equals(PublicKey.default)) {
  console.log('User was referred by:', referralPubkey.toBase58());
  // Calculate and distribute referral rewards
}
```

### Database Only Stores Anonymous Counts

The database `referral_analytics` table only stores:
- Anonymous referral counts (no wallet addresses)
- Timestamps for analytics
- Metadata for statistics

All actual referral tracking (who referred whom) is done on-chain.

## Troubleshooting

### Error: "TURSO_DATABASE_URL is not set"

**Solution:** Set the environment variable:
```bash
export TURSO_DATABASE_URL=http://127.0.0.1:8080
```

Or add it to `.env.local`:
```bash
echo "TURSO_DATABASE_URL=http://127.0.0.1:8080" >> .env.local
```

### Error: "Turso CLI is not installed"

**Solution:** Install the Turso CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Then restart your terminal.

### Error: "Connection refused"

**Solution:** Make sure the Turso dev server is running:
```bash
# In a separate terminal
turso dev --port 8080
```

## Production Setup (Turso Cloud)

For production deployments:

```bash
# 1. Authenticate
turso auth login

# 2. Create database
turso db create equa-db

# 3. Get URL and token
turso db show equa-db --url
turso db tokens create equa-db

# 4. Set environment variables
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-token-here

# 5. Apply schema
npm run db:sync:turso
```

## Summary

✅ **Zero PII stored** - No wallet addresses in database
✅ **On-chain verification** - Registration verified on Solana
✅ **On-chain referrals** - Referrer stored in UserAccount on blockchain
✅ **Anonymous analytics** - Database for statistics only

**The blockchain is the source of truth. The database is just for statistics.**
