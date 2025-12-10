# Environment Variables Documentation

This document provides a comprehensive overview of all environment variables used in the EQUA Frontend application.

## Required Environment Variables

### Solana Program Configuration

#### `NEXT_PUBLIC_PROGRAM_ID`
- **Type**: String (Base58-encoded Solana Public Key)
- **Required**: No (has default)
- **Default**: `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- **Description**: The Solana program ID for the EQUA token program. Override this when testing with a different program deployment or during migrations.
- **Example**: `NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
- **Used In**: `src/lib/constants.ts`, `src/config/program.ts`

#### `NEXT_PUBLIC_EQUA_PROGRAM_ID` (Legacy)
- **Type**: String (Base58-encoded Solana Public Key)
- **Required**: No (deprecated)
- **Default**: Falls back to `NEXT_PUBLIC_PROGRAM_ID`
- **Description**: Legacy variable name for backward compatibility. Use `NEXT_PUBLIC_PROGRAM_ID` instead.
- **Status**: ⚠️ Deprecated - maintained for backward compatibility only

## Network Configuration

#### `NEXT_PUBLIC_RPC_ENDPOINT`
- **Type**: String (URL)
- **Required**: No (has default)
- **Default**: `https://api.devnet.solana.com`
- **Description**: Solana RPC endpoint URL. Override this to use a custom RPC provider (e.g., Helius, QuickNode) to avoid rate limiting on the public endpoint.
- **Example**: 
  ```bash
  # Public devnet (default)
  NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
  
  # Custom RPC provider
  NEXT_PUBLIC_RPC_ENDPOINT=https://your-custom-rpc.solana.com
  ```
- **Used In**: `src/lib/constants.ts`, `src/components/providers/WalletProvider.tsx`
- **Notes**: 
  - The public devnet RPC may be rate-limited or experience downtime
  - For production, always use a dedicated RPC provider
  - The wallet connection will use this endpoint for all blockchain interactions

#### `NEXT_PUBLIC_NETWORK`
- **Type**: String (enum)
- **Required**: No (has default)
- **Default**: `devnet`
- **Allowed Values**: `devnet`, `testnet`, `mainnet-beta`
- **Description**: Specifies which Solana network to connect to.
- **Example**: `NEXT_PUBLIC_NETWORK=devnet`
- **Used In**: `src/lib/constants.ts`

## Optional Configuration Variables

### Oracle / Price Feed Configuration

#### `NEXT_PUBLIC_ENABLE_PYTH`
- **Type**: Boolean
- **Required**: No (has default)
- **Default**: `true`
- **Description**: Enable or disable Pyth Network Hermes price feeds. When disabled, the application will skip Hermes API calls and use fallback prices.
- **Example**: `NEXT_PUBLIC_ENABLE_PYTH=true`
- **Use Cases**:
  - Set to `false` during development to skip external API calls
  - Set to `false` if Pyth is experiencing issues
  - Set to `true` for production to get real-time price data

### Rate Limiting Configuration

#### `NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS`
- **Type**: Number (milliseconds)
- **Required**: No (has default)
- **Default**: `86400000` (24 hours)
- **Description**: Rate limit window duration in milliseconds for referral operations.
- **Example**: `NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=86400000`

#### `NEXT_PUBLIC_REFERRAL_RATE_LIMIT`
- **Type**: Number
- **Required**: No (has default)
- **Default**: `10`
- **Description**: Maximum number of referrals allowed per rate limit window.
- **Example**: `NEXT_PUBLIC_REFERRAL_RATE_LIMIT=10`

### Database Configuration (Not Currently Used)

> **Note**: The application previously used database providers but has migrated to a fully on-chain architecture. These variables are maintained for backward compatibility but are not actively used.

#### `NEXT_PUBLIC_DB_ADAPTER`
- **Type**: String (enum)
- **Status**: ⚠️ Not actively used
- **Allowed Values**: `sqlite`, `supabase`, `turso`
- **Description**: Client-side database adapter selection (legacy).

#### `DB_PROVIDER`
- **Type**: String (enum)
- **Status**: ⚠️ Not actively used
- **Allowed Values**: `sqlite`, `supabase`, `turso`
- **Description**: Server-side database provider (legacy).

