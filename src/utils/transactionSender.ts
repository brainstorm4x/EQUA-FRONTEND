/**
 * Transaction Sender Utility
 * 
 * Provides universal transaction sending for mobile and desktop wallets.
 * 
 * Uses wallet.sendTransaction() whenever available because it lets the wallet
 * control the signing flow (especially important for deep links on mobile).
 * Falls back to signTransaction() + sendRawTransaction() for legacy wallets or
 * when sendTransaction fails with a signature verification error.
 *
 * Mobile Detection: Uses isMobileBrowser() for logging/diagnostics only.
 * Sending strategy is capability-first, not user-agent-first.
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';

/**
 * Detect if running in mobile browser
 * Used for mobile-specific optimizations and logging
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  // android: Android Chrome/browsers
  // iphone/ipad/ipod: Safari on iOS
  // mobile: generic mobile browsers
  // crios: Chrome for iOS (uses CriOS UA token, not "mobile")
  // fxios: Firefox for iOS (uses FxiOS UA token, not "mobile")
  return /android|iphone|ipad|ipod|mobile|crios|fxios/i.test(ua);
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
 * PRIMARY PATH (mobile + desktop): Uses sendTransaction() for wallet-managed signing
 * - Works with browser extension wallets and deep-link mobile wallets
 * 
 * FALLBACK PATH: Uses signTransaction() + sendRawTransaction()
 * - Used if sendTransaction is unavailable
 * - Also used if sendTransaction fails with signature-related errors
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

  // Track whether sendTransaction() was attempted to prevent duplicate retries
  let usedSendTransaction = false;

  try {
    // Use sendTransaction first (mobile + desktop).
    // This lets wallet adapters handle signature orchestration internally.
    if (wallet.sendTransaction) {
      console.log('🌐 [TransactionSender] Using wallet.sendTransaction() as primary path');
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
    // - sendTransaction() was actually attempted (usedSendTransaction = true)
    // - The error is a signature verification failure
    // - The wallet supports signTransaction as an alternative
    //
    // This prevents duplicate retries when signAndSendRaw() was the original failing method
    //
    // @deprecated Mobile registration now uses a dedicated path (src/utils/mobileRegistration.ts)
    // that avoids transaction.setSigners() and transaction.compileMessage() entirely,
    // eliminating the need for this signature error retry fallback.
    const shouldFallback =
      usedSendTransaction && // ← KEY FIX: Only retry if sendTransaction was attempted
      (message.includes('missing signature') ||
       message.includes('Signature verification failed')) &&
      wallet.signTransaction;

    if (shouldFallback) {
      console.warn('⚠️ [TransactionSender] sendTransaction() failed with signature error');
      console.warn('   Falling back to signTransaction() + sendRawTransaction()');
      console.warn('   NOTE: Mobile registration now uses mobileRegistration.ts to avoid this fallback');
      try {
        return await signAndSendRaw();
      } catch (fallbackError: any) {
        return enhanceAndThrow(fallbackError);
      }
    }

    return enhanceAndThrow(error);
  }
}
