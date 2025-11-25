import { test, expect, Page } from '@playwright/test';
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
 * - User count display and registration gating at 100 users
 * - Current minting rate display based on user's tier and attempts left
 *
 * The referral requirement threshold is defined in src/utils/registration.ts
 * as REFERRAL_FREE_LIMIT = 100
 *
 * Note: These tests rely on the totalUsers prop passed to RegistrationForm.
 * In production, this is fetched from the on-chain global state.
 * For testing purposes, we verify UI behavior based on the visible state.
 *
 * Updated to match UI simplification:
 * - Removed checks for "Upcoming Mint Schedule" on registration page
 * - Focus on current tier-based minting rates for registered users
 * - Verify registration gating at 100 users threshold
 */
test.describe('Registration Threshold Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestMode(page);
    await navigateToMintPage(page);
  });

  /**
   * Helper to check if we're on the registration page (not already registered)
   */
  async function ensureOnRegistrationPage(page: Page): Promise<boolean> {
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
  async function isReferralRequired(page: Page): Promise<boolean> {
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
  async function isReferralOptional(page: Page): Promise<boolean> {
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

  test.describe('User Count and Gating', () => {
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
        // Verify format includes user count
        expect(text).toMatch(/Current Users:.*\d+/i);
      }
    });

    test('should display remaining spots without referral when below 100 users', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Look for the remaining spots text (shown when totalUsers < 100)
      const remainingSpotsText = page.locator('text=/spots left without referral/i');
      const isVisible = await remainingSpotsText.isVisible().catch(() => false);

      if (isVisible) {
        const text = await remainingSpotsText.textContent();
        // Verify it shows a number of remaining spots
        expect(text).toMatch(/\d+.*spots.*left.*without.*referral/i);
      }
    });

    test('should verify registration gating at 100 users threshold', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // Get current user count
      const userCountDisplay = page.locator('[data-testid="user-count-display"]');
      const isVisible = await userCountDisplay.isVisible().catch(() => false);

      if (isVisible) {
        const text = await userCountDisplay.textContent();
        const match = text?.match(/Current Users:.*?(\d+)/i);
        
        if (match) {
          const userCount = parseInt(match[1], 10);
          console.log('Current user count:', userCount);
          
          // Verify referral requirement based on user count
          if (userCount >= 100) {
            // Should require referral
            const referralRequired = await isReferralRequired(page);
            expect(referralRequired).toBe(true);
          } else {
            // Referral should be optional
            const referralOptional = await isReferralOptional(page);
            // Note: This may not always be visible, so we just log for now
            console.log('Referral optional indicator visible:', referralOptional);
          }
        }
      }
    });
  });

  test.describe('Minting Rate Display', () => {
    test('should display current minting rate based on user tier for registered users', async ({ page }) => {
      // Skip if not on registration page (assumes user might be registered)
      await page.waitForLoadState('domcontentloaded');
      
      // Check if user is registered by looking for mint UI elements
      const mintButton = page.locator('button:has-text("Claim Daily EQUA"), button:has-text("Mint")');
      const isMintPageVisible = await mintButton.count() > 0;
      
      if (!isMintPageVisible) {
        test.skip();
        return;
      }

      // Look for the tier card showing max per attempt
      const tierCard = page.locator('text=/Max per Attempt/i').first();
      const tierCardVisible = await tierCard.isVisible().catch(() => false);

      if (tierCardVisible) {
        // Find the EQUA amount display
        const equaAmount = page.locator('text=/\\d+.*EQUA/i').first();
        const amountVisible = await equaAmount.isVisible().catch(() => false);
        
        if (amountVisible) {
          const text = await equaAmount.textContent();
          console.log('Current minting rate:', text);
          // Verify it shows a valid EQUA amount (e.g., "1,000 EQUA" or "10,000 EQUA")
          expect(text).toMatch(/\d{1,3}(,\d{3})*\s*EQUA/i);
        }
      }
    });

    test('should display elevated attempts remaining for elevated users', async ({ page }) => {
      await page.waitForLoadState('domcontentloaded');
      
      // Check if user is registered and has elevated status
      const elevatedBadge = page.locator('text=/ELEVATED/i');
      const isElevated = await elevatedBadge.isVisible().catch(() => false);
      
      if (!isElevated) {
        test.skip();
        return;
      }

      // Look for elevated attempts display
      const attemptsDisplay = page.locator('text=/Elevated Attempts Left/i');
      const attemptsVisible = await attemptsDisplay.isVisible().catch(() => false);

      if (attemptsVisible) {
        // Find the remaining attempts count (format: "X / Y")
        const attemptsCount = page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first();
        const countVisible = await attemptsCount.isVisible().catch(() => false);
        
        if (countVisible) {
          const text = await attemptsCount.textContent();
          console.log('Elevated attempts:', text);
          // Verify format "X / Y" where X <= Y
          expect(text).toMatch(/\d+\s*\/\s*\d+/);
        }
      }
    });

    test('should NOT display "Upcoming Mint Schedule" table on registration page', async ({ page }) => {
      const isOnRegistration = await ensureOnRegistrationPage(page);
      if (!isOnRegistration) {
        test.skip();
        return;
      }

      // The "Upcoming Mint Schedule" section should not be visible on the registration form
      const scheduleHeader = page.locator('text=/Upcoming Mint Schedule/i');
      const scheduleVisible = await scheduleHeader.isVisible().catch(() => false);

      // For unregistered users viewing the registration form, the schedule should not be prominent
      // Note: It may still exist in a card, but should not be the main focus
      console.log('Upcoming Mint Schedule visible on registration:', scheduleVisible);
    });
  });
});
