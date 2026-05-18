# UNIYAA Business Registry API Documentation

## Overview

The UNIYAA Business Registry API provides serverless Netlify functions for managing business referrers in the on-chain BusinessRegistry account. These endpoints are admin-only backend infrastructure and do not modify the frontend UI.

## Table of Contents

- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Add Business Referrer](#add-business-referrer)
  - [Remove Business Referrer](#remove-business-referrer)
  - [List Business Users](#list-business-users)
- [Error Codes](#error-codes)
- [Security Notes](#security-notes)
- [Testing](#testing)

---

## Authentication

Admin-only endpoints (`add-business-referrer`, `remove-business-referrer`) require a valid admin private key configured in the environment. The private key must match the `authority` field in the BusinessRegistry PDA.

**No authentication required** for read-only operations (`list-business-users`).

---

## Environment Variables

### Required for Admin Operations

```bash
# Admin private key (base58 encoded) - KEEP SECURE
ADMIN_PRIVATE_KEY=<base58_admin_key>
```

**How to generate an admin keypair:**

```bash
# Using Solana CLI
solana-keygen new --outfile admin-keypair.json

# Get the base58 private key
solana-keygen pubkey admin-keypair.json  # This is the public key
cat admin-keypair.json  # This contains the byte array

# Convert to base58 (use a tool or library like bs58)
# The ADMIN_PRIVATE_KEY should be the base58 encoding of the full 64-byte secret key
```

### Required for All Operations

```bash
# Solana RPC URL (must match deployed program network)
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Program ID
NEXT_PUBLIC_PROGRAM_ID=D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw
```

### Netlify Configuration

Add these variables in the Netlify dashboard under **Site Settings > Environment Variables**:

1. `ADMIN_PRIVATE_KEY` - Your admin private key (base58 encoded)
2. `NEXT_PUBLIC_RPC_URL` - Solana RPC endpoint
3. `NEXT_PUBLIC_PROGRAM_ID` - UNIYAA program ID

---

## API Endpoints

### Add Business Referrer

**Endpoint:** `POST /.netlify/functions/add-business-referrer`

**Description:** Adds a user's public key to the BusinessRegistry, marking them as a business referrer.

**Request Body:**

```json
{
  "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "signature": "3ZxK8H9...",
  "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY",
  "businessRegistryPDA": "FxVpjJ2...",
  "message": "Business referrer added successfully"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "error": "BusinessReferrerAlreadyExists",
  "message": "User is already a business referrer"
}
```

**Example (cURL):**

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/add-business-referrer \
  -H "Content-Type: application/json" \
  -d '{"userPublicKey":"B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY"}'
```

**Example (JavaScript):**

```javascript
const response = await fetch('/.netlify/functions/add-business-referrer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userPublicKey: 'B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY'
  })
});

const data = await response.json();
console.log(data);
```

---

### Remove Business Referrer

**Endpoint:** `POST /.netlify/functions/remove-business-referrer`

**Description:** Removes a user's public key from the BusinessRegistry.

**Request Body:**

```json
{
  "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "signature": "4YzL9I8...",
  "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY",
  "businessRegistryPDA": "FxVpjJ2...",
  "message": "Business referrer removed successfully"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "error": "UnauthorizedBusinessRegistryAccess",
  "message": "Admin key does not match registry authority"
}
```

**Example (cURL):**

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/remove-business-referrer \
  -H "Content-Type: application/json" \
  -d '{"userPublicKey":"B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY"}'
```

---

### List Business Users

**Endpoint:** `GET /.netlify/functions/list-business-users`

**Description:** Retrieves all business referrers from the BusinessRegistry. No authentication required.

**Query Parameters:** None

**Response (Success - 200):**

```json
{
  "success": true,
  "authority": "Admin1PubKey...",
  "businessReferrers": [
    "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY",
    "5xKPz8Y3...",
    "9mNqR7X4..."
  ],
  "count": 3,
  "maxCapacity": 100
}
```

**Response (Error - 404):**

```json
{
  "success": false,
  "error": "BusinessRegistryNotFound",
  "message": "Business registry has not been initialized. Call initialize_business_registry first."
}
```

**Example (cURL):**

```bash
curl https://your-site.netlify.app/.netlify/functions/list-business-users
```

**Example (JavaScript):**

```javascript
const response = await fetch('/.netlify/functions/list-business-users');
const data = await response.json();
console.log(`Found ${data.count} business referrers:`, data.businessReferrers);
```

---

## Error Codes

### Backend Program Errors

| Code  | Name                                 | Description                                    |
|-------|--------------------------------------|------------------------------------------------|
| 6020  | `UnauthorizedBusinessRegistryAccess` | Admin key does not match registry authority    |
| 6021  | `BusinessReferrerAlreadyExists`      | User is already in the registry                |

### API Errors

| Error                         | Status | Description                                    |
|-------------------------------|--------|------------------------------------------------|
| `Missing userPublicKey`       | 400    | Request body missing `userPublicKey` field     |
| `Invalid userPublicKey`       | 400    | Public key format is invalid                   |
| `Method not allowed`          | 405    | HTTP method not supported                      |
| `BusinessRegistryNotFound`    | 404    | Registry PDA does not exist on-chain           |
| `InvalidAccountOwner`         | 500    | Registry account owned by wrong program        |
| `InternalServerError`         | 500    | Unexpected server error                        |

---

## Security Notes

### Admin Private Key Protection

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. **NEVER commit the admin private key to source control**
   - Add `ADMIN_PRIVATE_KEY` to `.gitignore` if stored in `.env.local`
   - Use Netlify environment variables for production

2. **Rotate the key immediately if compromised**
   - Generate a new keypair
   - Update the BusinessRegistry authority on-chain
   - Update Netlify environment variables

3. **Limit key exposure**
   - Only store in secure environment variable systems
   - Do not log or expose in API responses
   - Use separate keys for development/production

4. **Verify authority match**
   - The admin key's public key must match `BusinessRegistry.authority`
   - Initialize the registry with the correct authority during deployment

### Network Isolation

- Development: Use devnet with a dedicated admin keypair
- Production: Use mainnet-beta with a hardware wallet or secure key management system

### Rate Limiting

Consider implementing rate limiting on admin endpoints to prevent abuse:

```javascript
// Example rate limiting (not implemented by default)
const MAX_REQUESTS_PER_HOUR = 100;
```

---

## Testing

### Unit Tests

No unit tests are included in this PR as this is backend infrastructure. Integration testing should be performed on devnet.

### Integration Testing on Devnet

#### Prerequisites

1. Initialize BusinessRegistry on devnet:

```bash
# Using Anchor CLI (from backend repo)
anchor run initialize-business-registry
```

2. Configure environment variables in `.env.local`:

```bash
ADMIN_PRIVATE_KEY=<your_devnet_admin_key>
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw
```

#### Test Workflow

1. **Add a business referrer:**

```bash
curl -X POST http://localhost:8888/.netlify/functions/add-business-referrer \
  -H "Content-Type: application/json" \
  -d '{"userPublicKey":"<test_user_pubkey>"}'
```

Expected: `"success": true` with transaction signature

2. **Verify addition:**

```bash
curl http://localhost:8888/.netlify/functions/list-business-users
```

Expected: Test user appears in `businessReferrers` array

3. **Test duplicate addition:**

```bash
# Add same user again
curl -X POST http://localhost:8888/.netlify/functions/add-business-referrer \
  -H "Content-Type: application/json" \
  -d '{"userPublicKey":"<test_user_pubkey>"}'
```

Expected: `"error": "BusinessReferrerAlreadyExists"`

4. **Remove business referrer:**

```bash
curl -X POST http://localhost:8888/.netlify/functions/remove-business-referrer \
  -H "Content-Type: application/json" \
  -d '{"userPublicKey":"<test_user_pubkey>"}'
```

Expected: `"success": true` with transaction signature

5. **Verify removal:**

```bash
curl http://localhost:8888/.netlify/functions/list-business-users
```

Expected: Test user no longer in `businessReferrers` array

#### Verify On-Chain

Use Solana Explorer to verify transactions:

```
https://explorer.solana.com/tx/<signature>?cluster=devnet
```

---

## Architecture

### PDA Derivation

**BusinessRegistry PDA:**

```typescript
const [businessRegistryPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('business-registry')],
  PROGRAM_ID
);
```

**Seeds:** `["business-registry"]`

### Account Layout

**BusinessRegistry:**

```rust
pub struct BusinessRegistry {
    pub authority: Pubkey,              // 32 bytes
    pub business_referrers: Vec<Pubkey>, // 4 + (32 * count) bytes
}
```

- **Discriminator:** 8 bytes (Anchor account discriminator)
- **Authority:** 32 bytes (admin public key)
- **Vector Length:** 4 bytes (u32)
- **Business Referrers:** 32 bytes per public key (max 100)

**Total Size:** 8 + 32 + 4 + (32 × 100) = 3,244 bytes maximum

---

## Future Enhancements

Potential improvements for future PRs:

1. **Batch Operations:** Add/remove multiple users in a single transaction
2. **Pagination:** Support paginated queries for large registries
3. **Filtering:** Query by specific criteria (e.g., recently added)
4. **Webhooks:** Notify external systems when registry changes
5. **Analytics:** Track registry growth over time

---

## Support

For issues or questions:

- **Backend Issues:** Check the UNIYAA backend repository
- **Frontend Issues:** Open an issue in this repository
- **Security Concerns:** Contact the team privately (do not open public issues)

---

## License

Same as the main UNIYAA project.
