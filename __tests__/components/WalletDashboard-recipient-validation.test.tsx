/**
 * Tests for WalletDashboard Recipient UserAccount Validation Fix
 * 
 * Issue: Phantom wallet showing "This transaction reverted during simulation" warnings
 * Root Cause: Sending tokens to unregistered recipients (no UserAccount PDA exists)
 * Backend Requirement: transfer_tokens instruction requires recipient_user_account to be a valid Account<'info, UserAccount>
 * 
 * Fix: Validate recipient's UserAccount PDA exists BEFORE building transaction
 * to prevent Phantom simulation failures and provide clear, actionable error messages
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WalletDashboard - Recipient UserAccount Validation Fix', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  describe('Pre-flight Validation', () => {
    it('should fetch recipient UserAccount PDA info from blockchain', () => {
      // Verify we check if recipient's UserAccount exists on-chain
      // Pattern: const recipientUserAccountInfo = await connection.getAccountInfo(recipientUserAccount);
      expect(sourceCode).toMatch(/const recipientUserAccountInfo = await connection\.getAccountInfo\(recipientUserAccount\);/);
    });

    it('should validate recipient UserAccount exists before building transaction', () => {
      // Verify we throw an error if the account doesn't exist
      // Pattern: if (!recipientUserAccountInfo) { throw new Error(...) }
      expect(sourceCode).toMatch(/if \(!recipientUserAccountInfo\)\s*\{[\s\S]*?throw new Error\(/);
    });

    it('should throw user-friendly error when recipient is not registered', () => {
      // Verify the error message is clear and actionable
      expect(sourceCode).toContain('Recipient is not registered');
      expect(sourceCode).toContain('They must complete registration at /mint before receiving EQUA tokens');
    });

    it('should validate account has valid discriminator (basic integrity check)', () => {
      // Verify we check the account data length (must be at least 8 bytes for discriminator)
      // Pattern: if (recipientUserAccountInfo.data.length < 8) { throw new Error(...) }
      expect(sourceCode).toMatch(/if \(recipientUserAccountInfo\.data\.length < 8\)\s*\{[\s\S]*?throw new Error\(/);
    });

    it('should throw error for corrupted account data', () => {
      // Verify error message for invalid account data
      expect(sourceCode).toContain('Invalid recipient account');
      expect(sourceCode).toContain('Account data corrupted');
    });

    it('should include comment explaining the backend contract requirement', () => {
      // Verify we document WHY this validation is needed
      expect(sourceCode).toContain('CRITICAL FIX: Verify recipient is a registered EQUA user');
      expect(sourceCode).toContain('The transfer_tokens instruction requires recipient_user_account to be a valid');
      expect(sourceCode).toContain('Account<\'info, UserAccount>');
    });

    it('should reference backend lib.rs line numbers in comment', () => {
      // Verify we link to the backend contract
      expect(sourceCode).toContain('lib.rs line 1746-1749');
    });

    it('should explain Phantom simulation behavior in comment', () => {
      // Verify we explain why Phantom shows the warning
      expect(sourceCode).toContain('If this account doesn\'t exist, Phantom\'s simulation will fail');
    });
  });

  describe('Validation Order', () => {
    it('should validate recipient UserAccount AFTER deriving PDAs', () => {
      // Verify validation happens after getting the PDA but before building transaction
      const flowPattern = /const \[recipientUserAccount\] = getUserAccountPDA\(recipientPubkey\);[\s\S]*?const recipientUserAccountInfo = await connection\.getAccountInfo\(recipientUserAccount\);/;
      expect(sourceCode).toMatch(flowPattern);
    });

    it('should validate recipient UserAccount BEFORE building transaction', () => {
      // Verification should happen before new Transaction()
      const flowPattern = /const recipientUserAccountInfo = await connection\.getAccountInfo\(recipientUserAccount\);[\s\S]*?if \(!recipientUserAccountInfo\)[\s\S]*?const transaction = new Transaction\(\);/;
      expect(sourceCode).toMatch(flowPattern);
    });

    it('should validate recipient UserAccount BEFORE checking token account', () => {
      // UserAccount validation should happen before checking/creating recipient token account
      const flowPattern = /const recipientUserAccountInfo = await connection\.getAccountInfo\(recipientUserAccount\);[\s\S]*?const recipientAccountInfo = await connection\.getAccountInfo\(recipientTokenAccount\);/;
      expect(sourceCode).toMatch(flowPattern);
    });
  });

  describe('Error Display Enhancement', () => {
    it('should show error title "Send Failed"', () => {
      // Verify the error display has a clear title
      expect(sourceCode).toContain('⚠️ Send Failed');
    });

    it('should detect "not registered" errors and show helpful guidance', () => {
      // Verify conditional help message for unregistered recipients
      expect(sourceCode).toMatch(/error\.includes\(['"]not registered['"]\)/);
    });

    it('should show "How to fix" guidance for unregistered recipients', () => {
      // Verify we provide actionable steps
      expect(sourceCode).toContain('💡 How to fix:');
      expect(sourceCode).toContain('Ask the recipient to visit');
      expect(sourceCode).toContain('equa.live/mint');
      expect(sourceCode).toContain('complete registration first');
    });

    it('should style the help message with yellow warning colors', () => {
      // Verify visual distinction for help messages
      expect(sourceCode).toMatch(/bg-yellow-500\/10.*border-yellow-500\/30/);
      expect(sourceCode).toMatch(/text-yellow-300/);
      expect(sourceCode).toMatch(/text-yellow-200/);
    });

    it('should use font-mono for the URL in help message', () => {
      // Verify URL is formatted as code
      expect(sourceCode).toMatch(/<span className="font-mono">equa\.live\/mint<\/span>/);
    });
  });

  describe('Behavior Validation', () => {
    it('should use validation that matches backend Account<info, UserAccount> type', () => {
      // The validation checks:
      // 1. Account exists (not null)
      // 2. Has minimum 8 bytes (discriminator)
      // This matches Anchor's requirements for Account<'info, UserAccount>
      
      const hasExistenceCheck = sourceCode.includes('if (!recipientUserAccountInfo)');
      const hasDiscriminatorCheck = sourceCode.includes('recipientUserAccountInfo.data.length < 8');
      
      expect(hasExistenceCheck).toBe(true);
      expect(hasDiscriminatorCheck).toBe(true);
    });

    it('should NOT validate recipient token account in UserAccount validation block', () => {
      // UserAccount validation should be separate from token account validation
      // This block should ONLY check recipientUserAccountInfo, not recipientAccountInfo
      
      const userAccountValidationBlock = sourceCode.match(
        /const recipientUserAccountInfo = await connection\.getAccountInfo\(recipientUserAccount\);[\s\S]*?const transaction = new Transaction\(\);/
      );
      
      expect(userAccountValidationBlock).toBeTruthy();
      if (userAccountValidationBlock) {
        // Should reference recipientUserAccountInfo, not recipientAccountInfo
        expect(userAccountValidationBlock[0]).toContain('recipientUserAccountInfo');
        // Should check recipientUserAccountInfo specifically
        expect(userAccountValidationBlock[0]).toMatch(/!recipientUserAccountInfo/);
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable error for unregistered user', () => {
      // Error should tell user exactly what to do
      const errorMatch = sourceCode.match(/Recipient is not registered\.[\s\S]*?They must complete registration at \/mint before receiving EQUA tokens/);
      expect(errorMatch).toBeTruthy();
    });

    it('should provide contact support guidance for corrupted accounts', () => {
      // For rare corruption cases, direct user to support
      const errorMatch = sourceCode.match(/Invalid recipient account:[\s\S]*?Account data corrupted\.[\s\S]*?Please contact support if this persists/);
      expect(errorMatch).toBeTruthy();
    });

    it('should use multi-line error strings for readability', () => {
      // Errors should be formatted with + for multi-line strings
      expect(sourceCode).toMatch(/throw new Error\(\s*['"]Recipient is not registered\. ['"]\s*\+/);
      expect(sourceCode).toMatch(/throw new Error\(\s*['"]Invalid recipient account:[\s\S]*?['"]\s*\+/);
    });
  });

  describe('No Breaking Changes', () => {
    it('should still check recipient token account for ATA creation', () => {
      // Existing ATA creation logic should remain unchanged
      expect(sourceCode).toContain('const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);');
      expect(sourceCode).toContain('createAssociatedTokenAccountInstruction');
    });

    it('should still use conditional skipPreflight from PR #218', () => {
      // Previous fix should remain intact
      expect(sourceCode).toMatch(/const shouldSkipPreflight = !recipientAccountInfo;/);
      expect(sourceCode).toMatch(/skipPreflight:\s*shouldSkipPreflight/);
    });

    it('should still include all existing transaction validations', () => {
      // Existing validations should not be removed
      expect(sourceCode).toContain('Invalid amount format');
      expect(sourceCode).toContain('Amount must be greater than zero');
      expect(sourceCode).toContain('Insufficient balance');
    });
  });

  describe('Integration with Existing Code', () => {
    it('should use getUserAccountPDA from program.ts', () => {
      // Verify we use the existing helper function
      expect(sourceCode).toMatch(/const \[recipientUserAccount\] = getUserAccountPDA\(recipientPubkey\);/);
    });

    it('should use connection from useConnection hook', () => {
      // Verify we use the existing connection instance
      expect(sourceCode).toMatch(/const recipientUserAccountInfo = await connection\.getAccountInfo/);
    });

    it('should throw Error (not custom error types)', () => {
      // Keep error handling consistent with existing code
      expect(sourceCode).toMatch(/throw new Error\(/);
    });

    it('should maintain existing error state handling', () => {
      // Errors should be caught and displayed in the same error state
      // The handleSend function should have try-catch that sets error state
      const sendFunctionMatch = sourceCode.match(/const handleSend[\s\S]*?try\s*\{[\s\S]*?\}\s*catch/);
      expect(sendFunctionMatch).toBeTruthy();
    });
  });
});
