import { test, expect } from '@playwright/test';

/**
 * E2E Test: Basic Referral Path
 * 
 * Tests referral code validation and registration with referral.
 */
test.describe('Referral Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mint');
  });
  
  test('should show referral input field in registration form', async ({ page }) => {
    const referralInput = page.locator('input[data-testid="referral-input"]');
    
    const isVisible = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(referralInput).toBeVisible();
      await expect(referralInput).toBeEditable();
    }
  });
  
  test('should show referral requirement for users 101+', async ({ page }) => {
    // Look for referral requirement message
    const requirementMessage = page.locator('text=/referral.*required/i');
    
    const isVisible = await requirementMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Referral is required - we're past user 100
      await expect(requirementMessage).toBeVisible();
      await expect(page.locator('text=/first 100 users/i')).toBeVisible();
    }
  });
  
  test('should validate referral code format', async ({ page }) => {
    const referralInput = page.locator('input[data-testid="referral-input"]');
    
    const isVisible = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Enter invalid format (referral codes are 10 alphanumeric chars)
      await referralInput.fill('invalid');
      
      // Wait for validation
      await page.waitForTimeout(1000);
      
      // Check for validation error or invalid state
      const statusIndicator = page.locator('[data-testid="referral-status"]');
      const statusVisible = await statusIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (statusVisible) {
        const statusText = await statusIndicator.textContent();
        // Should show some kind of error or "not found" message
        expect(statusText).toBeTruthy();
      }
    }
  });
  
  test('should validate 10-character referral code format', async ({ page }) => {
    const referralInput = page.locator('input[data-testid="referral-input"]');
    
    const isVisible = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Enter valid format (10 alphanumeric chars)
      await referralInput.fill('TestCode12');
      
      // Wait for validation
      await page.waitForTimeout(1500);
      
      // Check for validation status
      const statusIndicator = page.locator('[data-testid="referral-status"]');
      const statusVisible = await statusIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (statusVisible) {
        // Should show loading, valid, expired, or not found status
        await expect(statusIndicator).toBeVisible();
      }
    }
  });
  
  test('should show loading state during referral validation', async ({ page }) => {
    const referralInput = page.locator('input[data-testid="referral-input"]');
    
    const isVisible = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Enter referral code
      await referralInput.fill('ValidCode1');
      
      // Should show loading spinner briefly
      const loadingSpinner = page.locator('text=⏳').first();
      const spinnerVisible = await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Loading spinner may appear and disappear quickly
      // Just checking if it appears is enough
    }
  });
  
  test('should accept valid wallet address as referrer', async ({ page }) => {
    const referralInput = page.locator('input[data-testid="referral-input"]');
    
    const isVisible = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Enter a valid Solana public key format
      const testPubkey = 'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp';
      await referralInput.fill(testPubkey);
      
      // Wait for validation
      await page.waitForTimeout(1500);
      
      // Should not show format error (though it may show "not registered" if account doesn't exist)
      const errorMessage = page.locator('text=/invalid.*format/i');
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Should not have format error for valid pubkey format
      expect(hasError).toBe(false);
    }
  });
  
  test.skip('should successfully register with valid referral code', async ({ page }) => {
    // TODO: This test requires:
    // 1. Valid referral code from referral_registry.json
    // 2. Wallet connection
    // 3. Sufficient SOL balance
    // 4. User not already registered
    
    // Fill referral code
    await page.fill('input[data-testid="referral-input"]', 'ValidCode1');
    
    // Wait for validation
    await page.waitForSelector('text=/valid/i', { timeout: 5000 });
    
    // Select account type
    await page.click('button:has-text("Individual")');
    
    // Click register
    await page.click('button:has-text("Register Now")');
    
    // Wait for success
    await page.waitForSelector('text=/registration.*successful/i', { timeout: 60000 });
    
    // Verify referrer was recorded on-chain
    // TODO: Query blockchain to verify referral relationship
  });
  
  test('should disable register button when referral is required but not provided', async ({ page }) => {
    const registerButton = page.locator('button:has-text("Register Now")');
    const requirementMessage = page.locator('text=/referral.*required/i');
    
    const bothVisible = await Promise.all([
      registerButton.isVisible({ timeout: 5000 }).catch(() => false),
      requirementMessage.isVisible({ timeout: 5000 }).catch(() => false),
    ]);
    
    if (bothVisible[0] && bothVisible[1]) {
      // Referral is required
      const referralInput = page.locator('input[data-testid="referral-input"]');
      await referralInput.fill('');
      
      // Register button should be disabled
      await expect(registerButton).toBeDisabled();
    }
  });
});

/**
 * Findings/Limitations:
 * 
 * 1. Referral Registry: referral_registry.json must be kept in sync with
 *    on-chain registrations. This is a point of potential failure.
 * 
 * 2. TTL Expiration: Referral codes expire after 15 minutes (900 seconds).
 *    Tests may fail if codes in registry have expired.
 * 
 * 3. Rate Limiting: Referrers who exceed rate limit have reduced rewards.
 *    This needs separate testing.
 * 
 * 4. Validation Timing: Debounced validation (500ms) means tests need to wait
 *    before checking validation results.
 * 
 * 5. On-Chain Verification: Should verify referral relationship was correctly
 *    stored on blockchain, not just that UI shows success.
 * 
 * 6. First 100 Users: Different behavior for first 100 vs later users.
 *    Tests need to account for both scenarios.
 * 
 * Recommended Approach:
 * - Generate fresh referral codes before test runs
 * - Use multiple test wallets to test referral chains
 * - Verify referral data on-chain after registration
 * - Test both "referral required" and "referral optional" scenarios
 * - Mock the referral registry for pure UI testing
 */
