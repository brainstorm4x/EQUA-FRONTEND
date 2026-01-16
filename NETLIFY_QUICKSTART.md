# Netlify Functions Migration - Quick Start Guide

## What Was Implemented

This PR migrates the EQX Oracle and FX Rate update jobs from GitHub Actions to Netlify Scheduled Functions, providing:

✅ **4 Netlify Functions:**
- `update-eqx-price` (scheduled, runs hourly)
- `update-fx-rates` (scheduled, runs hourly)
- `get-eqx-history` (on-demand API)
- `get-fx-rates` (on-demand API)

✅ **5 Shared Utility Modules:**
- `lib/eqxOracle.ts` - EQX Oracle integration
- `lib/equa_token.ts` - Anchor program types
- `lib/equa_token.json` - Anchor program IDL
- `lib/pythPrices.ts` - Pyth Hermes API client
- `lib/blobStorage.ts` - Netlify Blobs helpers

✅ **Configuration:**
- `netlify.toml` - Build and function configuration
- `tsconfig.functions.json` - TypeScript config for functions

✅ **Documentation:**
- `docs/NETLIFY_DEPLOYMENT.md` - Full deployment guide
- `docs/API.md` - API documentation for frontend

## Quick Deployment (5 Minutes)

### Step 1: Connect to Netlify
1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub and select `brainstorm4x/EQUA-FRONTEND`
4. Branch: `main` (after merge)

### Step 2: Set Environment Variables

In **Netlify Dashboard → Site Settings → Environment Variables**, add:

```bash
# Required (see docs/NETLIFY_DEPLOYMENT.md for wallet generation)
SOLANA_WALLET_PRIVATE_KEY=<your-base58-encoded-private-key>
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw

# Optional (has default)
EXCHANGERATE_API_KEY=ad6a5bbc282e885ec566493e
```

### Step 3: Deploy
Click "Deploy site" and wait 2-5 minutes.

### Step 4: Verify
1. Go to **Functions** tab
2. Confirm 4 functions are deployed
3. Check function logs after first hourly run

## Testing Locally (Optional)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and link
netlify login
netlify link

# Manually invoke functions
netlify functions:invoke update-eqx-price
netlify functions:invoke update-fx-rates
netlify functions:invoke get-eqx-history
netlify functions:invoke get-fx-rates
```

## API Endpoints (After Deployment)

```
# Get EQX price history
GET https://[your-site].netlify.app/.netlify/functions/get-eqx-history
    ?from=2026-01-01&to=2026-01-08&interval=daily

# Get latest FX rates
GET https://[your-site].netlify.app/.netlify/functions/get-fx-rates
```

## Monitoring

- **Function Logs:** Netlify Dashboard → Functions → [function name]
- **Blob Storage:** Netlify Dashboard → Blobs
- **Build Logs:** Netlify Dashboard → Deploys → [deploy]

## Cost

All within Netlify free tier:
- Functions: 125,000 invocations/month (using ~1,500/month)
- Blobs: 10 GB storage (using ~1-2 MB/month)

## Troubleshooting

**Function not running?**
→ Check environment variables are set
→ Check function logs for errors

**Pyth API failing?**
→ Functions automatically fall back to hardcoded prices

**Need help?**
→ See `docs/NETLIFY_DEPLOYMENT.md` for full troubleshooting guide

## Files Changed

```
netlify.toml                              # NEW - Netlify config
package.json                              # UPDATED - New dependencies
tsconfig.json                             # UPDATED - Exclude netlify/
tsconfig.functions.json                   # NEW - Functions TypeScript config
.gitignore                                # UPDATED - Netlify artifacts
netlify/functions/
  ├── update-eqx-price.ts                 # NEW - Scheduled function
  ├── update-fx-rates.ts                  # NEW - Scheduled function
  ├── get-eqx-history.ts                  # NEW - API function
  ├── get-fx-rates.ts                     # NEW - API function
  └── lib/
      ├── eqxOracle.ts                    # COPIED from src/utils/
      ├── equa_token.ts                   # COPIED from src/lib/
      ├── equa_token.json                 # COPIED from public/idl/
      ├── pythPrices.ts                   # NEW - Pyth API client
      └── blobStorage.ts                  # NEW - Blob helpers
docs/
  ├── NETLIFY_DEPLOYMENT.md               # NEW - Deployment guide
  └── API.md                              # NEW - API documentation
__tests__/pricing/fxRateClient.test.ts    # FIXED - Syntax error
```

## Next Steps After Deployment

1. ✅ Verify functions run successfully (check logs)
2. ✅ Confirm blob storage contains data after first run
3. ✅ Test API endpoints with curl/Postman
4. 🔜 Integrate API endpoints in frontend for charts
5. 🔜 Add EQX price chart component
6. 🔜 Add currency conversion display

---

For detailed information, see:
- **Deployment Guide:** `docs/NETLIFY_DEPLOYMENT.md`
- **API Documentation:** `docs/API.md`
