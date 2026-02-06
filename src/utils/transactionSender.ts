/**
 * Transaction Sender Utility
 * 
 * Provides robust transaction sending for mobile and desktop wallets.
 * - Mobile browsers: Prefers wallet.sendTransaction() for atomic Mobile Wallet Adapter flow
 * - Desktop browsers: Prefers wallet.signTransaction() + connection.sendRawTransaction()
 * 
 * This routing prevents signature verification failures on mobile caused by browser
 * context loss during wallet app deep-linking.
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

/**
 * Detects if the current environment is a mobile browser.
 * Used to determine the optimal transaction sending method.
 * 
 * Uses multiple detection strategies for reliability:
 * - User agent string (can be spoofed but widely supported)
 * - Touch points + pointer type (reliable feature detection)
 * 
 * Returns true if EITHER:
 * 1. User agent indicates mobile, OR
 * 2. Device has touch points AND coarse pointer (feature-based detection)
 * 
 * @returns true if running in a mobile browser (Android, iOS, etc.)
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check 1: User agent string
  const userAgentIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check 2: Touch points (mobile devices typically have > 0)
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  
  // Check 3: Pointer type (coarse = touch-based, typically mobile)
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  
  // Return true if user agent indicates mobile OR if device has touch + coarse pointer
  // This approach minimizes false negatives while being reasonably accurate
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
 * Sends a transaction using the optimal method for the current browser environment:
 * 
 * **Mobile browsers:**
 * 1. Prefer wallet.sendTransaction() - uses Mobile Wallet Adapter's atomic transact() flow
 *    (sign + submit happen inside wallet app, avoiding browser context loss)
 * 2. NO fallback to signTransaction (would fail with same deep-link issues)
 * 
 * **Desktop browsers:**
 * 1. Prefer wallet.signTransaction() + connection.sendRawTransaction()
 * 2. Fallback to wallet.sendTransaction() (for wallets without signTransaction)
 * 
 * This routing prevents "Signature verification failed" errors on mobile caused by
 * browser suspension/reload during wallet app deep-linking.
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
  
  const isMobile = isMobileBrowser();
  
  // MOBILE PATH: Prefer sendTransaction for atomic Mobile Wallet Adapter flow
  // On mobile, wallet.sendTransaction() uses transact() which handles sign + submit
  // atomically inside the wallet app, avoiding browser context loss during deep-linking
  if (isMobile && wallet.sendTransaction) {
    console.log('📱 Mobile browser detected — using wallet.sendTransaction (Mobile Wallet Adapter atomic flow)');
    
    try {
      const signature = await wallet.sendTransaction(
        transaction,
        connection,
        sendOptions
      );
      
      console.log('✅ Transaction submitted via sendTransaction (mobile):', signature);
      
      return {
        signature,
        method: 'send',
      };
    } catch (sendError: any) {
      console.error('❌ sendTransaction failed on mobile:', sendError);
      console.error('Error details:', {
        message: sendError?.message,
        name: sendError?.name,
        code: sendError?.code,
        logs: sendError?.logs,
      });
      
      // Re-throw the error with context
      throw new Error(
        `Failed to send transaction on mobile: ${sendError?.message || 'Unknown error'}`
      );
    }
  }
  
  // If mobile but sendTransaction not available, throw error (don't fall through to signTransaction)
  if (isMobile && !wallet.sendTransaction) {
    throw new Error(
      'Mobile wallet does not support sendTransaction. ' +
      'Please use a wallet with Mobile Wallet Adapter support (e.g., Phantom, Solflare).'
    );
  }
  
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

  // DESKTOP PATH: Prefer signTransaction + sendRawTransaction (existing behavior)
  if (wallet.signTransaction) {
    console.log('🖥️  Desktop browser — using wallet.signTransaction + connection.sendRawTransaction');
    
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
      
      console.log('✅ Transaction submitted via signTransaction (desktop):', signature);
      
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
  
  // DESKTOP FALLBACK: Use sendTransaction (for wallets without signTransaction)
  if (wallet.sendTransaction) {
    console.log('🖥️  Desktop browser — using wallet.sendTransaction (fallback)');
    
    try {
      const signature = await wallet.sendTransaction(
        transaction,
        connection,
        sendOptions
      );
      
      console.log('✅ Transaction submitted via sendTransaction (desktop fallback):', signature);
      
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
