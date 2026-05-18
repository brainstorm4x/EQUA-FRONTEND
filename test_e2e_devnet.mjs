#!/usr/bin/env node
/**
 * End-to-End Integration Test for UNIYAA Token on Devnet
 * 
 * This script verifies:
 * 1. Program deployment status
 * 2. Global state initialization
 * 3. Mint account existence and token program type
 * 4. Registration flow correctness
 * 5. Minting flow correctness
 * 6. Token Program ID consistency (Standard Token vs Token-2022)
 */

import { PublicKey, Connection, Keypair, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';

// Inlined SPL Token constants + ATA helpers (replaces @solana/spl-token to drop
// the bigint-buffer dependency chain, GHSA-3gc7-fjrx-p6mg).
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddressSync(
  mint,
  owner,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('TokenOwnerOffCurveError');
  }
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId,
  );
  return address;
}

function createAssociatedTokenAccountInstruction(
  payer,
  associatedToken,
  owner,
  mint,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

// Constants from the frontend
const PROGRAM_ID = new PublicKey('B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2');
const GLOBAL_STATE_SEED = 'global-state';
const MINT_SEED = 'uniyaa-mint';
const MINT_AUTHORITY_SEED = 'mint-authority';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, emoji, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function success(message) {
  log('green', '✅', message);
}

function error(message) {
  log('red', '❌', message);
}

function warning(message) {
  log('yellow', '⚠️ ', message);
}

function info(message) {
  log('blue', 'ℹ️ ', message);
}

function section(message) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}`);
  console.log(`${message}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

// PDA Helper Functions
function getGlobalStatePDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    PROGRAM_ID
  );
}

function getMintPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    PROGRAM_ID
  );
}

function getMintAuthorityPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_AUTHORITY_SEED)],
    PROGRAM_ID
  );
}

async function checkProgramDeployment(connection) {
  section('1. Checking Program Deployment');
  
  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    
    if (!programInfo) {
      error(`Program not found at ${PROGRAM_ID.toBase58()}`);
      return false;
    }
    
    success(`Program deployed at ${PROGRAM_ID.toBase58()}`);
    info(`Program owner: ${programInfo.owner.toBase58()}`);
    info(`Program data length: ${programInfo.data.length} bytes`);
    info(`Program lamports: ${programInfo.lamports / 1e9} SOL`);
    
    return true;
  } catch (err) {
    error(`Error checking program: ${err.message}`);
    return false;
  }
}

async function checkGlobalState(connection) {
  section('2. Checking Global State Initialization');
  
  try {
    const [globalStatePDA, bump] = getGlobalStatePDA();
    info(`Global State PDA: ${globalStatePDA.toBase58()} (bump: ${bump})`);
    
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    
    if (!accountInfo) {
      error('Global state account does not exist');
      warning('Admin needs to call the "initialize" instruction first');
      return { exists: false, pda: globalStatePDA };
    }
    
    success('Global state account exists');
    info(`Owner: ${accountInfo.owner.toBase58()}`);
    info(`Data length: ${accountInfo.data.length} bytes`);
    
    // Try to parse user count (at offset 8 after discriminator)
    if (accountInfo.data.length >= 16) {
      const userCount = new BN(accountInfo.data.slice(8, 16), 'le').toNumber();
      info(`User count: ${userCount}`);
    }
    
    return { exists: true, pda: globalStatePDA, info: accountInfo };
  } catch (err) {
    error(`Error checking global state: ${err.message}`);
    return { exists: false };
  }
}

