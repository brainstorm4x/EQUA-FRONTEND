/**
 * Wallet Environment Detection Utility
 * 
 * Detects three distinct wallet connection environments:
 * 1. Desktop - Browser extensions via window.solana
 * 2. Mobile In-App Browser - Injected wallet via window.solana (Phantom/Solflare in-app)
 * 3. Mobile External Browser - Deep linking to installed wallet apps
 * 
 * This distinction is critical because:
 * - Desktop/In-App: Use standard wallet adapters (PhantomWalletAdapter, SolflareWalletAdapter)
 * - Mobile External: Use Mobile Wallet Adapter with deep linking
 */

/**
 * Wallet environment types
 */
export type WalletEnvironment = 
  | 'desktop'           // Desktop browser with extensions
  | 'mobile-inapp'      // Mobile in-app browser (Phantom/Solflare)
  | 'mobile-browser';   // Mobile external browser (Chrome/Safari)

/**
 * Detects if the device is mobile based on user agent and touch capability
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const hasMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);

  // Check for touch capability (more reliable than UA alone)
  const hasTouchCapability = 
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  return hasMobileUserAgent || hasTouchCapability;
}

/**
 * Detects if running in a mobile wallet's in-app browser
 * 
 * Mobile wallet apps inject their wallet objects into their in-app browsers,
 * similar to how browser extensions work on desktop.
 */
function isMobileInAppBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for Phantom mobile in-app browser.
  // Phantom's built-in browser injects window.phantom.solana with isPhantom === true.
  // This signature is ONLY present inside the Phantom app's built-in browser —
  // NOT in Chrome on Android even when Phantom is installed.
  const hasPhantomMobile =
    typeof (window as any).phantom !== 'undefined' &&
    typeof (window as any).phantom.solana !== 'undefined' &&
    (window as any).phantom.solana.isPhantom === true;

  // Check for Solflare mobile in-app browser.
  // Solflare's built-in browser injects window.solflare with isSolflare === true.
  const hasSolflareMobile =
    typeof (window as any).solflare !== 'undefined' &&
    (window as any).solflare?.isSolflare === true;

  // IMPORTANT: Do NOT use `typeof window.solana !== 'undefined'` as a signal.
  //
  // The Mobile Wallet Adapter (MWA) library and WalletConnect bridge inject window.solana
  // into Chrome on Android when a wallet (e.g. Phantom) is installed. Using window.solana
  // as an in-app signal causes a false-positive: Chrome mobile users are classified as
  // 'mobile-inapp' instead of 'mobile-browser', which bypasses the mobileRegister()
  // function and routes them to the desktop signing path. The desktop path still uses
  // signTransaction() which deep-links and orphans the Promise, resulting in
  // "Signature verification failed".

  return hasPhantomMobile || hasSolflareMobile;
}

/**
 * Detects the current wallet environment
 * 
 * Returns:
 * - 'desktop': Desktop browser (may have wallet extensions)
 * - 'mobile-inapp': Mobile in-app browser (Phantom/Solflare with injected wallet)
 * - 'mobile-browser': Mobile external browser (Chrome/Safari - needs deep linking)
 */
export function detectWalletEnvironment(): WalletEnvironment {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // SSR context - default to desktop
    return 'desktop';
  }

  const isMobile = isMobileDevice();
  
  // If not mobile, it's desktop
  if (!isMobile) {
    console.log('🖥️ [WalletEnvironment] Detected: Desktop');
    return 'desktop';
  }

  // Mobile device - check if in-app browser
  const isInApp = isMobileInAppBrowser();
  
  if (isInApp) {
    console.log('📱 [WalletEnvironment] Detected: Mobile In-App Browser');
    console.log('  - Wallet injection detected via window.phantom or window.solflare');
    return 'mobile-inapp';
  }

  console.log('📱 [WalletEnvironment] Detected: Mobile External Browser');
  console.log('  - Will use Mobile Wallet Adapter with deep linking');
  return 'mobile-browser';
}

/**
 * Get a human-readable description of the wallet environment
 */
export function getEnvironmentDescription(env: WalletEnvironment): string {
  switch (env) {
    case 'desktop':
      return 'Desktop browser with wallet extensions';
    case 'mobile-inapp':
      return 'Mobile wallet in-app browser';
    case 'mobile-browser':
      return 'Mobile browser (Chrome/Safari) with deep linking';
    default:
      return 'Unknown environment';
  }
}

/**
 * Check if the current environment requires Mobile Wallet Adapter
 */
export function requiresMobileWalletAdapter(): boolean {
  return detectWalletEnvironment() === 'mobile-browser';
}

/**
 * Check if the current environment supports injected wallets
 */
export function supportsInjectedWallet(): boolean {
  const env = detectWalletEnvironment();
  return env === 'desktop' || env === 'mobile-inapp';
}
