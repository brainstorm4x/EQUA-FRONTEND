/**
 * Mobile Registration Utility
 *
 * Mobile-specific registration function that uses the correct transaction signing
 * strategy for mobile wallets:
 *
 * PRIMARY PATH — wallet.sendTransaction():
 *   - Used when the wallet adapter exposes sendTransaction()
 *   - Handles signing + submission atomically inside the wallet adapter
 *   - Does NOT trigger a full-page deep-link navigation — Promise is preserved
 *   - REQUIRED for Chrome mobile (external browser) + Phantom/Solflare
 *
 * FALLBACK PATH — wallet.signTransaction() + connection.sendRawTransaction():
 *   - Used only when sendTransaction() is unavailable
 *   - Triggers a deep-link that navigates to wallet app
 *   - ONLY reliable inside wallet in-app browsers (e.g., Phantom's built-in browser)
 *   - On external browsers (Chrome/Firefox mobile), the Promise is orphaned during
 *     the deep-link round-trip, resulting in "Signature verification failed"
 *
 * Historical note: Previously this file used signTransaction() exclusively, which
 * caused "Signature verification failed" on Chrome mobile.
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

  console.log('✅ [MobileRegistration] Transaction prepared:');
  console.log('  - Fee payer:', transaction.feePayer.toBase58());
  console.log('  - Instructions count:', transaction.instructions.length);
  console.log('    → Compute budget: 1');
  console.log('    → User ATA creation: 1');
  console.log('    → Locked ATA creation: 1');
  console.log('    → Registration (initializeUser): 1');

  // Validate wallet has at least one signing method
  if (!wallet.sendTransaction && !wallet.signTransaction) {
    throw new Error('Wallet does not support transaction signing or sending. Please use Phantom or Solflare mobile wallet.');
  }

  // SAVE STATE BEFORE SIGNING (in case page reloads on deep-link return)
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
    let signature: string;

    // Fetch fresh blockhash immediately before signing.
    // This is done here (not earlier) to minimize staleness risk in case any
    // setup steps above were slow or involved deep-link navigation.
    console.log('⛓️ [MobileRegistration] Fetching fresh blockhash immediately before signing...');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    console.log('  - Blockhash:', blockhash);
    console.log('  - Last valid block height:', lastValidBlockHeight);

    if (wallet.sendTransaction) {
      // PRIMARY PATH: sendTransaction() handles signing + submission atomically.
      //
      // This is the CORRECT method for Chrome mobile (external browser).
      // Modern Phantom and Solflare adapters implement sendTransaction() using an
      // internal mechanism (WalletConnect popup, sandboxed tab, or extension bridge)
      // that does NOT navigate away from the page — so the Promise is NOT orphaned.
      //
      // Contrast: signTransaction() triggers a deep-link that navigates Chrome to the
      // wallet app. When Chrome returns, the original Promise is garbage-collected and
      // resolves with an empty/zero signature, causing "Signature verification failed".
      console.log('📱 [MobileRegistration] Using sendTransaction() — primary path for Chrome mobile');
      console.log('  - This handles signing and submission atomically without a deep-link navigation');

      signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });

      console.log('✅ [MobileRegistration] Transaction sent via sendTransaction():', signature);
    } else {
      // FALLBACK PATH: signTransaction() + sendRawTransaction()
      //
      // Used ONLY when sendTransaction is unavailable (e.g., certain legacy adapters
      // or wallet in-app browsers where the wallet fully controls the browser context
      // and the Promise survives navigation).
      console.log('📱 [MobileRegistration] sendTransaction unavailable — using signTransaction() fallback');
      console.log('  ⚠️  This path is only reliable inside wallet in-app browsers (e.g., Phantom browser)');
      console.log('  ⚠️  On Chrome mobile, this may fail with "Signature verification failed"');

      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support transaction signing. Please use Phantom or Solflare mobile wallet.');
      }

      const signedTx = await wallet.signTransaction(transaction);

      console.log('✅ [MobileRegistration] Transaction signed by wallet');
      console.log('📤 [MobileRegistration] Submitting signed transaction to Solana...');

      signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
        preflightCommitment: 'confirmed',
      });

      console.log('✅ [MobileRegistration] Transaction submitted:', signature);
    }

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
    console.error('❌ [MobileRegistration] Transaction failed:', error);
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
    
    // Signature verification failed — most likely signTransaction() was used in Chrome mobile
    // and the Promise was orphaned during the deep-link navigation round-trip
    if (errorMessage.includes('Missing signature') || errorMessage.includes('Signature verification failed')) {
      clearTransactionState();
      throw new Error(
        '❌ Signature verification failed.\n\n' +
        'This can happen when using Chrome on mobile with an external wallet.\n\n' +
        'Please try:\n' +
        '1. Open this page inside your wallet app\'s built-in browser\n' +
        '   (Phantom → Browse → paste the URL)\n' +
        '2. Or use a desktop browser with the wallet extension\n' +
        '3. Disconnect and reconnect your wallet, then try again'
      );
    }
    
    // Re-throw other errors
    clearTransactionState();
    throw error;
  }
}
