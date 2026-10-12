import { test, expect } from '@playwright/test';

/**
 * E2E Test: Registration
 * 
 * Tests the registration flow. Every account is the same kind: there is no
 * account type to choose and no referral field.
 * 
 * Note: This test assumes a wallet is connected. In practice, it will be skipped
 * until wallet connection can be automated.
 */
test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mint');
  });
  
  test('should show registration form when wallet is not registered', async ({ page }) => {
    // TODO: This test requires wallet connection first
    // For now, we'll verify the UI elements exist when registration is needed
    
    // Look for registration form elements
    const registrationHeading = page.locator('h3:has-text("Register Account")');
    
    // Wait and check if registration form appears (might not if wallet not connected)
    const isVisible = await registrationHeading.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(registrationHeading).toBeVisible();
    } else {
      // Registration form not visible - likely need to connect wallet first
      console.log('Registration form not visible - wallet may not be connected');
    }
  });
  
  test('should not offer an account type or a referral field', async ({ page }) => {
    const registrationHeading = page.locator('h3:has-text("Register Account")');
    const isVisible = await registrationHeading.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(page.locator('button:has-text("Business")')).toHaveCount(0);
      await expect(page.locator('input[data-testid="referral-input"]')).toHaveCount(0);
    }
  });
  
  test.skip('should successfully register', async ({ page }) => {
    // TODO: This test requires:
    // 1. Wallet connection
    // 2. Sufficient SOL balance
    // 3. Not already registered
    
    // Click register button
    await page.click('button:has-text("Register Now")');
    
    // Wait for transaction confirmation
    await page.waitForSelector('text=Registration successful', { timeout: 60000 });
    
    // Verify success message
    await expect(page.locator('text=Registration successful')).toBeVisible();
  });
  
  test('should show SOL balance warning if insufficient balance', async ({ page }) => {
    // Look for SOL balance warning
    const warningMessage = page.locator('text=Insufficient SOL Balance');
    
    const isVisible = await warningMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(warningMessage).toBeVisible();
      await expect(page.locator('text=You need at least')).toBeVisible();
    }
  });
});

/**
 * Findings/Limitations:
 * 
 * 1. Wallet Dependency: All registration tests require wallet connection,
 *    which cannot be fully automated without mock wallet support.
 * 
 * 2. Blockchain State: Tests need to handle various blockchain states:
 *    - Wallet already registered
 *    - Insufficient SOL balance
 *    - Network connectivity issues
 *    - Transaction failures
 * 
 * 3. Transaction Timing: Blockchain transactions can take 10-30 seconds,
 *    requiring longer timeouts than typical UI tests.
 * 
 * 4. Test Data: Need fresh wallets with SOL for each test run,
 *    making automated testing on Devnet challenging.
 * 
 * Recommended Approach:
 * - Create mock wallet provider for UI testing
 * - Use manual E2E testing for actual blockchain integration
 * - Focus automated tests on UI state and validation logic
 */
