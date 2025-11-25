# Referral Codes Documentation

## Overview

The EQUA Frontend implements an off-chain referral code system that allows existing users to generate shareable codes for referring new users. This document describes the code format, expiration rules, single-use semantics, and planned roadmap.

## Code Format

Referral codes are:
- **10 alphanumeric characters** (A-Z, a-z, 0-9)
- **Randomly generated** using cryptographically secure random number generation
- **Case-sensitive** for maximum entropy

Example: `ABC123xyz9`

### Code Pattern

```regex
^[A-Za-z0-9]{10}$
```

## Expiration Rules

- **Time-to-live (TTL)**: 15 minutes (900 seconds)
- **Creation-based expiry**: Codes expire based on when they were created, not when they were last accessed
- **Countdown display**: The UI shows a mm:ss countdown when a valid code is entered

### Lifecycle

1. **Created**: Code is generated with `created_at` and `expires_at` timestamps
2. **Valid**: Code can be used if current time < `expires_at` and `used` is false
3. **Expired**: Code cannot be used if current time > `expires_at`
4. **Used**: Code cannot be used again after successful registration

## Single-Use Semantics

Each referral code can only be used **once**:

1. When a new user registers with a valid referral code
2. The code is marked as `used: true` in the registry
3. Subsequent attempts to use the same code will fail with a "Code already used" error

## Input Validation

The referral input field accepts two types of input:

### 1. Referral Code
A 10-character alphanumeric code that resolves to a referrer's public key through the registry.

### 2. Direct Public Key
A valid Solana public key (base58 encoded, 32-44 characters) can be entered directly, bypassing the code lookup.

### Validation States

| State | Description |
|-------|-------------|
| `IDLE` | No input entered |
| `LOADING` | Validating input |
| `VALID` | Code is valid and unexpired |
| `USED` | Code has already been used |
| `EXPIRED` | Code has expired (>15 minutes old) |
| `NOT_FOUND` | Code not found in registry |
| `PUBLIC_KEY` | Valid public key entered directly |
| `MALFORMED` | Invalid format (neither code nor public key) |

## JSON Schema

### Referral Code Entry

```json
{
  "referrer_pubkey": "string (base58 Solana public key)",
  "created_at": "integer (Unix timestamp in seconds)",
  "expires_at": "integer (Unix timestamp in seconds)",
  "used": "boolean"
}
```

### Referral Registry

The registry is an object mapping codes to entries:

```json
{
  "ABC123xyz9": {
    "referrer_pubkey": "...",
    "created_at": 1234567890,
    "expires_at": 1234568790,
    "used": false
  }
}
```

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `CODE_LENGTH` | 10 | Number of characters in a referral code |
| `CODE_TTL_SECONDS` | 900 | Time-to-live in seconds (15 minutes) |
| `DEBOUNCE_DELAY_MS` | 300 | Debounce delay for input validation |

## Current Implementation

The current implementation uses a mock registry stored in-memory for development. The registry is fetched via `fetchReferralRegistry()` which can be easily replaced with an actual HTTP fetch to an external JSON file.

## Future Roadmap

### Phase 1: External JSON Storage (Current)
- JSON file hosted on GitHub or static hosting
- Manual updates for code generation
- Suitable for small-scale testing

### Phase 2: Cloud KV Store
Options:
- **Cloudflare Workers KV**: Low latency, simple API, built-in TTL support
- **Vercel KV**: Seamless integration with Next.js, Redis-compatible
- **Upstash Redis**: Serverless Redis with TTL support, pay-per-request

Benefits:
- Automatic TTL expiration
- Real-time updates
- Better scalability

### Phase 3: Serverless Database
Options:
- **Supabase**: PostgreSQL with row-level security, real-time subscriptions
- **Firebase/Firestore**: Real-time sync, security rules

Benefits:
- Audit logs
- Row-level security policies
- Query capabilities

### Phase 4: Decentralized Storage
Options:
- **IPFS + Signed Manifest**: Codes published as signed JSON, client verifies signature
- **Arweave**: Permanent storage for historical records

Considerations:
- Adds complexity for single-use semantics (needs secondary revocation channel)
- Better censorship resistance
- Immutable audit trail

### Phase 5: On-Chain Registry
Options:
- **Solana PDA Registry**: Code metadata stored in Program Derived Accounts
- **Smart Contract**: Usage counter, trustless verification

Benefits:
- Fully trustless
- Immutable usage tracking
- Integrated with EQUA token program

Considerations:
- Higher development effort
- Compute costs for on-chain operations
- More complex key management

### Alternative: Hybrid Approach
- Off-chain authoritative store for code management
- Periodic on-chain snapshots of aggregate referral stats
- Best of both worlds: efficiency + transparency

### Alternative: Encrypted Public Registry
- Codes stored encrypted (AES) in public storage
- Encryption key distributed after user contact/verification
- Mitigates scraping attacks
- Likely overkill for initial deployment

## Security Considerations

1. **Code Entropy**: 10 alphanumeric characters provide ~59 bits of entropy
2. **Short TTL**: 15-minute expiration limits brute-force window
3. **Single-use**: Prevents replay attacks
4. **Rate limiting**: Should be implemented at API level (future)
5. **Signature verification**: Consider signing registry for integrity (future)

## Testing

### Unit Tests
Located in `__tests__/referral/`:
- `resolveReferralInput.test.ts`: Tests for resolution logic
- `useReferralResolution.test.ts`: Tests for the React hook

### E2E Tests
Located in `e2e/`:
- `referral-code.spec.ts`: End-to-end tests for the referral flow

### Test Cases Matrix

| Input | Registry Entry | used | expired | Expected State |
|-------|----------------|------|---------|----------------|
| validCode | present | false | false | VALID |
| validCodeUsed | present | true | false | USED |
| validCodeExpired | present | false | true | EXPIRED |
| unknownCode | absent | - | - | NOT_FOUND |
| publicKey | - | - | - | PUBLIC_KEY |
| malformedInput | - | - | - | MALFORMED |