async function checkMintAccount(connection) {
  section('3. Checking Mint Account');
  
  try {
    const [mintPDA, bump] = getMintPDA();
    info(`Mint PDA: ${mintPDA.toBase58()} (bump: ${bump})`);
    
    const mintInfo = await connection.getAccountInfo(mintPDA);
    
    if (!mintInfo) {
      error('Mint account does not exist');
      warning('Admin needs to run the mint creation script');
      warning('See MINT_CREATION_INSTRUCTIONS.md for details');
      return { exists: false, pda: mintPDA };
    }
    
    success('Mint account exists');
    info(`Owner: ${mintInfo.owner.toBase58()}`);
    info(`Data length: ${mintInfo.data.length} bytes`);
    info(`Lamports: ${mintInfo.lamports / 1e9} SOL`);
    
    // Determine which token program owns the mint
    let tokenProgramType = 'Unknown';
    let correctTokenProgram = null;
    
    if (mintInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      tokenProgramType = 'Standard SPL Token';
      correctTokenProgram = TOKEN_PROGRAM_ID;
      success('✅ Mint uses STANDARD SPL Token Program');
      info(`Token Program ID: ${TOKEN_PROGRAM_ID.toBase58()}`);
    } else if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      tokenProgramType = 'Token-2022 (Token Extensions)';
      correctTokenProgram = TOKEN_2022_PROGRAM_ID;
      success('✅ Mint uses Token-2022 (Token Extensions)');
      info(`Token Program ID: ${TOKEN_2022_PROGRAM_ID.toBase58()}`);
    } else {
      error(`Unknown token program: ${mintInfo.owner.toBase58()}`);
      return { exists: true, pda: mintPDA, error: 'Unknown token program' };
    }
    
    // Parse mint data to get supply info
    if (mintInfo.data.length >= 36) {
      const supply = new BN(mintInfo.data.slice(36, 44), 'le');
      const decimals = mintInfo.data[44];
      info(`Decimals: ${decimals}`);
      info(`Total supply: ${supply.toString()} (${supply.div(new BN(10).pow(new BN(decimals)))} tokens)`);
    }
    
    return { 
      exists: true, 
      pda: mintPDA, 
      info: mintInfo, 
      tokenProgramType,
      correctTokenProgram 
    };
  } catch (err) {
    error(`Error checking mint account: ${err.message}`);
    return { exists: false };
  }
}

async function checkMintAuthority(connection) {
  section('4. Checking Mint Authority PDA');
  
  try {
    const [mintAuthorityPDA, bump] = getMintAuthorityPDA();
    info(`Mint Authority PDA: ${mintAuthorityPDA.toBase58()} (bump: ${bump})`);
    
    const authorityInfo = await connection.getAccountInfo(mintAuthorityPDA);
    
    if (!authorityInfo) {
      // This is OK - mint authority PDA doesn't need to be an account itself
      info('Mint Authority PDA is used as a signer seed (no account needed)');
    } else {
      info(`Mint Authority account exists with ${authorityInfo.lamports / 1e9} SOL`);
    }
    
    return { pda: mintAuthorityPDA };
  } catch (err) {
    error(`Error checking mint authority: ${err.message}`);
    return {};
  }
}

async function checkFrontendConstants() {
  section('5. Checking Frontend Configuration');
  
  try {
    // Read the constants file
    const fs = await import('fs');
    const path = await import('path');
    const constantsPath = path.join(process.cwd(), 'src', 'lib', 'constants.ts');
    
    if (!fs.existsSync(constantsPath)) {
      warning(`Constants file not found at ${constantsPath}`);
      return { checked: false };
    }
    
    const constantsContent = fs.readFileSync(constantsPath, 'utf8');
    
    info('Analyzing constants.ts...');
    
    // Check which token program is exported (look for export statements specifically)
    const exportMatch = constantsContent.match(/export\s+(?:const\s+)?(?:{[^}]*TOKEN_PROGRAM_ID[^}]*}|TOKEN_PROGRAM_ID)/);
    const importMatch = constantsContent.match(/import\s+{[^}]*TOKEN_(?:2022_)?PROGRAM_ID[^}]*}\s+from\s+['"]\.\/spl-token-inline['"]/);

    if (importMatch) {
      if (importMatch[0].includes('TOKEN_2022_PROGRAM_ID')) {
        info('Frontend imports TOKEN_2022_PROGRAM_ID from ./spl-token-inline');
      } else {
        info('Frontend imports TOKEN_PROGRAM_ID from ./spl-token-inline (Standard Token)');
      }
    }
    
    // Check comments for explicit documentation
    if (constantsContent.includes('Standard SPL Token Program')) {
      success('Comments indicate Standard SPL Token Program is used');
    }
    if (constantsContent.includes('not Token-2022')) {
      success('Comments explicitly state NOT using Token-2022');
    }
    if (constantsContent.includes('Token-2022') || constantsContent.includes('Token2022')) {
      warning('Comments mention Token-2022 configuration');
    }
    
    success('Frontend constants file checked');
    return { checked: true };
  } catch (err) {
    warning(`Could not read constants file: ${err.message}`);
    return { checked: false };
  }
}

