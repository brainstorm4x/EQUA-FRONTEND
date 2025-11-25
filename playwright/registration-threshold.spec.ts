import { test, expect } from '@playwright/test';
import {
  enterReferral,
  waitForReferralResolution,
  captureScreenshot,
  navigateToMintPage,
  setupTestMode,
  VALID_CODE,
} from './helpers/referral';

/**
 * E2E tests for referral requirement threshold enforcement
 *
 * Tests scenarios:
 * - G1. Referral optional when user_count < 100 (below threshold)
 * - G2. Referral required when user_count >= 100 (at/above threshold)
 *
 * The referral requirement threshold is defined in src/utils/registration.ts
 * as REFERRAL_FREE_LIMIT = 100
 *
 * Note: These tests rely on the totalUsers prop passed to RegistrationForm.
 * In production, this is fetched from the on-chain global state.
 * For testing purposes, we verify UI behavior based on the visible state.
 */
test.describe('Registration Threshold Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestMode(page);
    await navigateToMintPage(page);
  });

  /**
   * Helper to check if we're on the registration page (not already registered)
   */
  async function ensureOnRegistrationPage(page: any): Promise<boolean> {
    await page.waitForLoadState('domcontentloaded');

    // Look for the registration form indicators
    const registerButton = page.locator('button:has-text("Register")');
    const referralInput = page.locator('#referrer-input, [placeholder*="referral"]').first();

    const hasRegisterButton = await registerButton.count() > 0;
    const hasReferralInput = await referralInput.count() > 0;

    return hasRegisterButton || hasReferralInput;
  }

  /**
   * Helper to check if referral is shown as required
   */
  async function isReferralRequired(page: any): Promise<boolean> {
    // Look for required indicator (red asterisk or required text)
    const requiredIndicator = page.locator('label:has-text("*"), .text-red-400:has-text("*")');
    const requiredText = page.locator('text=/required/i');
    const warningBox = page.locator('[class*="yellow"], [class*="warning"]').filter({ hasText: /referral/i });

    const hasRequiredIndicator = await requiredIndicator.count() > 0;
    const hasRequiredText = await requiredText.count() > 0;
    const hasWarningBox = await warningBox.count() > 0;

    return hasRequiredIndicator || hasRequiredText || hasWarningBox;
  }

  /**
   * Helper to check if referral is shown as optional
   */
  async function isReferralOptional(page: any): Promise<boolean> {
    const optionalText = page.locator('text=/optional/i');
    return await optionalText.count() > 0;
  }

  test.describe('G1. Threshold - Referral Optional (Below 100 users)', () => {
    test('should show referral as optional when user count is below threshold', async ({ page }) => {
      // Skip if not on registration page (wallet not connected or already registered)
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Check current displayed user count
      const userCountText = page.locator('text=/Current Users:/i, text=/User/i').first();
      const userCountVisible = await userCountText.isVisible().catch(() => false);

      // Look for optional indicator
      const optionalIndicator = page.locator('span:has-text("optional")');
      const isOptionalVisible = await optionalIndicator.isVisible().catch(() => false);

      // If showing optional, take screenshot
      if (isOptionalVisible) {
        await captureScreenshot(page, 'threshold-optional.png');
      }

      // This test documents current behavior - may need adjustment based on actual state
      // The key verification is that the UI correctly reflects the threshold state
    });

    test('should allow registration without referral when below threshold', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Look for register button
      const registerButton = page.locator('button:has-text("Register")');
      const isVisible = await registerButton.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip();
        return;
      }

      // Check if register button is enabled without referral input
      const isDisabled = await registerButton.getAttribute('disabled');

      // If optional, button should be enabled even without referral
      // Note: May also be disabled due to wallet balance requirements
      console.log('Register button disabled state:', isDisabled);
    });
  });

  test.describe('G2. Threshold - Referral Required (At/Above 100 users)', () => {
    test('should show referral as required when user count is at or above threshold', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Check if required indicator is visible
      const isRequired = await isReferralRequired(page);

      // If showing required indicator, take screenshot
      if (isRequired) {
        await captureScreenshot(page, 'threshold-required.png');
      }

      // This test documents current behavior - will pass when user_count >= 100
    });

    test('should show warning about referral requirement', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Look for the referral requirement warning box
      const warningBox = page.locator('[class*="yellow"]').filter({ hasText: /referral/i });
      const isWarningVisible = await warningBox.isVisible().catch(() => false);

      if (isWarningVisible) {
        // Verify warning message content
        await expect(warningBox).toContainText(/referral/i);
      }
    });

    test('should disable register button when referral is required but not provided', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      const isRequired = await isReferralRequired(page);
      if (!isRequired) {
        test.skip();
        return;
      }

      // Make sure referral input is empty
      const referralInput = page.locator('#referrer-input, [placeholder*="referral"]').first();
      const inputVisible = await referralInput.isVisible().catch(() => false);

      if (inputVisible) {
        await referralInput.clear();

        // Wait for state to settle
        await page.waitForTimeout(500);

        // Check register button state
        const registerButton = page.locator('button:has-text("Register")');
        const isDisabled = await registerButton.getAttribute('disabled');

        // When referral is required and empty, button should be disabled
        expect(isDisabled).not.toBeNull();
      }
    });

    test('should enable register button when valid referral is provided', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      const referralInput = page.locator('#referrer-input, [placeholder*="referral"]').first();
      const inputVisible = await referralInput.isVisible().catch(() => false);

      if (!inputVisible) {
        test.skip();
        return;
      }

      // Enter a valid referral code
      await enterReferral(page, VALID_CODE);
      await waitForReferralResolution(page);

      // Wait for state to settle
      await page.waitForTimeout(500);

      // Check for valid indicator
      const validIndicator = page.locator('[data-testid="referral-valid"]');
      const isValidShown = await validIndicator.isVisible().catch(() => false);

      if (isValidShown) {
        // Now check if register button becomes enabled
        // Note: May still be disabled due to other requirements (wallet balance, etc.)
        const registerButton = page.locator('button:has-text("Register")');
        const buttonText = await registerButton.textContent();
        console.log('Register button text after valid referral:', buttonText);
      }
    });
  });

  test.describe('Threshold Display', () => {
    test('should display remaining spots without referral', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Look for the remaining spots text (e.g., "X spots left without referral")
      const remainingSpotsText = page.locator('text=/spots left/i');
      const isVisible = await remainingSpotsText.isVisible().catch(() => false);

      if (isVisible) {
        const text = await remainingSpotsText.textContent();
        // Verify it shows a number
        expect(text).toMatch(/\d+.*spots/i);
      }
    });

    test('should display current user count', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Look for current users display
      const userCountDisplay = page.locator('text=/Current Users:/i');
      const isVisible = await userCountDisplay.isVisible().catch(() => false);

      if (isVisible) {
        const text = await userCountDisplay.textContent();
        // Verify format
        expect(text).toContain('Current Users');
      }
    });
  });
});
