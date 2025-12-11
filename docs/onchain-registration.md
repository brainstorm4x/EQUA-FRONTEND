# Onchain Registration Migration Guide

## Overview

This document details the migration from database-dependent registration to **onchain-only registration** where the Solana blockchain serves as the single source of truth for user registration and referral data.

## What Changed

### Before (Database-Dependent)
- User registration stored in both blockchain AND database (Supabase/Turso)
- Duplicate checks performed against database
- Referral validation checked database records
- Device fingerprinting enforced via database

### After (Onchain-Only)
- User registration exists ONLY on the blockchain
- Duplicate checks query blockchain via RPC
- Referral validation checks onchain account existence
- Device fingerprinting tracked in localStorage (informational only)
- Database usage optional (for analytics only, not enforcement)

## Architecture

### Account Structure

The EQUA program uses a **user account keypair** (not a PDA) that stores all user data onchain:

```typescript
interface UserAccount {
  authority: PublicKey;        // Wallet that controls this account
  referral: PublicKey;         // Referrer's user account (PublicKey.default if none)
  token_account: PublicKey;    // User's SPL token account
  minted_amount: u64;          // Total tokens minted
  mint_start: i64;             // Registration timestamp
  // locked_until field removed per EQUA Whitepaper 2025
  referral_rewards: u64;       // Rewards earned from referrals
  last_mint_time: i64;         // Last successful mint
}
```

> **Note**: The `locked_until` field has been removed as of December 2025 per EQUA Whitepaper 2025. Account size reduced from 144 to 136 bytes.

### Key Design Points

1. **User Account is a Keypair**: Unlike typical Solana patterns, the user account is NOT a PDA. It's a keypair generated client-side and stored in localStorage.
2. **Authority Separation**: The `authority` field links the user account to the wallet that controls it.
3. **Referral Storage**: Referrals are stored directly in the user account's `referral` field.
4. **No Off-Chain Dependencies**: All registration state lives onchain.

## Integration Points

### 1. Checking if a User is Registered

**Utility Function:**

```typescript
import { isUserAccountRegisteredOnchain } from '@/utils/onchainRegistration';

const isRegistered = await isUserAccountRegisteredOnchain(
  connection,
  userAccountKeypair.publicKey
);
```

**React Hook:**

```typescript
import { useIsUserRegistered } from '@/hooks/useUserAccount';

const { data: isRegistered, isLoading } = useIsUserRegistered(
  userAccountKeypair.publicKey
);
```

### 2. Validating a Referrer Exists

**Utility Function:**

```typescript
import { validateReferrerOnchain } from '@/utils/onchainRegistration';

const isValid = await validateReferrerOnchain(
  connection,
  referrerPubkey
);
```

**React Hook:**

```typescript
import { useValidateReferrer } from '@/hooks/useUserAccount';

const { data: isValidReferrer, isLoading } = useValidateReferrer(
  referrerPubkey
);
```

### 3. Reading User Account Data

**Utility Function:**

```typescript
import { getUserAccountData, getReferralInfo } from '@/utils/onchainRegistration';

const userData = await getUserAccountData(
  connection,
  userAccountPubkey
);

if (userData) {
  const referralInfo = getReferralInfo(userData);
  console.log('Has referrer:', referralInfo.hasReferrer);
  console.log('Referral address:', referralInfo.referralAddress);
  console.log('Referral rewards:', referralInfo.referralRewards);
}
```

**React Hook:**

```typescript
import { useUserAccount } from '@/hooks/useUserAccount';

const { data: userAccount, isLoading, error, refetch } = useUserAccount(
  userAccountKeypair.publicKey
);

if (userAccount) {
  console.log('Minted amount:', userAccount.mintedAmount.toString());
  console.log('Referral rewards:', userAccount.referralRewards.toString());
}
```

### 4. Registration Flow

**Updated Flow:**

```typescript
// 1. Check if account already exists onchain (NO database check)
const isRegisteredOnchain = await isUserAccountRegisteredOnchain(
  connection,
  userAccountKeypair.publicKey
);

if (isRegisteredOnchain) {
  throw new Error('Account already registered onchain');
}

// 2. Validate referrer onchain (if provided)
if (referrerPubkey) {
  const isValidReferrer = await validateReferrerOnchain(
    connection,
    referrerPubkey
  );
  
  if (!isValidReferrer) {
    throw new Error('Invalid referrer: not registered onchain');
  }
}

// 3. Create registration transaction
const instruction = createInitializeUserInstruction(
  userAccountKeypair.publicKey,
  walletPublicKey,
  globalStatePDA,
  referralAccountPubkey,
  userTokenAccount,
  mintPDA,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  now,
  lockUntil,
  referrerPubkey || PublicKey.default
);

// 4. Send transaction (wallet pays fees)
const transaction = new Transaction().add(instruction);
transaction.feePayer = walletPublicKey;

const signed = await wallet.signTransaction(transaction);
signed.partialSign(userAccountKeypair);

const signature = await connection.sendRawTransaction(signed.serialize());
await connection.confirmTransaction(signature);

// 5. Registration complete - data now stored onchain
```

### 5. Displaying Referral Information

**Example Component:**

```typescript
import { useUserAccount } from '@/hooks/useUserAccount';
import { getReferralInfo } from '@/utils/onchainRegistration';
import { rawToDecimal } from '@/utils/tokenFormat';

function ReferralDisplay({ userAccountPubkey }) {
  const { data: userAccount, isLoading } = useUserAccount(userAccountPubkey);
  
  if (isLoading) return <div>Loading...</div>;
  if (!userAccount) return <div>No account found</div>;
  
  const referralInfo = getReferralInfo(userAccount);
  const rewardsEQUA = rawToDecimal(referralInfo.referralRewards);
  
  return (
    <div>
      {referralInfo.hasReferrer && (
        <p>Referred by: {referralInfo.referralAddress}</p>
      )}
      <p>Referral Rewards: {rewardsEQUA} EQUA</p>
    </div>
  );
}
```

