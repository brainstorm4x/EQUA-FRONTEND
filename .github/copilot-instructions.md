# EQUA Token - AI Coding Agent Instructions

## Project Overview
Next.js 14 (App Router) + Solana blockchain dApp for minting EQUA tokens with time-locked rewards, referral system, and dynamic pricing. Uses **Token-2022 (SPL Token Extensions)** on Solana Devnet.

## Critical Installation Pattern
**Always use `npm install --legacy-peer-deps`** due to Solana wallet adapter peer dependency conflicts. Never use plain `npm install`.

## Architecture Patterns

### Directory Structure
- **`app/`** - Next.js App Router pages (NOT `src/app/` - see build script validation)
- **`src/components/`** - React UI components with client-side wallet integration
- **`src/lib/`** - Core blockchain interaction: `program.ts` (PDAs, instructions), `constants.ts` (program ID, seeds)
- **`src/utils/`** - Pure utility functions: `tokenFormat.ts` (6-decimal EQUA formatting), `registration.ts` (tiers, SOL validation), `referral/` (code generation and registry)
- **`src/hooks/`** - React hooks: `useProgram.ts`, `useReferralResolution.ts`
- **`lib/`** - Legacy root-level utilities (being migrated to `src/lib/`)
- **`__tests__/`** - Jest + React Testing Library tests organized by feature

### Build System
- `npm run build` runs `scripts/check-app-directory.sh` FIRST to prevent accidental `src/app/` creation
- Script ensures only root `app/` exists (Next.js App Router requirement)
- Failing this check blocks the build intentionally

## Solana/Web3 Integration Patterns

### PDA Derivation (Critical - Must Match Rust Backend)
```typescript
// Seeds are EXACT strings from Rust program - never modify
const GLOBAL_STATE_SEED = 'global-state';
const MINT_SEED = 'equa-mint';
const MINT_AUTHORITY_SEED = 'mint-authority';

// Always use PublicKey.findProgramAddressSync, not manual derivation
const [globalStatePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from(GLOBAL_STATE_SEED)], 
  PROGRAM_ID
);
```

