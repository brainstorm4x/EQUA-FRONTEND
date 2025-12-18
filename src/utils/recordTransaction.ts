/**
 * recordTransaction utility
 * 
 * Calls the record_transaction instruction to increment GlobalState.total_transactions
 * after successful SPL token transfers. This is non-blocking - if it fails, the transfer
 * is still considered successful.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createRecordTransactionInstruction, getGlobalStatePDA } from '@/lib/program';

/**
 * Records a transaction on-chain by calling the record_transaction instruction
 * 
 * @param connection - Solana RPC connection
 * @param signTransaction - Wallet adapter signTransaction function
 * @param authority - Wallet public key (must be the signer)
 * @returns Transaction signature on success, null on failure
 */
export async function recordTransaction(
  connection: Connection,
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined,
  authority: PublicKey
): Promise<string | null> {
  if (!signTransaction) {
    console.warn('⚠️ recordTransaction: No signTransaction function provided');
    return null;
  }

  try {
    // Get global state PDA
    const [globalStatePDA] = getGlobalStatePDA();

    // Create record_transaction instruction
    const instruction = createRecordTransactionInstruction(globalStatePDA, authority);

    // Build transaction
    const transaction = new Transaction();
    transaction.add(instruction);
    transaction.feePayer = authority;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;

    // Sign transaction
    const signed = await signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      maxRetries: 2,
    });

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    console.log('✅ recordTransaction successful:', signature);
    return signature;
  } catch (error: any) {
    // Non-blocking failure - log but don't throw
    console.warn('⚠️ recordTransaction failed (non-blocking):', error.message || error);
    return null;
  }
}
