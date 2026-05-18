# Netlify Scheduled Functions Deployment Guide

This document provides instructions for deploying and configuring the UNX Oracle and FX Rate update jobs on Netlify.

## Overview

The UNIYAA Frontend uses Netlify Scheduled Functions to maintain real-time pricing data:

- **`update-unx-price`** - Updates the on-chain UNX Oracle and stores historical prices (runs hourly)
- **`update-fx-rates`** - Fetches and stores foreign exchange rates (runs hourly)
- **`snapshot-daily-performance`** - Consolidates hourly data into daily records with "$100 held" metrics (runs daily at midnight UTC)
- **`get-unx-history`** - API endpoint for querying historical UNX prices
- **`get-fx-rates`** - API endpoint for querying latest FX rates

## Architecture

### Scheduled Functions (Backend)

1. **`netlify/functions/update-unx-price.ts`**
   - Schedule: `0 * * * *` (hourly at minute 0)
   - Fetches component prices from Pyth Hermes API
   - Calculates weighted UNX basket price
   - Updates on-chain UNX Oracle PDA (if instruction available)
   - Stores price snapshot in Netlify Blobs

2. **`netlify/functions/update-fx-rates.ts`**
   - Schedule: `0 * * * *` (hourly at minute 0)
   - Fetches daily FX rates from ExchangeRate-API
   - Stores rates in Netlify Blobs

3. **`netlify/functions/snapshot-daily-performance.ts`**
   - Schedule: `0 0 * * *` (daily at 00:00 UTC)
   - Reads yesterday's hourly rows from the `unx_price_snapshots` Turso table
   - Computes OHLC values for UNIYAA price and the UNX basket close
   - Computes "$100 held" comparison metrics:
     - `uniyaaHoldingValue`: value of a $100 UNIYAA holding since the first-ever snapshot
     - `usdHoldingValue`: value of a $100 USD holding after inflation (`100 / inflationIndex`)
     - `advantagePerHundred`: `uniyaaHoldingValue − usdHoldingValue`
   - Writes a row to the `unx_daily_performance` Turso table (idempotent)
   - Runs Netlify Blobs housekeeping (deletes snapshots older than 30 days)

### On-Demand API Functions

3. **`netlify/functions/get-unx-history.ts`**
   - Query historical UNX prices for charts/analysis
   - Query params: `?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=hourly|daily`

4. **`netlify/functions/get-fx-rates.ts`**
   - Get latest FX rates for frontend consumption
   - Cached for 1 hour

## Deployment Steps

### 1. Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `brainstorm4x/UNIYAA-FRONTEND`
4. Choose the branch to deploy (e.g., `main`)

### 2. Configure Build Settings

Netlify should auto-detect the `netlify.toml` configuration:

```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
```

### 3. Set Environment Variables

In **Netlify Dashboard → Site Settings → Environment Variables**, add:

#### Required Variables

| Variable | Description | Example | How to Get |
|----------|-------------|---------|------------|
| `SOLANA_RPC_ENDPOINT` | Solana RPC endpoint | `https://api.devnet.solana.com` | Use public endpoint or get from Helius/Alchemy |
| `SOLANA_NETWORK` | Network name | `devnet` | `devnet`, `testnet`, or `mainnet-beta` |
| `NEXT_PUBLIC_PROGRAM_ID` | UNIYAA program ID | `D158AFttmz...` | From `Anchor.toml` in backend repo |
| `SOLANA_WALLET_PRIVATE_KEY` | Admin wallet private key (base58) | `5x7k9...` | See "Generate Admin Wallet" below |

#### Optional Variables

| Variable | Description | Default | When Needed |
|----------|-------------|---------|-------------|
| `EXCHANGERATE_API_KEY` | ExchangeRate API key | Free tier | For production (higher rate limits) |
| `NETLIFY_SITE_ID` | Netlify site ID | Auto-detected | Only for manual blob config |
| `NETLIFY_ACCESS_TOKEN` | Netlify access token | Auto-detected | Only for manual blob config |
| `FRED_API_KEY` | Federal Reserve FRED API key | Fallback 3.2% CPI | For real CPI data in the performance dashboard. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html |

### 4. Generate Admin Wallet Private Key (Base58)

**SECURITY WARNING**: This wallet has authority to update on-chain oracles. Never commit the private key to version control!

#### Method 1: Using Solana CLI

```bash
# Generate new keypair
solana-keygen new --no-bip39-passphrase --outfile admin-keypair.json

# Encode to base58 for Netlify (requires jq and base58)
cat admin-keypair.json | jq -r 'map(tostring) | join(",")' | base58
```

