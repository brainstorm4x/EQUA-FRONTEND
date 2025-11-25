import { test, expect } from '@playwright/test';

/**
 * E2E tests for home page
 * 
 * Verifies:
 * - "Register Now" CTA button is displayed (not "Get Started")
 * - Navigation to mint/registration page works
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display "Register Now" CTA button', async ({ page }) => {
    // Look for the main CTA button with "Register Now" text
    const ctaButton = page.locator('a:has-text("Register Now")');
    
    await expect(ctaButton).toBeVisible();
    
    // Verify it links to the mint page
    const href = await ctaButton.getAttribute('href');
    expect(href).toBe('/mint');
  });

  test('should NOT display "Get Started" button', async ({ page }) => {
    // Verify old "Get Started" text is no longer used
    const oldButton = page.locator('a:has-text("Get Started")');
    const count = await oldButton.count();
    
    expect(count).toBe(0);
  });

  test('should navigate to mint page when CTA is clicked', async ({ page }) => {
    const ctaButton = page.locator('a:has-text("Register Now")');
    await ctaButton.click();
    
    // Wait for navigation
    await page.waitForURL('**/mint');
    
    // Verify we're on the mint page
    expect(page.url()).toContain('/mint');
  });
});
