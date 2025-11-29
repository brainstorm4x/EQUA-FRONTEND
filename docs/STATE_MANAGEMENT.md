# EQUA State Management Guide

This document explains how to manage and reset the various states in the EQUA Frontend application.

## State Types

The EQUA application maintains several types of state:

### 1. On-Chain State (Solana Blockchain)
- **GlobalState Account**: Contains `user_count`, `total_transactions`, `current_epoch`, and other program state
- **UserAccount**: Individual user registration data (authority, referrer, minted_amount, etc.)
- **Token Accounts**: SPL token balances for each user

### 2. Client-Side State (localStorage)
- `equa_user_keypair`: User's account keypair for signing transactions
- `equa_user_number`: User's registration number
- `equa_registration_complete`: Timestamp of registration completion
- `equa_registered_fingerprints`: Device fingerprints for Sybil prevention
- `equa_registered_public_keys`: Registry of registered public keys
- `equa_registration_stats`: Count of individual/business registrations
- `equa_transfer_stats`: Count of transfers between users
- `equa_referral_rate_limit_registry`: Referral rate limiting data
- `equa_device_fingerprint`: Device fingerprint for the current browser

---

## How to Reset States

### Resetting Client-Side State (Frontend Only)

To reset all client-side state, open the browser console and run:

```javascript
// Reset all EQUA localStorage data
const keysToRemove = [
  'equa_user_keypair',
  'equa_user_number',
  'equa_registration_complete',
  'equa_registered_fingerprints',
  'equa_registered_public_keys',
  'equa_registration_stats',
  'equa_transfer_stats',
  'equa_referral_rate_limit_registry',
  'equa_device_fingerprint'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log('✅ All EQUA localStorage data cleared!');
console.log('⚠️ Note: On-chain state is NOT affected. Refresh the page to reinitialize.');
```

Or to clear ALL localStorage (use with caution):
```javascript
localStorage.clear();
```

### Resetting On-Chain State

**⚠️ WARNING**: On-chain state on Solana is immutable. You cannot "reset" accounts that have been created.

Options for managing on-chain state:

1. **Deploy to a New Program ID**: Create a fresh deployment with a new program ID
2. **Re-initialize Global State**: If the program supports it, admin can reinitialize
3. **Use a Different Network**: Switch between devnet, testnet, or mainnet
4. **Close and Recreate Accounts**: Some programs allow closing accounts to reclaim rent

For the EQUA program specifically:
- The GlobalState PDA is derived from the program ID and seed
- User accounts are derived from the user's keypair
- These PDAs are deterministic and cannot be "reset" without program changes

---

## Impact of Resetting States

### Client-Side Reset Impact

| State | Impact of Reset | Recovery |
|-------|-----------------|----------|
| `equa_user_keypair` | New account keypair generated | Previous registration lost - will need to re-register |
| `equa_user_number` | User number forgotten locally | Can be recovered from on-chain data |
| `equa_registered_fingerprints` | Sybil prevention bypassed | Allows duplicate registrations (security concern) |
| `equa_registered_public_keys` | Registration tracking lost | Allows duplicate registrations (security concern) |
| `equa_registration_stats` | User counts reset to 0 | UI shows 0 until fetched from chain |
| `equa_transfer_stats` | Transfer count reset to 0 | Lost transfer history (frontend only) |

### On-Chain State Impact

On-chain state is permanent. If you need to "reset" for testing:

1. **For Devnet Testing**:
   - Deploy a new program instance
   - Update `PROGRAM_ID` in `src/lib/constants.ts`
   - Clear localStorage to get fresh client state

2. **For Production**:
   - On-chain state should NOT be reset
   - User data is valuable and should be preserved
   - Any "reset" would require careful migration planning

---

## Persistent Storage Recommendations

For production deployment, the current localStorage-based tracking has limitations:

### Free Tier Options for Persistent Storage

1. **Netlify KV Store** (Recommended for Netlify hosting)
   - Free tier: 1GB storage, 1M reads/month
   - Serverless key-value store
   - Easy integration with Netlify Edge Functions

2. **Supabase** (PostgreSQL)
   - Free tier: 500MB database, 2GB bandwidth/month
   - Full PostgreSQL with REST API
   - Real-time subscriptions

3. **PlanetScale** (MySQL)
   - Free tier: 1 billion row reads/month
   - Serverless MySQL
   - Branching for development

4. **MongoDB Atlas** (Document DB)
   - Free tier: 512MB storage
   - Flexible schema
   - Good for tracking data

### Implementation Notes for Persistent Storage

To implement server-side registration tracking:

```typescript
// Example Edge Function for Netlify KV
export async function handler(event) {
  const { publicKey, action } = JSON.parse(event.body);
  
  if (action === 'check') {
    // Check if public key exists in KV store
    const exists = await Netlify.env.get(`registered_${publicKey}`);
    return { statusCode: 200, body: JSON.stringify({ registered: !!exists }) };
  }
  
  if (action === 'register') {
    // Store the registration
    await Netlify.env.set(`registered_${publicKey}`, JSON.stringify({
      registeredAt: Date.now(),
      // Additional metadata
    }));
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
}
```

---

## Development vs Production

### Development (Devnet)
- Use localStorage for quick iteration
- Reset freely for testing
- Deploy new program instances as needed

### Production (Mainnet)
- Implement server-side persistence
- Never reset on-chain state
- Implement proper backup strategies
- Use monitoring for state tracking

---

## Contact

For questions about state management, please open an issue in the repository.
