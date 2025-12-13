#!/usr/bin/env node
/**
 * E2E Validation Script for Registration Flow
 * 
 * This script validates:
 * 1. Mint owner matches TOKEN_PROGRAM_ID (standard SPL Token)
 * 2. ASSOCIATED_TOKEN_PROGRAM_ID is correct
 * 3. Instruction accounts are in correct order (11-account structure)
 * 4. IDL matches backend expectations
 * 
 * Run: node scripts/validate_registration.mjs
 */

import { PublicKey, Connection } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function success(msg) {
  console.log(`${colors.green}${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}${msg}${colors.reset}`);
}

function warn(msg) {
  console.log(`${colors.yellow}${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}${msg}${colors.reset}`);
}

// Configuration
const PROGRAM_ID = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
const MINT_SEED = 'equa-mint';
const STANDARD_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

async function main() {
  console.log('='.repeat(80));
  info('EQUA Frontend Registration Validation');
  console.log('='.repeat(80));
  console.log();

  let hasErrors = false;

  // Step 1: Validate IDL
  info('Step 1: Validating IDL...');
  try {
    const idlPath = path.join(__dirname, '..', 'public', 'idl', 'equa_token.json');
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    
    const initializeUserInstruction = idl.instructions.find(ix => ix.name === 'initialize_user');
    
    if (!initializeUserInstruction) {
      error('✗ initialize_user instruction not found in IDL');
      hasErrors = true;
    } else {
      // Check account count
      if (initializeUserInstruction.accounts.length !== 11) {
        error(`✗ Expected 11 accounts, got ${initializeUserInstruction.accounts.length}`);
        hasErrors = true;
      } else {
        success('✓ IDL has 11 accounts for initialize_user');
      }
      
      // Check account names
      const expectedAccounts = [
        'user_account',
        'user_metadata',
        'authority',
        'global_state',
        'referral_account',
        'referrer_metadata',
        'user_token_account',
        'mint',
        'associated_token_program',
        'token_program',
        'system_program'
      ];
      
      let accountsValid = true;
      for (let i = 0; i < expectedAccounts.length; i++) {
        if (initializeUserInstruction.accounts[i]?.name !== expectedAccounts[i]) {
          error(`✗ Account ${i} should be '${expectedAccounts[i]}', got '${initializeUserInstruction.accounts[i]?.name}'`);
          accountsValid = false;
          hasErrors = true;
        }
      }
      
      if (accountsValid) {
        success('✓ All account names match expected order');
      }
      
      // Check args
      if (initializeUserInstruction.args.length !== 3) {
        error(`✗ Expected 3 args, got ${initializeUserInstruction.args.length}`);
        hasErrors = true;
      } else {
        const expectedArgs = ['referral', 'mint_start', 'user_type'];
        const actualArgs = initializeUserInstruction.args.map(a => a.name);
        if (JSON.stringify(actualArgs) === JSON.stringify(expectedArgs)) {
          success('✓ IDL args include referral, mint_start, and user_type');
        } else {
          error(`✗ Args mismatch. Expected: ${expectedArgs.join(', ')}, got: ${actualArgs.join(', ')}`);
          hasErrors = true;
        }
      }
      
      // Check associated_token_program address
      const atpAccount = initializeUserInstruction.accounts[8];
      if (atpAccount?.address === ASSOCIATED_TOKEN_PROGRAM) {
        success(`✓ IDL specifies correct ASSOCIATED_TOKEN_PROGRAM_ID at index 8`);
      } else {
        error(`✗ IDL associated_token_program should be ${ASSOCIATED_TOKEN_PROGRAM}, got ${atpAccount?.address}`);
        hasErrors = true;
      }
    }
  } catch (err) {
    error(`✗ Failed to validate IDL: ${err.message}`);
    hasErrors = true;
  }
  console.log();

  // Step 2: Validate constants.ts
  info('Step 2: Validating constants.ts...');
  try {
    const constantsPath = path.join(__dirname, '..', 'src', 'lib', 'constants.ts');
    const constantsContent = fs.readFileSync(constantsPath, 'utf-8');
    
    // Check for TOKEN_2022_PROGRAM_ID import (should NOT exist)
    if (constantsContent.includes('TOKEN_2022_PROGRAM_ID')) {
      // Check if it's just in comments or actual code
      const lines = constantsContent.split('\n').filter(line => 
        line.includes('TOKEN_2022_PROGRAM_ID') && !line.trim().startsWith('//')
      );
      if (lines.length > 0) {
        warn('⚠ TOKEN_2022_PROGRAM_ID found in constants.ts (should use standard SPL Token)');
        console.log('  Lines:', lines);
      }
    }
    
    // Check for standard SPL Token references
    if (constantsContent.includes('Standard SPL Token') || 
        constantsContent.includes('TOKEN_PROGRAM_ID as SPL_TOKEN_PROGRAM_ID')) {
      success('✓ constants.ts configured for Standard SPL Token');
    } else {
      warn('⚠ Cannot verify Standard SPL Token configuration in constants.ts');
    }
    
    // Check for ASSOCIATED_TOKEN_PROGRAM_ID export
    if (constantsContent.includes('export const ASSOCIATED_TOKEN_PROGRAM_ID')) {
      success('✓ ASSOCIATED_TOKEN_PROGRAM_ID is exported');
    } else {
      error('✗ ASSOCIATED_TOKEN_PROGRAM_ID not exported from constants.ts');
      hasErrors = true;
    }
    
    // Check for runtime assertions
    if (constantsContent.includes('Runtime assertion') || 
        constantsContent.includes('ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()')) {
      success('✓ Runtime assertions present in constants.ts');
    } else {
      warn('⚠ No runtime assertions found in constants.ts');
    }
  } catch (err) {
    error(`✗ Failed to validate constants.ts: ${err.message}`);
    hasErrors = true;
  }
  console.log();

  // Step 3: Check mint owner on devnet
  info('Step 3: Checking mint owner on devnet...');
  try {
    const [mintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(MINT_SEED)],
      PROGRAM_ID
    );
    
    info(`  Mint PDA: ${mintPDA.toBase58()}`);
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const mintInfo = await connection.getAccountInfo(mintPDA);
    
    if (!mintInfo) {
      warn('⚠ Mint account does not exist on devnet (needs to be created)');
      warn('  This is expected for a fresh deployment');
    } else {
      const mintOwner = mintInfo.owner.toBase58();
      info(`  Mint owner: ${mintOwner}`);
      
      if (mintOwner === STANDARD_TOKEN_PROGRAM) {
        success('✓ Mint uses Standard SPL Token Program (correct)');
      } else if (mintOwner === TOKEN_2022_PROGRAM) {
        error('✗ Mint uses Token-2022 but app is configured for Standard SPL Token');
        error('  Fix: Either update constants.ts or recreate mint with standard SPL Token');
        hasErrors = true;
      } else {
        error(`✗ Mint uses unknown token program: ${mintOwner}`);
        hasErrors = true;
      }
    }
  } catch (err) {
    warn(`⚠ Could not check mint on devnet: ${err.message}`);
    warn('  This may be due to network issues or mint not being created yet');
  }
  console.log();

  // Step 4: Validate program.ts instruction builder
  info('Step 4: Validating program.ts...');
  try {
    const programPath = path.join(__dirname, '..', 'src', 'lib', 'program.ts');
    const programContent = fs.readFileSync(programPath, 'utf-8');
    
    // Check for verifyMintOwner function
    if (programContent.includes('export async function verifyMintOwner')) {
      success('✓ verifyMintOwner function exists');
    } else {
      error('✗ verifyMintOwner function not found');
      hasErrors = true;
    }
    
    // Check createInitializeUserInstruction
    if (programContent.includes('createInitializeUserInstruction')) {
      success('✓ createInitializeUserInstruction function exists');
      
      // Check for 11 account keys
      const instructionMatch = programContent.match(/keys:\s*\[([\s\S]*?)\]/);
      if (instructionMatch) {
        const keysContent = instructionMatch[1];
        const keyCount = (keysContent.match(/\{[^}]*pubkey:/g) || []).length;
        if (keyCount === 11) {
          success('✓ Instruction builder creates 11 account keys');
        } else {
          error(`✗ Instruction builder creates ${keyCount} account keys, expected 11`);
          hasErrors = true;
        }
      }
    } else {
      error('✗ createInitializeUserInstruction function not found');
      hasErrors = true;
    }
    
    // Check for user_type parameter
    if (programContent.includes('userType: number')) {
      success('✓ Instruction builder accepts userType parameter');
    } else {
      warn('⚠ Cannot verify userType parameter in instruction builder');
    }
  } catch (err) {
    error(`✗ Failed to validate program.ts: ${err.message}`);
    hasErrors = true;
  }
  console.log();

  // Step 5: Check mint registration flow
  info('Step 5: Validating registration flow integration...');
  try {
    const mintPagePath = path.join(__dirname, '..', 'app', 'mint', 'page.tsx');
    const mintPageContent = fs.readFileSync(mintPagePath, 'utf-8');
    
    // Check for verifyMintOwner import
    if (mintPageContent.includes('verifyMintOwner')) {
      success('✓ verifyMintOwner imported in registration flow');
    } else {
      error('✗ verifyMintOwner not imported in registration flow');
      hasErrors = true;
    }
    
    // Check for verifyMintOwner call
    if (mintPageContent.includes('await verifyMintOwner')) {
      success('✓ verifyMintOwner called in registration flow');
    } else {
      error('✗ verifyMintOwner not called in registration flow');
      hasErrors = true;
    }
    
    // Check for ASSOCIATED_TOKEN_PROGRAM_ID import
    if (mintPageContent.includes('ASSOCIATED_TOKEN_PROGRAM_ID')) {
      success('✓ ASSOCIATED_TOKEN_PROGRAM_ID used in registration');
    } else {
      warn('⚠ Cannot verify ASSOCIATED_TOKEN_PROGRAM_ID usage');
    }
  } catch (err) {
    error(`✗ Failed to validate registration flow: ${err.message}`);
    hasErrors = true;
  }
  console.log();

  // Final summary
  console.log('='.repeat(80));
  if (hasErrors) {
    error('❌ VALIDATION FAILED - Errors found');
    error('Please fix the issues above before deploying');
    process.exit(1);
  } else {
    success('✅ VALIDATION PASSED');
    success('Registration flow is correctly configured for Standard SPL Token');
    console.log();
    info('Next steps:');
    info('  1. Run: npm test -- __tests__/registration/');
    info('  2. Test registration on devnet with a wallet');
    info('  3. Verify instruction metas in browser console');
  }
  console.log('='.repeat(80));
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