## PDA Derivation Patterns

### Global State PDA

```typescript
import { getGlobalStatePDA } from '@/lib/program';

const [globalStatePDA, bump] = getGlobalStatePDA();
```

Seeds: `['global-state']`

### Mint PDA

```typescript
import { getMintPDA } from '@/lib/program';

const [mintPDA, bump] = getMintPDA();
```

Seeds: `['equa-mint']`

### Mint Authority PDA

```typescript
import { getMintAuthorityPDA } from '@/lib/program';

const [mintAuthorityPDA, bump] = getMintAuthorityPDA();
```

Seeds: `['mint-authority']`

### User Account (NOT a PDA)

The user account is **not** a PDA. It's a keypair:

```typescript
import { getOrCreateKeypair } from '@/lib/program';

const userAccountKeypair = getOrCreateKeypair();
// Stored in localStorage: 'equa_user_keypair'
```

## Transaction Fees

All transactions are paid by the user's wallet:

- **Registration**: ~0.05 SOL minimum required
  - Account creation rent
  - Token account creation (if needed)
  - Transaction fees
  
- **Validation**: Performed via `getAccountInfo` (free RPC calls)

## Error Handling

### Duplicate Registration

```typescript
// Check will fail if account already exists
const isRegisteredOnchain = await isUserAccountRegisteredOnchain(
  connection,
  userAccountKeypair.publicKey
);

if (isRegisteredOnchain) {
  throw new Error('Registration blocked: Account already exists onchain');
}
```

### Invalid Referrer

```typescript
const isValidReferrer = await validateReferrerOnchain(
  connection,
  referrerPubkey
);

if (!isValidReferrer) {
  throw new Error('Invalid referrer: Account not found onchain');
}
```

### Insufficient Balance

```typescript
import { hasMinimumSolBalance, MIN_SOL_BALANCE } from '@/utils/registration';

if (!hasMinimumSolBalance(walletBalance)) {
  throw new Error(`Insufficient balance. Need at least ${MIN_SOL_BALANCE} SOL`);
}
```

## Database Usage (Optional)

While registration no longer requires a database, you may still use one for:

- **Analytics**: Track registration patterns, referral chains
- **Caching**: Speed up queries for frequently accessed data
- **Historical Data**: Store transaction history for reporting

**Important**: The blockchain is always the source of truth. Database is for optimization only.

## Testing

### Unit Tests

```typescript
import { isUserAccountRegisteredOnchain, validateReferrerOnchain } from '@/utils/onchainRegistration';

describe('Onchain Registration', () => {
  it('should detect registered accounts', async () => {
    const isRegistered = await isUserAccountRegisteredOnchain(
      connection,
      registeredUserPubkey
    );
    expect(isRegistered).toBe(true);
  });
  
  it('should reject unregistered accounts', async () => {
    const isRegistered = await isUserAccountRegisteredOnchain(
      connection,
      unregisteredUserPubkey
    );
    expect(isRegistered).toBe(false);
  });
});
```

### Integration Tests

Test the full registration flow against devnet:

```typescript
it('should register user onchain', async () => {
  // 1. Generate new keypair
  const userKeypair = Keypair.generate();
  
  // 2. Verify not registered
  const isRegisteredBefore = await isUserAccountRegisteredOnchain(
    connection,
    userKeypair.publicKey
  );
  expect(isRegisteredBefore).toBe(false);
  
  // 3. Register
  await registerUser({...});
  
  // 4. Verify registered
  const isRegisteredAfter = await isUserAccountRegisteredOnchain(
    connection,
    userKeypair.publicKey
  );
  expect(isRegisteredAfter).toBe(true);
  
  // 5. Verify account data
  const userData = await getUserAccountData(connection, userKeypair.publicKey);
  expect(userData).not.toBeNull();
  expect(userData.authority.toBase58()).toBe(walletPubkey.toBase58());
});
```

## Migration Checklist

- [x] Created `src/utils/onchainRegistration.ts` utility functions
- [x] Created `src/hooks/useUserAccount.ts` React hooks
- [x] Updated `RegistrationForm.tsx` to use onchain validation
- [x] Updated `app/mint/page.tsx` to remove database dependencies
- [x] Removed database checks for duplicate registration
- [x] Updated referrer validation to check onchain
- [x] Added UI states for onchain validation errors
- [ ] Updated tests to use onchain mocks
- [ ] Removed database assertions from tests
- [x] Created this documentation

## Common Pitfalls

1. **User Account is NOT a PDA**: Don't try to derive it with `findProgramAddressSync`
2. **Partial Signing Required**: The user account keypair must sign the registration transaction
3. **Referral Field**: Can be `PublicKey.default` if no referrer (don't pass `null`)
4. **Account Data Length**: UserAccount should be at least 144 bytes
5. **RPC Rate Limits**: Cache results to avoid excessive `getAccountInfo` calls

## Support

For questions or issues with onchain registration:
- Check the IDL: `/public/idl/equa_token.json`
- Review program code: Backend EQUA Anchor program repository
- Test against devnet before mainnet deployment

## Additional Resources

- [Solana Cookbook - Account Data](https://solanacookbook.com/core-concepts/accounts.html)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [SPL Token Program](https://spl.solana.com/token)
