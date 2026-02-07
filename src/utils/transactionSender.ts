/**
 * Transaction Sender Utility (Rewritten)
 * 
 * Provides universal transaction sending for mobile and desktop wallets.
 * Uses a sign-first approach that is compatible with all Solana wallet adapters.
 * 
 * Key Principle: Always prefer signTransaction() for maximum compatibility.
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

/**
 * Detects if the current environment is a mobile browser.
 * 
 * NOTE: This function is kept for backward compatibility with existing code that uses it
 * for non-transaction purposes (e.g., selecting blockhash commitment levels).
 * It is NO LONGER used for transaction routing - all wallets now use the same sign-first approach.
 * 
 * @returns true if running in a mobile browser (Android, iOS, etc.)
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check 1: User agent string (includes common mobile platforms)
  const userAgentIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|KaiOS/i.test(navigator.userAgent);
  
  // Check 2: Touch points (mobile devices typically have > 0)
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  
  // Check 3: Pointer type (coarse = touch-based, typically mobile)
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  
  // Return true if user agent indicates mobile OR if device has touch + coarse pointer
  return userAgentIsMobile || (hasTouchPoints && hasCoarsePointer);
}

/**
 * Wallet interface representing the minimal wallet adapter methods needed
 * for transaction sending. This matches the WalletContextState from
 * @solana/wallet-adapter-react.
 */
export interface WalletAdapter {
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  sendTransaction?: (
    transaction: Transaction,
    connection: Connection,
    options?: SendOptions
  ) => Promise<TransactionSignature>;
}

export interface SendOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface SendTransactionResult {
  signature: TransactionSignature;
  /** Indicates which method was used: 'sign' or 'send' */
  method: 'sign' | 'send';
}

/**
 * Sends a transaction using the most reliable method available:
 * 
 * **Preferred Method (99% of wallets):**
 * 1. wallet.signTransaction() - Sign in wallet app/extension
 * 2. connection.sendRawTransaction() - Submit signed transaction
 * 
 * **Fallback Method (legacy wallets only):**
 * 1. wallet.sendTransaction() - Wallet handles sign + submit internally
 * 
 * This approach ensures compatibility with:
 * - Mobile wallets (Phantom Mobile, Solflare Mobile via deep-link signing)
 * - Desktop wallets (Phantom Extension, Solflare Extension)
 * - All Solana Mobile Wallet Adapter compatible wallets
 * 
 * @param wallet - Wallet adapter instance
 * @param transaction - Prepared transaction (must have feePayer and recentBlockhash set)
 * @param connection - Solana connection instance
 * @param options - Transaction send options
 * @returns Promise with signature and method used
 * @throws Error if wallet doesn't support either method or if validation fails
 */
