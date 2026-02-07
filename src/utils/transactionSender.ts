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
  console.log('📤 [TransactionSender] Starting transaction send...');
  
  // Validation
  if (!wallet.connected || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }
  
  if (!transaction.feePayer) {
    throw new Error('Transaction fee payer not set');
  }
  
  if (!transaction.recentBlockhash) {
    throw new Error('Transaction recent blockhash not set');
  }
  
  console.log('📝 Transaction prepared:', {
    feePayer: transaction.feePayer.toBase58(),
    recentBlockhash: transaction.recentBlockhash,
    instructionCount: transaction.instructions.length,
  });
  
  const sendTransaction = async (): Promise<SendTransactionResult> => {
    if (!wallet.sendTransaction) {
      throw new Error('Wallet does not support sendTransaction');
    }

    console.log('🔐 Using wallet.sendTransaction() (mobile-compatible)');
    console.log('  - Wallet will sign, verify, and submit internally');

    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: options.skipPreflight ?? false,
      preflightCommitment: 'confirmed',
      maxRetries: options.maxRetries ?? 3,
    });

    console.log('✅ Transaction submitted successfully:', signature);
    console.log('  - Method: wallet.sendTransaction()');
    console.log('  - Signature:', signature);

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
    console.error('❌ Transaction send failed:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      logs: error?.logs,
    });

    if (error?.message?.includes('User rejected')) {
      throw new Error('Transaction rejected by user in wallet');
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
        enhanceAndThrow(fallbackError);
      }
    }

    enhanceAndThrow(error);
  }
}
