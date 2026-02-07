/**
 * Transaction Sender Utility
 * 
 * Provides universal transaction sending for mobile and desktop wallets.
 * Uses wallet.sendTransaction() exclusively for mobile compatibility.
 * 
 * CRITICAL: Always uses wallet.sendTransaction() for mobile compatibility
 * Mobile wallets (Phantom, Solflare) require full control over signing + submission
 */

import { Connection, Transaction, TransactionSignature } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

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
  /** Indicates which method was used: always 'sendTransaction' */
  method: 'sendTransaction';
}

/**
 * Universal transaction sender for mobile and desktop wallets
 * 
 * CRITICAL: Always uses wallet.sendTransaction() for mobile compatibility
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
  
  if (!wallet.sendTransaction) {
    throw new Error('Wallet does not support sendTransaction');
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
  
  // Use wallet.sendTransaction() exclusively for mobile + desktop compatibility
  console.log('🔐 Using wallet.sendTransaction() (mobile-compatible)');
  console.log('  - Wallet will sign, verify, and submit internally');
  
  try {
    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: options.skipPreflight ?? false,
      preflightCommitment: 'confirmed',
      maxRetries: options.maxRetries ?? 3,
    });
    
    console.log('✅ Transaction submitted successfully:', signature);
    console.log('  - Method: wallet.sendTransaction()');
    console.log('  - Signature:', signature);
    
    return { signature, method: 'sendTransaction' };
    
  } catch (error: any) {
    console.error('❌ wallet.sendTransaction() failed:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      logs: error?.logs,
    });
    
    // Enhanced error messages for common mobile wallet issues
    if (error?.message?.includes('User rejected')) {
      throw new Error('Transaction rejected by user in wallet');
    }
    
    if (error?.message?.includes('insufficient funds')) {
      throw new Error('Insufficient SOL balance for transaction fees');
    }
    
    if (error?.message?.includes('blockhash')) {
      throw new Error('Transaction expired - please try again');
    }
    
    // Re-throw with original error for other cases
    throw error;
  }
}