export async function sendTransactionWithSign(
  wallet: WalletAdapter,
  transaction: Transaction,
  connection: Connection,
  options: SendOptions = {}
): Promise<SendTransactionResult> {
  // ============================================================================
  // VALIDATION: Ensure transaction is properly prepared
  // ============================================================================
  if (!transaction.feePayer) {
    throw new Error('Transaction validation failed: feePayer not set');
  }
  
  if (!transaction.recentBlockhash) {
    throw new Error('Transaction validation failed: recentBlockhash not set');
  }
  
  // Log transaction state (public keys only, no sensitive data)
  console.log('📝 Transaction prepared for signing:', {
    feePayer: transaction.feePayer.toBase58(),
    recentBlockhash: transaction.recentBlockhash,
    instructionCount: transaction.instructions.length,
  });
  
  // Default options
  const sendOptions: SendOptions = {
    skipPreflight: options.skipPreflight ?? false,
    maxRetries: options.maxRetries ?? 3,
    preflightCommitment: options.preflightCommitment,
  };
  
  // ============================================================================
  // CRITICAL: Compile message to initialize signature slots
  // Without this, transaction.signatures array is empty and signing fails
  // ============================================================================
  try {
    transaction.compileMessage();
    console.log('✅ Transaction message compiled');
    console.log('  - Signature slots initialized:', transaction.signatures.length);
    console.log('  - Required signers:', transaction.signatures.map((sig, i) => 
      `${i}. ${sig.publicKey?.toBase58() || 'unknown'}`
    ).join('\n    '));
  } catch (compileError) {
    console.error('❌ Failed to compile transaction message:', compileError);
    throw new Error(`Transaction compilation failed: ${compileError instanceof Error ? compileError.message : 'Unknown error'}`);
  }
  
  // ============================================================================
  // PATH 1 (PREFERRED): Use wallet.signTransaction() + connection.sendRawTransaction()
  // This works for ALL modern wallets (mobile + desktop)
  // ============================================================================
  if (wallet.signTransaction) {
    console.log('🔐 Using wallet.signTransaction() (universal method - mobile & desktop compatible)');
    
    try {
      // Sign the transaction in the wallet (opens wallet app on mobile)
      console.log('  - Requesting signature from wallet...');
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('  - ✅ Transaction signed successfully');
      console.log('🔍 Verifying signatures after wallet.signTransaction...');
      console.log('  - Total signature slots:', signedTransaction.signatures.length);
      
      // Verify that the transaction was actually signed
      let allSigned = true;
      for (let i = 0; i < signedTransaction.signatures.length; i++) {
        const sig = signedTransaction.signatures[i];
        const hasSig = sig.signature !== null && sig.signature.length > 0 && sig.signature.some((byte: number) => byte !== 0);
        console.log(`  - Signature ${i}: ${sig.publicKey?.toBase58()} - ${hasSig ? '✅ Signed' : '❌ Missing'}`);
        if (!hasSig) {
          allSigned = false;
        }
      }

      if (!allSigned) {
        throw new Error(
          'Signature verification failed after wallet.signTransaction. ' +
          'This may be due to the wallet app closing before completing the signature. ' +
          'Please try again and ensure you approve the transaction in your wallet.'
        );
      }

      console.log('✅ All signatures verified');
      console.log('  - Submitting signed transaction to Solana network...');
      
      // Submit the signed transaction to the network
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: sendOptions.skipPreflight,
          maxRetries: sendOptions.maxRetries,
          preflightCommitment: sendOptions.preflightCommitment,
        }
      );
      
      console.log('✅ Transaction submitted successfully:', signature);
      
      return {
        signature,
        method: 'sign',
      };
    } catch (signError: any) {
      console.error('❌ signTransaction() failed:', signError);
      console.error('Error details:', {
        message: signError?.message,
        name: signError?.name,
        code: signError?.code,
      });
      
      // Re-throw with context
      throw new Error(
        `Failed to sign and send transaction: ${signError?.message || 'Unknown error'}`
      );
    }
  }
  
  // ============================================================================
  // PATH 2 (FALLBACK): Use wallet.sendTransaction()
  // Only for legacy wallets that don't support signTransaction
  // ============================================================================
  if (wallet.sendTransaction) {
    console.log('📤 Using wallet.sendTransaction() (fallback for legacy wallets)');
    
    try {
      const signature = await wallet.sendTransaction(
        transaction,
        connection,
        sendOptions
      );
      
      console.log('✅ Transaction submitted via sendTransaction():', signature);
      
      return {
        signature,
        method: 'send',
      };
    } catch (sendError: any) {
      console.error('❌ sendTransaction() failed:', sendError);
      console.error('Error details:', {
        message: sendError?.message,
        name: sendError?.name,
        code: sendError?.code,
        logs: sendError?.logs,
      });
      
      // Re-throw with context
      throw new Error(
        `Failed to send transaction: ${sendError?.message || 'Unknown error'}`
      );
    }
  }
  
  // ============================================================================
  // ERROR: Neither method is available
  // ============================================================================
  throw new Error(
    'Wallet does not support transaction signing. ' +
    'Please use a compatible wallet like Phantom or Solflare.'
  );
}
