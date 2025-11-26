# Testing Guide for User Type Selection

## Overview

This guide provides instructions for testing the user type selection feature (Individual vs. Business) in the EQUA registration flow.

## Feature Description

The registration page now includes a user type selection toggle that allows users to choose between:
- **Individual**: For personal accounts
- **Business**: For business/organizational accounts

The selected user type is:
- Visually indicated with highlighting and ARIA attributes
- Persisted through the registration flow
- Submitted along with other registration data

## Running Tests

### Jest Unit Tests

Run all Jest tests:
```bash
npm test
```

Run only user type selection tests:
```bash
npm test -- __tests__/registration/userTypeSelection.test.tsx
```

Run tests in watch mode:
```bash
npm test:watch
```

### Playwright E2E Tests

Run all Playwright tests:
```bash
npm run test:e2e
```

Run only user type selection E2E tests:
```bash
npx playwright test user-type-selection.spec.ts
```

Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

Run specific test file:
```bash
npx playwright test referral-code.spec.ts
```

View test report:
```bash
npm run test:e2e:report
```

## Test Coverage

### Jest Unit Tests (16 tests)

Located in: `__tests__/registration/userTypeSelection.test.tsx`

**Test Groups:**
1. **Rendering**: Verifies both options render with proper ARIA roles
2. **Default Selection**: Confirms Individual is selected by default
3. **Selection Interaction**: Tests toggling between options
4. **Form Submission**: Verifies selected type is passed to onRegister callback
5. **Visual State**: Checks CSS classes for selected/unselected states
6. **Integration**: Tests interaction with referral field and balance checks

### Playwright E2E Tests (18+ tests)

Located in: `playwright/user-type-selection.spec.ts`

**Test Groups:**
1. **H1. Rendering and Visibility**: Both options visible on registration page
2. **H2. Default Selection**: Individual selected by default
3. **H3. Selection Interaction**: User can toggle between options
4. **H4. Visual Styling**: Selected styling applied correctly
5. **H5. Integration**: Works with registration flow
6. **H6. Screenshots**: Documentation screenshots captured

### Updated Existing Tests

**Referral Code Tests** (`referral-code.spec.ts`):
- Now verify user type selection is present before testing referral logic

**Registration Threshold Tests** (`registration-threshold.spec.ts`):
- Now verify user type selection is visible and functional
- Confirm user type persists through referral requirement checks

## Test Selectors

The following data-testid attributes are available for stable test selection:

- `data-testid="user-type-individual"`: Individual selection button
- `data-testid="user-type-business"`: Business selection button
- `data-testid="referral-input"`: Referral code input field
- `data-testid="register-button"`: Registration submit button
- `data-testid="user-count-display"`: Current user count display

## Accessibility Testing

All user type selection tests verify proper accessibility attributes:

- `role="radiogroup"`: Container has proper role
- `role="radio"`: Each button has radio role
- `aria-label="Account type selection"`: Group has descriptive label
- `aria-selected="true/false"`: Selected state is indicated
- `aria-pressed="true/false"`: Button pressed state

## Screenshot Artifacts

E2E tests capture screenshots in `playwright-artifacts/`:

- `user-type-individual.png`: Individual selection state
- `user-type-business.png`: Business selection state
- `user-type-both-options.png`: Both options visible
- `registration-form-complete.png`: Full registration form

## Debugging Failed Tests

### Jest Tests

If tests fail with timeout errors:
```bash
npm test -- --testTimeout=10000
```

To see detailed error output:
```bash
npm test -- --verbose
```

### Playwright Tests

Run tests in headed mode (see browser):
```bash
npx playwright test --headed
```

Run tests with debug mode:
```bash
npx playwright test --debug
```

Take screenshots on failure (enabled by default):
```bash
npx playwright test --screenshot=only-on-failure
```

## Common Issues

### Issue: "act() warning" in Jest tests
**Solution**: The tests use `waitFor` to properly handle async state updates. If warnings appear, verify all state changes are wrapped in `act()` or `waitFor()`.

### Issue: Playwright tests timing out
**Solution**: Tests include `setupTestMode()` which disables debouncing. Ensure this is called in `beforeEach` hooks.

### Issue: User type selection not visible
**Solution**: Tests automatically skip if not on registration page. Verify wallet is connected and user is not already registered.

### Issue: Register button always disabled
**Solution**: Button requires sufficient SOL balance and valid referral (when required). Check wallet balance and referral code requirements.

## Continuous Integration

Tests are run automatically on:
- Pull requests
- Commits to main branch
- Scheduled nightly runs

CI configuration is in `.github/workflows/` (if applicable).

## Adding New Tests

When adding tests for user type selection:

1. Use the existing test patterns in `userTypeSelection.test.tsx`
2. Follow the naming convention: `should [action/state] when [condition]`
3. Use data-testid selectors for stability
4. Include accessibility checks (ARIA attributes)
5. Capture screenshots for visual verification
6. Test both happy path and edge cases

Example:
```typescript
test('should maintain selection when entering referral code', async () => {
  render(<RegistrationForm {...props} />);
  
  const businessButton = screen.getByTestId('user-type-business');
  fireEvent.click(businessButton);
  
  const referralInput = screen.getByTestId('referral-input');
  fireEvent.change(referralInput, { target: { value: 'ABC123xyz9' } });
  
  await waitFor(() => {
    expect(businessButton).toHaveAttribute('aria-selected', 'true');
  });
});
```

## Performance Considerations

- Jest tests complete in ~1.5s
- Playwright tests take 10-30s depending on suite
- Use `--maxWorkers=2` to limit parallel execution if needed

## Related Documentation

- [E2E Testing Guide](./E2E_TESTING_GUIDE.md)
- [Problem Statement](./problem_statement.md)
- [Implementation Summary](./IMPLEMENTATION-COMPLETE.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test output and error messages
3. Consult the main README.md
4. Open an issue with test logs and reproduction steps
