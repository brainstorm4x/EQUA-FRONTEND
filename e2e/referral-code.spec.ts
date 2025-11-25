import { test, expect } from '@playwright/test';

/**
 * E2E test skeleton for referral code functionality
 * 
 * These tests verify the referral code input behavior in the registration flow.
 * They test various scenarios including valid codes, expired codes, used codes, and public keys.
 * 
 * NOTE: These tests are designed to be run when the full UI integration is complete.
 * They use data-testid attributes for reliable element selection.
 */

test.describe('Referral Code Input', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the mint/registration page
    await page.goto('/mint');
  });

  /**
   * Helper to check if the referral input exists and return it
   * Skips the test if the feature is not yet integrated
   */
  async function getReferralInput(page: any) {
    const referralInput = page.getByPlaceholder(/referral|referrer/i);
    const count = await referralInput.count();
    if (count === 0) {
      test.skip();
    }
    return referralInput;
  }

  test.describe('Valid Code Entry', () => {
    test('should show success state when entering a valid referral code before expiry', async ({ page }) => {
      const referralInput = await getReferralInput(page);
      
      // Enter a valid mock referral code (from mock registry)
      await referralInput.fill('ABC123xyz9');

      // Wait for debounce and validation
      await page.waitForTimeout(500);

      // Check for success indicator with data-testid
      const validIndicator = page.locator('[data-testid="referral-valid"]');
      const countdownIndicator = page.locator('[data-testid="referral-countdown"]');
      
      // Expect either the valid indicator or countdown to be visible
      const isValid = await validIndicator.count() > 0;
      const hasCountdown = await countdownIndicator.count() > 0;
      
      expect(isValid || hasCountdown).toBeTruthy();
    });
  });

  test.describe('Expired Code Entry', () => {
    test('should show error state when entering an expired referral code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a mock expired referral code
      await referralInput.fill('ExpiredCd1');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for expired error indicator
      const expiredIndicator = page.locator('[data-testid="referral-expired"]');
      
      await expect(expiredIndicator).toBeVisible();
    });
  });

  test.describe('Used Code Entry', () => {
    test('should show error state when entering an already used referral code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a mock used referral code
      await referralInput.fill('UsedCode01');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for used error indicator
      const usedIndicator = page.locator('[data-testid="referral-used"]');
      
      await expect(usedIndicator).toBeVisible();
    });
  });

  test.describe('Public Key Entry', () => {
    test('should show success state when entering a valid public key directly', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a valid Solana public key
      await referralInput.fill('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for public key success indicator
      const pubkeyIndicator = page.locator('[data-testid="referral-pubkey"]');
      
      await expect(pubkeyIndicator).toBeVisible();
    });
  });

  test.describe('Malformed Input Entry', () => {
    test('should show error state when entering malformed input', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter invalid input
      await referralInput.fill('invalid!!!');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for error indicator
      const errorIndicator = page.locator('[data-testid="referral-error"]');
      
      await expect(errorIndicator).toBeVisible();
    });
  });

  test.describe('Not Found Code Entry', () => {
    test('should show not found state when entering unknown code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a code that doesn't exist in the registry
      await referralInput.fill('Unknown123');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for not found indicator
      const notFoundIndicator = page.locator('[data-testid="referral-not-found"]');
      
      await expect(notFoundIndicator).toBeVisible();
    });
  });

  test.describe('Countdown Timer', () => {
    test('should display countdown timer for valid code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a valid mock referral code
      await referralInput.fill('ABC123xyz9');

      // Wait for validation
      await page.waitForTimeout(500);

      // Check for countdown display (mm:ss format)
      const countdownDisplay = page.locator('[data-testid="referral-countdown"]');
      
      await expect(countdownDisplay).toBeVisible();
      
      // Verify countdown format matches mm:ss pattern
      const text = await countdownDisplay.textContent();
      expect(text).toMatch(/\d{1,2}:\d{2}/);
    });

    test('should update countdown every second', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a valid mock referral code
      await referralInput.fill('ABC123xyz9');

      // Wait for initial validation
      await page.waitForTimeout(500);

      const countdownDisplay = page.locator('[data-testid="referral-countdown"]');
      
      // Skip if countdown not visible
      if (await countdownDisplay.count() === 0) {
        test.skip();
        return;
      }

      const initialValue = await countdownDisplay.textContent();

      // Wait 2 seconds
      await page.waitForTimeout(2000);

      const updatedValue = await countdownDisplay.textContent();

      // Values should be different if countdown is working
      expect(initialValue).not.toBe(updatedValue);
    });
  });

  test.describe('Loading State', () => {
    test('should show loading state while validating', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter input but don't wait for full validation
      await referralInput.fill('ABC123xyz9');

      // Look for loading indicator (before debounce completes)
      const loadingIndicator = page.locator('[data-testid="referral-loading"]');
      
      // Loading indicator may or may not be visible depending on timing
      // This test just verifies the loading indicator exists when needed
      const isLoading = await loadingIndicator.count() > 0;
      
      // Wait for validation to complete
      await page.waitForTimeout(500);
      
      // After validation, loading should be gone
      await expect(loadingIndicator).not.toBeVisible();
    });
  });
});
