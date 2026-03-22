// app/src/utils/minting.ts

export interface MintSlot {
  minUser: number;
  maxUser: number;
  rate: number;      // UNIA per day
  period: number;    // Days initial rate applies, then --> prevailingRate
}

// Define your minting schedule
export const MINT_SLOTS: MintSlot[] = [
  { minUser: 1, maxUser: 10, rate: 10000, period: 100 },
  { minUser: 11, maxUser: 100, rate: 1000, period: 100 },
  { minUser: 101, maxUser: 1000, rate: 100, period: Number.POSITIVE_INFINITY },
  { minUser: 1001, maxUser: 10000, rate: 10, period: Number.POSITIVE_INFINITY },
  { minUser: 10001, maxUser: 100000, rate: 1, period: Number.POSITIVE_INFINITY },
  { minUser: 100001, maxUser: 1000000, rate: 0.1, period: Number.POSITIVE_INFINITY },
  { minUser: 1000001, maxUser: 10000000, rate: 0.01, period: Number.POSITIVE_INFINITY },
  { minUser: 10000001, maxUser: 100000000, rate: 0.001, period: Number.POSITIVE_INFINITY },
  { minUser: 100000001, maxUser: 1000000000, rate: 0.0001, period: Number.POSITIVE_INFINITY },
  { minUser: 1000000001, maxUser: Infinity, rate: 0.00001, period: Number.POSITIVE_INFINITY },
];

// Util for prevailing rate logic (extend for shifting as daily rates evolve)
export function prevailingRateByUserIndex(userIndex: number): number {
  for (const slot of MINT_SLOTS) {
    if (userIndex >= slot.minUser && userIndex <= slot.maxUser) {
      return slot.rate;
    }
  }
  // Default to lowest rate if userIndex is outside all defined slots
    if (MINT_SLOTS.length === 0) {
        throw new Error("No mint slots configured.");
    }
    // The exclamation mark '!' tells TS we are sure it isn't undefined here.
    return MINT_SLOTS[MINT_SLOTS.length - 1]!.rate;
}


/**
 * Compute the allowed daily mint for a specific user.
 * @param userIndex The user's registration order (1-based index)
 * @param daysSinceMintStart Days since user's mint_start timestamp
 */
export function calculateAllowedMint(userIndex: number, daysSinceMintStart: number): number {
  for (const slot of MINT_SLOTS) {
    if (userIndex >= slot.minUser && userIndex <= slot.maxUser) {
      if (daysSinceMintStart <= slot.period) {
        return slot.rate;
      } else {
        return prevailingRateByUserIndex(userIndex);
      }
    }
  }
  return prevailingRateByUserIndex(userIndex);
}
