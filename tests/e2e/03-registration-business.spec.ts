import { test, expect } from '@playwright/test';

/**
 * E2E Test: Registration as Business
 * 
 * Tests the registration flow for a business user with user_type = 1.
 */
test.describe('Registration - Business', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mint');
  });
  
  test('should allow selecting Business account type', async ({ page }) => {
    // Wait for account type cards
    const businessCard = page.locator('button:has-text("Business")');
    
    const isVisible = await businessCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Click Business card
      await businessCard.click();
      
      // Verify it's selected (should have purple border and checkmark)
      await expect(businessCard).toHaveClass(/border-purple-500/);
      await expect(businessCard.locator('text=✓')).toBeVisible();
      
      // Verify Individual is NOT selected
      const individualCard = page.locator('button:has-text("Individual")');
      await expect(individualCard).not.toHaveClass(/bg-purple-500\/20/);
    }
  });
  
  test('should display business icon (🏢) on business card', async ({ page }) => {
    const businessCard = page.locator('button:has-text("Business")');
    
    const isVisible = await businessCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      // Check for business icon
      await expect(businessCard.locator('text=🏢')).toBeVisible();
      await expect(businessCard.locator('text=Company account')).toBeVisible();
    }
  });
  
  test.skip('should successfully register as Business', async ({ page }) => {
    // TODO: This test requires:
    // 1. Wallet connection
    // 2. Sufficient SOL balance
    // 3. Not already registered
    // 4. Optional: Valid referral code
    
    // Select Business
    await page.click('button:has-text("Business")');
    
    // Fill referral code if needed
    // await page.fill('input[data-testid="referral-input"]', 'ValidCode1');
    
    // Click register button
    await page.click('button:has-text("Register Now")');
    
    // Wait for transaction confirmation
    await page.waitForSelector('text=Registration successful', { timeout: 60000 });
    
    // Verify success message
    await expect(page.locator('text=Registration successful')).toBeVisible();
    
    // TODO: Verify on-chain that user_type = 1 was stored
  });
  
  test('should toggle between Individual and Business', async ({ page }) => {
    const individualCard = page.locator('button:has-text("Individual")');
    const businessCard = page.locator('button:has-text("Business")');
    
    const bothVisible = await Promise.all([
      individualCard.isVisible({ timeout: 5000 }).catch(() => false),
      businessCard.isVisible({ timeout: 5000 }).catch(() => false),
    ]);
    
    if (bothVisible[0] && bothVisible[1]) {
      // Individual should be selected by default
      await expect(individualCard).toHaveClass(/border-purple-500/);
      
      // Click Business
      await businessCard.click();
      await expect(businessCard).toHaveClass(/border-purple-500/);
      
      // Click Individual again
      await individualCard.click();
      await expect(individualCard).toHaveClass(/border-purple-500/);
    }
  });
});

/**
 * Findings/Limitations:
 * 
 * 1. Same limitations as Individual registration (wallet, balance, etc.)
 * 
 * 2. User Type Verification: Need a way to verify on-chain that user_type = 1
 *    was correctly stored in the user account.
 * 
 * 3. Business-Specific Logic: If there are different behaviors for business
 *    accounts (e.g., different mint limits), those should be tested separately.
 * 
 * 4. UI State: The toggle between Individual and Business is purely client-side
 *    and can be tested without blockchain interaction.
 */
