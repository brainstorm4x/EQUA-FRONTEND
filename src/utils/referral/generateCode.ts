/**
 * Utility for generating unique referral codes
 */

import { CODE_LENGTH, CODE_CHARACTERS } from '@/config/referral';

/** In-memory set to track generated codes for uniqueness (placeholder) */
const generatedCodes = new Set<string>();

/**
 * Generates a cryptographically random referral code
 * @returns A 10-character alphanumeric string
 */
export function generateReferralCode(): string {
  let code: string;
  
  // Keep generating until we get a unique code
  do {
    code = generateRandomString(CODE_LENGTH);
  } while (generatedCodes.has(code));
  
  // Track this code to prevent duplicates
  generatedCodes.add(code);
  
  return code;
}

/**
 * Generates a random alphanumeric string of specified length
 * @param length - The desired length of the string
 * @returns A random alphanumeric string
 */
function generateRandomString(length: number): string {
  // Use crypto.getRandomValues for cryptographically secure random numbers
  const array = new Uint8Array(length);
  
  // Check if we're in a browser environment with crypto API
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto API (testing/Node.js)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_CHARACTERS[array[i] % CODE_CHARACTERS.length];
  }
  
  return result;
}

/**
 * Clears the generated codes set (useful for testing)
 */
export function clearGeneratedCodes(): void {
  generatedCodes.clear();
}

/**
 * Checks if a code has already been generated
 * @param code - The code to check
 * @returns true if the code exists in the generated set
 */
export function isCodeGenerated(code: string): boolean {
  return generatedCodes.has(code);
}
