/**
 * Public-key validation helper.
 *
 * The previous version of this module maintained a per-browser localStorage
 * registry of "already registered" public keys. That layer was security
 * theatre: clearing localStorage bypassed it, and the canonical source of
 * truth is the on-chain `UserAccount` PDA (see
 * `isUserAccountRegisteredOnchain` in `onchainRegistration.ts`). Callers now
 * rely on the on-chain check directly.
 */

/**
 * Validates a public key format.
 * Solana public keys are exactly 44 characters in base58 encoding.
 */
export function isValidPublicKey(publicKey: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44}$/;
  return base58Regex.test(publicKey);
}
