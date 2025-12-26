# Development Environment Setup

This document explains how the EQUA Frontend is configured for development environments and how to ensure development mode is active.

## Overview

The repository is configured to run in **development mode by default** to provide:
- Better debugging capabilities
- Detailed error messages
- React DevTools integration
- Hot module replacement
- Source maps
- Development-specific warnings and checks

## Environment Configuration Files

### `.env.local` (Development Default)
The repository includes a pre-configured `.env.local` file optimized for local development:

```bash
NODE_ENV=development
DEBUG=true
DB_PROVIDER=sqlite
SQLITE_DB_PATH=.data/equa.sqlite
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

**Key Settings for Development:**
- `NODE_ENV=development` - Explicitly sets development mode
- `DEBUG=true` - Enables verbose logging
- `DB_PROVIDER=sqlite` - Uses local SQLite database (no cloud dependencies)
- `NEXT_PUBLIC_NETWORK=devnet` - Points to Solana Devnet (not mainnet)

### `.env.local.example` and `.env.example`
These template files provide:
- Guidance on available configuration options
- Examples for production deployments
- Documentation for each environment variable

## How NODE_ENV Works

### Automatic Setting by Next.js
Next.js automatically sets `NODE_ENV`:
- `npm run dev` → `NODE_ENV=development`
- `npm run build` → `NODE_ENV=production`
- `npm run start` → `NODE_ENV=production`

### Explicit Configuration
For extra clarity, the development script explicitly sets NODE_ENV:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development next dev -p 3000"
  }
}
```

This ensures development mode even if the environment variable isn't inherited from the shell.

### Browser Fallback
The `src/lib/clientProcessShim.ts` module provides a browser-side fallback:

```typescript
// Defaults to 'development' if NODE_ENV is not set
const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;

(window as any).process = {
  env: {
    NODE_ENV: nodeEnv || 'development',
  },
};
```

This ensures that:
1. Browser code can check `process.env.NODE_ENV`
2. Development mode is the default (not production)
3. Libraries expecting Node.js globals work correctly

## Verifying Development Mode

### During Development Server
When running `npm run dev`, you should see:

```bash
$ NODE_ENV=development next dev -p 3000
▲ Next.js 14.2.33
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.5s
```

### In Browser Console
Check the environment in browser DevTools:

```javascript
// Should log: "development"
console.log(process.env.NODE_ENV);
```

### In Application Code
Components can check the environment:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Running in development mode');
}
```

## Development vs Production Differences

### Development Mode
- ✅ Detailed error messages with stack traces
- ✅ React DevTools work
- ✅ Hot module replacement active
- ✅ Source maps included
- ✅ Warnings enabled (PropTypes, hooks, etc.)
- ✅ Larger bundle sizes (unminified)
- ✅ Local SQLite database
- ⚠️ Slower performance (includes dev tools)

### Production Mode
- ✅ Optimized bundle (minified, tree-shaken)
- ✅ Better runtime performance
- ✅ Smaller bundle sizes
- ❌ No source maps (by default)
- ❌ No React DevTools
- ❌ Minimal error messages
- ✅ Cloud database (Turso/Supabase)

## Production Deployment Checklist

When deploying to production, update `.env.local` (or use platform environment variables):

```bash
# Required changes for production
NODE_ENV=production
DEBUG=false

# Database (choose one)
DB_PROVIDER=turso  # or supabase
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token-here

# Network
NEXT_PUBLIC_RPC_ENDPOINT=https://your-custom-rpc.com
NEXT_PUBLIC_NETWORK=mainnet-beta  # or devnet for staging

# Program ID (if needed)
NEXT_PUBLIC_PROGRAM_ID=GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C
```

## Troubleshooting

### "Running in production mode during development"

**Symptoms:**
- React DevTools show "This page is using the production build of React"
- Console warnings are suppressed
- Hot reload not working

**Solutions:**

1. **Check `.env.local` exists:**
   ```bash
   # Should show NODE_ENV=development
   cat .env.local | grep NODE_ENV
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Check package.json script:**
   ```json
   "dev": "NODE_ENV=development next dev -p 3000"
   ```

4. **Verify environment in browser:**
   ```javascript
   console.log(process.env.NODE_ENV);  // Should be "development"
   ```

### "Environment variables not loading"

Next.js loads environment variables in this order (later overrides earlier):
1. `.env.local` (your custom config, not committed)
2. `.env.development` or `.env.production` (based on NODE_ENV)
3. `.env` (base defaults)

**Note:** Only `NEXT_PUBLIC_*` variables are exposed to the browser. Server-side variables (without the prefix) are only available in API routes and server components.

### Platform-Specific Instructions

#### Windows (PowerShell)
```powershell
$env:NODE_ENV="development"
npm run dev
```

#### Windows (CMD)
```cmd
set NODE_ENV=development
npm run dev
```

#### Linux/macOS
```bash
NODE_ENV=development npm run dev
```

Or simply:
```bash
npm run dev  # NODE_ENV is set in package.json script
```

## Testing

Run tests to verify environment configuration:

```bash
# Test the client process shim
npm test -- __tests__/lib/clientProcessShim.test.ts

# Run all tests
npm test
```

The test suite includes checks for:
- ✅ `window.process.env.NODE_ENV` is defined
- ✅ Defaults to 'development' when not set
- ✅ Respects explicit NODE_ENV setting
- ✅ Doesn't override existing process object

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [React Development vs Production](https://react.dev/learn/start-a-new-react-project#production-grade-react-frameworks)
- [EQUA Console Warnings Guide](./CONSOLE_WARNINGS_GUIDE.md)
- [EQUA Database Configuration](./DB_SCHEMA.md)

## Summary

The EQUA Frontend is **configured for development by default**:

1. ✅ `.env.local` created with `NODE_ENV=development`
2. ✅ `package.json` dev script explicitly sets `NODE_ENV=development`
3. ✅ `clientProcessShim.ts` defaults to `'development'` fallback
4. ✅ Tests verify development mode is the default
5. ✅ Documentation explains environment setup

No additional configuration is needed for development - just run `npm run dev`!
