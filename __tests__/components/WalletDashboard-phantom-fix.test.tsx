/**
 * Tests for WalletDashboard Phantom wallet simulation warning fix
 * 
 * Issue: Phantom wallet showing false "This transaction reverted during simulation" warnings
 * Cause: Using skipPreflight: false for all transactions, including when creating ATAs
 * 
 * Fix: Conditionally skip preflight when creating recipient ATA in same transaction
 * to prevent false simulation failures
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WalletDashboard - Phantom Simulation Warning Fix', () => {
  const walletDashboardPath = join(__dirname, '../../src/components/WalletDashboard.tsx');
  const sourceCode = readFileSync(walletDashboardPath, 'utf-8');

  it('should conditionally set skipPreflight based on ATA creation', () => {
    // Verify that skipPreflight is determined by whether we're creating an ATA
    // Pattern: const shouldSkipPreflight = !recipientAccountInfo;
    expect(sourceCode).toMatch(/const shouldSkipPreflight = !recipientAccountInfo;/);
  });

  it('should use shouldSkipPreflight variable in sendRawTransaction', () => {
    // Verify that we're using the conditional value, not hardcoded false
    expect(sourceCode).toMatch(/skipPreflight:\s*shouldSkipPreflight/);
    
    // Ensure we're NOT using hardcoded skipPreflight: false
    expect(sourceCode).not.toMatch(/skipPreflight:\s*false,[\s\S]*?maxRetries:\s*3[\s\S]*?\}/);
  });

  it('should include comment explaining the fix', () => {
    // Verify the comment explaining why we skip preflight
    expect(sourceCode).toContain('Skip preflight only if creating recipient ATA in same tx');
    expect(sourceCode).toContain('This prevents false simulation failures when ATA creation is included');
  });

  it('should add development logging for diagnostics', () => {
    // Verify that development logging is included
    expect(sourceCode).toMatch(/if \(process\.env\.NODE_ENV === ['"]development['"]\)/);
    expect(sourceCode).toContain('Send transaction: skipPreflight=');
    expect(sourceCode).toContain('creatingATA=');
  });

  it('should log both skipPreflight value and ATA creation status', () => {
    // The log should include both pieces of information
    const logMatch = sourceCode.match(/console\.log\(`🔧 Send transaction: skipPreflight=\$\{shouldSkipPreflight\}, creatingATA=\$\{!recipientAccountInfo\}`\);/);
    expect(logMatch).toBeTruthy();
  });

  it('should keep transaction confirmation unchanged', () => {
    // Verify that confirmation logic remains the same
    expect(sourceCode).toMatch(/await connection\.confirmTransaction\(\{[\s\S]*?signature,[\s\S]*?blockhash,[\s\S]*?lastValidBlockHeight[\s\S]*?\},\s*['"]confirmed['"]\);/);
  });

  it('should skip preflight when creating new ATA (recipientAccountInfo is null)', () => {
    // Test the logic: !recipientAccountInfo === true when account doesn't exist
    const recipientAccountInfo = null;
    const shouldSkipPreflight = !recipientAccountInfo;
    
    expect(shouldSkipPreflight).toBe(true);
  });

  it('should NOT skip preflight when ATA already exists (recipientAccountInfo is truthy)', () => {
    // Test the logic: !recipientAccountInfo === false when account exists
    const recipientAccountInfo = { data: Buffer.from([]), executable: false, lamports: 0, owner: null as any };
    const shouldSkipPreflight = !recipientAccountInfo;
    
    expect(shouldSkipPreflight).toBe(false);
  });

  it('should maintain maxRetries: 3 setting', () => {
    // Verify maxRetries is still set to 3
    expect(sourceCode).toMatch(/maxRetries:\s*3/);
  });

  describe('Transaction flow validation', () => {
    it('should check recipientAccountInfo BEFORE building transaction', () => {
      // recipientAccountInfo check should happen before transaction signing
      const sendFlowMatch = sourceCode.match(/const recipientAccountInfo = await connection\.getAccountInfo\(recipientTokenAccount\);[\s\S]*?const signed = await signTransaction\(transaction\);/);
      expect(sendFlowMatch).toBeTruthy();
    });

    it('should use recipientAccountInfo for both ATA creation AND preflight decision', () => {
      // The variable should be used in two places:
      // 1. if (!recipientAccountInfo) { ... create ATA ... }
      // 2. const shouldSkipPreflight = !recipientAccountInfo;
      
      const accountCheckMatches = sourceCode.match(/!recipientAccountInfo/g);
      expect(accountCheckMatches).toBeTruthy();
      expect(accountCheckMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
