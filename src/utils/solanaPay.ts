/**
 * Solana Pay URL generation utilities
 * 
 * Generates Solana Pay transfer URLs for EQUA Token-2022 transfers.
 * See: https://docs.solanapay.com/spec
 */

import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ADDRESS } from '@/lib/constants';

export interface SolanaPayTransferParams {
  /** Recipient wallet address */
  recipient: PublicKey | string;
  /** SPL Token mint address (for token transfers) */
  splToken?: PublicKey | string;
  /** Optional: Amount to request (in token units, not base units) */
  amount?: number | string;
  /** Optional: Reference for tracking (can be array of pubkeys) */
  reference?: (PublicKey | string)[];
  /** Optional: Label shown in wallet UI */
  label?: string;
  /** Optional: Message shown to user */
  message?: string;
  /** Optional: On-chain memo */
  memo?: string;
  /** Optional: Explicit token program ID (for Token-2022) */
  tokenProgram?: PublicKey | string;
}

/**
 * Converts a value to a base58 string
 */
function toBase58(value: PublicKey | string): string {
  return typeof value === 'string' ? value : value.toBase58();
}

/**
 * Generates a Solana Pay transfer URL
 * 
 * @param params - Transfer parameters
 * @returns Solana Pay URL string
 * 
 * @example
 * // Basic SOL transfer
 * generateSolanaPayUrl({ recipient: publicKey })
 * 
 * @example
 * // SPL Token-2022 transfer with amount
 * generateSolanaPayUrl({ 
 *   recipient: publicKey,
 *   splToken: mintAddress,
 *   amount: 10.5,
 *   label: 'EQUA Token',
 *   message: 'Receive EQUA tokens'
 * })
 */
export function generateSolanaPayUrl(params: SolanaPayTransferParams): string {
  const { recipient, splToken, amount, reference, label, message, memo, tokenProgram } = params;
  
  // Start with the recipient
  const recipientAddress = toBase58(recipient);
  const url = new URL(`solana:${recipientAddress}`);
  
  // Add SPL token mint if provided
  if (splToken) {
    url.searchParams.set('spl-token', toBase58(splToken));
  }
  
  // Add amount if provided
  if (amount != null) {
    url.searchParams.set('amount', amount.toString());
  }
  
  // Add reference(s) if provided
  if (reference && reference.length > 0) {
    reference.forEach(ref => {
      url.searchParams.append('reference', toBase58(ref));
    });
  }
  
  // Add label if provided
  if (label) {
    url.searchParams.set('label', label);
  }
  
  // Add message if provided
  if (message) {
    url.searchParams.set('message', message);
  }
  
  // Add memo if provided
  if (memo) {
    url.searchParams.set('memo', memo);
  }
  
  // Add token program if provided (important for Token-2022)
  if (tokenProgram) {
    url.searchParams.set('token-program', toBase58(tokenProgram));
  }
  
  return url.toString();
}

/**
 * Generates a Solana Pay URL for receiving EQUA tokens (Token-2022)
 * 
 * @param recipientAddress - Recipient wallet address
 * @param mintAddress - EQUA mint address
 * @returns Solana Pay URL for EQUA token transfers
 * 
 * @example
 * const url = generateEquaSolanaPayUrl(walletAddress, equaMintAddress);
 * // solana:RecipientAddress?spl-token=MintAddress&token-program=TokenzQdBN...&label=EQUA&message=Send%20EQUA%20tokens
 */
export function generateEquaSolanaPayUrl(
  recipientAddress: PublicKey | string,
  mintAddress: PublicKey | string
): string {
  // Runtime validation: Ensure TOKEN_PROGRAM_ID is Token-2022
  if (TOKEN_PROGRAM_ID.toBase58() !== TOKEN_2022_PROGRAM_ADDRESS) {
    throw new Error(
      `EQUA Solana Pay URLs require Token-2022. ` +
      `Configured TOKEN_PROGRAM_ID (${TOKEN_PROGRAM_ID.toBase58()}) does not match Token-2022 (${TOKEN_2022_PROGRAM_ADDRESS})`
    );
  }
  
  return generateSolanaPayUrl({
    recipient: recipientAddress,
    splToken: mintAddress,
    label: 'EQUA Token',
    message: 'Send EQUA tokens (Token-2022)',
    tokenProgram: TOKEN_PROGRAM_ID,
  });
}
