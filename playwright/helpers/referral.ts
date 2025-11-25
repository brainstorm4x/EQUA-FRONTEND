/**
 * Playwright helper utilities for referral code E2E tests
 */
import { Page, expect } from '@playwright/test';

// Mock referral registry data aligned with src/utils/referral/registry.ts
export interface ReferralCodeEntry {
  referrer_pubkey: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface MockRegistry {
  [code: string]: ReferralCodeEntry;
}

// Test data constants
export const TEST_PUBKEY_VALID = '11111111111111111111111111111111';
export const TEST_PUBKEY_USED = '22222222222222222222222222222222';
export const TEST_PUBKEY_EXPIRED = '33333333333333333333333333333333';
export const TEST_PUBKEY_INPUT = 'BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL';

// Mock referral codes that match the registry in src/utils/referral/registry.ts
export const VALID_CODE = 'ABC123xyz9';
export const USED_CODE = 'UsedCode01';
export const EXPIRED_CODE = 'ExpiredCd1';

// Test-friendly codes for various scenarios
export const TEST_NOT_FOUND_CODE = 'Unknown123';
export const TEST_MALFORMED_INPUT = '@@@';

/**
 * Enters a value into the referral input field
 */
export async function enterReferral(page: Page, value: string): Promise<void> {
  const input = page.locator('[data-testid="referral-input"], #referrer-input, [placeholder*="referral"]').first();
  await input.clear();
  await input.fill(value);
}

/**
 * Waits for the referral status to appear with a specific state
 */
export async function waitForReferralStatus(
  page: Page, 
  testId: string, 
  timeout: number = 5000
): Promise<void> {
  await page.waitForSelector(`[data-testid="${testId}"]`, { 
    state: 'visible',
    timeout 
  });
}

/**
 * Waits for the referral loading indicator to disappear
 */
export async function waitForReferralResolution(page: Page, timeout: number = 5000): Promise<void> {
  // Wait for loading to disappear (if visible)
  const loadingIndicator = page.locator('[data-testid="referral-loading"]');
  const isLoadingVisible = await loadingIndicator.isVisible().catch(() => false);
  
  if (isLoadingVisible) {
    await loadingIndicator.waitFor({ state: 'hidden', timeout });
  }
  
  // Additional small wait for state to settle
  await page.waitForTimeout(100);
}

/**
 * Captures a screenshot with a specific name
 */
export async function captureScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ 
    path: `playwright-artifacts/${name}`, 
    fullPage: false 
  });
}

/**
 * Gets the current referral status text
 */
export async function getReferralStatusText(page: Page): Promise<string | null> {
  const statusElement = page.locator('[data-testid^="referral-"]').first();
  const isVisible = await statusElement.isVisible().catch(() => false);
  if (isVisible) {
    return await statusElement.textContent();
  }
  return null;
}

/**
 * Checks if the register button is enabled
 */
export async function isRegisterButtonEnabled(page: Page): Promise<boolean> {
  const button = page.locator('button:has-text("Register")');
  const isDisabled = await button.getAttribute('disabled');
  return isDisabled === null;
}

/**
 * Waits for the referral input field to be visible and ready
 */
export async function waitForReferralInputReady(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for the page to settle
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for the referral input to be visible
  const input = page.locator('[data-testid="referral-input"], #referrer-input, [placeholder*="referral"]').first();
  await input.waitFor({ state: 'visible', timeout });
}

/**
 * Validates that a specific referral state indicator is visible
 */
export async function expectReferralState(
  page: Page, 
  expectedState: 'valid' | 'used' | 'expired' | 'not-found' | 'pubkey' | 'error' | 'loading'
): Promise<void> {
  const testIdMap: Record<string, string> = {
    'valid': 'referral-valid',
    'used': 'referral-used',
    'expired': 'referral-expired',
    'not-found': 'referral-not-found',
    'pubkey': 'referral-pubkey',
    'error': 'referral-error',
    'loading': 'referral-loading',
  };
  
  const testId = testIdMap[expectedState];
  const indicator = page.locator(`[data-testid="${testId}"]`);
  await expect(indicator).toBeVisible({ timeout: 5000 });
}

/**
 * Navigates to the mint/registration page and waits for it to be ready
 */
export async function navigateToMintPage(page: Page): Promise<void> {
  await page.goto('/mint');
  await page.waitForLoadState('networkidle');
}

/**
 * Sets up test mode by injecting test parameters
 * This can be extended to inject test-specific configurations
 */
export async function setupTestMode(page: Page): Promise<void> {
  // Expose test mode flag for the application
  await page.addInitScript(() => {
    (window as any).__TEST_MODE__ = true;
    (window as any).__TEST_DEBOUNCE_MS__ = 0;
  });
}

/**
 * Mock API response helper for generating referral codes via API
 * Note: This requires the API route to be implemented in the application
 */
export async function generateReferralCodeViaApi(
  page: Page,
  referrerPubkey: string = TEST_PUBKEY_VALID
): Promise<{ code: string } | null> {
  try {
    const response = await page.request.post('/api/referral-codes/generate', {
      data: { referrer_pubkey: referrerPubkey }
    });
    
    if (response.ok()) {
      return await response.json();
    }
    return null;
  } catch {
    // API not implemented yet - return null
    return null;
  }
}

/**
 * Mock API response helper for marking a code as used
 * Note: This requires the API route to be implemented in the application
 */
export async function markReferralCodeUsed(
  page: Page,
  code: string
): Promise<boolean> {
  try {
    const response = await page.request.post('/api/referral-codes/mark-used', {
      data: { code }
    });
    
    return response.ok();
  } catch {
    // API not implemented yet
    return false;
  }
}

/**
 * Mock API response helper for getting global state
 * Note: This requires the API route to be implemented in the application
 */
export async function getGlobalState(page: Page): Promise<{ user_count: number } | null> {
  try {
    const response = await page.request.get('/api/global-state');
    
    if (response.ok()) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}