#### Method 2: Using Node.js

```bash
# Install dependencies
npm install --legacy-peer-deps

# Generate new wallet
node -e "const { Keypair } = require('@solana/web3.js'); const bs58 = require('bs58'); const wallet = Keypair.generate(); console.log('Public Key:', wallet.publicKey.toString()); console.log('Private Key (Base58):', bs58.encode(wallet.secretKey));"
```

Copy the base58 output and add it to Netlify environment variables as `SOLANA_WALLET_PRIVATE_KEY`.

### 5. Get ExchangeRate API Key (Optional)

1. Visit https://www.exchangerate-api.com/
2. Sign up for free account (1,500 requests/month)
3. Copy API key from dashboard
4. Add to Netlify as `EXCHANGERATE_API_KEY`

If not provided, functions will use the free tier endpoint with lower rate limits.

### 6. Deploy

1. Click "Deploy site"
2. Wait for build to complete (~2-5 minutes)
3. Verify deployment in **Functions** tab

### 7. Verify Function Deployment

Check the **Functions** tab in Netlify Dashboard:

- ✅ `update-unx-price` (scheduled)
- ✅ `update-fx-rates` (scheduled)
- ✅ `snapshot-daily-performance` (scheduled)
- ✅ `get-unx-history` (on-demand)
- ✅ `get-fx-rates` (on-demand)

### 8. Monitor Function Logs

In **Netlify Dashboard → Functions → [function name]**:

- View execution logs
- Check for errors
- Monitor API response times

## Testing

### Manual Function Invocation

Using Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link to site
netlify link

# Invoke scheduled functions manually
netlify functions:invoke update-unx-price
netlify functions:invoke update-fx-rates

# Test API functions
netlify functions:invoke get-unx-history --queryStringParameters "from=2026-01-01&to=2026-01-08"
netlify functions:invoke get-fx-rates
```

### Test API Endpoints

After deployment, test the API endpoints:

```bash
# Get UNX history (last 7 days)
curl "https://[your-site].netlify.app/.netlify/functions/get-unx-history"

# Get UNX history (specific date range)
curl "https://[your-site].netlify.app/.netlify/functions/get-unx-history?from=2026-01-01&to=2026-01-08&interval=daily"

