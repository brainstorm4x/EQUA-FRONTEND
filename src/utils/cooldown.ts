/**
 * Minting cooldown period.
 *
 * The cooldown itself lives on-chain: the program stores last_mint_time in the
 * UserAccount and refuses a mint within MINTING_COOLDOWN_SECONDS of it
 * (MintingCooldownNotExpired), even when two mints are sent at once. The mint
 * page reads last_mint_time from the chain to show the countdown, and guards
 * double clicks with an in-page lock. Nothing about the cooldown is kept in
 * the browser: a stored copy could go stale and contradict the chain (it once
 * blocked minting for 30 days after a mint that never happened).
 */

// Default 2592000 = 30 days, matching MINTING_COOLDOWN_SECONDS in the program
const MINT_COOLDOWN_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_MINT_COOLDOWN_SECONDS || '2592000',
  10
);

/**
 * Get the cooldown period in seconds
 * @returns Cooldown period in seconds
 */
export function getCooldownPeriod(): number {
  return MINT_COOLDOWN_SECONDS;
}
