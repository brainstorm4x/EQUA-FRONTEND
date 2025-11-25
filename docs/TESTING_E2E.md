# Playwright E2E Testing Guide

This document provides instructions for running and developing E2E tests for the EQUA Frontend application using Playwright.

## Setup

### Prerequisites

- Node.js 18+ installed
- npm 9+ installed

### Install Dependencies

```bash
npm install --legacy-peer-deps
```

### Install Playwright Browsers

```bash
npx playwright install chromium
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

This will:
1. Start the Next.js dev server on port 3000
2. Run all Playwright tests
3. Generate screenshots in `playwright-artifacts/`
4. Create an HTML report in `playwright-report/`

### Run Tests with UI

For interactive debugging and test development:

```bash
npm run test:e2e:ui
```

### View HTML Report

After running tests, view the detailed HTML report:

```bash
npm run test:e2e:report
```

### Run Specific Test File

```bash
npx playwright test playwright/referral-code.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should show VALID state"
```

## Test Structure

```
playwright/
├── helpers/
│   └── referral.ts       # Utility functions for referral tests
├── referral-code.spec.ts # Referral code state tests
└── registration-threshold.spec.ts  # Threshold enforcement tests
```

## Test Scenarios

### Referral Code Tests (referral-code.spec.ts)

| Scenario | Code | Expected State | Screenshot |
|----------|------|----------------|------------|
| A. Valid Code | `ABC123xyz9` | VALID | `referral-valid.png` |
| B. Used Code | `UsedCode01` | USED | `referral-used.png` |
| C. Expired Code | `ExpiredCd1` | EXPIRED | `referral-expired.png` |
| D. Not Found | `Unknown123` | NOT_FOUND | `referral-not-found.png` |
| E. Public Key | `BgNRqYsP...` | PUBLIC_KEY | `referral-public-key.png` |
| F. Malformed | `@@@` | MALFORMED | `referral-malformed.png` |

### Registration Threshold Tests (registration-threshold.spec.ts)

| Scenario | User Count | Referral Status | Screenshot |
|----------|------------|-----------------|------------|
| G1. Below Threshold | < 100 | Optional | `threshold-optional.png` |
| G2. At/Above Threshold | >= 100 | Required | `threshold-required.png` |

## Configuration

The Playwright configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './playwright',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  outputDir: 'playwright-artifacts',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Mode

Tests run with `__TEST_MODE__` flag injected into the page, which can be used to:
- Disable debounce delays for faster tests
- Enable test-specific behavior

To check test mode in application code:

```typescript
if (typeof window !== 'undefined' && (window as any).__TEST_MODE__) {
  // Test-specific behavior
}
```

## Writing New Tests

### Using Helpers

Import helpers from `./helpers/referral.ts`:

```typescript
import {
  enterReferral,
  waitForReferralResolution,
  captureScreenshot,
  expectReferralState,
  navigateToMintPage,
  setupTestMode,
} from './helpers/referral';
```

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import {
  enterReferral,
  waitForReferralResolution,
  captureScreenshot,
  navigateToMintPage,
  setupTestMode,
} from './helpers/referral';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestMode(page);
    await navigateToMintPage(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code
    await captureScreenshot(page, 'my-screenshot.png');
  });
});
```

## Debugging

### Using Debug Mode

```bash
PWDEBUG=1 npx playwright test
```

### Taking Screenshots

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Viewing Traces

After a failed test with trace enabled:

```bash
npx playwright show-trace test-results/trace.zip
```

## CI Integration

### GitHub Actions Example

Add this to `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install --legacy-peer-deps
        
      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: |
            playwright-artifacts/
            playwright-report/
          retention-days: 30
```

## Troubleshooting

### Tests Timeout

If tests timeout waiting for the dev server:
1. Increase `webServer.timeout` in `playwright.config.ts`
2. Ensure port 3000 is available
3. Check for build errors: `npm run build`

### Element Not Found

If elements are not found:
1. Check for correct `data-testid` attributes
2. Use `await page.waitForSelector()` for dynamic content
3. Verify page has loaded: `await page.waitForLoadState('networkidle')`

### Flaky Tests

To reduce flakiness:
1. Use `waitForReferralResolution()` instead of `waitForTimeout()`
2. Enable test mode to disable debounce
3. Add retries in CI: `retries: process.env.CI ? 1 : 0`

## Mock Data

The tests use mock referral codes from `src/utils/referral/registry.ts`:

| Code | State | Referrer |
|------|-------|----------|
| `ABC123xyz9` | Valid | `11111111...` |
| `UsedCode01` | Used | `22222222...` |
| `ExpiredCd1` | Expired | `33333333...` |

## API Endpoints (Future)

For full E2E testing with dynamic codes, implement these endpoints:

- `POST /api/referral-codes/generate` - Generate new referral code
- `POST /api/referral-codes/mark-used` - Mark code as used
- `GET /api/global-state` - Get current global state

See helper functions in `playwright/helpers/referral.ts` for API interaction examples.
