/**
 * Transaction Sender Utility
 * 
 * Provides robust transaction sending for mobile and desktop wallets.
 * Implements a sign-first approach that is compatible with Phantom mobile
 * and other wallet adapters that may have issues with sendTransaction.
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

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
 * 1. Prefer wallet.signTransaction (mobile-compatible)
 * 2. Fallback to wallet.sendTransaction (for wallets without signTransaction)
 * 
 * This approach ensures compatibility with Phantom mobile deep-link signing
 * while maintaining backward compatibility with desktop wallets.
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
  // Defensive validation: ensure transaction is properly prepared
  if (!transaction.feePayer) {
    throw new Error('Transaction validation failed: feePayer not set');
  }
  
  if (!transaction.recentBlockhash) {
    throw new Error('Transaction validation failed: recentBlockhash not set');
  }
  
  // Log transaction state before signing (public keys only, no sensitive data)
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
  
  /**
   * Wrap wallet.signTransaction with timeout protection to detect if wallet app doesn't return
   */
  const signWithTimeout = async (wallet: any, transaction: Transaction, timeoutMs = 120000) => {
    return Promise.race([
      wallet.signTransaction(transaction),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(
          'Wallet signature timeout. The wallet app did not respond within 2 minutes. ' +
          'Please ensure the wallet app is open and try again.'
        )), timeoutMs)
      )
    ]);
  };

  // Path 1: Prefer signTransaction (mobile-compatible, more reliable)
  if (wallet.signTransaction) {
    console.log('🔐 Using wallet.signTransaction (preferred method for mobile compatibility)');
    
    try {
      // Sign the transaction with timeout protection
      const signed = await signWithTimeout(wallet, transaction) as Transaction;
      
      // ✅ CRITICAL: Verify signature was actually attached
      console.log('🔍 Verifying signatures after wallet.signTransaction...');
      const hasValidSignatures = signed.signatures.every(sig => {
        if (!sig.signature || sig.signature.length === 0) {
          console.error('❌ Missing signature for:', sig.publicKey.toBase58());
          return false;
        }
        // Check if signature is not just zeros
        const isNonZero = sig.signature.some(byte => byte !== 0);
        if (!isNonZero) {
          console.error('❌ Zero signature for:', sig.publicKey.toBase58());
          return false;
        }
        return true;
      });

      if (!hasValidSignatures) {
        throw new Error(
          'Signature verification failed after wallet.signTransaction. ' +
          'This may be due to the wallet app closing before completing the signature. ' +
          'Please keep the wallet app open until you return to the browser.'
        );
      }

      console.log('✅ All signatures verified:', 
        signed.signatures.map(s => s.publicKey.toBase58()).join(', ')
      );
      
      // Submit the signed transaction
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        {
          skipPreflight: sendOptions.skipPreflight,
          maxRetries: sendOptions.maxRetries,
          preflightCommitment: sendOptions.preflightCommitment,
        }
      );
      
      console.log('📤 Transaction submitted via signTransaction:', signature);
      
      return {
        signature,
        method: 'sign',
      };
    } catch (signError: any) {
      console.error('❌ signTransaction failed:', signError);
      console.error('Error details:', {
        message: signError?.message,
        name: signError?.name,
        code: signError?.code,
      });
      
      // Re-throw the error with context
      throw new Error(
        `Failed to sign and send transaction: ${signError?.message || 'Unknown error'}`
      );
    }
  }
  
  // Path 2: Fallback to sendTransaction (for wallets without signTransaction)
  if (wallet.sendTransaction) {
    console.log('📤 Using wallet.sendTransaction (fallback method)');
    
    try {
      const signature = await wallet.sendTransaction(
        transaction,
        connection,
        sendOptions
      );
      
      console.log('📤 Transaction submitted via sendTransaction:', signature);
      
      return {
        signature,
        method: 'send',
      };
    } catch (sendError: any) {
      console.error('❌ sendTransaction failed:', sendError);
      console.error('Error details:', {
        message: sendError?.message,
        name: sendError?.name,
        code: sendError?.code,
        logs: sendError?.logs,
      });
      
      // Re-throw the error with context
      throw new Error(
        `Failed to send transaction: ${sendError?.message || 'Unknown error'}`
      );
    }
  }
  
  // Neither method is available - throw error
  throw new Error(
    'Wallet does not support transaction signing. ' +
    'Please use a compatible wallet like Phantom or Solflare.'
  );
}
