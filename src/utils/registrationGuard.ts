/**
 * Registration Guard Utility
 * 
 * Prevents duplicate registrations by tracking registered public keys.
 * This is a client-side mechanism for immediate feedback.
 * 
 * IMPORTANT: This should be complemented with on-chain validation.
 * The Solana program should also check if a user account already exists
 * for the given public key.
 * 
 * For production with persistent storage:
 * - Consider using Netlify KV store (free tier available)
 * - Or Netlify Edge Functions with external DB
 * - Or a simple backend API with database
 */

const STORAGE_KEY = 'equa_registered_public_keys';

export interface RegisteredKeyData {
  publicKey: string;
  registeredAt: number;
  deviceFingerprint?: string;
}

export interface RegistrationGuardRegistry {
  keys: RegisteredKeyData[];
  lastUpdated: number;
}

/**
 * Gets the registry of registered public keys from localStorage
 */
export function getRegisteredKeysRegistry(): RegistrationGuardRegistry {
  if (typeof window === 'undefined') {
    return { keys: [], lastUpdated: 0 };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { keys: [], lastUpdated: 0 };
    }
    return JSON.parse(stored);
  } catch {
    console.warn('Failed to parse registered keys registry');
    return { keys: [], lastUpdated: 0 };
  }
}

/**
 * Saves the registry to localStorage
 */
export function saveRegisteredKeysRegistry(registry: RegistrationGuardRegistry): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch {
    console.warn('Failed to save registered keys registry');
  }
}

/**
 * Checks if a public key has already been registered
 * @param publicKey - The public key to check (base58 string)
 * @returns true if already registered, false otherwise
 */
export function isPublicKeyRegistered(publicKey: string): boolean {
  const registry = getRegisteredKeysRegistry();
  return registry.keys.some(k => k.publicKey === publicKey);
}

/**
 * Records a successful registration
 * @param publicKey - The public key that was registered
 * @param fingerprint - Optional device fingerprint
 */
export function recordRegisteredKey(publicKey: string, fingerprint?: string): void {
  const registry = getRegisteredKeysRegistry();
  
  // Check if already exists (avoid duplicates)
  if (registry.keys.some(k => k.publicKey === publicKey)) {
    console.log('Public key already recorded in registry');
    return;
  }
  
  registry.keys.push({
    publicKey,
    registeredAt: Date.now(),
    deviceFingerprint: fingerprint
  });
  registry.lastUpdated = Date.now();
  
  saveRegisteredKeysRegistry(registry);
  console.log(`✅ Recorded registration for public key: ${publicKey.slice(0, 8)}...`);
}

/**
 * Gets all registered public keys
 */
export function getAllRegisteredKeys(): string[] {
  return getRegisteredKeysRegistry().keys.map(k => k.publicKey);
}

/**
 * Gets registration data for a specific public key
 */
export function getRegistrationData(publicKey: string): RegisteredKeyData | null {
  const registry = getRegisteredKeysRegistry();
  return registry.keys.find(k => k.publicKey === publicKey) || null;
}

/**
 * Clears the registered keys registry (for testing/admin purposes)
 */
export function clearRegisteredKeysRegistry(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Registered keys registry cleared');
  } catch {
    console.warn('Failed to clear registered keys registry');
  }
}

/**
 * Gets total count of registered keys
 */
export function getRegisteredKeysCount(): number {
  return getRegisteredKeysRegistry().keys.length;
}

/**
 * Validates a public key format
 * Solana public keys are exactly 44 characters in base58 encoding
 */
export function isValidPublicKey(publicKey: string): boolean {
  // Base58 characters used in Solana addresses (exactly 44 chars)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
  return base58Regex.test(publicKey);
}