## Development Configuration

#### `NODE_ENV`
- **Type**: String (enum)
- **Required**: No (automatically set by Next.js)
- **Default**: `development` (dev), `production` (build)
- **Allowed Values**: `development`, `production`, `test`
- **Description**: Node.js environment mode. Automatically set by Next.js based on the command used.
- **Notes**: 
  - Set by `npm run dev` → `development`
  - Set by `npm run build` → `production`
  - Set by `npm test` → `test`

#### `DEBUG`
- **Type**: Boolean
- **Required**: No
- **Default**: `false`
- **Description**: Enable verbose logging in development environments.
- **Example**: `DEBUG=true`
- **Used In**: Various components for conditional debug output

## Environment File Precedence

Next.js loads environment variables in the following order (later files override earlier ones):

1. `.env` - Base configuration (committed to repo)
2. `.env.local` - Local overrides (gitignored, never committed)
3. `.env.development` / `.env.production` - Environment-specific
4. `.env.development.local` / `.env.production.local` - Local environment-specific

**Best Practices**:
- Use `.env.example` as a template
- Copy to `.env.local` for local development
- Never commit `.env.local` or any file with sensitive credentials
- Document all new environment variables in this file

## Quick Start Examples

### Local Development Setup
```bash
# Copy example file
cp .env.local.example .env.local

# Edit with your values
nano .env.local

# Minimal required configuration (uses defaults)
NEXT_PUBLIC_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

### Production Deployment
```bash
# Required for production
NEXT_PUBLIC_PROGRAM_ID=<your-production-program-id>
NEXT_PUBLIC_RPC_ENDPOINT=<your-custom-rpc-endpoint>
NEXT_PUBLIC_NETWORK=mainnet-beta
NEXT_PUBLIC_ENABLE_PYTH=true

# Optional but recommended
NODE_ENV=production
DEBUG=false
```

### Custom RPC Provider Setup
```bash
# Using Helius
NEXT_PUBLIC_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=<your-key>

# Using QuickNode
NEXT_PUBLIC_RPC_ENDPOINT=https://your-endpoint.solana-devnet.quiknode.pro/<your-token>/

# Using Alchemy
NEXT_PUBLIC_RPC_ENDPOINT=https://solana-devnet.g.alchemy.com/v2/<your-key>
```

## Troubleshooting

### RPC Connection Issues
If you experience RPC connection errors:
1. Verify `NEXT_PUBLIC_RPC_ENDPOINT` is correctly set
2. Check if the RPC endpoint is accessible (try in browser)
3. Ensure you're not hitting rate limits on public RPCs
4. Consider using a custom RPC provider

### Program ID Mismatch
If transactions fail with "Program ID mismatch":
1. Verify `NEXT_PUBLIC_PROGRAM_ID` matches your deployed program
2. Clear browser cache and restart dev server
3. Check that the program exists on the configured network

### Environment Variables Not Loading
If variables aren't being picked up:
1. Restart the development server (`npm run dev`)
2. Verify the variable name starts with `NEXT_PUBLIC_` (for client-side access)
3. Check file naming (`.env.local`, not `.env.local.txt`)
4. Ensure no syntax errors in the env file (no quotes around values unless they contain spaces)

## Adding New Environment Variables

When adding a new environment variable:

1. **Update all template files**:
   - `.env.example`
   - `.env.local.example`

2. **Document it here** with:
   - Type and format
   - Whether it's required
   - Default value
   - Description and use case
   - Example usage
   - Which files use it

3. **Add TypeScript types** if needed (in `src/types/env.d.ts`)

4. **Update tests** to handle the new variable

5. **Add validation** if the variable is critical

## Security Notes

- **Never commit sensitive values** to version control
- Use `.env.local` for secrets and local overrides
- All `NEXT_PUBLIC_*` variables are exposed to the browser
- For server-only secrets, omit the `NEXT_PUBLIC_` prefix
- Rotate API keys and tokens regularly
- Use different values for development and production

## References

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Solana RPC Methods](https://docs.solana.com/api/http)
- [Anchor Framework](https://www.anchor-lang.com/)
