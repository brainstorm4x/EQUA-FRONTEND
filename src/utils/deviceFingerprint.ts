/**
 * Device Fingerprint Utility
 * 
 * Generates a unique browser fingerprint hash for anti-abuse measures.
 * This fingerprint is passed during registration and stored in metadata
 * to flag potential duplicate/fraudulent registrations.
 * 
 * Note: This is an optional frontend placeholder. The actual duplicate
 * detection and flagging should be implemented on the backend/off-chain service.
 */

/**
 * Generates a simple hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and ensure positive
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Collects browser and device characteristics for fingerprinting
 */
export interface FingerprintData {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  touchSupport: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  plugins: string[];
  canvas: string;
  webglVendor: string;
  webglRenderer: string;
}

/**
 * Collects various browser characteristics for fingerprinting
 */
export function collectFingerprintData(): FingerprintData {
  if (typeof window === 'undefined') {
    // Return default values for SSR
    return {
      userAgent: '',
      language: '',
      platform: '',
      screenResolution: '0x0',
      timezone: '',
      colorDepth: 0,
      deviceMemory: null,
      hardwareConcurrency: 0,
      touchSupport: false,
      cookieEnabled: false,
      doNotTrack: null,
      plugins: [],
      canvas: '',
      webglVendor: '',
      webglRenderer: '',
    };
  }

  const nav = navigator;
  const screen = window.screen;

  // Collect basic browser info
  const data: FingerprintData = {
    userAgent: nav.userAgent,
    language: nav.language,
    platform: nav.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    deviceMemory: (nav as Navigator & { deviceMemory?: number }).deviceMemory || null,
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    touchSupport: 'ontouchstart' in window || nav.maxTouchPoints > 0,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    plugins: [],
    canvas: '',
    webglVendor: '',
    webglRenderer: '',
  };

  // Collect plugin information
  if (nav.plugins) {
    data.plugins = Array.from(nav.plugins).map(p => p.name);
  }

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('UNIYAA Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Canvas Test', 4, 35);
      data.canvas = canvas.toDataURL();
    }
  } catch {
    data.canvas = 'canvas-not-available';
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const webgl = gl as WebGLRenderingContext;
      const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        data.webglVendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        data.webglRenderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch {
    data.webglVendor = 'webgl-not-available';
    data.webglRenderer = 'webgl-not-available';
  }

  return data;
}

/**
 * Generates a fingerprint hash from collected browser data
 * @returns A hex string representing the device fingerprint
 */
export function generateDeviceFingerprint(): string {
  const data = collectFingerprintData();
  
  // Create a string from all the collected data
  const fingerprintString = [
    data.userAgent,
    data.language,
    data.platform,
    data.screenResolution,
    data.timezone,
    data.colorDepth.toString(),
    data.deviceMemory?.toString() || 'null',
    data.hardwareConcurrency.toString(),
    data.touchSupport.toString(),
    data.cookieEnabled.toString(),
    data.doNotTrack || 'null',
    data.plugins.join(','),
    data.canvas.slice(-50), // Use last 50 chars of canvas data
    data.webglVendor,
    data.webglRenderer,
  ].join('|');

  // Generate hash from the fingerprint string
  // Using multiple rounds for better distribution
  let hash1 = simpleHash(fingerprintString);
  let hash2 = simpleHash(fingerprintString.split('').reverse().join(''));
  let hash3 = simpleHash(hash1 + hash2);
  
  return `${hash1}${hash2}${hash3}`.slice(0, 32);
}

/**
 * Stores the fingerprint in localStorage for persistence
 */
export function storeFingerprint(fingerprint: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('uniyaa_device_fingerprint', fingerprint);
  } catch {
    console.warn('Unable to store fingerprint in localStorage');
  }
}

/**
 * Retrieves the stored fingerprint from localStorage
 */
export function getStoredFingerprint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('uniyaa_device_fingerprint');
  } catch {
    return null;
  }
}

/**
 * Gets or generates a device fingerprint
 * Uses cached version if available, otherwise generates new one
 */
export function getOrGenerateFingerprint(): string {
  // Check for existing fingerprint
  const stored = getStoredFingerprint();
  if (stored) {
    return stored;
  }

  // Generate new fingerprint
  const fingerprint = generateDeviceFingerprint();
  storeFingerprint(fingerprint);
  return fingerprint;
}

/**
 * Interface for fingerprint metadata to be included in registration
 */
export interface FingerprintMetadata {
  fingerprint: string;
  timestamp: number;
  userAgent: string;
}

/**
 * Creates fingerprint metadata for registration
 */
export function createFingerprintMetadata(): FingerprintMetadata {
  return {
    fingerprint: getOrGenerateFingerprint(),
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}
