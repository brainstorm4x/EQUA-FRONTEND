/**
 * Transaction Sender Utility
 * 
 * Provides universal transaction sending for mobile and desktop wallets.
 * 
 * CRITICAL FIX: Mobile browsers (Phantom Mobile, Solflare Mobile) use signTransaction()
 * path because their sendTransaction() does NOT properly sign before submitting,
 * causing "Missing signature" errors. Desktop browsers use sendTransaction() for convenience.
 *
 * Mobile Detection: Uses isMobileBrowser() to detect mobile user agents
 * Mobile Path: wallet.signTransaction() + connection.sendRawTransaction()
 * Desktop Path: wallet.sendTransaction() (more convenient, handles signing internally)
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

/**
 * Detect if running in mobile browser
 * Used for mobile-specific optimizations and logging
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}

/**
 * Wallet interface representing the minimal wallet adapter methods needed
 * for transaction sending. This matches the WalletContextState from
 * @solana/wallet-adapter-react.
 */
export interface WalletAdapter {
  connected?: boolean;
  publicKey?: { toBase58(): string } | null;
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
  /** Indicates which method was used */
  method: 'sendTransaction' | 'signTransaction';
}

/**
 * Universal transaction sender for mobile and desktop wallets
 * 
 * MOBILE BROWSERS: Uses signTransaction() + sendRawTransaction() path
 * - Phantom Mobile, Solflare Mobile require explicit signing
 * - Their sendTransaction() does NOT sign properly
 * - Detects mobile via isMobileBrowser() user agent check
 * 
 * DESKTOP BROWSERS: Uses sendTransaction() for convenience
 * - Desktop wallets handle signing internally
 * - Falls back to signTransaction() on signature errors
 * 
 * @param wallet - Wallet adapter context
 * @param transaction - Prepared transaction (must have feePayer and recentBlockhash set)
 * @param connection - Solana connection
 * @param options - Send options (skipPreflight, commitment, etc.)
 * @returns Transaction signature
 */