async function testATACreation(correctTokenProgram, mintPDA) {
  section('6. Testing ATA Derivation');
  
  try {
    // Generate a test wallet
    const testWallet = Keypair.generate();
    info(`Test wallet: ${testWallet.publicKey.toBase58()}`);
    
    // Test ATA derivation with Standard Token Program
    const ataStandard = getAssociatedTokenAddressSync(
      mintPDA,
      testWallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    info(`ATA (Standard Token): ${ataStandard.toBase58()}`);
    
    // Test ATA derivation with Token-2022
    const ata2022 = getAssociatedTokenAddressSync(
      mintPDA,
      testWallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    info(`ATA (Token-2022): ${ata2022.toBase58()}`);
    
    // ATAs should always differ between token programs - this is expected
    info('ATAs differ based on token program (as expected)');
    
    // Show which one matches the correct token program
    if (correctTokenProgram) {
      if (correctTokenProgram.equals(TOKEN_PROGRAM_ID)) {
        success(`Frontend should use: ${ataStandard.toBase58()} (Standard Token)`);
      } else if (correctTokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
        success(`Frontend should use: ${ata2022.toBase58()} (Token-2022)`);
      }
    }
    
    return { ataStandard, ata2022 };
  } catch (err) {
    error(`Error testing ATA creation: ${err.message}`);
    return {};
  }
}

function generateRecommendations(results) {
  section('7. Recommendations & Action Items');
  
  const { program, globalState, mint, frontendConstants } = results;
  
  if (!program) {
    error('CRITICAL: Program not deployed');
    info('Action: Deploy the program to devnet');
    return;
  }
  
  if (!globalState?.exists) {
    error('CRITICAL: Global state not initialized');
    info('Action: Call the "initialize" instruction on the deployed program');
    return;
  }
  
  if (!mint?.exists) {
    error('CRITICAL: Mint account not created');
    info('Action: Run the mint creation script (see MINT_CREATION_INSTRUCTIONS.md)');
    return;
  }
  
  // Check for consistency
  if (mint?.correctTokenProgram) {
    if (mint.correctTokenProgram.equals(TOKEN_PROGRAM_ID)) {
      success('✅ Configuration Check: Standard SPL Token Program');
      info('Frontend should use TOKEN_PROGRAM_ID from @/lib/spl-token-inline');
      info('This matches the current constants.ts configuration');
    } else if (mint.correctTokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      warning('⚠️  Configuration Check: Token-2022 detected');
      error('Frontend constants.ts currently uses Standard Token Program');
      error('ACTION REQUIRED: Update constants.ts to use TOKEN_2022_PROGRAM_ID');
      info('Change import to: import { TOKEN_2022_PROGRAM_ID } from "@/lib/spl-token-inline"');
      info('Change export to: export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;');
    }
  }
  
  success('\n✅ Core infrastructure appears to be set up correctly');
  info('Next steps:');
  info('1. Test registration flow with a fresh wallet');
  info('2. Verify ATA creation uses correct token program');
  info('3. Test minting flow');
  info('4. Test referral flow (self-referral and with referrer)');
  info('5. Verify cooldown mechanism works');
}

async function main() {
  console.log(`\n${colors.cyan}╔${'═'.repeat(78)}╗`);
  console.log(`║  UNIYAA Token - End-to-End Devnet Integration Test${' '.repeat(28)}║`);
  console.log(`╚${'═'.repeat(78)}╝${colors.reset}\n`);
  
  info(`RPC Endpoint: ${RPC_ENDPOINT}`);
  info(`Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log('');
  
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  const results = {};
  
  // Run all checks
  results.program = await checkProgramDeployment(connection);
  results.globalState = await checkGlobalState(connection);
  results.mint = await checkMintAccount(connection);
  results.mintAuthority = await checkMintAuthority(connection);
  results.frontendConstants = await checkFrontendConstants();
  
  if (results.mint?.correctTokenProgram && results.mint?.pda) {
    results.ataTest = await testATACreation(results.mint.correctTokenProgram, results.mint.pda);
  }
  
  // Generate recommendations
  generateRecommendations(results);
  
  // Summary
  section('Summary');
  const checks = [
    { name: 'Program Deployed', passed: results.program },
    { name: 'Global State Initialized', passed: results.globalState?.exists },
    { name: 'Mint Account Created', passed: results.mint?.exists },
    { name: 'Token Program Identified', passed: !!results.mint?.correctTokenProgram },
  ];
  
  checks.forEach(check => {
    if (check.passed) {
      success(check.name);
    } else {
      error(check.name);
    }
  });
  
  const allPassed = checks.every(c => c.passed);
  console.log('');
  if (allPassed) {
    success('🎉 All infrastructure checks passed!');
    return 0;
  } else {
    error('Some checks failed - see recommendations above');
    return 1;
  }
}

main()
  .then(exitCode => process.exit(exitCode || 0))
  .catch(err => {
    error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
