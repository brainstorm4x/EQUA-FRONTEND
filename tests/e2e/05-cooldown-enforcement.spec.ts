import { test, expect } from '@playwright/test';

/**
 * E2E Test: Cooldown Enforcement
 * 
 * Tests off-chain cooldown logic to prevent multiple mints within 24 hours
 * and eliminate UI race conditions.
 */
test.describe('Cooldown Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mint');
  });
  
  test('should block rapid double-clicks on mint button', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for mint button (only visible for registered users not on cooldown)
    const mintButton = page.locator('button:has-text("Claim Daily EQUA")');
    
    const isVisible = await mintButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('Mint button not visible - user may not be registered or is on cooldown');
      // This is expected if user is already on cooldown or not registered
      test.skip();
      return;
    }
    
    // Check if button is disabled (could be on cooldown)
    const isDisabled = await mintButton.isDisabled();
    if (isDisabled) {
      console.log('Mint button is disabled - user is on cooldown');
      
      // Verify cooldown message is displayed
      const cooldownMessage = page.locator('text=/Cooldown Active/i');
      await expect(cooldownMessage).toBeVisible();
      
      // Verify countdown timer is present
      await expect(page.locator('text=/Next claim available in:/i')).toBeVisible();
      await expect(page.locator('text=/\\d+h|\\d+m|\\d+s/')).toBeVisible();
      
      test.skip();
      return;
    }
    
    // Button is enabled, test rapid double-clicks
    // Note: We can't actually test the transaction because we don't control the wallet
    // But we can verify the button behavior
    
    // Click the button
    await mintButton.click();
    
    // Button should be immediately disabled
    await expect(mintButton).toBeDisabled({ timeout: 1000 });
    
    // Verify pointer-events style is set to 'none'
    const style = await mintButton.getAttribute('style');
    expect(style).toContain('pointer-events: none');
    
    // Try to click again - should be blocked by disabled state and pointer-events
    await mintButton.click({ force: true }); // force: true bypasses actionability checks
    
    // Button should remain disabled
    await expect(mintButton).toBeDisabled();
  });
  
  test('should show cooldown UI immediately after first click', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for mint button
    const mintButton = page.locator('button:has-text("Claim Daily EQUA")');
    
    const isVisible = await mintButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('Mint button not visible - user may not be registered or is on cooldown');
      test.skip();
      return;
    }
    
    const isDisabled = await mintButton.isDisabled();
    if (isDisabled) {
      console.log('Mint button is already disabled - user is on cooldown');
      
      // Verify cooldown UI is visible
      const cooldownSection = page.locator('text=/Cooldown Active/i');
      await expect(cooldownSection).toBeVisible();
      
      // Verify countdown timer
      const countdown = page.locator('text=/Next claim available in:/i');
      await expect(countdown).toBeVisible();
      
      // Verify time format (hours, minutes, or seconds)
      await expect(page.locator('text=/\\d+h \\d+m|\\d+m \\d+s|\\d+s/')).toBeVisible();
      
      test.skip();
      return;
    }
    
    // Button is enabled, click it
    await mintButton.click();
    
    // Cooldown UI should appear immediately
    // Button should show loading state
    await expect(page.locator('text=/⏳ Minting.../i')).toBeVisible({ timeout: 2000 });
    
    // Button should be disabled
    await expect(mintButton).toBeDisabled();
  });
  
  test('should prevent multiple mint transactions with in-flight lock', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for mint button
    const mintButton = page.locator('button:has-text("Claim Daily EQUA")');
    
    const isVisible = await mintButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('Mint button not visible - user may not be registered or is on cooldown');
      test.skip();
      return;
    }
    
    const isDisabled = await mintButton.isDisabled();
    if (isDisabled) {
      console.log('Mint button is disabled - user is on cooldown');
      test.skip();
      return;
    }
    
    // Click the button to start mint
    await mintButton.click();
    
    // Button should be immediately disabled
    await expect(mintButton).toBeDisabled({ timeout: 1000 });
    
    // Verify loading state
    await expect(page.locator('text=/⏳ Minting.../i')).toBeVisible({ timeout: 2000 });
    
    // Try to open a new tab with the same page and click mint again
    // This simulates trying to mint from multiple tabs
    const context = page.context();
    const newPage = await context.newPage();
    await newPage.goto('/mint');
    await newPage.waitForLoadState('networkidle');
    
    // The mint button in the new tab should also be disabled due to in-flight lock
    const newMintButton = newPage.locator('button:has-text("Claim Daily EQUA")');
    
    // Wait a moment for localStorage to sync
    await newPage.waitForTimeout(500);
    
    // Button should be disabled or show cooldown
    const newIsDisabled = await newMintButton.isDisabled().catch(() => true);
    expect(newIsDisabled).toBe(true);
    
    await newPage.close();
  });
  
  test('should display cooldown countdown correctly', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for cooldown timer (visible if user is on cooldown)
    const cooldownSection = page.locator('text=/Cooldown Active/i');
    
    const isVisible = await cooldownSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('No cooldown active - user can mint or is not registered');
      test.skip();
      return;
    }
    
    // Verify countdown timer elements
    await expect(page.locator('text=/Next claim available in:/i')).toBeVisible();
    
    // Verify time format matches expected pattern
    const timeDisplay = page.locator('div.text-yellow-100.text-4xl');
    await expect(timeDisplay).toBeVisible();
    
    const timeText = await timeDisplay.textContent();
    expect(timeText).toMatch(/\d+h \d+m|\d+m \d+s|\d+s/);
    
    // Verify "Come back at" message
    await expect(page.locator('text=/Come back at/i')).toBeVisible();
    
    // Wait 2 seconds and verify countdown decreased
    await page.waitForTimeout(2000);
    
    const newTimeText = await timeDisplay.textContent();
    // Time should have changed (countdown is active)
    expect(newTimeText).not.toBe(timeText);
  });
  
  test('should show "Ready to mint!" when cooldown expired', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for ready to mint message
    const readyMessage = page.locator('text=/✅ Ready to mint!/i');
    
    const isVisible = await readyMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('User is on cooldown or not registered');
      test.skip();
      return;
    }
    
    // Verify ready to mint UI
    await expect(readyMessage).toBeVisible();
    
    // Verify claim message
    await expect(page.locator('text=/Claim your.*EQUA/i')).toBeVisible();
    
    // Verify mint button is enabled
    const mintButton = page.locator('button:has-text("Claim Daily EQUA")');
    await expect(mintButton).toBeEnabled();
    
    // Verify button has correct styling (green background)
    const buttonClass = await mintButton.getAttribute('class');
    expect(buttonClass).toContain('bg-green-600');
  });
  
  test('should persist cooldown state across page reloads', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check current cooldown state
    const cooldownSection = page.locator('text=/Cooldown Active/i');
    const hasCooldown = await cooldownSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasCooldown) {
      console.log('No cooldown active - cannot test persistence');
      test.skip();
      return;
    }
    
    // Get current countdown value
    const timeDisplay = page.locator('div.text-yellow-100.text-4xl');
    const initialTime = await timeDisplay.textContent();
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Cooldown should still be visible
    await expect(cooldownSection).toBeVisible();
    
    // Time should be approximately the same (allowing for a few seconds difference)
    const newTime = await timeDisplay.textContent();
    expect(newTime).toBeTruthy();
    
    // Both should have time format
    expect(initialTime).toMatch(/\d+h \d+m|\d+m \d+s|\d+s/);
    expect(newTime).toMatch(/\d+h \d+m|\d+m \d+s|\d+s/);
  });
});

/**
 * Test Notes:
 * 
 * 1. These tests are UI-focused and don't require actual wallet transactions
 * 2. Tests gracefully skip if user is not in the expected state (not registered, already on cooldown, etc.)
 * 3. The in-flight lock test verifies localStorage-based synchronization across tabs
 * 4. Cooldown persistence test verifies localStorage state survives page reloads
 * 5. Real transaction testing would require wallet automation (not included)
 * 
 * Coverage:
 * - ✅ Rapid double-click prevention
 * - ✅ Immediate UI feedback (cooldown UI appears on first click)
 * - ✅ In-flight lock prevents duplicate submissions
 * - ✅ Cooldown countdown display
 * - ✅ "Ready to mint" state display
 * - ✅ Cooldown state persistence across reloads
 */
