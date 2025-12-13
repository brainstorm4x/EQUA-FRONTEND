# Sybil Prevention in EQUA Frontend

## Overview

EQUA implements multiple layers of Sybil attack prevention to discourage duplicate registrations and maintain system integrity. The blockchain serves as the primary source of truth, with client-side measures providing additional friction for attackers.

## Primary Defense: Blockchain Enforcement

### One Wallet = One Account

The most fundamental Sybil prevention is enforced at the smart contract level:

- **User Account PDA**: Each wallet can only have one UserAccount PDA derived from their wallet's public key
- **On-Chain Check**: The program checks if a UserAccount already exists before allowing registration
- **Immutable**: Once registered, a wallet cannot create another account

This is the **strongest** defense because it cannot be bypassed without creating a new wallet.

### Cost Barrier

- **SOL Requirement**: Users must have at least 0.05 SOL in their wallet
- **Transaction Fees**: Registration requires SOL for gas fees
- **Account Rent**: Token accounts require rent-exempt lamports (~0.002 SOL)

Creating multiple wallets with sufficient SOL creates a real cost barrier for attackers.

## Client-Side Prevention Layers

### 1. Device Fingerprinting

**Location**: `src/utils/deviceFingerprint.ts`

**How It Works**:
```typescript
// Generates a unique fingerprint based on:
- Browser user agent
- Screen resolution
- Timezone
- Language preferences
- Hardware concurrency
- Platform information
```

**Implementation**:
```typescript
const fingerprint = createFingerprintMetadata();
// Returns: { fingerprint: string, timestamp: number }
```

**Stored After Registration**:
- Fingerprint saved to localStorage: `equa_registered_fingerprints`
- Associated with wallet: `equa_fingerprint_{publicKey}`

**Warning System**:
- Duplicate fingerprints trigger console warnings
- UI could optionally show warnings (currently informational only)

### 2. Public Key Tracking

**Location**: `src/utils/registrationGuard.ts`

**How It Works**:
```typescript
// Prevents same wallet from registering twice client-side
isPublicKeyRegistered(publicKeyBase58: string): boolean

// Records wallet after successful registration
recordRegisteredKey(
  publicKeyBase58: string, 
  fingerprint?: string
): void
```

**Storage**:
- Public keys stored in localStorage: `equa_registered_keys`
- Checked before allowing registration UI flow
- Acts as fast client-side pre-check before blockchain query

### 3. Rate Limiting

**Location**: `src/utils/referralRateLimit.ts`

**Purpose**: Prevent abuse of referral system

**Limits**:
- Maximum 10 referrals per 24 hours per referrer
- Configurable via `NEXT_PUBLIC_REFERRAL_RATE_LIMIT`
- Rate limit window: `NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS` (default 24 hours)

**How It Works**:
```typescript
// Check if referrer has reached limit
const status = getRateLimitStatus(referrerPubkey);
if (status.isRateLimited) {
  // Reduce referral rewards or show warning
}
```

**Effects**:
- After limit: referral rewards reduced by 50%
- Prevents single referrer from benefiting from mass Sybil registrations
- Encourages organic growth over automated sign-ups

### 4. Cooldown Guards

**Location**: `src/utils/cooldown.ts`

**Purpose**: Prevent rapid-fire minting attempts

**How It Works**:
- 24-hour cooldown between mints (on-chain + client-side)
- Client-side optimistic cooldown prevents UI spamming
- In-flight lock prevents race conditions

**Implementation**:
```typescript
// Check if user can mint now
if (!CooldownGuard.canMintNow(walletAddress)) {
  const remaining = CooldownGuard.timeRemaining(walletAddress);
  // Show cooldown message
}

// Start mint operation
CooldownGuard.startMint(walletAddress);

// After successful mint
CooldownGuard.endMint(walletAddress, true, now, onchainTimestamp);
```

## Limitations & Bypass Methods

### What Client-Side Prevention Cannot Stop

1. **New Wallets**: Attacker can create unlimited new wallets
   - **Mitigation**: Each wallet needs SOL (cost barrier)
   - **Mitigation**: Referral system required after first 100 users

