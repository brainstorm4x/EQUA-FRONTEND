/**
 * Mobile Registration Utility
 * 
 * Mobile-specific registration function that uses the signTransaction pattern for mobile wallets:
 * - Uses wallet.signTransaction() to trigger deep link to wallet app
 * - Uses connection.sendRawTransaction() to submit the signed transaction
 * - Uses 'confirmed' commitment for fresher blockhash (survives deep-link round-trip)
 * - Sets skipPreflight: true to avoid simulation failures during mobile app-switch delay
 * 
 * This pattern avoids the "Missing signature" error that occurs when using sendTransaction()
 * with mobile wallet adapters.
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import {
  saveTransactionState,
  clearTransactionState,
  type TransactionState,
} from './TransactionStateManager';

/**
 * Wallet adapter interface for mobile registration
 */
export interface MobileWalletAdapter {
  connected?: boolean;
  publicKey?: PublicKey | null;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
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

  // Validate wallet has signTransaction method
  if (!wallet.signTransaction) {
    throw new Error('Wallet does not support transaction signing. Please use Phantom or Solflare mobile wallet.');
  }

  // SAVE STATE BEFORE DEEP LINK
  const transactionState: TransactionState = {
    type: 'registration',
    timestamp: Date.now(),
    publicKey: publicKey.toBase58(),
    metadata: {
      accountType,
      referrer: params.referrerPubkey?.toBase58(),
    },
  };
  saveTransactionState(transactionState);

  try {
    console.log('📱 [MobileRegistration] Calling wallet.signTransaction()...');
    console.log('  - This will open your wallet app for approval');

    // Wallet signs (triggers deep link → opens wallet app)
    const signedTx = await wallet.signTransaction(transaction);

    console.log('✅ [MobileRegistration] Transaction signed by wallet');
    console.log('📤 [MobileRegistration] Submitting signed transaction to Solana...');

    // Submit signed transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,  // Avoid simulation failures during mobile app-switch delay
      maxRetries: 3,
      preflightCommitment: 'confirmed',
    });

    console.log('✅ [MobileRegistration] Transaction submitted:', signature);
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

    // CLEAR STATE ON SUCCESS
    clearTransactionState();

    return { signature };
  } catch (error: any) {
    console.error('❌ [MobileRegistration] Transaction signing failed:', error);
    const errorMessage = error?.message || '';
    
    // User cancelled in wallet app
    if (errorMessage.includes('User rejected') || errorMessage.includes('rejected the request')) {
      clearTransactionState();
      throw new Error('❌ Transaction cancelled: You rejected the transaction in your wallet app.');
    }
    
    // Deep link timeout or wallet app not responding
    if (errorMessage.includes('timeout') || errorMessage.includes('not responding')) {
      clearTransactionState();
      throw new Error(
        '❌ Wallet app did not respond. Please ensure:\n' +
        '• Phantom or Solflare mobile app is installed\n' +
        '• You approved the transaction in the wallet app\n' +
        '• You were redirected back to the browser\n\n' +
        'Try again and make sure to complete the approval in your wallet app.'
      );
    }
    
    // Still a signature error after using signTransaction? (shouldn't happen)
    if (errorMessage.includes('Missing signature') || errorMessage.includes('Signature verification failed')) {
      clearTransactionState();
      throw new Error(
        '❌ Signature error: Please try these steps:\n' +
        '1. Close and reopen your wallet app\n' +
        '2. Disconnect and reconnect your wallet\n' +
        '3. Clear browser cache and try again'
      );
    }
    
    // Re-throw other errors
    clearTransactionState();
    throw error;
  }
}
