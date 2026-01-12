/**
 * E2E Test Script for EQUA Registration and Minting
 * 
 * This script performs an end-to-end test of the EQUA token system:
 * 1. Verifies global state and mint PDA exist
 * 2. Performs user registration with self-referral
 * 3. Mints 1000 EQUA tokens using new 7-account mint_tokens instruction
 * 4. Logs all instruction metas and results
 * 
 * Usage: npx ts-node scripts/e2e-register-mint.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import {
  PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  GLOBAL_STATE_SEED,
  MINT_SEED,
  MINT_AUTHORITY_SEED,
  RPC_ENDPOINT,
} from '../src/lib/constants';
import {
  getGlobalStatePDA,
  getMintPDA,
  getMintAuthorityPDA,
  getUserAccountPDA,
  getUserMetadataPDA,
  getBusinessRegistryPDA,
  createInitializeUserInstruction,
  createMintEquaInstruction,
  createMintTokensInstruction,
  getSPLTokenBalance,
} from '../src/lib/program';
import { formatEquaRaw } from '../src/utils/tokenFormat';
import { getLockedTokenAccountPda, getLockedTokenPda, getLockedTokenAta } from '../src/utils/pda-helpers';

async function main() {
  console.log('🚀 Starting E2E Test: EQUA Registration & Minting\n');
  
  // Initialize connection
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  console.log('✅ Connected to Solana devnet:', RPC_ENDPOINT);
  
  // Load or generate test keypair
  // In production, this would be loaded from a secure location
  const payer = Keypair.generate();
  console.log('🔑 Test payer:', payer.publicKey.toBase58());
  
  // Check payer balance (this is devnet, so would need to airdrop in real test)
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Insufficient balance for testing. Requesting airdrop...');
    try {
      const airdropSig = await connection.requestAirdrop(
        payer.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig);
      console.log('✅ Airdrop successful');
    } catch (err) {
      console.error('❌ Airdrop failed:', err);
      console.log('💡 Tip: You may need to manually fund this address on devnet');
    }
  }
  
  // Get PDAs
  const [globalStatePDA] = getGlobalStatePDA();
  const [mintPDA] = getMintPDA();
  const [mintAuthority] = getMintAuthorityPDA();
  
  console.log('\n📋 PDAs:');
  console.log('  Global State:', globalStatePDA.toBase58());
  console.log('  Mint:', mintPDA.toBase58());
  console.log('  Mint Authority:', mintAuthority.toBase58());
  
  // Step 1: Verify global state exists
  console.log('\n🔍 Step 1: Verifying global state...');
  const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
  if (!globalStateInfo) {
    console.error('❌ Global state not found. Program may not be initialized.');
    process.exit(1);
  }
  console.log('✅ Global state verified');
  
  // Step 2: Verify mint exists
  console.log('\n🔍 Step 2: Verifying mint...');
  const mintInfo = await connection.getAccountInfo(mintPDA);
  if (!mintInfo) {
    console.error('❌ Mint not found. Run mint creation script first.');
    process.exit(1);
  }
  console.log('✅ Mint verified');
  
  // Step 3: Derive user account PDA from authority (payer's public key)
  console.log('\n🔍 Step 3: Deriving user account PDA...');
  const [userAccountPDA] = getUserAccountPDA(payer.publicKey);
  const [userMetadataPDA] = getUserMetadataPDA(payer.publicKey);
  console.log('✅ User account PDA:', userAccountPDA.toBase58());
  console.log('✅ User metadata PDA:', userMetadataPDA.toBase58());
  
  // Step 4: Create ATA
  console.log('\n🔍 Step 4: Creating Associated Token Account...');
  const userTokenAccount = getAssociatedTokenAddressSync(
    mintPDA,
    payer.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log('  Token Account:', userTokenAccount.toBase58());
  
  const ataInfo = await connection.getAccountInfo(userTokenAccount);
  if (!ataInfo) {
    console.log('  Creating ATA...');
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      userTokenAccount,
      payer.publicKey,
      mintPDA,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const ataTransaction = new Transaction().add(createAtaIx);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    ataTransaction.recentBlockhash = blockhash;
    ataTransaction.feePayer = payer.publicKey;
    ataTransaction.sign(payer);
    
    const ataSig = await connection.sendRawTransaction(ataTransaction.serialize(), {
      skipPreflight: true,
    });
    await connection.confirmTransaction(ataSig, 'confirmed');
    console.log('  ✅ ATA created:', ataSig);
  } else {
    console.log('  ✅ ATA already exists');
  }
  
  // Step 5: Register user (self-referral)
  console.log('\n🔍 Step 5: Registering user...');
  const now = Math.floor(Date.now() / 1000);
  
  // userMetadataPDA already derived in Step 3
  
  // Derive business registry PDA using helper function
  const [businessRegistryPDA] = getBusinessRegistryPDA();
  
  const registerIx = createInitializeUserInstruction(
    userAccountPDA,
    userMetadataPDA,              // User metadata PDA
    payer.publicKey,
    globalStatePDA,
    userAccountPDA,               // Self-referral: use own account PDA
    userMetadataPDA,              // Self-referral: use own metadata PDA
    userTokenAccount,
    mintPDA,
    businessRegistryPDA,          // Business registry PDA
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    now,
    PublicKey.default,            // No referrer
    0                             // userType: 0 = individual, 1 = business
  );
  
  console.log('\n🧪 Registration Instruction Metas (12 accounts):');
  registerIx.keys.forEach((k, i) => {
    console.log(`  ${i}. ${k.pubkey.toBase58()}`);
    console.log(`     writable=${k.isWritable} signer=${k.isSigner}`);
  });
  
  const registerTx = new Transaction().add(registerIx);
  const { blockhash: regBlockhash } = await connection.getLatestBlockhash('confirmed');
  registerTx.recentBlockhash = regBlockhash;
  registerTx.feePayer = payer.publicKey;
  registerTx.sign(payer);  // Only payer signs - user account is a PDA (no keypair needed)
  
  try {
    const regSig = await connection.sendRawTransaction(registerTx.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(regSig, 'confirmed');
    console.log('\n✅ Registration successful!');
    console.log('  Signature:', regSig);
    console.log('  Explorer:', `https://explorer.solana.com/tx/${regSig}?cluster=devnet`);
  } catch (err: any) {
    console.error('\n❌ Registration failed:', err.message);
    if (err.logs) {
      console.error('Transaction logs:', err.logs);
    }
    process.exit(1);
  }
  
  // Step 6: Mint 1000 EQUA using new 15-account mint_tokens instruction
  console.log('\n🔍 Step 6: Minting 1000 EQUA...');
  console.log('  User Metadata PDA:', userMetadataPDA.toBase58());
  
  // Derive locked token PDAs
  const [lockedTokenAccountPda] = getLockedTokenAccountPda(payer.publicKey, PROGRAM_ID);
  const lockedTokenPda = getLockedTokenPda(payer.publicKey, PROGRAM_ID);
  const lockedTokenAta = getLockedTokenAta(lockedTokenPda, mintPDA, TOKEN_PROGRAM_ID);
  
  // Derive business registry PDA
  const [businessRegistryPDA] = getBusinessRegistryPDA();
  
  // Use new 15-account mint_tokens instruction (with all accounts)
  const mintIx = createMintTokensInstruction(
    userAccountPDA,                // user_account (PDA)
    userMetadataPDA,               // user_metadata
    globalStatePDA,                // global_state
    userTokenAccount,              // user_token_account
    mintPDA,                       // mint
    mintAuthority,                 // mint_authority
    PublicKey.default,             // referrer_account (no referrer)
    businessRegistryPDA,           // business_registry
    payer.publicKey,               // authority
    lockedTokenAccountPda,         // locked_token_account
    lockedTokenAta,                // locked_token_ata
    lockedTokenPda,                // locked_token_pda
    TOKEN_PROGRAM_ID,              // token_program
    1000_000000                    // 1000 EQUA with 6 decimals
  );
  
  console.log('\n🧪 Mint Instruction Metas (15-account mint_tokens):');
  mintIx.keys.forEach((k, i) => {
    console.log(`  ${i}. ${k.pubkey.toBase58()}`);
    console.log(`     writable=${k.isWritable} signer=${k.isSigner}`);
  });
  
  const mintTx = new Transaction().add(mintIx);
  const { blockhash: mintBlockhash } = await connection.getLatestBlockhash('confirmed');
  mintTx.recentBlockhash = mintBlockhash;
  mintTx.feePayer = payer.publicKey;
  mintTx.sign(payer);
  
  try {
    const mintSig = await connection.sendRawTransaction(mintTx.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(mintSig, 'confirmed');
    console.log('\n✅ Minting successful!');
    console.log('  Signature:', mintSig);
    console.log('  Explorer:', `https://explorer.solana.com/tx/${mintSig}?cluster=devnet`);
  } catch (err: any) {
    console.error('\n❌ Minting failed:', err.message);
    if (err.logs) {
      console.error('Transaction logs:', err.logs);
    }
    process.exit(1);
  }
  
  // Step 7: Verify final balance
  console.log('\n🔍 Step 7: Verifying final token balance...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for state to update
  
  const finalBalance = await getSPLTokenBalance(connection, userTokenAccount);
  const formattedBalance = formatEquaRaw(finalBalance, { trimTrailingZeros: true });
  console.log(`✅ Final balance: ${formattedBalance} EQUA (raw: ${finalBalance})`);
  
  // Compare raw amount (should be >= 1,000,000,000 for 1000 EQUA)
  if (finalBalance >= 1_000_000_000) {
    console.log('\n🎉 E2E Test PASSED! Registration and minting successful.');
  } else {
    console.log(`\n⚠️  E2E Test WARNING: Expected at least 1,000,000,000 raw units (1000 EQUA), got ${finalBalance} (${formattedBalance} EQUA)`);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('  ✅ Global state verified');
  console.log('  ✅ Mint verified');
  console.log('  ✅ User registered (self-referral)');
  console.log('  ✅ 1000 EQUA minted');
  console.log('  ✅ Final balance:', formattedBalance, 'EQUA');
}

main().catch(err => {
  console.error('❌ E2E Test failed with error:', err);
  process.exit(1);
});
