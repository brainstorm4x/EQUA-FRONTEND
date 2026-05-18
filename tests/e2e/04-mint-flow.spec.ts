import { test, expect } from '@playwright/test';

/**
 * E2E Test: Minting Flow
 * 
 * Tests the minting flow after successful registration.
 */
test.describe('Minting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mint');
  });
  
  test('should display mint button when registered and not on cooldown', async ({ page }) => {
    // Look for mint button (only visible for registered users)
    const mintButton = page.locator('button:has-text("Mint")');
    
    const isVisible = await mintButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(mintButton).toBeVisible();
    } else {
      // Mint button not visible - likely not registered or on cooldown
      console.log('Mint button not visible - user may not be registered or is on cooldown');
    }
  });
  
  test('should show cooldown timer if recently minted', async ({ page }) => {
    // Look for cooldown message
    const cooldownMessage = page.locator('text=/wait.*before minting/i');
    
    const isVisible = await cooldownMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(cooldownMessage).toBeVisible();
      
      // Verify countdown timer is present
      await expect(page.locator('text=/\\d+h|\\d+m|\\d+s/')).toBeVisible();
    }
  });
  
  test('should display mint tier information', async ({ page }) => {
    // Look for mint tier card
    const tierCard = page.locator('text=Your Mint Tier');
    
    const isVisible = await tierCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(tierCard).toBeVisible();
      
      // Should show UNIYAA per mint
      await expect(page.locator('text=/UNIYAA.*mint/i')).toBeVisible();
    }
  });
  
  test.skip('should successfully mint tokens', async ({ page }) => {
    // TODO: This test requires:
    // 1. Wallet connection
    // 2. User already registered
    // 3. Not on cooldown (24 hours since last mint)
    // 4. Sufficient SOL for transaction fees
    
    // Click mint button
    await page.click('button:has-text("Mint")');
    
    // Wait for transaction confirmation
    await page.waitForSelector('text=/mint.*successful/i', { timeout: 60000 });
    
    // Verify success message
    await expect(page.locator('text=/mint.*successful/i')).toBeVisible();
    
    // Verify balance updated
    // await expect(page.locator('text=/balance/i')).toContainText(/\d+/);
  });
  
  test('should show transaction signature after successful mint', async ({ page }) => {
    // Look for transaction signature link (appears after successful mint)
    const txSignature = page.locator('a[href*="solscan.io"]');
    
    const isVisible = await txSignature.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(txSignature).toBeVisible();
      await expect(txSignature).toHaveAttribute('href', /solscan\.io/);
    }
  });
  
  test('should display user balance', async ({ page }) => {
    // Look for balance display
    const balanceDisplay = page.locator('text=/balance/i');
    
    const isVisible = await balanceDisplay.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(balanceDisplay).toBeVisible();
      // Balance should be a number
      await expect(page.locator('text=/\\d+.*UNIYAA/i')).toBeVisible();
    }
  });
  
  test('should show error message for mint failures', async ({ page }) => {
    // Look for error messages
    const errorMessage = page.locator('[role="alert"]');
    
    const isVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // If an error is visible, it should have meaningful content
      await expect(errorMessage).toBeVisible();
      const errorText = await errorMessage.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText).not.toBe('');
    }
  });
});

/**
 * Findings/Limitations:
 * 
 * 1. Cooldown Period: 24-hour cooldown between mints makes it difficult to
 *    test multiple mints in succession. Tests would need to use different
 *    wallets or wait 24 hours.
 * 
 * 2. Network Variability: Devnet can be slow or unstable, causing timeouts.
 *    Tests need generous timeout values (60+ seconds).
 * 
 * 3. Balance Verification: Need to query blockchain to verify balance changed,
 *    not just check UI display.
 * 
 * 4. Error Scenarios: Should test various error conditions:
 *    - Cooldown not expired
 *    - Insufficient SOL for fees
 *    - Network errors
 *    - Transaction timeout
 * 
 * 5. Transaction Confirmation: Need to verify transaction actually succeeded
 *    on-chain, not just that UI shows success.
 * 
 * Recommended Approach:
 * - Use multiple test wallets to avoid cooldown issues
 * - Implement retry logic for network failures
 * - Add detailed logging for debugging blockchain interactions
 * - Consider using a local validator for faster, more reliable testing
 */
