# Frontend Testing Guide

## Overview

This document describes the comprehensive Jest + React Testing Library test suite for the EQUA Token frontend application. The test suite validates complete end-to-end user journeys, UI states, referral gating, mint rate display, and error resilience without browser automation.

## Test Structure

### Directory Organization

```
__tests__/
├── home/              # Home/Landing page tests
├── registration/      # Registration form tests
├── referral/          # Referral resolution tests
├── mint/              # Mint rate display tests
├── error/             # Error resilience tests
├── journeys/          # End-to-end user journey tests
├── integration/       # Integration tests
└── utils/             # Shared test utilities (excluded from test runs)
```

### Test Categories

#### 1. Home Page Tests (`__tests__/home/homePage.test.tsx`)
Validates the landing page CTA behavior:
- "Get Started" button links to `/mint`
- Proper display of features and information
- Accessibility attributes
- Semantic HTML structure

#### 2. Registration Form Tests (`__tests__/registration/`)

**User Type Selection** (`userTypeSelection.test.tsx`):
- Individual vs Business selection
- Proper ARIA attributes (aria-checked, role="radio")
- State persistence through interactions
- Visual styling updates

**Referral States** (`referralStates.test.tsx`):
- IDLE: Empty input state
- VALID: Valid referral code
- USED: Already used code
- EXPIRED: Expired code
- NOT_FOUND: Unknown code
- PUBLIC_KEY: Valid Solana public key
- MALFORMED: Invalid format
- CLEARED: Reset after clearing input

#### 3. Mint Rate Display Tests (`__tests__/mint/mintRateDisplay.test.tsx`)
Validates dynamic mint rate based on user tiers:
- User #1: 100,000 EQUA/day
- Users #2-10: Range display
- Users #11-100: Range display
- Users #101+: 100 EQUA/day
- Price and epoch display
- Loading states
- Error handling

#### 4. Error Resilience Tests (`__tests__/error/errorResilience.test.tsx`)
Tests edge cases and error handling:
- Implausible user counts (overflow values)
- Network/API failures
- Referral registry fetch failures
- Rapid state changes
- Balance edge cases
- Component stability

#### 5. End-to-End Journey Tests (`__tests__/journeys/`)

**Unregistered to Registered** (`unregisteredToRegistered.test.tsx`):
- Business type + valid referral → registered
- Individual + no referral → registered (below threshold)
- At threshold + no referral → blocked → referral → registered
- Error recovery: malformed → valid
- Multiple user type changes
- Insufficient balance recovery
- Loading state handling
- Clear and retry flows

**Threshold Referral Requirement** (`thresholdReferralRequirement.test.tsx`):
- Referral optional when totalUsers < 100
- Referral required when totalUsers >= 100
- Visual indicators (required asterisk, warning boxes)
- Boundary transitions (99 → 100 users)
- User type selection with threshold

#### 6. Referral Hook Tests (`__tests__/referral/`)
- Debounced input validation
- State transitions (IDLE → LOADING → VALID)
- Countdown timer for expiring codes
- All referral states
- Registry loading
- **No act() warnings** ✓

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- __tests__/home/homePage.test.tsx
```

### Run Tests in Watch Mode
```bash
npm test:watch
```

### Generate Coverage Report
```bash
npm test:coverage
```

## Coverage Thresholds

The project enforces the following minimum coverage thresholds:
- **Branches**: 25%
- **Functions**: 29%
- **Lines**: 24%
- **Statements**: 24%

**Note**: These thresholds are set to reflect the current focus on user journey and UI component testing. The test suite prioritizes comprehensive end-to-end user flows over exhaustive unit test coverage of blockchain integration utilities. As the project matures, these thresholds may be increased incrementally.

## Key Testing Principles

### 1. User-Centric Testing
Tests focus on user behavior and interactions rather than implementation details:
- Click buttons
- Enter text
- Observe visual feedback
- Complete workflows

### 2. Accessibility First
All interactive elements are tested for proper accessibility attributes:
- `data-testid` for stable element selection
- `role` attributes (radiogroup, radio, alert)
- `aria-checked`, `aria-invalid`, `aria-describedby`

### 3. Mocking Strategy
External dependencies are mocked at the boundary:
- Blockchain RPC calls
- Wallet adapters
- Referral registry fetches
- Network requests

### 4. Test Isolation
Each test is independent and idempotent:
- Fresh mocks for each test
- No shared mutable state
- Clear setup and teardown

### 5. Async Handling
Proper handling of asynchronous operations:
- `waitFor` for state updates
- `findBy*` queries for async resolution
- Wrapped act() calls for React state updates

## Mock Data

### Referral Registry Mock (`__tests__/utils/mocks.ts`)
Pre-defined referral codes for testing:
- `ValidCode1`: Valid, not used, not expired
- `UsedCode01`: Already used
- `ExpiredCd1`: Expired
- `Expiring01`: About to expire (1 minute left)
- `ValidCode2`, `ValidCode3`: Additional valid codes

### User Count Constants
- `BELOW_THRESHOLD`: 50
- `AT_THRESHOLD`: 100
- `ABOVE_THRESHOLD`: 150
- `OVERFLOW`: 17179869188 (tests overflow handling)
- `MAX_SAFE`: 1,000,000

### Wallet Balances
- `INSUFFICIENT`: 0.01 SOL
- `SUFFICIENT`: 0.1 SOL
- `GENEROUS`: 1 SOL

## Common Test Utilities

### Test Providers (`__tests__/utils/testProviders.tsx`)
Wrapper components for React Query and other context providers:
```typescript
import { createTestWrapper } from '../utils/testProviders';

