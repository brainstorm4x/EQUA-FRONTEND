# Netlify Scheduled Functions Deployment Guide

This document provides instructions for deploying and configuring the EQX Oracle and FX Rate update jobs on Netlify.

## Overview

The EQUA Frontend uses Netlify Scheduled Functions to maintain real-time pricing data:

- **`update-eqx-price`** - Updates the on-chain EQX Oracle and stores historical prices (runs hourly)
- **`update-fx-rates`** - Fetches and stores foreign exchange rates (runs hourly)
- **`get-eqx-history`** - API endpoint for querying historical EQX prices
- **`get-fx-rates`** - API endpoint for querying latest FX rates

## Architecture

### Scheduled Functions (Backend)

1. **`netlify/functions/update-eqx-price.ts`**
   - Schedule: `0 * * * *` (hourly at minute 0)
   - Fetches component prices from Pyth Hermes API
   - Calculates weighted EQX basket price
   - Updates on-chain EQX Oracle PDA (if instruction available)
   - Stores price snapshot in Netlify Blobs

2. **`netlify/functions/update-fx-rates.ts`**
   - Schedule: `0 * * * *` (hourly at minute 0)
   - Fetches daily FX rates from ExchangeRate-API
   - Stores rates in Netlify Blobs

### On-Demand API Functions

3. **`netlify/functions/get-eqx-history.ts`**
   - Query historical EQX prices for charts/analysis
   - Query params: `?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=hourly|daily`

4. **`netlify/functions/get-fx-rates.ts`**
   - Get latest FX rates for frontend consumption
   - Cached for 1 hour

## Deployment Steps

### 1. Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `brainstorm4x/EQUA-FRONTEND`
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

```bash
# Solana Configuration
SOLANA_WALLET_PRIVATE_KEY=<Base58 encoded private key>
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw
```

#### Optional Variables (Have Defaults)

```bash
# API Keys
EXCHANGERATE_API_KEY=ad6a5bbc282e885ec566493e  # Free tier available
```

### 4. Generate Solana Wallet Private Key (Base58)

If you need to convert a Solana CLI wallet (`id.json`) to Base58:

```bash
# Using Python and base58
cat ~/.config/solana/id.json | jq -r '.' | python3 -c "import sys, json, base58; print(base58.b58encode(bytes(json.load(sys.stdin))).decode())"
```

Or generate a new wallet:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Generate new wallet (Node.js)
node -e "const { Keypair } = require('@solana/web3.js'); const bs58 = require('bs58'); const wallet = Keypair.generate(); console.log('Public Key:', wallet.publicKey.toString()); console.log('Private Key (Base58):', bs58.encode(wallet.secretKey));"
```

**⚠️ Security Warning:** Never commit private keys to version control!

### 5. Deploy

1. Click "Deploy site"
2. Wait for build to complete (~2-5 minutes)
3. Verify deployment in **Functions** tab

### 6. Verify Function Deployment

Check the **Functions** tab in Netlify Dashboard:

- ✅ `update-eqx-price` (scheduled)
- ✅ `update-fx-rates` (scheduled)
- ✅ `get-eqx-history` (on-demand)
- ✅ `get-fx-rates` (on-demand)

### 7. Monitor Function Logs

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
netlify functions:invoke update-eqx-price
netlify functions:invoke update-fx-rates

# Test API functions
netlify functions:invoke get-eqx-history --queryStringParameters "from=2026-01-01&to=2026-01-08"
netlify functions:invoke get-fx-rates
```

### Test API Endpoints

After deployment, test the API endpoints:

```bash
# Get EQX history (last 7 days)
curl "https://[your-site].netlify.app/.netlify/functions/get-eqx-history"

# Get EQX history (specific date range)
curl "https://[your-site].netlify.app/.netlify/functions/get-eqx-history?from=2026-01-01&to=2026-01-08&interval=daily"

# Get latest FX rates
curl "https://[your-site].netlify.app/.netlify/functions/get-fx-rates"
```

## Netlify Blobs Storage

The functions use Netlify Blobs for persistent storage:

### Store: `eqx-prices`

- **Key format:** `YYYY-MM-DD-HH` (hourly snapshots)
- **Value:** JSON object with EQX price data

### Store: `fx-rates`

- **Key:** `latest` (single key, overwritten hourly)
- **Value:** JSON object with FX rate data

### View Blob Data

In **Netlify Dashboard → Blobs**:

- Browse stored data
- View storage usage
- Delete old data if needed

## Troubleshooting

### Function Fails to Deploy

**Error:** `Module not found`

**Solution:** Ensure all dependencies are in `package.json`:

```bash
npm install --legacy-peer-deps @netlify/functions @netlify/blobs bs58
```

### Scheduled Function Not Running

**Check:**

1. Verify `netlify.toml` has correct schedule syntax
2. Check function logs for errors
3. Ensure environment variables are set

### On-Chain Oracle Update Fails

**Error:** `update_eqx_oracle instruction not found`

**Solution:** This is expected if the Solana program doesn't have the `update_eqx_oracle` instruction. The function will continue and store data to blobs only.

### Pyth Hermes API Fails

**Fallback:** The function automatically falls back to hardcoded prices if Pyth API is unavailable.

## API Response Formats

### GET /get-eqx-history

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

### Example: Display EQX Chart

```typescript
// Fetch historical data
const response = await fetch('/.netlify/functions/get-eqx-history?from=2026-01-01&to=2026-01-08');
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

- **Scheduled functions:** 2 × 24 × 30 = 1,440 invocations/month
- **API functions:** Depends on frontend traffic
- **Blob storage:** ~1-2 MB/month (hourly snapshots)

**Conclusion:** Well within free tier limits.

## Migration from GitHub Actions

This deployment replaces the GitHub Actions workflows:

- ~~`.github/workflows/update-eqx-price.yml`~~ → `netlify/functions/update-eqx-price.ts`
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
3. Open an issue on GitHub: `brainstorm4x/EQUA-FRONTEND`

---

**Last Updated:** 2026-01-08
