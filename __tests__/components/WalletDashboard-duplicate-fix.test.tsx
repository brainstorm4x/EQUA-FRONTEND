/**
 * Tests for WalletDashboard duplicate transaction prevention
 * 
 * Issue: Multiple transaction requests were being triggered for a single user action
 * causing "Transaction simulation failed: This transaction has already been processed" errors
 * 
 * Fix: an in-flight ref in handleSend refuses duplicate submissions while one
 * is processing (a state check let fast double clicks through)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WalletDashboard - Duplicate Transaction Prevention', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  describe('handleSend function', () => {
    // The guard is a ref, set synchronously. A check on the isLoading state
    // reads the value from the last render, so a fast second click passed it
    // and two valid transfers could go out.
    const handleSendStart = () =>
      sourceCode.match(/const handleSend = async \(\) => \{[\s\S]*?setIsLoading\(true\);/)?.[0] ?? '';

    it('refuses a second send while one is in flight, using a ref (not state)', () => {
      expect(handleSendStart()).toMatch(/if \(sendInFlight\.current\) \{[\s\S]*?return;/);
      expect(handleSendStart()).not.toContain('if (isLoading)');
    });

    it('takes the lock before setting the loading state', () => {
      const code = handleSendStart();
      const lockIndex = code.indexOf('sendInFlight.current = true;');
      expect(lockIndex).toBeGreaterThan(-1);
      expect(lockIndex).toBeLessThan(code.indexOf('setIsLoading(true)'));
    });

    it('always releases the lock when the send ends', () => {
      expect(sourceCode).toMatch(/\} finally \{\s*sendInFlight\.current = false;/);
    });

    it('should warn about duplicate requests in console', () => {
      expect(sourceCode).toContain('Transaction already in progress, ignoring duplicate request');
    });
  });

  describe('Button disabled states', () => {
    it('should keep button disabled during loading in Send Modal', () => {
      // Verify the button is disabled when isLoading is true
      // Pattern: disabled={isLoading || !recipientAddress || !amount}
      expect(sourceCode).toMatch(/disabled=\{isLoading \|\| !recipientAddress \|\| !amount\}/);
    });

    it('should apply correct styling when button is disabled', () => {
      // Verify the conditional styling includes isLoading check
      const buttonStylingMatch = sourceCode.match(/isLoading \|\| !recipientAddress \|\| !amount[\s\S]*?'bg-gray-500\/50 text-gray-300 cursor-not-allowed'/);
      expect(buttonStylingMatch).toBeTruthy();
    });
  });
});
