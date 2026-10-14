import { clusterApiUrl, Cluster, type ConnectionConfig } from '@solana/web3.js';
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

/**
 * Connection settings shared by every wallet provider. Reads use "confirmed",
 * the level registration and payments wait for. Without it the RPC default is
 * "finalized", which trails by ~13 s, so a just-registered wallet read as
 * "not registered". One shared object, because ConnectionProvider makes a new
 * connection whenever its config object changes.
 */
export const WALLET_CONNECTION_CONFIG: ConnectionConfig = { commitment: 'confirmed' };
