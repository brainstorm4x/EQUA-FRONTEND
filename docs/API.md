# EQUA Frontend - API Documentation

## Overview

EQUA Frontend provides serverless API functions for real-time pricing data and historical analysis.

## API Endpoints

All API endpoints are served via Netlify Functions at:

```
https://[your-site].netlify.app/.netlify/functions/[function-name]
```

### 1. Get EQX Price History

Retrieve historical EQX (EQUA Index) prices for charts and analysis.

**Endpoint:** `GET /get-eqx-history`

**Query Parameters:**

| Parameter  | Type   | Default      | Description                                |
|-----------|--------|--------------|-------------------------------------------|
| `from`    | string | 7 days ago   | Start date (YYYY-MM-DD)                   |
| `to`      | string | now          | End date (YYYY-MM-DD)                     |
| `interval`| string | `hourly`     | Data interval (`hourly` or `daily`)       |

**Example Request:**

```bash
# Last 7 days (hourly)
GET /.netlify/functions/get-eqx-history

# Specific date range (daily)
GET /.netlify/functions/get-eqx-history?from=2026-01-01&to=2026-01-08&interval=daily
```

**Response:**

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

### 2. Get Latest FX Rates

Retrieve the latest foreign exchange rates for currency conversions.

**Endpoint:** `GET /get-fx-rates`

**Example Request:**

```bash
GET /.netlify/functions/get-fx-rates
```

**Response:**

```json
{
  "timestamp": 1736341200000,
  "date": "2026-01-08",
  "rates": {
    "USD": 1.0,
    "EUR": 0.91,
    "GBP": 0.79,
    "JPY": 149.5,
    "CNY": 7.24,
    "INR": 83.25,
    "AUD": 1.52,
    "CAD": 1.35
  },
  "source": "exchangerate-api",
  "currencyCount": 162
}
```

**Cache:** Responses are cached for 1 hour.

## Data Updates

### Scheduled Functions

Both data sources are updated hourly via Netlify Scheduled Functions:

- **EQX Prices:** Updated at minute 0 of every hour
- **FX Rates:** Updated at minute 0 of every hour

### Data Sources

- **EQX Prices:** Pyth Network Hermes API (real-time oracle data)
- **FX Rates:** ExchangeRate-API (daily updates)

## Frontend Integration

### React/Next.js Example

```typescript
import { useEffect, useState } from 'react';

function EqxPriceChart() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      const response = await fetch(
        '/.netlify/functions/get-eqx-history?from=2026-01-01&to=2026-01-08&interval=daily'
      );
      const data = await response.json();
      setHistory(data);
    }
    fetchHistory();
  }, []);

  if (!history) return <div>Loading...</div>;

  return (
    <div>
      <h2>EQX Price History</h2>
      <ul>
        {history.data.map((point, i) => (
          <li key={i}>
            {new Date(point.timestamp).toLocaleDateString()}: ${point.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Fetch FX Rates

```typescript
async function convertToLocalCurrency(usdAmount: number, currencyCode: string) {
  const response = await fetch('/.netlify/functions/get-fx-rates');
  const data = await response.json();
  
  const rate = data.rates[currencyCode];
  if (!rate) {
    throw new Error(`Currency ${currencyCode} not found`);
  }
  
  return usdAmount * rate;
}

// Example usage
const eurAmount = await convertToLocalCurrency(100, 'EUR');
console.log(`100 USD = ${eurAmount.toFixed(2)} EUR`);
```

## Error Handling

All endpoints return standard HTTP status codes:

- **200 OK** - Success
- **404 Not Found** - No data available
- **500 Internal Server Error** - Server error

**Error Response Format:**

```json
{
  "error": "Error message",
  "message": "Additional details (optional)"
}
```

## CORS

All API endpoints support CORS with the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
```

## Rate Limits

Free tier limits (Netlify):

- **Functions:** 125,000 invocations/month
- **Bandwidth:** Unlimited for API responses

## Documentation

- **Deployment Guide:** [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)
- **Transaction Counting:** [TRANSACTION_COUNTING.md](./TRANSACTION_COUNTING.md)

## Support

For issues or questions, open an issue on [GitHub](https://github.com/brainstorm4x/EQUA-FRONTEND).

---

**Last Updated:** 2026-01-08
