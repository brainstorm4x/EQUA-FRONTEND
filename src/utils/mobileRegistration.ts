/**
 * Mobile Registration Utility
 * 
 * Mobile-specific registration function that avoids the patterns that break mobile wallet adapters:
 * - Does NOT call transaction.setSigners() - lets wallet.sendTransaction() manage signatures
 * - Does NOT call transaction.compileMessage() - avoids pre-compilation lock
 * - Uses 'confirmed' commitment for fresher blockhash (survives deep-link round-trip)
 * - Sets skipPreflight: true to avoid simulation failures during mobile app-switch delay
 * 
 * This is the clean pattern that already works for mobile minting in handleMint().
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

/**
 * Wallet adapter interface for mobile registration
 */
export interface MobileWalletAdapter {
  connected?: boolean;
  publicKey?: PublicKey | null;
  sendTransaction?: (
    transaction: Transaction,
    connection: Connection,
    options?: { skipPreflight?: boolean; maxRetries?: number }
  ) => Promise<string>;
}

/**
 * Parameters for mobile registration
 */
export interface MobileRegisterParams {
  wallet: MobileWalletAdapter;
  connection: Connection;
  program: Program;
  publicKey: PublicKey;
  userAccountPDA: PublicKey;
  userMetadataPDA: PublicKey;
  globalStatePDA: PublicKey;
  referralAccountPubkey: PublicKey;
  referrerMetadataPubkey: PublicKey;
  referrerPubkey: PublicKey;
  userTokenAccount: PublicKey;
  mintPDA: PublicKey;
  businessRegistryPDA: PublicKey;
  lockedTokenAta: PublicKey;
  preInstructions: TransactionInstruction[];
  accountType: number;
  now: number;
}

/**
 * Mobile-specific registration function
 * 
 * Builds the exact same Anchor instruction as desktop registration but uses
 * a clean transaction building pattern that doesn't conflict with mobile wallet adapters.
 * 
 * @param params - Registration parameters
 * @returns Transaction signature
 */
export async function mobileRegister(params: MobileRegisterParams): Promise<{ signature: string }> {
  const {
    wallet,
    connection,
    program,
    publicKey,
    userAccountPDA,
    userMetadataPDA,
    globalStatePDA,
    referralAccountPubkey,
    referrerMetadataPubkey,
    referrerPubkey,
    userTokenAccount,
    mintPDA,
    businessRegistryPDA,
    preInstructions,
    accountType,
    now,
  } = params;

  console.log('📱 [MobileRegistration] Building mobile registration transaction...');

  // Import required dependencies
  const anchor = await import('@coral-xyz/anchor');
  const { SystemProgram } = await import('@solana/web3.js');
  const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@/lib/constants');

  // Build registration instruction using Anchor (same as desktop)
  console.log('📝 [MobileRegistration] Building registration instruction via Anchor...');
  const registerIx = await program.methods
    .initializeUser(
      referrerPubkey ?? PublicKey.default,  // referral: PublicKey
      new anchor.BN(now),                   // mint_start: i64
      accountType                           // user_type: u8
    )
    .accounts({
      userAccount: userAccountPDA,
      userMetadata: userMetadataPDA,
      authority: publicKey,
      globalState: globalStatePDA,
      referralAccount: referralAccountPubkey,
      referrerMetadata: referrerMetadataPubkey,
      userTokenAccount: userTokenAccount,
      mint: mintPDA,
      businessRegistry: businessRegistryPDA,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  console.log('✅ [MobileRegistration] Registration instruction built');

  // Build complete transaction with all instructions
  const transaction = new Transaction();
  transaction.add(...preInstructions);  // Compute budget + ATA creations
  transaction.add(registerIx);          // Registration instruction

  // Set feePayer and get blockhash
  // CRITICAL: Do NOT call transaction.setSigners() - let wallet.sendTransaction() handle it
  transaction.feePayer = publicKey;

  console.log('⛓️ [MobileRegistration] Getting blockhash (confirmed commitment for mobile)...');
  // Use 'confirmed' commitment for fresher blockhash that survives deep-link round-trip
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;

  console.log('✅ [MobileRegistration] Transaction prepared:');
  console.log('  - Fee payer:', transaction.feePayer.toBase58());
  console.log('  - Blockhash:', blockhash);
  console.log('  - Last valid block height:', lastValidBlockHeight);
  console.log('  - Instructions count:', transaction.instructions.length);
  console.log('    → Compute budget: 1');
  console.log('    → User ATA creation: 1');
  console.log('    → Locked ATA creation: 1');
  console.log('    → Registration (initializeUser): 1');

  // Validate wallet has sendTransaction method
  if (!wallet.sendTransaction) {
    throw new Error('Mobile wallet does not support sendTransaction');
  }

  console.log('📤 [MobileRegistration] Sending transaction via wallet.sendTransaction()...');
  console.log('  - skipPreflight: true (avoids simulation failure during app-switch)');
  console.log('  - This will open wallet app for approval');

  // Send transaction using wallet.sendTransaction() directly
  // No transaction.setSigners() - wallet manages signatures
  // No transaction.compileMessage() - no pre-compilation
  const signature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: true,  // Avoid simulation failures during mobile app-switch delay
    maxRetries: 3,
  });

  console.log('✅ [MobileRegistration] Transaction sent successfully!');
  console.log('  📍 Signature:', signature);
  console.log('  📍 Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  console.log('⏳ [MobileRegistration] Confirming transaction...');

  // Wait for confirmation using the same blockhash from transaction
  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  console.log('✅ [MobileRegistration] Transaction confirmed on-chain');
  console.log('  📍 Signature:', signature);

  return { signature };
}
