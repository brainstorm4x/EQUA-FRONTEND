# E2E Test Updates for Registration UI Simplification

## Overview
Updated E2E/Playwright tests to reflect the simplified registration UI, removing outdated checks and adding new assertions for the current tier-based minting system.

## Changes Made

### 1. Home Page Updates
- **File:** `app/page.tsx`
- **Change:** Updated CTA button text from "Get Started →" to "Register Now →"
- **Test:** Created `playwright/home-page.spec.ts` to verify:
  - "Register Now" button is displayed
  - Old "Get Started" button is not present
  - Navigation to mint page works correctly

### 2. Registration Threshold Tests Updates
- **File:** `playwright/registration-threshold.spec.ts`
- **Changes:**
  - Renamed test group from "Threshold Display" to "User Count and Gating"
  - Added explicit test for 100-user registration gating threshold
  - Added new test group "Minting Rate Display" with tests for:
    - Current minting rate display based on user's tier
    - Elevated attempts remaining for elevated users
    - Verification that "Upcoming Mint Schedule" table is not prominently displayed on registration page
  - Updated test documentation to reflect UI simplification goals
  - Tests now focus on current tier-based rates rather than schedule tables

### 3. Removed/Adjusted Assertions
- ✅ Removed focus on "Upcoming Mint Schedule" section in registration tests
- ✅ No KYC/KYB "coming soon" checks were present in tests (verified clean)
- ✅ Updated to check for current minting rate based on tier and attempts left
- ✅ Added sanity check for user count logic at 100 users threshold

### 4. Configuration Updates
- **File:** `jest.config.js`
- **Change:** Added `<rootDir>/playwright/` to `testPathIgnorePatterns` to prevent Jest from running Playwright tests

## Test Coverage

### Home Page (`playwright/home-page.spec.ts`)
- ✅ Displays "Register Now" CTA button
- ✅ Does NOT display "Get Started" button
- ✅ Navigates to mint page when clicked

### Registration Threshold (`playwright/registration-threshold.spec.ts`)
- ✅ Referral optional when user_count < 100
- ✅ Referral required when user_count >= 100
- ✅ Displays current user count
- ✅ Shows remaining spots without referral (when < 100)
- ✅ Verifies registration gating at 100 users threshold
- ✅ Displays current minting rate based on user's tier (for registered users)
- ✅ Shows elevated attempts remaining (for elevated users)
- ✅ Verifies "Upcoming Mint Schedule" is not prominently on registration page

### Referral Code Validation (`playwright/referral-code.spec.ts`)
- ✅ No changes needed - already tests referral input validation correctly

## Key Behavioral Changes

### Before (Old UI)
- Home page had "Get Started" button
- Tests checked for "Upcoming Mint Schedule" table
- Tests might have checked for KYC/KYB "coming soon" messaging

### After (New UI)
- Home page has "Register Now" button
- Tests focus on current tier-based minting rates
- Tests verify user count gating at 100 users
- Tests check individual tier information (Max per Attempt, Elevated Attempts)
- No KYC/KYB "coming soon" checks (already clean)

## Running Tests

### Unit Tests (Jest)
```bash
npm test
```
All unit tests pass. Playwright tests are now properly excluded from Jest.

### E2E Tests (Playwright)
```bash
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Run with UI mode
npm run test:e2e:report  # View test report
```

## Notes
- Tests use conditional skipping when elements are not present (wallet not connected, user already registered, etc.)
- Tests are designed to be flexible and document actual UI behavior
- Playwright config auto-starts Next.js dev server on port 3000
- All linting, type-checking, and build steps pass successfully
