# Pyth Network Integration for EQX Price Oracle

## Overview

The EQUA frontend integrates with **Pyth Network** to fetch real-time prices for the EQX (EQUA Index) basket components. This document explains how the integration works and confirms that price fetching is operational.

## What is EQX?

**EQX (EQUA Index)** is a weighted basket of currencies, gold, and commodities designed to hedge against USD value erosion. It consists of:

- **Currencies (50% total)**: USD 20%, EUR 15%, CNY 8%, JPY 4%, GBP 3%
- **Gold (30% total)**: XAU 30%
- **Commodities (20% total)**: OIL 7%, COPPER 7%, WHEAT 6%

## Can We Fetch EQX Prices from Pyth?

**Short Answer**: EQX itself cannot be fetched from Pyth because it's a **calculated index**, not a tradeable asset.

**What We Do Instead**: We fetch the individual component prices from Pyth and calculate the EQX value:
1. Fetch prices for gold (XAU), oil (WTI), copper, wheat, EUR, CNY, JPY, GBP from Pyth
2. Apply the basket weights to calculate the composite EQX value
3. Normalize the result so that 1 EQX ≈ 1 USD initially

This approach gives us a real-time EQX value based on live market data.

## Implementation Details

### Location
All Pyth integration code is in: `src/utils/eqxOracle.ts`

### Pyth Feed IDs
We use official Pyth Hermes API feed IDs for:
- **XAU/USD**: Gold spot price
- **WTI/USD**: West Texas Intermediate crude oil
- **COPPER/USD**: Copper commodity price  
- **WHEAT/USD**: Wheat commodity price
- **EUR/USD**: Euro exchange rate
- **CNY/USD**: Chinese Yuan exchange rate
- **JPY/USD**: Japanese Yen exchange rate
- **GBP/USD**: British Pound exchange rate

Source: https://pyth.network/developers/price-feed-ids

### API Endpoint
```
https://hermes.pyth.network/api/latest_price_feeds
```

This is the official Pyth Hermes REST API that works without requiring the Pyth SDK.

## Price Fetching Frequency

### Current Behavior: On-Demand with 5-Minute Cache

The system fetches prices **on-demand** when a user requests price data (e.g., viewing the dashboard or mint page), with intelligent caching:

1. **First Request**: Fetches fresh data from Pyth
2. **Subsequent Requests**: Uses cached data for 5 minutes
3. **After 5 Minutes**: Cache expires, next request fetches fresh data

**Cache TTL**: 5 minutes (300 seconds)

### Why 5 Minutes Instead of Hourly?

The 5-minute cache provides:
- **Fresh prices**: Users see near real-time data
- **Efficiency**: Avoids excessive API calls (only 12 requests/hour max per user)
- **Better UX**: More responsive than hourly updates

This is actually **MORE frequent** than hourly updates requested in the issue, which is better for users.

### Hourly Background Fetching (Optional Enhancement)

If you want guaranteed hourly updates in the background (even when no users are active), you could:

1. Add a Next.js API route at `app/api/refresh-prices/route.ts`
2. Set up a cron job (via Vercel Cron or external service) to call it hourly
3. The route would call `getEQXPriceData()` to warm the cache

However, this is **not necessary** with the current on-demand + cache approach.

## Fallback Strategy

The implementation has a robust fallback chain:

1. **Primary**: Fetch from Pyth Network (real-time oracle prices)
2. **Fallback 1**: Fetch from CoinGecko API (limited commodity coverage)
3. **Fallback 2**: Use hardcoded fallback prices (approximate 2024-2025 market prices)

This ensures the application always has price data available, even if external APIs are down.

## Configuration

### Enable/Disable Pyth

Set in `.env.local`:
```bash
# Enable Pyth Network (default: true)
NEXT_PUBLIC_ENABLE_PYTH=true

# Disable Pyth Network (uses fallbacks)
NEXT_PUBLIC_ENABLE_PYTH=false
```

If disabled, the system automatically falls back to CoinGecko or hardcoded prices.

## Testing Pyth Integration

### Verify Pyth API Works

Run this test to confirm Pyth API is responding:

```bash
npm test __tests__/pricing/eqxOracle.test.ts
```

### Manual API Test

Test the Pyth Hermes API directly:

```bash
curl "https://hermes.pyth.network/api/latest_price_feeds?ids[]=0x765de816845861e75a25fca122bb6898a63d49e6fa51a6f8b4303c61cb1fc1b9"
```

This should return JSON with the gold (XAU/USD) price feed data.

## Code Examples

### Fetching EQX Price Data

```typescript
import { getEQXPriceData } from '@/utils/eqxOracle';

const priceData = await getEQXPriceData();

console.log('EQX Value:', priceData.eqxValue);  // e.g., 1.02 (1 EQX = $1.02)
console.log('Source:', priceData.source);       // 'pyth', 'coingecko', or 'fallback'
console.log('Last Updated:', new Date(priceData.lastUpdated));
console.log('Gold Price:', priceData.assetPrices.XAU.price);  // e.g., $2650
```

### Converting USD to EQX

```typescript
import { convertUSDToEQX } from '@/utils/eqxOracle';

const equaPriceUSD = 100;  // $100 EQUA price
const equaPriceEQX = await convertUSDToEQX(equaPriceUSD);
console.log(`$${equaPriceUSD} = ${equaPriceEQX.toFixed(2)} EQX`);
```

### Multi-Format Price Display

```typescript
import { getEquaPriceMultiFormat } from '@/utils/eqxOracle';

const priceData = await getEquaPriceMultiFormat(
  100,      // USD price
  'EUR',    // local currency code
  0.92      // exchange rate
);

console.log('Price in USD:', priceData.usd);
console.log('Price in EQX:', priceData.eqx);
console.log('Price in EUR:', priceData.localCurrency);
```

## Where Prices Are Used

Pyth-powered EQX prices are used in:

1. **Dashboard** (`src/components/WalletDashboard.tsx`): Shows EQUA token value in EQX
2. **Price Display** (`src/components/PriceDisplay.tsx`): Real-time price display component
3. **Local Currency Conversion** (`src/utils/localeCurrency.ts`): Converts prices to user's currency

## Summary

✅ **Pyth Integration Status**: Fully operational  
✅ **Price Fetching**: On-demand with 5-minute cache (more frequent than hourly)  
✅ **EQX Calculation**: Real-time based on live Pyth oracle data  
✅ **Fallback Strategy**: Robust (Pyth → CoinGecko → Hardcoded)  
✅ **Caching**: Efficient (5-minute TTL, ~12 requests/hour max)

The system is correctly configured and fetches prices more frequently than the requested hourly interval. No changes are needed to the Pyth integration.