# Get latest FX rates
curl "https://[your-site].netlify.app/.netlify/functions/get-fx-rates"
```

## Netlify Blobs Storage

The functions use Netlify Blobs for persistent storage:

### Store: `unx-prices`

- **Key format:** `YYYY-MM-DD-HH` (hourly snapshots)
- **Value:** JSON object with UNX price data

### Store: `fx-rates`

- **Key:** `latest` (single key, overwritten hourly)
- **Value:** JSON object with FX rate data

### View Blob Data

In **Netlify Dashboard → Blobs**:

- Browse stored data
- View storage usage
- Delete old data if needed

## Troubleshooting

### Error: `MissingBlobsEnvironmentError`

**Full Error:**
```
MissingBlobsEnvironmentError: The environment has not been configured to use Netlify Blobs.
To use it manually, supply the following properties when creating a store: siteID, token
```

**Cause**: Netlify Blobs not configured. This should auto-configure in Netlify environment.

**Solution**:
1. Verify you're deploying to Netlify (not running locally)
2. Check Netlify Dashboard → Site Settings → Environment Variables
3. If deploying outside Netlify, add `NETLIFY_SITE_ID` and `NETLIFY_ACCESS_TOKEN`
4. Redeploy the site after adding environment variables

**Get Site ID and Token**:
```bash
# Site ID: Found in Netlify Dashboard → Site Settings → General
# Access Token: Generate in Netlify Dashboard → User Settings → Applications → Personal Access Tokens
```

### Error: `Pyth Hermes API returned 404`

**Full Error:**
```
Pyth Hermes API failed, using fallback prices: Error: Hermes API returned 404
```

**Cause**: Incorrect or missing Pyth feed IDs, or network connectivity issues.

**Solution**:
1. This PR includes the correct feed IDs with proper 0x prefixes
2. Check network connectivity to `hermes.pyth.network`
3. Verify feed IDs are still valid at https://pyth.network/developers/price-feed-ids
4. Functions will automatically fall back to hardcoded prices

**Expected Behavior**: After fix, you should see "Source: hermes" in logs, not "Source: fallback"

### Error: `Wallet private key not set`

**Full Error:**
```
SOLANA_WALLET_PRIVATE_KEY environment variable not set
```

**Cause**: Missing or invalid `SOLANA_WALLET_PRIVATE_KEY`.

**Solution**:
1. Verify environment variable is set in Netlify Dashboard
2. Ensure key is base58 encoded (not JSON array)
3. Regenerate wallet if needed (see "Generate Admin Wallet" above)
4. Redeploy after setting the variable

### Error: `Failed to decode wallet private key`

**Cause**: Private key is not properly base58 encoded.

**Solution**:
1. Verify you used base58 encoding (not hex or JSON)
2. Use the commands provided in "Generate Admin Wallet" section
3. Test the key locally before adding to Netlify

### Function Fails to Deploy

**Error:** `Module not found`

**Solution:** Ensure all dependencies are in `package.json`:

```bash
npm install --legacy-peer-deps @netlify/functions @netlify/blobs bs58
```

### Scheduled Function Not Running

**Check:**

1. Verify `netlify.toml` has correct schedule syntax
2. Check function logs for errors in Netlify Dashboard
3. Ensure all required environment variables are set
4. Manually invoke function to test: `netlify functions:invoke update-unx-price`

### On-Chain Oracle Update Fails

**Error:** `update_unx_oracle instruction not found`

**Solution:** This is expected if the Solana program doesn't have the `update_unx_oracle` instruction yet. The function will continue and store data to blobs only.

### Pyth Hermes API Fails (General)

**Fallback:** The function automatically falls back to hardcoded prices if Pyth API is unavailable.

**Check Logs**: Look for "Source: hermes" (success) vs "Source: fallback" (API failed)

### ExchangeRate API Fails

**Fallback:** The function tries paid tier first (if `EXCHANGERATE_API_KEY` is set), then falls back to free tier.

**Check Rate Limits**: 
- Paid tier: Check your plan limits
- Free tier: 1,500 requests/month (≈50 requests/day)

## API Response Formats

### GET /get-unx-history

```json
{
  "data": [
    {
      "timestamp": 1736341200000,
      "price": 748.12,
      "slot": 123456789,
      "components": {
        "USDUSD": 1.0,
        "EURUSD": 1.10,
        "CNHUSD": 0.14,
        "JPYUSD": 0.0067,
        "GBPUSD": 1.27,
        "XAUUSD": 2650.00,
        "OIL": 73.50
      },
      "source": "hermes"
    }
  ],
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-01-08T00:00:00Z",
  "interval": "hourly",
  "count": 168
}
```

### GET /get-fx-rates

```json
{
  "timestamp": 1736341200000,
  "date": "2026-01-08",
  "rates": {
    "EUR": 0.91,
    "GBP": 0.79,
    "JPY": 149.5,
    "CNY": 7.24,
    "INR": 83.25
  },
  "source": "exchangerate-api",
  "currencyCount": 162
}
```

## Frontend Integration

### Example: Display UNX Chart

```typescript
// Fetch historical data
const response = await fetch('/.netlify/functions/get-unx-history?from=2026-01-01&to=2026-01-08');
const data = await response.json();

// Render chart (using Chart.js, Recharts, etc.)
const chartData = data.data.map(point => ({
  x: new Date(point.timestamp),
  y: point.price,
}));
```

### Example: Display FX Rates

```typescript
// Fetch latest rates
const response = await fetch('/.netlify/functions/get-fx-rates');
const data = await response.json();

// Display rates
console.log('EUR to USD:', data.rates.EUR);
console.log('GBP to USD:', data.rates.GBP);
```

## Cost Considerations

### Netlify Free Tier

- **Functions:** 125,000 function invocations/month
- **Blobs:** 10 GB storage, 100 GB bandwidth/month
- **Scheduled functions:** Included in function invocations

### Expected Usage

- **Scheduled functions:** (2 × 24 + 1) × 30 ≈ 1,470 invocations/month
- **API functions:** Depends on frontend traffic
- **Blob storage:** ~1-2 MB/month (hourly snapshots)

**Conclusion:** Well within free tier limits.

## Migration from GitHub Actions

This deployment replaces the GitHub Actions workflows:

- ~~`.github/workflows/update-unx-price.yml`~~ → `netlify/functions/update-unx-price.ts`
- ~~`.github/workflows/update-fx-rates.yml`~~ → `netlify/functions/update-fx-rates.ts`

**Benefits:**

- ✅ No Solana CLI caching issues
- ✅ Persistent blob storage for historical data
- ✅ Built-in API endpoints for frontend
- ✅ Better monitoring and logging
- ✅ Automatic retries on failure

## Support

For issues or questions:

1. Check Netlify function logs
2. Review this documentation
3. Open an issue on GitHub: `brainstorm4x/UNIYAA-FRONTEND`

---

**Last Updated:** 2026-01-08