export async function sendTransactionWithSign(
  wallet: WalletAdapter,
  transaction: Transaction,
  connection: Connection,
  options: SendOptions = {}
): Promise<SendTransactionResult> {
  console.log('📡 [TransactionSender] Starting transaction send...');
  console.log('  📍 Wallet:', wallet.publicKey?.toBase58() || 'Unknown');
  console.log('  📍 Has sendTransaction:', !!wallet.sendTransaction);
  console.log('  📍 Has signTransaction:', !!wallet.signTransaction);
  console.log('  📍 Fee payer:', transaction.feePayer?.toBase58());
  console.log('  📍 Recent blockhash:', transaction.recentBlockhash);
  console.log('  📍 Instructions count:', transaction.instructions.length);
  
  // Check if mobile browser
  const isMobile = isMobileBrowser();
  console.log('  📍 Is mobile browser:', isMobile);
  
  // Validation
  if (!wallet.connected || !wallet.publicKey) {
    console.error('❌ [TransactionSender] Wallet not connected');
    throw new Error('Wallet not connected');
  }
  
  if (!transaction.feePayer) {
    console.error('❌ [TransactionSender] Transaction fee payer not set');
    throw new Error('Transaction fee payer not set');
  }
  
  if (!transaction.recentBlockhash) {
    console.error('❌ [TransactionSender] Transaction recent blockhash not set');
    throw new Error('Transaction recent blockhash not set');
  }
  
  console.log('📝 Transaction prepared:', {
    feePayer: transaction.feePayer.toBase58(),
    recentBlockhash: transaction.recentBlockhash,
    instructionCount: transaction.instructions.length,
  });
  
  const sendTransaction = async (): Promise<SendTransactionResult> => {
    if (!wallet.sendTransaction) {
      console.error('❌ [TransactionSender] Wallet does not support sendTransaction');
      throw new Error('Wallet does not support sendTransaction');
    }

    console.log('📤 [TransactionSender] Calling wallet.sendTransaction()...');
    console.log('  📍 Options:', options);
    console.log('🔐 Using wallet.sendTransaction() (mobile-compatible)');
    console.log('  - Wallet will sign, verify, and submit internally');

    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: options.skipPreflight ?? false,
      preflightCommitment: 'confirmed',
      maxRetries: options.maxRetries ?? 3,
    });

    console.log('✅ [TransactionSender] Transaction sent successfully!');
    console.log('  📍 Signature:', signature);
    console.log('  📍 Method: sendTransaction');

    return { signature, method: 'sendTransaction' };
  };

  const signAndSendRaw = async (): Promise<SendTransactionResult> => {
    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support signTransaction');
    }

    console.log('🔐 Using wallet.signTransaction() + connection.sendRawTransaction()');

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: options.skipPreflight ?? false,
      preflightCommitment: 'confirmed',
      maxRetries: options.maxRetries ?? 3,
    });

    console.log('✅ Transaction submitted successfully:', signature);
    console.log('  - Method: wallet.signTransaction()');
    console.log('  - Signature:', signature);

    return { signature, method: 'signTransaction' };
  };

  const enhanceAndThrow = (error: any): never => {
    console.error('❌ [TransactionSender] Transaction send failed:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      logs: error?.logs,
      error: error,
    });

    // Log specific error types
    if (error?.message?.includes('Signature verification failed')) {
      console.error('🔴 [TransactionSender] SIGNATURE VERIFICATION FAILURE');
      console.error('  This indicates the wallet returned an unsigned transaction');
      console.error('  Wallet:', wallet.publicKey?.toBase58());
      console.error('  Is Mobile:', isMobileBrowser());
    }

    if (error?.message?.includes('User rejected')) {
      console.error('🔴 [TransactionSender] USER REJECTED TRANSACTION');
    }

    if (error?.message?.includes('insufficient funds')) {
      throw new Error('Insufficient SOL balance for transaction fees');
    }

    if (error?.message?.includes('blockhash')) {
      throw new Error('Transaction expired - please try again');
    }

    throw error;
  };

  // Track which transaction method we're using to prevent duplicate retries
  let usedSendTransaction = false;

  try {
    // CRITICAL FIX: Mobile wallets (Phantom Mobile, Solflare Mobile) require signTransaction()
    // because their sendTransaction() does not properly sign before submitting
    
    // MOBILE PATH: Always prefer signTransaction on mobile if available
    if (isMobile && wallet.signTransaction) {
      console.log('📱 [TransactionSender] Mobile browser detected');
      console.log('   Using signTransaction() + sendRawTransaction() for mobile compatibility');
      return await signAndSendRaw();
    }
    
    // DESKTOP PATH: Use sendTransaction for desktop wallets (more convenient)
    if (wallet.sendTransaction) {
      console.log('🖥️ [TransactionSender] Desktop browser detected');
      console.log('   Using wallet.sendTransaction() for convenience');
      usedSendTransaction = true; // Mark that we're attempting sendTransaction
      return await sendTransaction();
    }
    
    // FALLBACK: signTransaction for wallets without sendTransaction
    if (wallet.signTransaction) {
      console.log('🔄 [TransactionSender] Fallback path');
      console.log('   Using signTransaction() + sendRawTransaction()');
      return await signAndSendRaw();
    }
    
    // No supported methods
    throw new Error('Wallet does not support transaction signing');
  } catch (error: any) {
    const message = error?.message ?? '';
    
    // ENHANCED FIX: Only fallback to signTransaction if:
    // 1. sendTransaction() was actually attempted (usedSendTransaction = true)
    // 2. The error is a signature verification failure
    // 3. The wallet supports signTransaction as an alternative
    //
    // This prevents duplicate retries when signAndSendRaw() was the original failing method
    const shouldFallback =
      usedSendTransaction && // ← KEY FIX: Only retry if sendTransaction was attempted
      (message.includes('missing signature') ||
       message.includes('Signature verification failed')) &&
      wallet.signTransaction;

    if (shouldFallback) {
      console.warn('⚠️ [TransactionSender] sendTransaction() failed with signature error');
      console.warn('   Falling back to signTransaction() + sendRawTransaction()');
      try {
        return await signAndSendRaw();
      } catch (fallbackError: any) {
        return enhanceAndThrow(fallbackError);
      }
    }

    return enhanceAndThrow(error);
  }
}
