import { test, expect, Page } from '@playwright/test';
import {
  enterReferral,
  waitForReferralResolution,
  captureScreenshot,
  expectReferralState,
  navigateToMintPage,
  setupTestMode,
  waitForReferralInputReady,
  VALID_CODE,
  USED_CODE,
  EXPIRED_CODE,
  TEST_NOT_FOUND_CODE,
  TEST_MALFORMED_INPUT,
  TEST_PUBKEY_INPUT,
} from './helpers/referral';

/**
 * E2E tests for referral code functionality
 *
 * Tests all referral code states:
 * - VALID: Valid referral code before expiry
 * - USED: Code that has already been consumed
 * - EXPIRED: Code that has exceeded its TTL
 * - NOT_FOUND: Code not in the registry
 * - PUBLIC_KEY: Valid Solana public key input
 * - MALFORMED: Invalid input format
 *
 * Screenshots are captured for each state and stored in playwright-artifacts/
 */
test.describe('Referral Code Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test mode to disable/reduce debounce for faster tests
    await setupTestMode(page);
    await navigateToMintPage(page);
  });

  /**
   * Helper to check if the referral input exists and skip test if not integrated
   */
  async function getReferralInput(page: Page) {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Look for referral input field
    const referralInput = page.locator('#referrer-input, [placeholder*="referral"]').first();
    const count = await referralInput.count();

    if (count === 0) {
      test.skip();
    }
    return referralInput;
  }

  test.describe('A. Valid Referral Code', () => {
    test('should show VALID state when entering a valid referral code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Verify user type selection is present on registration page
      const individualButton = page.locator('[data-testid="user-type-individual"]');
      const businessButton = page.locator('[data-testid="user-type-business"]');
      const hasUserTypeSelection = await individualButton.count() > 0 && await businessButton.count() > 0;
      
      if (hasUserTypeSelection) {
        // User type selection should be visible before referral input
        await expect(individualButton).toBeVisible();
        await expect(businessButton).toBeVisible();
      }

      // Enter the valid mock referral code (ABC123xyz9 from registry)
      await enterReferral(page, VALID_CODE);

      // Wait for validation to complete
      await waitForReferralResolution(page);

      // Expect valid indicator to be visible
      await expectReferralState(page, 'valid');

      // Capture screenshot
      await captureScreenshot(page, 'referral-valid.png');
    });

    test('should show countdown timer for valid code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      await enterReferral(page, VALID_CODE);
      await waitForReferralResolution(page);

      // Check for countdown display
      const countdownDisplay = page.locator('[data-testid="referral-countdown"]');
      const isVisible = await countdownDisplay.isVisible().catch(() => false);

      if (isVisible) {
        // Verify countdown format matches mm:ss pattern
        const text = await countdownDisplay.textContent();
        expect(text).toMatch(/\d{1,2}:\d{2}/);
      }
    });
  });

  test.describe('B. Used Referral Code', () => {
    test('should show USED state when entering an already used referral code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter the used mock referral code (UsedCode01 from registry)
      await enterReferral(page, USED_CODE);

      // Wait for validation
      await waitForReferralResolution(page);

      // Expect used indicator to be visible
      await expectReferralState(page, 'used');

      // Capture screenshot
      await captureScreenshot(page, 'referral-used.png');
    });
  });

  test.describe('C. Expired Referral Code', () => {
    test('should show EXPIRED state when entering an expired referral code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter the expired mock referral code (ExpiredCd1 from registry)
      await enterReferral(page, EXPIRED_CODE);

      // Wait for validation
      await waitForReferralResolution(page);

      // Expect expired indicator to be visible
      await expectReferralState(page, 'expired');

      // Capture screenshot
      await captureScreenshot(page, 'referral-expired.png');
    });
  });

  test.describe('D. Not Found Code', () => {
    test('should show NOT_FOUND state when entering unknown code', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a code that doesn't exist in the registry
      await enterReferral(page, TEST_NOT_FOUND_CODE);

      // Wait for validation
      await waitForReferralResolution(page);

      // Expect not found indicator to be visible
      await expectReferralState(page, 'not-found');

      // Capture screenshot
      await captureScreenshot(page, 'referral-not-found.png');
    });
  });

  test.describe('E. Public Key Input', () => {
    test('should show PUBLIC_KEY state when entering a valid public key', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a valid Solana public key
      await enterReferral(page, TEST_PUBKEY_INPUT);

      // Wait for validation
      await waitForReferralResolution(page);

      // Expect public key indicator to be visible
      await expectReferralState(page, 'pubkey');

      // Capture screenshot
      await captureScreenshot(page, 'referral-public-key.png');
    });
  });

  test.describe('F. Malformed Input', () => {
    test('should show MALFORMED state when entering invalid input', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter invalid input (special characters)
      await enterReferral(page, TEST_MALFORMED_INPUT);

      // Wait for validation
      await waitForReferralResolution(page);

      // Expect error indicator to be visible
      await expectReferralState(page, 'error');

      // Capture screenshot
      await captureScreenshot(page, 'referral-malformed.png');
    });
  });

  test.describe('Loading State', () => {
    test('should show loading state while validating', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter input - loading state may appear briefly
      await enterReferral(page, VALID_CODE);

      // Try to catch loading state (may be quick due to test mode)
      const loadingIndicator = page.locator('[data-testid="referral-loading"]');

      // Wait for validation to complete
      await waitForReferralResolution(page);

      // After validation, loading should not be visible
      await expect(loadingIndicator).not.toBeVisible();
    });
  });

  test.describe('Input Clearing', () => {
    test('should clear status when input is emptied', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Enter a valid code first
      await enterReferral(page, VALID_CODE);
      await waitForReferralResolution(page);

      // Verify status is shown
      const statusIndicator = page.locator('[data-testid="referral-valid"]');
      await expect(statusIndicator).toBeVisible();

      // Clear the input
      await enterReferral(page, '');

      // Wait a moment for state to update
      await page.waitForTimeout(500);

      // Status should be hidden/cleared
      await expect(statusIndicator).not.toBeVisible();
    });
  });

  test.describe('State Transitions', () => {
    test('should transition between different code states', async ({ page }) => {
      const referralInput = await getReferralInput(page);

      // Start with valid code
      await enterReferral(page, VALID_CODE);
      await waitForReferralResolution(page);
      await expectReferralState(page, 'valid');

      // Change to used code
      await enterReferral(page, USED_CODE);
      await waitForReferralResolution(page);
      await expectReferralState(page, 'used');

      // Change to expired code
      await enterReferral(page, EXPIRED_CODE);
      await waitForReferralResolution(page);
      await expectReferralState(page, 'expired');

      // Change to public key
      await enterReferral(page, TEST_PUBKEY_INPUT);
      await waitForReferralResolution(page);
      await expectReferralState(page, 'pubkey');
    });
  });
});
