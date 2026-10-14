/**
 * The minting cooldown is enforced on-chain and read from the chain; the
 * browser keeps no cooldown state (see src/utils/cooldown.ts).
 */

import { getCooldownPeriod } from '@/utils/cooldown';

describe('Cooldown period', () => {
  describe('getCooldownPeriod', () => {
    it('should return 2592000 seconds (30 days) by default', () => {
      expect(getCooldownPeriod()).toBe(2592000);
    });
  });
});
