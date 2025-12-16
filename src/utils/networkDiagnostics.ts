/**
 * Network Diagnostics Utilities
 * 
 * Provides utilities for detecting cluster/network information from RPC endpoints
 * and validating configuration alignment between frontend and backend.
 */

import { Connection } from '@solana/web3.js';

export type ClusterType = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | 'custom';

export interface ClusterInfo {
  type: ClusterType;
  endpoint: string;
  displayName: string;
}

/**
 * Known Solana RPC endpoints for cluster detection
 */
const KNOWN_ENDPOINTS: Record<string, ClusterType> = {
  'https://api.mainnet-beta.solana.com': 'mainnet-beta',
  'https://api.mainnet.solana.com': 'mainnet-beta',
  'https://api.devnet.solana.com': 'devnet',
  'https://api.testnet.solana.com': 'testnet',
  'http://localhost:8899': 'localnet',
  'http://127.0.0.1:8899': 'localnet',
};

/**
 * Derive cluster type from RPC endpoint URL
 * 
 * @param endpoint - RPC endpoint URL
 * @returns Detected cluster type
 */
export function detectClusterFromEndpoint(endpoint: string): ClusterType {
  // Check exact matches first
  const normalized = endpoint.toLowerCase().trim();
  
  for (const [knownEndpoint, cluster] of Object.entries(KNOWN_ENDPOINTS)) {
    if (normalized === knownEndpoint.toLowerCase()) {
      return cluster;
    }
  }
  
  // Check for partial matches in URL
  if (normalized.includes('mainnet')) {
    return 'mainnet-beta';
  }
  if (normalized.includes('devnet')) {
    return 'devnet';
  }
  if (normalized.includes('testnet')) {
    return 'testnet';
  }
  if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
    return 'localnet';
  }
  
  // Unknown/custom endpoint
  return 'custom';
}

/**
 * Get human-readable cluster information from connection
 * 
 * @param connection - Solana connection instance
 * @returns Cluster information object
 */
export function getClusterInfo(connection: Connection): ClusterInfo {
  const endpoint = connection.rpcEndpoint;
  const type = detectClusterFromEndpoint(endpoint);
  
  const displayNames: Record<ClusterType, string> = {
    'mainnet-beta': 'Mainnet Beta',
    'devnet': 'Devnet',
    'testnet': 'Testnet',
    'localnet': 'Localnet',
    'custom': 'Custom RPC',
  };
  
  return {
    type,
    endpoint,
    displayName: displayNames[type],
  };
}

/**
 * Get the expected cluster from environment variables
 * 
 * @returns Expected cluster type or null if not specified
 */
export function getExpectedCluster(): ClusterType | null {
  const network = process.env.NEXT_PUBLIC_NETWORK || process.env.NEXT_PUBLIC_SOLANA_NETWORK;
  
  if (!network) {
    return null;
  }
  
  const normalized = network.toLowerCase();
  if (normalized === 'mainnet-beta' || normalized === 'mainnet') {
    return 'mainnet-beta';
  }
  if (normalized === 'devnet') {
    return 'devnet';
  }
  if (normalized === 'testnet') {
    return 'testnet';
  }
  if (normalized === 'localnet') {
    return 'localnet';
  }
  
  return null;
}

/**
 * Check if the current connection cluster matches the expected cluster from env
 * 
 * @param connection - Solana connection instance
 * @returns true if clusters match or no expected cluster is set, false otherwise
 */
export function isClusterAligned(connection: Connection): boolean {
  const expectedCluster = getExpectedCluster();
  
  // If no expected cluster is set, assume aligned
  if (!expectedCluster) {
    return true;
  }
  
  const actualCluster = detectClusterFromEndpoint(connection.rpcEndpoint);
  return actualCluster === expectedCluster;
}
