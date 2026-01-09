/**
 * Solana Explorer Link Utilities
 * 
 * Generate links to Solana Explorer for transactions, addresses, and blocks.
 * Automatically includes cluster parameter for non-mainnet networks.
 */

import { NETWORK } from '@/lib/constants';

/**
 * Get Solana Explorer link for a given resource
 * 
 * @param type - Type of resource ('tx' for transaction, 'address' for account, 'block' for block)
 * @param identifier - Transaction signature, address, or block number
 * @param network - Solana network (defaults to NETWORK from constants)
 * @returns Full URL to Solana Explorer
 */
export function getExplorerLink(
  type: 'tx' | 'address' | 'block',
  identifier: string,
  network: string = NETWORK
): string {
  // Base URL for Solana Explorer
  const baseUrl = 'https://explorer.solana.com';
  
  // Add cluster parameter for non-mainnet networks
  // Mainnet-beta doesn't need a cluster parameter
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  
  return `${baseUrl}/${type}/${identifier}${cluster}`;
}

/**
 * Get Solana Explorer link for a transaction
 * 
 * @param signature - Transaction signature
 * @param network - Solana network (defaults to NETWORK from constants)
 * @returns Full URL to transaction on Solana Explorer
 */
export function getTransactionExplorerLink(
  signature: string,
  network: string = NETWORK
): string {
  return getExplorerLink('tx', signature, network);
}

/**
 * Get Solana Explorer link for an address/account
 * 
 * @param address - Account address (base58 string)
 * @param network - Solana network (defaults to NETWORK from constants)
 * @returns Full URL to address on Solana Explorer
 */
export function getAddressExplorerLink(
  address: string,
  network: string = NETWORK
): string {
  return getExplorerLink('address', address, network);
}

/**
 * Get Solana Explorer link for a block
 * 
 * @param block - Block number or slot
 * @param network - Solana network (defaults to NETWORK from constants)
 * @returns Full URL to block on Solana Explorer
 */
export function getBlockExplorerLink(
  block: number | string,
  network: string = NETWORK
): string {
  return getExplorerLink('block', block.toString(), network);
}
