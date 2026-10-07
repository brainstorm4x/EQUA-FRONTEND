import { clusterApiUrl, Cluster } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { NETWORK, RPC_ENDPOINT } from '@/lib/constants';

/**
 * RPC endpoint shared by every wallet provider (desktop, mobile in-app,
 * mobile external browser).
 *
 * Uses `NEXT_PUBLIC_RPC_ENDPOINT` (or the legacy `NEXT_PUBLIC_SOLANA_RPC_HOST`)
 * via `@/lib/constants`, falling back to the public endpoint for
 * `NEXT_PUBLIC_NETWORK`, so wallet connections use the same cluster and RPC
 * as the rest of the app rather than silently using public devnet.
 */
export function resolveNetwork(value: string): WalletAdapterNetwork {
  switch (value) {
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'testnet':
      return WalletAdapterNetwork.Testnet;
    case 'devnet':
    default:
      return WalletAdapterNetwork.Devnet;
  }
}

export function walletRpcEndpoint(
  rpcEndpoint: string = RPC_ENDPOINT,
  network: string = NETWORK,
): string {
  if (rpcEndpoint && rpcEndpoint.length > 0) return rpcEndpoint;
  return clusterApiUrl(resolveNetwork(network) as Cluster);
}
