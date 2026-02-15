/**
 * Transaction Sender Utility
 * 
 * Provides universal transaction sending for mobile and desktop wallets.
 * Prefers wallet.sendTransaction() for mobile compatibility, with a fallback
 * to signTransaction() + sendRawTransaction() when missing-signature errors occur.
 *
 * CRITICAL: Default path uses wallet.sendTransaction() for mobile compatibility
 * Mobile wallets (Phantom, Solflare) require full control over signing + submission
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
  preferSendTransaction?: boolean;
}

export interface SendTransactionResult {
  signature: TransactionSignature;
  /** Indicates which method was used */
  method: 'sendTransaction' | 'signTransaction';
}

/**
 * Universal transaction sender for mobile and desktop wallets
 * 
 * CRITICAL: Uses wallet.sendTransaction() by default for mobile compatibility
 * Mobile wallets (Phantom, Solflare) require full control over signing + submission
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

  try {
    if (options.preferSendTransaction === false) {
      return await signAndSendRaw();
    }

    return await sendTransaction();
  } catch (error: any) {
    const message = error?.message ?? '';
    const shouldFallback =
      message.includes('missing signature') ||
      message.includes('Signature verification failed') ||
      message.includes('Wallet does not support sendTransaction');

    if (shouldFallback && wallet.signTransaction) {
      try {
        return await signAndSendRaw();
      } catch (fallbackError: any) {
        return enhanceAndThrow(fallbackError);
      }
    }

    return enhanceAndThrow(error);
  }
}
