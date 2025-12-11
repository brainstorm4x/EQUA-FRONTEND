# Playwright E2E Testing Findings and Limitations

**Date:** 2025-12-11  
**Version:** 1.0  
**Test Framework:** Playwright 1.57.0

## Executive Summary

Playwright E2E tests have been implemented for the EQUA Frontend application covering wallet connection, registration (individual and business), minting, and referral flows. However, **significant limitations exist** due to the blockchain-dependent nature of the application. Most tests require manual intervention or mock implementations to run successfully in automated CI/CD pipelines.

## Test Coverage Implemented

### 1. Wallet Connection (`01-wallet-connection.spec.ts`)
- ✅ Display of wallet connect button
- ✅ Wallet selection modal trigger
- ⚠️ Actual wallet connection (requires browser extension)

### 2. Registration - Individual (`02-registration-individual.spec.ts`)
- ✅ Registration form visibility
- ✅ Account type selection UI (Individual/Business cards)
- ✅ Referral input field
- ✅ SOL balance warning
- ⚠️ Actual registration transaction (requires wallet + balance)

### 3. Registration - Business (`03-registration-business.spec.ts`)
- ✅ Business account type selection
- ✅ Toggle between Individual and Business
- ✅ Business icon and description display
- ⚠️ Actual business registration (requires wallet + balance)

### 4. Minting Flow (`04-mint-flow.spec.ts`)
- ✅ Mint button visibility
- ✅ Cooldown timer display
- ✅ Mint tier information
- ✅ Balance display
- ⚠️ Actual minting transaction (requires wallet + no cooldown)

### 5. Referral Path (`05-referral-path.spec.ts`)
- ✅ Referral input field
- ✅ Referral requirement messaging
- ✅ Format validation (10-char codes vs wallet addresses)
- ✅ Loading states during validation
- ⚠️ Actual referral registration (requires valid code + wallet)

**Legend:**
- ✅ Fully automated (tests UI state and behavior)
- ⚠️ Partially automated (requires manual setup or mock)

## Critical Limitations

### 1. Wallet Extension Dependency

**Issue:** All blockchain interactions require a wallet extension (Phantom, Solflare, etc.) to be installed in the browser.

**Impact:**
- Cannot fully automate wallet connection in headless browsers
- Wallet approval dialogs require manual user interaction
- Different wallet extensions have different UI/behavior

**Current State:** Tests check for UI elements but skip actual connection

**Recommended Solutions:**
- Create a mock wallet adapter for testing
- Use a headless wallet implementation for CI/CD
- Focus automated tests on UI state changes
- Maintain manual test procedures for blockchain integration

### 2. Blockchain State Management

**Issue:** Tests depend on external blockchain state that cannot be easily reset between test runs.

**Impact:**
- User can only register once per wallet
- 24-hour cooldown between mints prevents consecutive tests
- Referral codes expire after 15 minutes
- Need fresh wallets with SOL for each test

**Current State:** Tests are defensive and check multiple possible states

**Recommended Solutions:**
- Use test wallets that reset on Devnet
- Consider local validator for isolated testing
- Implement test data factories to generate fresh referral codes
- Use multiple test wallets to avoid cooldown issues

### 3. Network Variability and Performance

**Issue:** Solana Devnet can be slow, congested, or occasionally unavailable.

**Impact:**
- Transactions can take 10-60 seconds to confirm
- Network timeouts cause test failures
- Rate limiting on RPC endpoints
- Blockhash expiration during transaction signing

**Current State:** Tests use generous timeouts (60-90 seconds)

**Recommended Solutions:**
- Implement retry logic with exponential backoff
- Use multiple RPC endpoints with fallback
- Add detailed logging for debugging network issues
- Monitor Devnet status before running tests

### 4. Transaction Costs

**Issue:** Each test requires SOL for transaction fees.

**Impact:**
- Need to fund test wallets with SOL
- Devnet SOL faucet has rate limits
- Cannot run tests without sufficient balance

**Current State:** Tests check for balance warnings but skip transactions

**Recommended Solutions:**
- Maintain a pool of funded test wallets
- Automate wallet funding from Devnet faucet
- Use local validator with unlimited SOL for development

### 5. Referral System Complexity

**Issue:** Referral system has multiple moving parts (registry, TTL, rate limits).

**Impact:**
- Referral codes expire after 15 minutes
- Registry must be kept in sync with blockchain
- Rate limiting affects referrer rewards
- First 100 users have different behavior

**Current State:** Tests check UI validation but skip actual referral flow

