/**
 * Tests for the RPC endpoint shared by all wallet providers.
 */

import { walletRpcEndpoint, resolveNetwork } from '@/providers/walletEndpoint';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

describe('walletRpcEndpoint', () => {
  it('uses the configured RPC endpoint when set', () => {
    expect(walletRpcEndpoint('https://rpc.example.com', 'devnet')).toBe('https://rpc.example.com');
  });

  it('falls back to the public endpoint for the configured network', () => {
    expect(walletRpcEndpoint('', 'mainnet-beta')).toBe(clusterApiUrl('mainnet-beta'));
    expect(walletRpcEndpoint('', 'testnet')).toBe(clusterApiUrl('testnet'));
    expect(walletRpcEndpoint('', 'devnet')).toBe(clusterApiUrl('devnet'));
  });

  it('treats an unknown network as devnet', () => {
    expect(resolveNetwork('localnet')).toBe(WalletAdapterNetwork.Devnet);
  });
});
