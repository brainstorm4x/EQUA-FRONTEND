# EQUA Token - Transaction Flow Diagrams

> **HISTORICAL NOTE (December 2025):** This archived document references the original program ID `BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL`. The program has been redeployed to `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`. Please refer to current documentation for up-to-date information.

Visual representations of the registration and minting flows for easy understanding.

---

## Registration Flow (Fresh User)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER REGISTRATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

USER ACTION: Click "Register Now"
     │
     ├──> 1. Check wallet connected ✓
     │
     ├──> 2. Generate/Load user account keypair
     │        (Stored in localStorage: 'equa_user_keypair')
     │
     ├──> 3. Derive PDAs
     │        ├─ Global State PDA: [b"global-state"]
     │        ├─ Mint PDA: [b"equa-mint"]
     │        └─ User's ATA: getAssociatedTokenAddressSync(mint, wallet)
     │
     ├──> 4. Verify mint exists on devnet
     │        └─ Call: connection.getAccountInfo(mintPDA)
     │
     ├──> 5. Check if ATA exists
     │        ├─ YES: Skip ATA creation
     │        └─ NO:  Create ATA instruction
     │                 └─ createAssociatedTokenAccountInstruction(
     │                       payer: wallet,
     │                       ata: derived ATA,
     │                       owner: wallet,
     │                       mint: mintPDA,
     │                       tokenProgram: TOKEN_PROGRAM_ID ← IMPORTANT!
     │                    )
     │
     ├──> 6. Build initialize_user instruction
     │        └─ Accounts (9 total):
     │            1. userAccount (signer, writable) ← Generated keypair
     │            2. authority (signer, writable) ← Connected wallet
     │            3. globalState (writable) ← PDA
     │            4. referralAccount (writable) ← User's own account (self-referral)
     │            5. userTokenAccount (writable) ← ATA
     │            6. mint ← PDA
     │            7. associatedTokenProgram ← ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
     │            8. tokenProgram ← TOKEN_PROGRAM_ID
     │            9. systemProgram ← 11111111111111111111111111111111
     │
     ├──> 7. Combine instructions in transaction
     │        Transaction {
     │          instructions: [
     │            createAssociatedTokenAccountInstruction (if needed),
     │            initialize_user
     │          ],
     │          feePayer: wallet
     │        }
     │
     ├──> 8. Sign transaction
     │        ├─ Wallet signs (authority)
     │        └─ userAccountKeypair signs (userAccount)
     │
     ├──> 9. Send transaction
     │        └─ connection.sendRawTransaction(signed, {
     │              skipPreflight: false,
     │              preflightCommitment: 'confirmed'
     │           })
     │
     ├──> 10. Wait for confirmation
     │         └─ connection.confirmTransaction(signature, 'confirmed')
     │
     └──> 11. SUCCESS! 🎉
              ├─ User account created
              ├─ ATA created (if didn't exist)
              ├─ User registered in global state
              ├─ Balance: 0 EQUA
              └─ Ready to mint!

```

---

## Minting Flow (Daily Claim)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DAILY MINTING FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

USER ACTION: Click "Claim Daily EQUA"
     │
     ├──> 1. Check wallet connected ✓
     │
     ├──> 2. Load user account keypair from localStorage ✓
     │
     ├──> 3. Check cooldown
     │        ├─ Read last_mint_time from user account
     │        ├─ Calculate time since last mint
     │        └─ If < 24 hours: STOP and show countdown
     │
     ├──> 4. Derive PDAs
     │        ├─ Mint PDA: [b"equa-mint"]
     │        ├─ Mint Authority PDA: [b"mint-authority"]
     │        └─ User's ATA: getAssociatedTokenAddressSync(mint, wallet)
     │
     ├──> 5. Verify mint exists on devnet
     │        └─ Call: connection.getAccountInfo(mintPDA)
     │
     ├──> 6. Verify user's ATA exists
     │        └─ Call: connection.getAccountInfo(userATA)
     │            ├─ Exists: Continue ✓
     │            └─ Missing: ERROR - Registration incomplete
     │
     ├──> 7. Build mint_equa_tokens instruction
     │        └─ Accounts (6 total):
     │            1. userAccount (writable) ← From localStorage
     │            2. userTokenAccount (writable) ← ATA
     │            3. mint (writable) ← PDA
     │            4. mintAuthority ← PDA (not writable, used as signer seed)
     │            5. authority (signer) ← Connected wallet
     │            6. tokenProgram ← TOKEN_PROGRAM_ID
     │
     ├──> 8. Create transaction
     │        Transaction {
     │          instructions: [mint_equa_tokens],
     │          feePayer: wallet
     │        }
     │
     ├──> 9. Sign transaction
     │        └─ Wallet signs (authority only)
     │            Note: userAccount is NOT a signer for mint
     │
     ├──> 10. Send transaction
     │         └─ connection.sendRawTransaction(signed, {
     │               skipPreflight: false,
     │               preflightCommitment: 'confirmed'
     │            })
     │
     ├──> 11. Wait for confirmation
     │         └─ connection.confirmTransaction(signature, 'confirmed')
     │
     ├──> 12. Update UI
     │         ├─ Fetch new balance from ATA
     │         ├─ Read new last_mint_time
     │         └─ Start cooldown countdown
     │
     └──> 13. SUCCESS! 🎉
              ├─ 1,000 EQUA minted
              ├─ Balance updated
              ├─ Cooldown started (24 hours)
              └─ Button disabled until cooldown expires

```

---

## Token Program Consistency Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   TOKEN PROGRAM CONSISTENCY CHECK                       │
└─────────────────────────────────────────────────────────────────────────┘

DEPLOYMENT TIME:
     │
     ├──> 1. Admin deploys Anchor program to devnet
     │
     ├──> 2. Admin calls initialize
     │        └─ Creates global state PDA
     │
     ├──> 3. Admin creates mint
     │        ├─ Chooses token program:
     │        │  ├─ Option A: Standard Token (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
     │        │  └─ Option B: Token-2022 (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
     │        │
     │        └─ Mint is now OWNED by chosen token program
     │
     ├──> 4. Frontend configuration must match
     │        └─ src/lib/constants.ts:
     │            ├─ If mint uses Standard Token:
     │            │  import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
     │            │  export { TOKEN_PROGRAM_ID };
     │            │
     │            └─ If mint uses Token-2022:
     │               import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
     │               export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;
     │
     └──> 5. Why this matters:
          │
          ├─ ATA derivation uses token program:
          │  ATA = deriveATA(mint, owner, TOKEN_PROGRAM_ID)
          │  ├─ Standard Token: One address
          │  └─ Token-2022: Different address
          │
          ├─ ATA creation requires correct token program:
          │  createATA(..., TOKEN_PROGRAM_ID)
          │  └─ Must match mint's owner
          │
          └─ Token operations require correct token program:
             ├─ Mint instruction passes token program
             └─ Must match ATA's token program

RESULT: If mismatch → "incorrect program id for instruction" error

```

---

## Cooldown Mechanism Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COOLDOWN MECHANISM                              │
└─────────────────────────────────────────────────────────────────────────┘

AFTER MINTING:
     │
     ├──> 1. Backend updates user account
     │        └─ last_mint_time = current_timestamp
     │
     ├──> 2. Frontend reads last_mint_time
     │        └─ Offset 136 in user account data
     │            (8 discriminator + 32 authority + 32 referral + 
     │             32 token_account + 8 minted_amount + 8 mint_start + 
     │             8 locked_until = 128, then 8 transaction_count = 136)
     │
     ├──> 3. Calculate time until next mint
     │        cooldown_remaining = (last_mint_time + 86400) - now
     │
     ├──> 4. Update UI every second
     │        setInterval(() => {
     │          if (cooldown_remaining > 0) {
     │            canMint = false
     │            Display countdown: "23h 59m 30s"
     │          } else {
     │            canMint = true
     │            Display: "Ready to mint!"
     │          }
     │        }, 1000)
     │
     ├──> 5. Button state
     │        if (canMint) {
     │          button.enabled = true
     │          button.color = green
     │        } else {
     │          button.enabled = false
     │          button.color = gray
     │        }
     │
     └──> 6. User attempts to mint
              ├─ If canMint: Proceed with mint
              └─ If !canMint: Show error with time remaining

TIMELINE:
     Mint at T=0
     │
     ├──> T+0s:    ✅ Minted 1,000 EQUA
     ├──> T+1s:    ⏰ Cooldown: 23h 59m 59s
     ├──> T+60s:   ⏰ Cooldown: 23h 59m 0s
     ├──> T+3600s: ⏰ Cooldown: 23h 0m 0s
     ├──> T+86399s:⏰ Cooldown: 0h 0m 1s
     └──> T+86400s:✅ Ready to mint again!

```

---

## Referral System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REFERRAL SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────┘

SCENARIO A: Self-Referral (No Actual Referrer)
     │
     ├──> User A registers without referrer
     │
     ├──> Frontend passes:
     │    ├─ referralAccount: User A's own user account
     │    └─ referrer: PublicKey.default (all zeros)
     │
     ├──> Backend checks:
     │    if (referrer == PublicKey.default) {
     │      // No actual referrer, skip rewards
     │      // referralAccount must still be writable per IDL
     │    }
     │
     └──> Result: User A registered, no referral rewards


SCENARIO B: With Referrer
     │
     ├──> User A registers first (becomes potential referrer)
     │
     ├──> User B wants to use User A as referrer
     │
     ├──> Frontend passes:
     │    ├─ referralAccount: User A's user account (writable)
     │    └─ referrer: User A's wallet pubkey
     │
     ├──> Backend checks:
     │    if (referrer != PublicKey.default) {
     │      // Has actual referrer
     │      // 1. Validate referrer is registered
     │      // 2. Calculate referral reward
     │      // 3. Update referrer's minted_amount
     │    }
     │
     └──> Result:
          ├─ User B registered
          └─ User A receives referral reward

WHY referralAccount Must Be Writable:
     │
     ├──> Solana/Anchor constraint: Account must be writable if data might change
     │
     ├──> Even for self-referral:
     │    └─ Backend might access referralAccount
     │       └─ Must declare as writable in instruction accounts
     │
     └──> Solution: Pass user's own account when no referrer
          └─ Satisfies "writable" requirement
          └─ Backend ignores it when referrer == default

```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING                                  │
└─────────────────────────────────────────────────────────────────────────┘

REGISTRATION ERRORS:

1. Mint Doesn't Exist
   └─> verifyMintExists() fails
       └─> Error: "EQUA token mint has not been created yet. 
                   Please contact the program administrator."

2. ATA Creation Fails
   └─> createAssociatedTokenAccountInstruction fails during simulation
       └─> Check: Sufficient SOL? Token program correct?

3. User Account Already Exists
   └─> Transaction fails: "account already exists"
       └─> Frontend checks and regenerates new keypair

4. Insufficient SOL
   └─> Transaction simulation fails
       └─> Error: "insufficient funds"
           └─> Solution: Get more devnet SOL from faucet


MINTING ERRORS:

1. Not Registered
   └─> ATA doesn't exist
       └─> Error: "Your token account does not exist. This usually means
                   registration did not complete properly. Please disconnect
                   your wallet, clear your browser cache, and reconnect to
                   register again."

2. Cooldown Active
   └─> Frontend check fails
       └─> Error: "⏰ Please wait 23h 59m 30s before minting again"

3. Mint Doesn't Exist
   └─> verifyMintExists() fails
       └─> Error: "EQUA token mint has not been created yet."

4. Token Program Mismatch
   └─> ATA created with wrong token program
       └─> Error: "incorrect program id for instruction"
           └─> Solution: Update constants.ts to match mint's token program


GENERAL ERRORS:

1. Wallet Not Connected
   └─> Check: publicKey == null
       └─> Show: "Please connect your wallet"

2. Network Error
   └─> RPC call fails
       └─> Show: "Network error. Please try again."

3. Transaction Timeout
   └─> Confirmation times out
       └─> Show: "Transaction timed out. It may still succeed."

```

---

## Account Structure Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ACCOUNT STRUCTURES                              │
└─────────────────────────────────────────────────────────────────────────┘

USER ACCOUNT STRUCTURE (on-chain):
┌──────────────────┬────────┬─────────────────────────────────────────┐
│ Field            │ Size   │ Offset                                  │
├──────────────────┼────────┼─────────────────────────────────────────┤
│ discriminator    │ 8      │ 0                                       │
│ authority        │ 32     │ 8   (Connected wallet pubkey)          │
│ referral         │ 32     │ 40  (Referrer's user account)          │
│ token_account    │ 32     │ 72  (User's ATA)                       │
│ minted_amount    │ 8      │ 104 (Total tokens minted)              │
│ mint_start       │ 8      │ 112 (Registration timestamp)           │
│ locked_until     │ 8      │ 120 (Token lock expiry)                │
│ transaction_count│ 8      │ 128 (Number of mints)                  │
│ last_mint_time   │ 8      │ 136 (Last mint timestamp) ← For cooldown│
└──────────────────┴────────┴─────────────────────────────────────────┘


ASSOCIATED TOKEN ACCOUNT (ATA):
┌──────────────────┬────────┬─────────────────────────────────────────┐
│ Field            │ Size   │ Offset                                  │
├──────────────────┼────────┼─────────────────────────────────────────┤
│ mint             │ 32     │ 0   (Mint pubkey)                      │
│ owner            │ 32     │ 32  (Owner pubkey = wallet)            │
│ amount           │ 8      │ 64  (Token balance) ← Read this         │
│ delegate         │ 36     │ 72                                      │
│ state            │ 1      │ 108                                     │
│ ...              │ ...    │ ...                                     │
└──────────────────┴────────┴─────────────────────────────────────────┘


MINT ACCOUNT:
┌──────────────────┬────────┬─────────────────────────────────────────┐
│ Field            │ Size   │ Offset                                  │
├──────────────────┼────────┼─────────────────────────────────────────┤
│ mint_authority   │ 36     │ 0                                       │
│ supply           │ 8      │ 36  (Total supply)                     │
│ decimals         │ 1      │ 44  (6 for EQUA)                       │
│ is_initialized   │ 1      │ 45                                      │
│ freeze_authority │ 36     │ 46                                      │
└──────────────────┴────────┴─────────────────────────────────────────┘

```

---

## Transaction Signing Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TRANSACTION SIGNING                                │
└─────────────────────────────────────────────────────────────────────────┘

REGISTRATION (Requires 2 signatures):

Transaction {
  instructions: [
    (optional) createAssociatedTokenAccount,
    initialize_user
  ],
  signatures: [
    wallet.signature,           ← Authority (connected wallet)
    userAccountKeypair.signature ← User account (new account being created)
  ]
}

Signing order:
1. wallet.signTransaction()        ← Async (wallet popup)
2. transaction.partialSign(userAccountKeypair) ← Sync (in code)


MINTING (Requires 1 signature):

Transaction {
  instructions: [
    mint_equa_tokens
  ],
  signatures: [
    wallet.signature  ← Authority (connected wallet)
  ]
}

Signing order:
1. wallet.signTransaction() ← Async (wallet popup)

Note: userAccount is NOT a signer for mint!
      Only passed as account, not signer.

```

---

## PDA Derivation Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PDA DERIVATIONS                                 │
└─────────────────────────────────────────────────────────────────────────┘

PROGRAM-DERIVED ADDRESSES (PDAs):

Global State PDA:
  Seeds: [b"global-state"]
  Program: BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
  Result: 4dt3EfdbD63e4vCDz5CiK2ee14v7hotet7tJt5GGi6Kf
  Bump: 249

Mint PDA:
  Seeds: [b"equa-mint"]
  Program: BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
  Result: 3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4
  Bump: 252

Mint Authority PDA:
  Seeds: [b"mint-authority"]
  Program: BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
  Result: FU1bDqbYxdz7KwhyFgi1sB4R2Dp7JA5f5NLtCQEfeSe3
  Bump: 250


ASSOCIATED TOKEN ACCOUNT (ATA):
  Seeds: [
    owner.pubkey,           ← Connected wallet
    TOKEN_PROGRAM_ID,       ← Standard Token or Token-2022
    mint.pubkey             ← Mint PDA
  ]
  Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
  Result: Varies per wallet + token program

IMPORTANT: ATA address changes if token program changes!
           Standard Token ATA ≠ Token-2022 ATA

```

---

## Testing Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TESTING WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Infrastructure Verification
  │
  ├─> Run: node test_e2e_devnet.mjs
  │
  └─> Checks:
      ├─ [ ] Program deployed
      ├─ [ ] Global state initialized
      ├─ [ ] Mint account created
      └─ [ ] Token program identified
          └─> RESULT: Pass/Fail
              └─> If FAIL: Fix infrastructure before continuing


STEP 2: Manual Registration Test
  │
  ├─> Fresh wallet with devnet SOL
  │
  ├─> Connect to dApp
  │
  ├─> Click "Register Now"
  │
  ├─> Monitor console logs:
  │   ✓ 🔑 Generated new user account: [address]
  │   ✓ 📝 Creating registration transaction...
  │   ✓ ✅ Registration successful! [signature]
  │
  └─> Verify on Solana Explorer:
      ├─ [ ] Transaction succeeded
      ├─ [ ] ATA created
      ├─ [ ] User account created
      └─ [ ] Global state updated


STEP 3: Manual Minting Test
  │
  ├─> After successful registration
  │
  ├─> Click "Claim Daily EQUA"
  │
  ├─> Monitor console logs:
  │   ✓ 🪙 Creating mint transaction...
  │   ✓ ✅ Minting successful! [signature]
  │   ✓ 💰 New balance: 1000
  │
  └─> Verify on Solana Explorer:
      ├─ [ ] Transaction succeeded
      ├─ [ ] ATA balance: 1,000 EQUA
      └─ [ ] Cooldown started


STEP 4: Error Scenario Tests
  │
  ├─> Try mint without registration → Should show error
  ├─> Try mint during cooldown → Should show countdown
  ├─> Try register twice → Should handle gracefully
  └─> Disconnect wallet mid-flow → Should handle gracefully


STEP 5: Report Results
  │
  └─> Use template from E2E_TESTING_GUIDE.md
      ├─ Include all test results
      ├─ Include transaction signatures
      ├─ Include console logs
      └─ Include screenshots

```

---

## Quick Reference: Key Files

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY FILES REFERENCE                             │
└─────────────────────────────────────────────────────────────────────────┘

FRONTEND CODE:
  src/lib/constants.ts
    └─> Token program configuration
        export { TOKEN_PROGRAM_ID }

  src/lib/program.ts
    └─> Instruction builders
        ├─ createInitializeUserInstruction()
        └─ createMintEquaInstruction()

  src/app/mint/page.tsx
    └─> Main UI and flows
        ├─ handleRegister()
        ├─ handleMint()
        └─ Cooldown logic

DOCUMENTATION:
  COMPLETE_SUMMARY.md
    └─> Executive summary

  AUDIT_REPORT.md
    └─> Complete technical audit

  E2E_TESTING_GUIDE.md
    └─> Testing procedures

  TROUBLESHOOTING.md
    └─> Problem resolution

  FLOW_DIAGRAMS.md (this file)
    └─> Visual flow diagrams

TESTING:
  test_e2e_devnet.mjs
    └─> Infrastructure verification script

```

---

**These diagrams are for reference only.**  
**For complete details, see AUDIT_REPORT.md and E2E_TESTING_GUIDE.md**
