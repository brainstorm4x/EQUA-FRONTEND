# Browser Console Warnings Guide

This document explains common browser console warnings you might see when running the EQUA frontend and how to resolve them.

## Database Provider Warnings

### Warning: "SQLite adapter requested in browser environment"

**Full Message:**
```
[EQUA DB] SQLite adapter requested in browser environment. 
Using Supabase adapter instead. SQLite is only available on the server.
```

**Cause:**
- The application is configured to use SQLite (`DB_PROVIDER=sqlite` in `.env.local`)
- SQLite uses the `better-sqlite3` package which is Node.js-only and cannot run in browsers
- The application automatically falls back to Supabase for client-side database operations

**Resolution Options:**

1. **Use Turso for both client and server** (Recommended):
   ```bash
   # In .env.local
   DB_PROVIDER=turso
   TURSO_DATABASE_URL=libsql://127.0.0.1:8080
   TURSO_AUTH_TOKEN=
   ```
   
   Then start local Turso server:
   ```bash
   turso dev --port 8080
   ```

2. **Configure Supabase** (if you want cloud database):
   ```bash
   # In .env.local
   DB_PROVIDER=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Ignore the warning** (if you're okay with server-side SQLite):
   - The warning is informational only
   - Your app will work correctly using SQLite on the server
   - Client-side operations will use localStorage as fallback

### Warning: "Turso adapter requested in browser environment"

**Full Message:**
```
[EQUA DB] Turso adapter requested in browser environment. 
Using Supabase adapter instead. Turso credentials should only be used server-side.
```

**Cause:**
- Similar to SQLite warning
- Turso adapter is configured for server-side use only for security
- The application falls back to Supabase for client-side operations

**Resolution:**
Configure Turso for client-side access (only for development):
```bash
# In .env.local
DB_PROVIDER=turso
NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://127.0.0.1:8080
NEXT_PUBLIC_TURSO_AUTH_TOKEN=
```

**Note:** The `NEXT_PUBLIC_` prefix makes the variables available in the browser.

## Wallet Adapter Warnings

### Warning: "Failed to connect wallet"

**Cause:**
- Wallet extension not installed
- Wallet not unlocked
- Network mismatch (mainnet vs devnet)

**Resolution:**
1. Install Phantom or Solflare wallet extension
2. Ensure wallet is unlocked
3. Switch wallet to Devnet:
   - Phantom: Settings → Developer Settings → Testnet Mode → Enable
   - Solflare: Settings → Network → Devnet

## RPC Connection Warnings

### Warning: "429 Too Many Requests"

**Cause:**
- Default Solana Devnet RPC has rate limits
- Too many requests in a short time

**Resolution:**
Use a custom RPC endpoint in `.env.local`:
```bash
NEXT_PUBLIC_RPC_ENDPOINT=https://your-custom-rpc.com
```

Recommended free RPC providers:
- Helius: https://www.helius.dev/
- QuickNode: https://www.quicknode.com/
- Alchemy: https://www.alchemy.com/

## Price Oracle Warnings

### Warning: "Failed to fetch EQUA price"

**Cause:**
- Pyth Network Hermes API is temporarily unavailable
- Network connectivity issues

**Resolution:**
The app uses fallback prices automatically. To disable Pyth and use only fallback:
```bash
# In .env.local
NEXT_PUBLIC_ENABLE_PYTH=false
```

## Common Next.js Warnings

### Warning: "Fast Refresh had to perform a full reload"

**Cause:**
- Hot module replacement couldn't update the component in place
- Usually happens after saving a component with breaking changes

**Resolution:**
- This is normal and expected during development
- The page automatically reloads to apply changes

### Warning: "Module not found: Can't resolve 'fs'"

**Cause:**
- Server-side module (`fs`, `path`, etc.) being imported in client-side code

**Resolution:**
- Already handled by `next.config.js` webpack fallbacks
- If you see this, the module is properly excluded from browser bundles

## Performance Warnings

### Warning: "Image with src '...' was detected as the Largest Contentful Paint"

**Cause:**
- Next.js detected an image that affects LCP performance metric

**Resolution:**
- Add `priority` prop to the Image component:
  ```tsx
  <Image src="..." alt="..." priority />
  ```

## Debugging Tips

### Enable Verbose Logging

Add to `.env.local`:
```bash
DEBUG=true
NODE_ENV=development
```

### Check Network Tab

Open DevTools → Network tab to see:
- Failed API requests
- RPC endpoint issues
- Database connection problems

### Check Console Filters

Ensure console filters are set correctly:
- Click "Default levels" dropdown
- Enable: Errors, Warnings, Info, Verbose

### Clear Cache and Reload

Sometimes old cached data causes warnings:
```bash
# Clear Next.js cache
rm -rf .next

# Clear browser cache
# Use Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Expected Warnings (Safe to Ignore)

These warnings are informational and don't affect functionality:

1. **"Using fallback adapter"** - App falls back gracefully
2. **"Wallet adapter wallet-standard is not supported"** - Some wallets aren't compatible
3. **"Connection to wallet failed"** - Retry usually works
4. **"Telemetry data collection"** - Next.js anonymous usage statistics

## Reporting Issues

If you encounter warnings not listed here:

1. Check the full error message and stack trace
2. Note your environment:
   - OS and browser version
   - Node.js version
   - Database provider (SQLite/Supabase/Turso)
3. Check if the issue persists after:
   - Clearing cache
   - Restarting dev server
   - Reinstalling dependencies
4. Open an issue on GitHub with:
   - Full error message
   - Steps to reproduce
   - Environment details
