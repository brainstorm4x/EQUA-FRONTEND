# Examples

This directory contains example scripts demonstrating how to use various utility functions in the EQUA frontend.

## getGlobalTransactionCount.ts

Demonstrates how to use the standalone `getGlobalTransactionCount()` function to read authoritative transaction counts from the on-chain GlobalState account.

### What it does:
- Connects to Solana Devnet
- Derives the GlobalState PDA address
- Fetches the total transaction count from on-chain data
- Displays the count with formatting

### Why it's important:
The `getGlobalTransactionCount()` function provides a Sybil-resistant transaction count because:
- Only registered users can transfer EQUA tokens
- Registration requires 0.1 SOL fee (costly to spam)
- After first 100 users, referral is required (additional barrier)
- Both sender and recipient MUST be registered (enforced by backend)

### Running the example:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run the example with tsx (TypeScript executor)
npx tsx examples/getGlobalTransactionCount.ts
```

Expected output:
```
🔍 Testing getGlobalTransactionCount function...

✓ Connected to Solana Devnet
✓ GlobalState PDA: F6HyQcuQfMc1RuSCxq5dAYNoERMkdyAt65fUPajudPpc

📊 Fetching transaction count from on-chain GlobalState...

✅ Total Transactions (registered users only): 1,234

This count represents peer-to-peer transfers between registered users.
It is Sybil-resistant because both sender and recipient must be registered.
Registration requires 0.1 SOL fee + referral (after first 100 users).
```

## Architecture Notes

### Single Source of Truth
The transaction count comes directly from `GlobalState.total_transactions` field in the on-chain program state. This is the **authoritative** source that cannot drift from backend state.

### What is Counted
Only peer-to-peer transfers between registered users via the `transfer_tokens` instruction increment this counter.

### What is NOT Counted
- Transfers from/to unregistered users (instruction fails)
- Mint operations (separate `mint_tokens` instruction)
- Registration transfers (`initialize_user` instruction)
- Reward claims (`claim_referral_rewards` instruction)

### Backend Alignment
The frontend reads the same field that the backend increments, ensuring perfect synchronization.
