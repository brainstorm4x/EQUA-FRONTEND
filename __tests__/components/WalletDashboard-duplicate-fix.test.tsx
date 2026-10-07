/**
 * Tests for WalletDashboard duplicate transaction prevention
 * 
 * Issue: Multiple transaction requests were being triggered for a single user action
 * causing "Transaction simulation failed: This transaction has already been processed" errors
 * 
 * Fix: Added early return guards in handleSend to prevent
 * duplicate submissions when already processing
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WalletDashboard - Duplicate Transaction Prevention', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  describe('handleSend function', () => {
    it('should check isLoading state before processing', () => {
      // Verify the duplicate submission guard is present
      expect(sourceCode).toMatch(/if \(isLoading\) \{[\s\S]*?console\.warn\(['"]⚠️ Transaction already in progress/);
    });

    it('should return early if already loading', () => {
      // The pattern should be:
      // if (isLoading) {
      //   console.warn('...');
      //   return;
      // }
      const handleSendMatch = sourceCode.match(/const handleSend = async \(\) => \{[\s\S]*?setIsLoading\(true\)/);
      expect(handleSendMatch).toBeTruthy();
      
      if (handleSendMatch) {
        const handleSendCode = handleSendMatch[0];
        expect(handleSendCode).toContain('if (isLoading)');
        expect(handleSendCode).toContain('return;');
      }
    });

    it('should warn about duplicate requests in console', () => {
      // Verify warning message is included
      expect(sourceCode).toContain('Transaction already in progress, ignoring duplicate request');
    });

    it('should have duplicate guard BEFORE setIsLoading(true)', () => {
      // The guard must be before setting loading state
      // Pattern: if (isLoading) { ... return; } ... setIsLoading(true);
      const handleSendMatch = sourceCode.match(/const handleSend = async \(\) => \{[\s\S]*?setIsLoading\(true\);/);
      expect(handleSendMatch).toBeTruthy();
      
      if (handleSendMatch) {
        const codeSection = handleSendMatch[0];
        const isLoadingCheckIndex = codeSection.indexOf('if (isLoading)');
        const setLoadingIndex = codeSection.indexOf('setIsLoading(true)');
        
        // isLoading check should come BEFORE setIsLoading(true)
        expect(isLoadingCheckIndex).toBeGreaterThan(-1);
        expect(setLoadingIndex).toBeGreaterThan(-1);
        expect(isLoadingCheckIndex).toBeLessThan(setLoadingIndex);
      }
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
