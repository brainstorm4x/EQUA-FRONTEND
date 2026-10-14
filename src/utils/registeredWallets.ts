import type { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';

/**
 * Remembers, on this device, which wallets have registered.
 *
 * Right after registering, an RPC node can still answer "not registered" for
 * a few seconds (it may be a slot or two behind, or read at a slower
 * commitment). Without this, a reload or the back button in that window
 * showed the registration form to a user who had just registered. Once a
 * wallet is known to be registered, the site never shows it the form again.
 *
 * Keyed by program ID, so a new deployment (where nobody is registered yet)
 * starts clean. Storage can be unavailable (private mode, blocked site data);
 * then this simply remembers nothing and the on-chain check decides.
 */
const key = (wallet: PublicKey) => `uniyaa:registered:${PROGRAM_ID.toBase58()}:${wallet.toBase58()}`;

export function rememberRegistered(wallet: PublicKey): void {
  try {
    window.localStorage.setItem(key(wallet), '1');
  } catch {
    // storage unavailable: nothing to remember
  }
}

export function wasRegistered(wallet: PublicKey): boolean {
  try {
    return window.localStorage.getItem(key(wallet)) === '1';
  } catch {
    return false;
  }
}