2. **Clearing LocalStorage**: User can clear browser data
   - **Mitigation**: Blockchain check still prevents duplicate registration
   - **Mitigation**: Only prevents UI warnings, not actual registration

3. **Different Browsers/Devices**: Fingerprints will differ
   - **Mitigation**: Blockchain remains source of truth
   - **Mitigation**: Each wallet still limited to one account

4. **VPNs/Proxies**: Can mask network identity
   - **Mitigation**: Not tracked (privacy-respecting)
   - **Mitigation**: Blockchain and wallet limits are sufficient

### What IS Prevented

1. **Same Wallet, Multiple Accounts**: ✅ Blocked by blockchain
2. **Accidental Double Registration**: ✅ Blocked by client-side checks
3. **Mass Automated Sign-ups with Same Referrer**: ✅ Limited by rate limiting
4. **Rapid Minting**: ✅ Prevented by 24-hour cooldown
5. **Same Browser, Different Wallets**: ⚠️ Warned but allowed (legitimate multi-wallet use)

## Configuration

Add to `.env.local`:

```bash
# Referral rate limiting
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=86400000  # 24 hours
NEXT_PUBLIC_REFERRAL_RATE_LIMIT=10         # Max 10 referrals per window

# Mint cooldown
NEXT_PUBLIC_MINT_COOLDOWN_SECONDS=86400    # 24 hours between mints
```

## Monitoring & Detection

### Client-Side Warnings

Check browser console for:
```
⚠️ Duplicate fingerprint detected in localStorage (informational)
🚫 Duplicate public key detected in localStorage - blocking duplicate registration
⚠️ Duplicate fingerprint detected in localStorage (informational)
```

### On-Chain Detection

Query the blockchain:
```typescript
// Check if wallet already registered
const [userAccountPDA] = getUserAccountPDA(walletPublicKey);
const accountInfo = await connection.getAccountInfo(userAccountPDA);
const isRegistered = accountInfo !== null && accountInfo.data.length >= 136;
```

### Analytics (Privacy-Respecting)

Track (without PII):
- Registration rate over time
- Referral patterns (high-frequency referrers)
- Mint frequency patterns

**Note**: No personally identifiable information is tracked or stored.

## Best Practices

### For Users

1. **One Wallet Per Person**: Use a single wallet for your EQUA account
2. **Protect Your Keys**: Don't share wallet private keys
3. **Natural Usage**: Follow 24-hour mint cooldown naturally

### For Developers

1. **Trust the Blockchain**: Always query on-chain state as source of truth
2. **Client-Side is Advisory**: Use localStorage checks for UX, not security
3. **Cost Barriers**: SOL requirements are most effective Sybil prevention
4. **Rate Limiting**: Adjust limits based on observed abuse patterns

### For Attackers (Educational)

Creating Sybil accounts requires:
1. New Solana wallet (free but requires key management)
2. Sufficient SOL balance (cost per wallet: ~0.05+ SOL)
3. Referral code (after first 100 users)
4. Time investment (24-hour mint cooldown per wallet)

**Economics**: At current SOL prices, mass Sybil attacks become expensive. The potential EQUA rewards must outweigh:
- SOL cost per wallet
- Time cost of managing multiple wallets
- Risk of detection and account value loss

## Future Enhancements

Potential additional measures (not currently implemented):

1. **CAPTCHA**: Add human verification for registration
2. **Email/Phone Verification**: Optional for increased trust
3. **Reputation System**: Track account age and activity
4. **Social Graph**: Analyze referral network patterns
5. **ML Detection**: Pattern recognition for bot behavior
6. **Progressive Trust**: Unlock features over time/usage

## Security Contact

If you discover Sybil attack vectors or vulnerabilities:

1. **DO NOT** exploit them for profit
2. Report to: [Security Contact] (see SECURITY.md)
3. Provide detailed steps to reproduce
4. Allow time for patch before disclosure

## Related Documentation

- [Security Summary](./SECURITY_SUMMARY.md)
- [Referral System](./REFERRAL_REWARDS_IMPLEMENTATION.md)
- [Rate Limiting](./STATE_MANAGEMENT.md)
- [Testing Guide](./TESTING_E2E.md)
