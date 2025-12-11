# Referral Reward System - Implementation Guide

## Current State

### ✅ What's Already Implemented (On-Chain)

1. **Referral Tracking**: Each UserAccount stores the referrer's public key
   ```
   UserAccount structure (on Solana blockchain):
   - authority (Pubkey)           ← User's wallet
   - referral (Pubkey)            ← Referrer's wallet (immutable!)
   - token_account (Pubkey)       ← User's token account
   - minted_amount (u64)          ← Total minted
   - mint_start (i64)             ← Registration timestamp
   - (locked_until field removed per EQUA Whitepaper 2025)
   - referral_rewards (u64)       ← Accumulated rewards for this referrer
   - last_mint_time (i64)         ← Last mint timestamp
   ```

> **Note**: The `locked_until` field has been removed as of December 2025.

2. **Referral Rewards Accumulation**: The `referral_rewards` field in each UserAccount tracks how much reward that account has earned from referring others.

### ❌ What's NOT Yet Implemented

**Automatic Referral Reward Distribution**: Currently, when a user mints tokens, the backend program does NOT automatically distribute rewards to their referrer. The `mintEquaTokens` instruction only includes:
- userAccount
- userTokenAccount  
- mint
- mint_authority
- authority (signer)
- token_program

**No referral account parameter** - meaning no automatic reward distribution happens during minting.

## How Referral Rewards Currently Work

### Step 1: Registration (Already Working)
When a user registers with a referrer:
```typescript
// During registration
const referrerPubkey = new PublicKey("referrer_address");
// This is stored in the UserAccount.referral field on-chain
```

### Step 2: Minting (No Reward Distribution)
When a referred user mints tokens:
- Tokens are minted to the user's account
- **No rewards are automatically sent to the referrer**
- The referrer must claim rewards separately

### Step 3: Claiming Rewards (Needs Implementation)
To implement reward distribution, you need:

1. **Backend Program**: Add a `claim_referral_rewards` instruction
2. **Frontend**: Add a "Claim Referral Rewards" button/page
3. **Calculation Logic**: Calculate how much the referrer should receive

## Implementation Options

### Option 1: Manual Claim System (Recommended)

Referrers can check their accumulated rewards and claim them when ready.

**Backend (Rust program) - Add new instruction:**
```rust
pub fn claim_referral_rewards(ctx: Context<ClaimReferralRewards>) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let referral_rewards = user_account.referral_rewards;
    
    // Transfer accumulated rewards to referrer
    // Reset referral_rewards to 0
    user_account.referral_rewards = 0;
    
    // Mint tokens to referrer's token account
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.referrer_token_account.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
            &[&[b"mint-authority", &[ctx.bumps.mint_authority]]],
        ),
        referral_rewards,
    )?;
    
    Ok(())
}
```

**Frontend - Add claim functionality:**
```typescript
// In a new component or page
async function claimReferralRewards() {
  const userAccount = getUserAccount(); // Get user's account
  const referralRewards = await parseReferralRewards(userAccount);
  
  if (referralRewards > 0) {
    // Call claim_referral_rewards instruction
    await program.methods
      .claimReferralRewards()
      .accounts({
        userAccount: userAccountPubkey,
        referrerTokenAccount: userTokenAccount,
        mint: mintPDA,
        mintAuthority: mintAuthorityPDA,
        authority: publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }
}
```

### Option 2: Automatic Distribution During Mint

Modify the mint instruction to automatically distribute rewards.

**Backend - Modify mintEquaTokens:**
```rust
pub fn mint_equa_tokens(ctx: Context<MintEquaTokens>, amount: u64) -> Result<()> {
    // ... existing mint logic ...
    
    // Calculate referral reward (e.g., 10% of minted amount)
    let referral_reward = amount / 10;
    
    // Get referrer's UserAccount
    let referrer_pubkey = ctx.accounts.user_account.referral;
    if referrer_pubkey != Pubkey::default() {
        // Load referrer's account and increment their referral_rewards
        let referrer_account = &mut ctx.accounts.referrer_account;
        referrer_account.referral_rewards += referral_reward;
    }
    
    Ok(())
}
```

**Note**: This requires adding `referrer_account` to the accounts list.

## Calculating Referral Rewards

### Option A: Fixed Percentage
- Simple: Give 10% of minted amount to referrer
- Example: User mints 100 EQUA → Referrer gets 10 EQUA

### Option B: Tiered System
- First-level referrals: 10%
- Second-level referrals: 5%
- Third-level referrals: 2%

### Option C: One-Time Bonus
- Referrer gets a fixed bonus (e.g., 50 EQUA) when someone they referred completes first mint
- Stored in referral_rewards field

## Querying Referral Relationships

### Find All Users Referred by an Address

```typescript
async function getUsersReferredBy(referrerPubkey: PublicKey): Promise<PublicKey[]> {
  // Get all UserAccounts from the program
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 8 + 32, // Skip discriminator + authority
          bytes: referrerPubkey.toBase58(),
        },
      },
    ],
  });
  
  return accounts.map(acc => acc.pubkey);
}
```

### Calculate Total Rewards Earned

```typescript
async function calculateReferralRewards(userPubkey: PublicKey): Promise<number> {
  const accountInfo = await connection.getAccountInfo(userPubkey);
  if (!accountInfo) return 0;
  
  // Parse referral_rewards field (at offset: 8 + 32 + 32 + 32 + 8 + 8 + 8 = 128)
  const referralRewards = new BN(
    accountInfo.data.slice(128, 136),
    'le'
  );
  
  return referralRewards.toNumber();
}
```

## Recommended Implementation Steps

1. **Phase 1: Query & Display (No backend changes needed)**
   - ✅ Add UI to show who referred you
   - ✅ Add UI to show who you've referred
   - ✅ Show accumulated `referral_rewards` balance
   - Implementation: Frontend only, read on-chain data

2. **Phase 2: Backend - Add Claim Instruction**
   - Add `claim_referral_rewards` instruction to Rust program
   - Test on devnet
   - Deploy to production

3. **Phase 3: Frontend - Add Claim UI**
   - Add "My Referrals" dashboard
   - Add "Claim Rewards" button
   - Show reward history

4. **Phase 4: Automated Rewards (Optional)**
   - Modify mint instruction to auto-distribute
   - Add referrer_account parameter
   - Update frontend mint calls

## Current Frontend Support

**What you can do NOW without backend changes:**

```typescript
// Get user's referrer
const userAccount = await parseUserAccount(userAccountPubkey);
const referrerPubkey = userAccount.referral;
console.log('Referred by:', referrerPubkey.toBase58());

// Get accumulated rewards
const rewards = userAccount.referralRewards;
console.log('Rewards earned:', rewards.toString());

// Find all users you referred
const referredUsers = await getUsersReferredBy(publicKey);
console.log('You referred:', referredUsers.length, 'users');
```

## Summary

**Current State:**
- ✅ Referral relationships stored on-chain
- ✅ `referral_rewards` field tracks earnings
- ❌ No automatic distribution mechanism
- ❌ No claim functionality

**Next Steps:**
1. Decide on reward distribution model (manual claim vs automatic)
2. If automatic: Modify backend program to add referrer_account parameter
3. If manual: Add claim_referral_rewards instruction to backend
4. Add frontend UI for claiming rewards
5. Add referrals dashboard to show your referrals and rewards

**The infrastructure is in place - you just need to implement the distribution mechanism based on your business requirements.**