const { result } = renderHook(() => useMyHook(), {
  wrapper: createTestWrapper(),
});
```

### Mock Functions
```typescript
import { mockFetchReferralRegistry, createMockUserAccount } from '../utils/mocks';

// Mock successful registry fetch
jest.mock('@/utils/referral', () => ({
  fetchReferralRegistry: mockFetchReferralRegistry(),
}));

// Create test user account
const user = createMockUserAccount({ totalUsers: 50 });
```

## User Journey Narratives

### Journey 1: New Business User with Referral
```
User arrives unregistered
→ Views registration form
→ Selects "Business" account type
→ Enters valid referral code
→ Code validates (green border)
→ Clicks "Register Now"
→ Transaction succeeds
→ User is now registered
```

### Journey 2: Early Individual User (No Referral)
```
User arrives unregistered (totalUsers = 50)
→ Sees "optional" referral label
→ Keeps default "Individual" selection
→ Clicks "Register Now" without referral
→ Registration succeeds
→ User is now registered
```

### Journey 3: Registration at Threshold
```
User arrives when totalUsers = 100
→ Sees "required" referral label with warning
→ Register button is disabled
→ Enters valid referral code
→ Register button becomes enabled
→ Clicks "Register Now"
→ Registration succeeds
```

## Troubleshooting

### Act Warnings
If you see act() warnings:
1. Ensure all state updates are wrapped in `act()`
2. Use `waitFor` for async state changes
3. Use `findBy*` queries instead of `getBy*` for async elements

### Timeout Errors
Increase timeout for slow operations:
```typescript
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 5000 });
```

### Mock Not Working
Ensure mocks are defined before imports:
```typescript
jest.mock('@/module', () => ({
  myFunction: jest.fn(),
}));

// Import AFTER mock
import { Component } from './component';
```

## Best Practices

1. **Use data-testid sparingly**: Prefer accessible queries (getByRole, getByLabelText)
2. **Test behavior, not implementation**: Focus on what users see and do
3. **Keep tests readable**: Use descriptive test names and clear assertions
4. **Avoid implementation details**: Don't test internal state or private methods
5. **Test error states**: Ensure graceful degradation and error messages
6. **Mock at boundaries**: Mock external systems, not internal modules
7. **Run tests frequently**: Catch regressions early

## Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch
- Pre-commit hooks (if configured)

All tests must pass and coverage thresholds must be met before merging.

## Future Enhancements

Potential additions to the test suite:
- Visual regression testing (Chromatic, Percy)
- Performance testing (React Testing Library benchmarks)
- E2E browser tests (Playwright - already in `/e2e` directory)
- Accessibility audits (axe-core integration)
- Snapshot testing for stable UI components
- Component interaction testing (user-event library)

## Related Documentation

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://testing-library.com/docs/queries/about/#priority)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test patterns
3. Consult React Testing Library docs
4. Ask the development team