### Transaction Instruction Building
- Use raw `TransactionInstruction` (NOT Anchor's program methods) - see `lib/program.ts`
- **Always** include 8-byte discriminator (Anchor IDL requirement) before instruction data
- Example: `createInitializeUserInstruction()` - study for account ordering and mutability flags
- **Critical**: `referral_account` must ALWAYS be writable per IDL, even when user self-refers

### Token Amount Conversions
EQUA uses **6 decimals** (1 EQUA = 1,000,000 base units):
```typescript
// ALWAYS use tokenFormat.ts utilities - never raw division/multiplication
import { formatEquaRaw, decimalToRaw, rawToDecimal } from '@/utils/tokenFormat';

formatEquaRaw(1_000_000_000) // "1,000.000000"
formatEquaRaw(1_000_000_000, { trimTrailingZeros: true }) // "1,000"
decimalToRaw(100) // 100_000_000 base units
```

### Wallet Adapter Pattern
```typescript
// Components using wallet MUST be 'use client' and dynamically imported with ssr: false
const WalletButton = dynamic(
  () => import('@/components/WalletButton').then(mod => ({ default: mod.WalletButton })),
  { ssr: false }
);
```

### Account Data Parsing
- Raw account reading (discriminator + struct layout) when Anchor deserialization unavailable
- Use `safeParseUserCount()` and `safeParseTimestamp()` from `utils/safeAccountParsing.ts` for overflow protection
- **Implausible values** (e.g., 17+ billion users) should be treated as invalid data, not errors

## Testing Conventions

### Test Organization
- **`__tests__/journeys/`** - Complete user flows (registration → minting)
- **`__tests__/registration/`** - Form state and validation
- **`__tests__/referral/`** - Referral code resolution and hook behavior
- **`__tests__/utils/`** - Mock utilities (excluded from test runs via `testPathIgnorePatterns`)

### Test Patterns
```typescript
// ALWAYS use testProviders wrapper for React Query context
import { createTestWrapper } from '../utils/testProviders';
const { result } = renderHook(() => useMyHook(), {
  wrapper: createTestWrapper()
});

// Mock Solana RPC calls at the boundary
jest.mock('@/utils/referral', () => ({
  fetchReferralRegistry: mockFetchReferralRegistry()
}));

// Use established mock data from __tests__/utils/mocks.ts
import { MOCK_REFERRAL_REGISTRY, createMockUserAccount } from '../utils/mocks';
```

### Test Coverage Philosophy
- Focus on **user journeys** over exhaustive unit coverage (thresholds: 24-29%)
- Blockchain integration (`lib/program.ts`, `src/services/`) excluded from coverage
- Test what users see/do, not implementation details

## Key Business Logic

### Registration Requirements
```typescript
// First 100 users: referral optional
// User 101+: referral REQUIRED (validated on-chain)
const REFERRAL_FREE_LIMIT = 100;
isReferralRequired(totalUsers) // Checks threshold

// Minimum 0.05 SOL balance for transaction fees
const MIN_SOL_BALANCE = 0.05;
hasMinimumSolBalance(walletBalance) // Validates in lamports
```

### Elevated Mint Tiers (Hard-Coded)
```typescript
// User #1: 100,000 EQUA/attempt × 100 attempts (100 days)
// Users #2-10: 10,000 EQUA/attempt × 100 attempts (100 days)
// Users #11-100: 1,000 EQUA/attempt × 100 attempts (100 days)
// Users #101-1000: 100 EQUA/attempt (standard, till user 1001)
// Users #1001-10000: 10 EQUA/attempt (till user 10001)
// Users #10001-100000: 1 EQUA/attempt (till user 100001)
// Users #100001-1000000: 0.1 EQUA/attempt (till user 1000001)
// Users #1000001-10000000: 0.01 EQUA/attempt (till user 10000001)
// Users #10000001-100000000: 0.001 EQUA/attempt (till user 100000001)
// Users #100000001+: 0.0005 EQUA/attempt (continues at this rate)
getUserMintTier(userNumber) // Returns tier config
```

### Referral System
- 10-character alphanumeric codes (e.g., `ValidCode1`)
- 15-minute TTL (900 seconds)
- Registry stored in `/public/idl/referral_registry.json`
- `useReferralResolution` hook: debounced validation, countdown timers, state machine (IDLE → LOADING → VALID/EXPIRED/USED/etc.)

## Developer Workflows

### Running Locally
```bash
npm run dev           # Port 3000 (specified in scripts)
npm run typecheck     # Catch TypeScript errors before build
npm run check:structure  # Validate directory structure
```

### Testing
```bash
npm test              # Run Jest suite
npm test:watch        # TDD mode
npm test:coverage     # Generate coverage report
```

### Common Pitfalls
1. **Never** manually create `src/app/` - build will fail
2. **Always** use `--legacy-peer-deps` for installs
3. **Never** hardcode token math - use `tokenFormat.ts`
4. **Always** mark referral_account as writable in instructions
5. **Check** discriminator matches Anchor IDL (use anchor-cli if unsure)
6. **Validate** PDA seeds exactly match Rust program

## Configuration Notes
- **Network**: Solana Devnet (`https://api.devnet.solana.com`)
- **Program ID**: `GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C`
- **Token Program**: Token-2022 (SPL Token Extensions) ONLY - Standard SPL Token is not supported
- **Webpack**: Node.js polyfills disabled for `fs` and `pino-pretty` (see `next.config.js`)
- **TypeScript**: Paths alias `@/*` maps to `src/*`

## Documentation Resources
- **README.md** - Installation, features, user guide
- **docs/testing-frontend.md** - Complete Jest/RTL testing guide
- **docs/TESTING_E2E.md** - Manual E2E testing procedures
- **AUDIT_REPORT.md** - Technical architecture deep-dive (18,000 words)

## When Making Changes
1. Run `npm run typecheck` before committing
2. Run affected tests with `npm test -- <path>`
3. Check build doesn't break: `npm run build`
4. For Solana changes, verify PDA derivation and instruction data layout
5. For token math, validate with `tokenFormat.ts` functions and add test cases
