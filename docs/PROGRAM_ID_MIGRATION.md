# Program ID Migration & Database Setup Guide

This guide explains how to use the new program ID migration system and Turso database setup.

## December 2025 Update: Program Client Consolidation

**Breaking Change:** The frontend has consolidated to a single Solana program client implementation to fix `InstructionDidNotDeserialize (0x66)` errors during user registration.

### What Changed

1. **Removed duplicate program clients:**
   - ❌ Deleted `lib/program.ts` (root level duplicate)
   - ❌ Deleted `lib/constants.ts` (root level duplicate)
   - ❌ Deleted `src/hooks/useEquaProgram.ts` (alternate hook with minimal IDL)
   - ❌ Deleted `src/config/program.ts` (redundant configuration)
   - ❌ Deleted `src/services/program.service.ts` (unused service)

2. **Single source of truth:**
   - ✅ All code now uses `src/lib/program.ts` for program client
   - ✅ All code now uses `src/lib/constants.ts` for configuration
   - ✅ Only `useProgram` hook is used (loads full IDL from `/idl/equa_token.json`)

3. **Runtime validation:**
   - Program client now validates that `PROGRAM_ID` from environment matches the IDL
   - Clear error messages guide developers to fix misconfigurations

### Action Required

If you have a local development environment, ensure your `.env.local` has the correct program ID:

```bash
# Current deployed program ID (Devnet)
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
```

The legacy environment variable `NEXT_PUBLIC_EQUA_PROGRAM_ID` is still supported but deprecated.

### Why This Matters

The previous setup had two program clients loading different IDL structures:
- `useProgram` loaded the full IDL from `/idl/equa_token.json`
- `useEquaProgram` used a hardcoded minimal IDL

This caused instruction data to be formatted differently, leading to deserialization failures on-chain. With a single program client, all instructions are guaranteed to match the deployed program's expectations.

## Program ID Migration

The system automatically detects when the Solana program ID changes and clears local state to ensure a fresh start.

### How It Works

1. On component mount (e.g., PriceDisplay), `resetForNewProgramId()` is called
2. The current program ID is compared with the stored value in localStorage
3. If changed, all EQUA-related localStorage data is cleared
4. The new program ID is stored for future comparisons

### Configuration

Set the program ID in `.env.local`:

```bash
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
```

Or use the legacy variable (both work):

```bash
NEXT_PUBLIC_EQUA_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
```

## Turso Database Setup

The project includes a complete Turso/libSQL database setup with migration scripts.

### Quick Start

1. **Setup local Turso database:**

   ```bash
   npm run db:setup
   ```

   This interactive script will:
   - Optionally install Turso CLI
   - Guide you through local or remote database setup
   - Provide environment variables to add to `.env.local`

2. **Configure environment:**

   For local development, add to `.env.local`:

   ```bash
   NEXT_PUBLIC_DB_ADAPTER=turso
   NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://127.0.0.1:8080
   NEXT_PUBLIC_TURSO_AUTH_TOKEN=
   ```

3. **Start local Turso server** (in a separate terminal):

   ```bash
   turso dev --port 8080
   ```

4. **Run migrations:**

   ```bash
   npm run db:migrate
   ```

5. **Reset database** (if needed):

   ```bash
   npm run db:reset
   ```

### Database Scripts

- `npm run db:setup` - Interactive setup wizard for Turso
- `npm run db:migrate` - Apply schema migrations to database
- `npm run db:reset` - Truncate tables and reseed default values
- `npm run test:turso` - Test Turso connection

### Migration Files

Located in `scripts/turso/`:

- `migrate.sql` - Schema definitions for registrations and transfer_totals tables
- `reset.sql` - SQL to truncate tables and reseed default values
- `migrate.ts` - TypeScript script to apply migrations
- `reset.ts` - TypeScript script to reset database
- `setup-turso.sh` - Interactive setup wizard

### Database Adapter Methods

All database adapters now support a `resetAll()` method:

```typescript
import { db } from '@/lib/db/client';

// Reset all database tables
await db.adapter.resetAll();
```

## Pyth Oracle Configuration

The Pyth Network price feed integration can be toggled via environment variable.

### Enable/Disable Pyth

Add to `.env.local`:

```bash
# Enable Pyth (default)
NEXT_PUBLIC_ENABLE_PYTH=true

# Disable Pyth (use fallback prices)
NEXT_PUBLIC_ENABLE_PYTH=false
```

### Updated Feed IDs

The following Pyth Hermes feed IDs have been updated to the correct values:

- **XAU/USD** (Gold): `0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9`
- **USOILSPOT** (WTI/USD): `0x925c4ef7ee2b7b4c19a23b04d80187b3e687b3e6e65a97cf93bf3cce8db3b8a2`
- **COPPER/USD**: `0x1ff1261f8c1aef0e8736e26a28e1330a645e3e21203d1e609f87df918d6af510`
- **WHEAT/USD**: `0xb1830a04e1e59bf3cbd0f93a2e6b321acd5e7d89892c0becc49b265eada2c694`
- **EUR/USD**: `0x2d0366e8361c110a1fcf6b3023a1d4e17f63b3a2e10b8ca8bb144dbe7b8a7de0`
- **CNY/USD**: `0x60964c6f8ec3a8283bbc2fa9a5a321d996bb099c7ccafca443c1a89fa919e05d`
- **JPY/USD**: `0xac5c83fbd5b1b125d7d4aa5e7ddf14e354ae3836e47ac5b2e87fea9cb7c9b7af`
- **GBP/USD**: `0xcf094b0624b532422629f3cffe918d512a529bbc1794cb15d3a0128c541f71b8`

### Fallback Behavior

When Pyth is disabled or unavailable:

1. Falls back to CoinGecko API
2. If CoinGecko fails, uses hardcoded fallback prices
3. Console warnings are logged only once to avoid spam

## Environment Variables Reference

See `.env.local.example` for a complete list of all configuration options.

### Key Variables

- `NEXT_PUBLIC_PROGRAM_ID` - Solana program ID (triggers reset when changed)
- `NEXT_PUBLIC_DB_ADAPTER` - Database adapter: `sqlite`, `turso`, or `supabase`
- `NEXT_PUBLIC_TURSO_DATABASE_URL` - Turso database URL
- `NEXT_PUBLIC_TURSO_AUTH_TOKEN` - Turso auth token (empty for local dev)
- `NEXT_PUBLIC_ENABLE_PYTH` - Enable/disable Pyth price feeds

## Testing

All changes have been tested:

- ✅ 389 tests passing
- ✅ TypeScript compilation succeeds
- ✅ Production build completes
- ✅ Program ID reset logic verified
- ✅ Pyth toggle tested
- ✅ Database resetAll() implemented in all adapters

## Troubleshooting

### Program ID not resetting

Clear localStorage manually in browser DevTools:
```javascript
localStorage.clear();
```

### Turso connection fails

1. Ensure Turso dev server is running: `turso dev --port 8080`
2. Check environment variables in `.env.local`
3. Run connection test: `npm run test:turso`

### Pyth prices not loading

1. Check `NEXT_PUBLIC_ENABLE_PYTH` is set to `true` (or not set)
2. Verify internet connectivity
3. Check browser console for Pyth errors
4. System will automatically fall back to CoinGecko or hardcoded prices