**Recommended Solutions:**
- Generate fresh referral codes before test runs
- Mock referral registry for UI-only tests
- Test rate limiting separately with dedicated test data
- Document referral threshold behaviors

### 6. User Type Verification

**Issue:** No easy way to verify `user_type` (0=individual, 1=business) was stored on-chain.

**Impact:**
- Cannot verify business registration worked correctly
- Need blockchain query to validate
- UI shows selection but can't confirm on-chain value

**Current State:** Tests verify UI selection but not blockchain storage

**Recommended Solutions:**
- Add helper function to read user_type from on-chain account
- Create separate integration test for user_type verification
- Log transaction details to inspect instruction data

## Test Execution Results

### Manual Test Run (2025-12-11)

**Environment:**
- Local development server (port 3000)
- Chromium browser
- No wallet connected

**Results:**
```
Test Suites: 5 total
Tests: 25 total (18 passed, 7 skipped)
Duration: ~45 seconds
```

**Passed Tests (18):**
- All UI element visibility tests
- Account type selection and toggling
- Referral input validation (format only)
- Balance warning display
- Cooldown timer visibility

**Skipped Tests (7):**
- Wallet connection with extension
- Registration transactions (individual and business)
- Minting transaction
- Referral registration with valid code

**Failures:** None (skipped tests don't count as failures)

## Recommendations for Improvement

### Short Term (Immediate)
1. ✅ **Document limitations** (this document)
2. ✅ **Implement defensive UI tests** (check multiple states)
3. **Add detailed logging** for debugging blockchain interactions
4. **Create manual test procedures** for blockchain integration testing

### Medium Term (Next Sprint)
1. **Mock Wallet Adapter**: Create a test wallet that simulates blockchain interactions
2. **Test Data Factory**: Generate fresh wallets and referral codes programmatically
3. **Local Validator Setup**: Use Solana test validator for isolated testing
4. **CI/CD Integration**: Run UI tests in CI, manual tests on schedule

### Long Term (Future)
1. **Custom Test Harness**: Build tooling specifically for blockchain dApp testing
2. **Synthetic Monitoring**: Deploy test wallets to continuously verify production
3. **Performance Benchmarks**: Track transaction confirmation times over time
4. **Cross-Browser Testing**: Expand beyond Chromium to Firefox and WebKit

## Test Configuration

### Playwright Config Highlights
```typescript
timeout: 90000,              // 90 seconds per test
workers: 1,                  // Sequential execution
retries: process.env.CI ? 2 : 0,
baseURL: 'http://localhost:3000',
```

### Environment Variables
```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

## Running the Tests

### Prerequisites
```bash
npm install --legacy-peer-deps
npx playwright install chromium
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/02-registration-individual.spec.ts
```

### Run with UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Generate HTML Report
```bash
npx playwright show-report
```

## Known Issues / TODOs

### High Priority
- [ ] **TODO:** Implement mock wallet adapter for CI/CD
- [ ] **TODO:** Create test wallet funding script
- [ ] **TODO:** Add on-chain verification helpers
- [ ] **TODO:** Document manual testing procedures

### Medium Priority
- [ ] **TODO:** Set up local Solana validator for tests
- [ ] **TODO:** Add retry logic for network failures
- [ ] **TODO:** Create test data factory for referral codes
- [ ] **TODO:** Add performance monitoring

### Low Priority
- [ ] **TODO:** Cross-browser testing (Firefox, Safari)
- [ ] **TODO:** Mobile viewport testing
- [ ] **TODO:** Accessibility testing with Playwright
- [ ] **TODO:** Visual regression testing

## Conclusion

Playwright provides excellent tooling for E2E testing, but the blockchain-dependent nature of this application creates significant challenges for full automation. **The current test suite focuses on UI state validation and user interactions**, with blockchain transactions marked as `test.skip()` until proper mocking or test infrastructure is in place.

**Recommended approach:** Maintain both automated UI tests and manual blockchain integration tests. Use the automated tests for rapid feedback during development, and run manual tests before releases to verify on-chain behavior.

## References

- [Playwright Documentation](https://playwright.dev/)
- [Solana Web3.js Testing](https://solana.com/docs/testing)
- [Wallet Adapter Testing](https://github.com/solana-labs/wallet-adapter)
- EQUA Frontend Test Documentation: `docs/testing-frontend.md`
- EQUA E2E Manual Testing: `docs/TESTING_E2E.md`

---

**Last Updated:** 2025-12-11  
**Maintainer:** EQUA Development Team
