/**
 * Script to capture screenshots of the user type selection feature
 * 
 * Run with: npx playwright test screenshot-capture.spec.ts --headed
 */

import { test } from '@playwright/test';
import { captureScreenshot, navigateToMintPage, setupTestMode } from './helpers/referral';

test.describe('Screenshot Capture for Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestMode(page);
  });

  test('capture registration page with user type selection', async ({ page }) => {
    await navigateToMintPage(page);
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Capture full page
    await captureScreenshot(page, 'registration-page-full.png');
    
    // Check if user type buttons exist
    const individualButton = page.locator('[data-testid="user-type-individual"]');
    const businessButton = page.locator('[data-testid="user-type-business"]');
    
    const hasUserType = await individualButton.count() > 0;
    
    if (hasUserType) {
      // Individual selected (default)
      await captureScreenshot(page, 'user-type-individual-selected.png');
      
      // Click Business
      await businessButton.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, 'user-type-business-selected.png');
      
      // Focus on the user type selection area
      await individualButton.scrollIntoViewIfNeeded();
      await page.screenshot({ 
        path: 'playwright-artifacts/user-type-selection-closeup.png',
        clip: await businessButton.boundingBox() !== null ? {
          x: (await individualButton.boundingBox())!.x - 20,
          y: (await individualButton.boundingBox())!.y - 60,
          width: 600,
          height: 200
        } : undefined
      });
      
      console.log('✅ Screenshots captured successfully!');
    } else {
      console.log('⚠️ User type selection not found on page (may already be registered)');
    }
  });

  test('capture registration page with connect wallet prompt', async ({ page }) => {
    // Navigate without connecting wallet first
    await page.goto('/mint');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Capture the connect wallet screen
    await captureScreenshot(page, 'connect-wallet-prompt.png');
  });
});
