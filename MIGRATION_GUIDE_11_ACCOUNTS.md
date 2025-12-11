# Migration Guide: 9-Account to 11-Account initialize_user

## Overview

The `initialize_user` instruction has been updated to match the on-chain Anchor program IDL. This is a **breaking change** that requires all clients (web, mobile, CLI tools) to update their instruction builders.

## What Changed

### Account Structure

**Before (9 accounts):**
```typescript
createInitializeUserInstruction(
  userAccount,                 // 0
  authority,                   // 1
  globalState,                 // 2
  referralAccount,             // 3
  userTokenAccount,            // 4
  mint,                        // 5
  associatedTokenProgram,      // 6
  tokenProgram,                // 7
  systemProgram,               // 8
  mintStart,                   // arg
  referrer                     // arg
)
```

**After (11 accounts):**
```typescript
createInitializeUserInstruction(
  userAccount,                 // 0
  userMetadata,                // 1 ← NEW
  authority,                   // 2
  globalState,                 // 3
  referralAccount,             // 4
  referrerMetadata,            // 5 ← NEW
  userTokenAccount,            // 6
  mint,                        // 7
  associatedTokenProgram,      // 8
  tokenProgram,                // 9
  systemProgram,               // 10
  mintStart,                   // arg
  referrer,                    // arg
  userType                     // arg ← NEW
)
```

### Data Layout

**Before:**
```
8 bytes:  discriminator [111, 17, 185, 250, 60, 122, 38, 254]
32 bytes: referrer (Pubkey)
8 bytes:  mint_start (i64)
---
Total: 48 bytes
```

**After:**
```
8 bytes:  discriminator [111, 17, 185, 250, 60, 122, 38, 254]
32 bytes: referrer (Pubkey)
8 bytes:  mint_start (i64)
1 byte:   user_type (u8) ← NEW
---
Total: 49 bytes
```

## Migration Steps

### 1. Update PDA Derivation

Add functions to derive the new PDAs:

```typescript
// User metadata PDA (seeds: ["user-meta", authority])
export function getUserMetadataPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user-meta"), authority.toBuffer()],
    PROGRAM_ID
  );
}
```

### 2. Update Instruction Builder

Modify your `createInitializeUserInstruction` function:

```typescript
export function createInitializeUserInstruction(
  userAccount: PublicKey,
  userMetadata: PublicKey,        // NEW: Add this parameter
  authority: PublicKey,
  globalState: PublicKey,
  referralAccount: PublicKey,
  referrerMetadata: PublicKey,    // NEW: Add this parameter
  userTokenAccount: PublicKey,
  mint: PublicKey,
  associatedTokenProgram: PublicKey,
  tokenProgram: PublicKey,
  mintStart: number,
  referrer: PublicKey = PublicKey.default,
  userType: number = 0            // NEW: Add this parameter (0=individual, 1=business)
): TransactionInstruction {
  const discriminator = Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]);
  const mintStartBN = new BN(mintStart);
  const userTypeByte = Buffer.from([userType & 0xFF]);  // NEW: Encode user_type
  
  const data = Buffer.concat([
    discriminator,
    referrer.toBuffer(),
    mintStartBN.toArrayLike(Buffer, 'le', 8),
    userTypeByte,                 // NEW: Append user_type byte
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: userMetadata, isSigner: false, isWritable: true },       // NEW: Account 1
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
      { pubkey: referrerMetadata, isSigner: false, isWritable: true },   // NEW: Account 5
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: associatedTokenProgram, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}
```

### 3. Update Registration Flow

When calling the instruction builder, derive and pass the new PDAs:

```typescript
// Derive user's metadata PDA
const [userMetadataPDA] = getUserMetadataPDA(publicKey);

// Determine referrer metadata
let referrerMetadataPubkey: PublicKey;
if (referrer) {
  const referrerPubkey = new PublicKey(referrer);
  const [referrerMetadata] = getUserMetadataPDA(referrerPubkey);
  referrerMetadataPubkey = referrerMetadata;
} else {
  // No referrer: use PublicKey.default
  referrerMetadataPubkey = PublicKey.default;
}

// Determine user type (0=individual, 1=business)
const userTypeValue = accountType === 'business' ? 1 : 0;

// Build instruction
const instruction = createInitializeUserInstruction(
  userAccountPDA,
  userMetadataPDA,              // NEW
  publicKey,
  globalStatePDA,
  referralAccountPubkey,
  referrerMetadataPubkey,        // NEW
  userTokenAccount,
  mintPDA,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  now,
  referrerPubkey,
  userTypeValue                  // NEW
);
```

### 4. Update Tests

Update all test assertions to expect 11 accounts instead of 9:

```typescript
expect(instruction.keys).toHaveLength(11);  // Was 9

// Account 4 is now referral_account (was 3)
expect(instruction.keys[4].pubkey).toEqual(referralAccount);

// Instruction data should be 49 bytes (was 48)
expect(instruction.data.length).toBe(49);
```

### 5. Enhanced Error Handling

Add better error logging for SendTransactionError:

```typescript
try {
  // ... send transaction
} catch (err: unknown) {
  console.error('Registration error:', err);
  
  // Log transaction logs if available
  if (err && typeof err === 'object' && 'logs' in err) {
    console.error('Transaction logs:', (err as any).logs);
  }
  
  // Check for specific Anchor errors
  if (err instanceof Error) {
    if (err.message.includes('0x66') || err.message.includes('InstructionDidNotDeserialize')) {
      throw new Error('Instruction deserialization failed. Please ensure you are using the latest client version.');
    }
  }
  throw err;
}
```

## Common Errors

### Error: 0x66 (InstructionDidNotDeserialize)

**Cause:** Client is still using the old 9-account structure.

**Solution:** Update your instruction builder to pass 11 accounts and include the user_type byte.

### Error: Missing PDA accounts

**Cause:** Not deriving user_metadata or referrer_metadata PDAs.

**Solution:** Derive both PDAs using `getUserMetadataPDA()` and pass them to the instruction builder.

### Error: Invalid account order

**Cause:** Accounts are not in the correct order per the IDL.

**Solution:** Verify account order matches the IDL exactly (see "Account Structure" above).

## Verification Checklist

- [ ] Instruction builder accepts 13 parameters (was 10)
- [ ] Two new PDA derivations added: user_metadata and referrer_metadata
- [ ] Instruction data is 49 bytes (was 48)
- [ ] Instruction has 11 accounts (was 9)
- [ ] user_type byte is appended to instruction data
- [ ] Tests updated to expect 11 accounts
- [ ] Error handling includes transaction log extraction
- [ ] Self-referral case uses PublicKey.default for referrer_metadata

## Testing

After migration, verify:

1. **Registration succeeds** without 0x66 error
2. **Instruction data** is exactly 49 bytes
3. **Account count** is exactly 11
4. **Transaction logs** show successful execution
5. **User account** is created on-chain
6. **Token account** is properly initialized

## Support

If you encounter issues during migration:

1. Check your instruction data length (should be 49 bytes)
2. Verify all 11 accounts are passed in correct order
3. Ensure user_type byte is properly encoded
4. Review transaction logs for specific error messages
5. Consult IMPLEMENTATION_NOTES.md for detailed examples

## Related Documentation

- `IMPLEMENTATION_NOTES.md` - Detailed implementation notes
- `__tests__/registration/initializeUserInstruction.test.ts` - Test examples
- `scripts/e2e-register-mint.ts` - End-to-end test script
- `docs/onchain-registration.md` - Onchain registration guide
