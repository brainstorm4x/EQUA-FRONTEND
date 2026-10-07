'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { walletRpcEndpoint } from './walletEndpoint';

interface Props {
  children: ReactNode;
}

/**
 * Mobile In-App Wallet Provider
 *
 * For mobile in-app browsers (Phantom/Solflare apps).
 * The wallet self-registers via the Wallet Standard protocol inside its own
 * in-app browser, so no legacy adapters are needed.  autoConnect={true}
 * silently reconnects the pre-injected wallet when the app re-opens.
 */
export const MobileInAppWalletProvider: FC<Props> = ({ children }) => {
  // Same endpoint as the rest of the app (was hard-coded public devnet).
  const endpoint = useMemo(() => walletRpcEndpoint(), []);

  console.log('📱 [MobileInAppProvider] Initializing with Wallet Standard auto-detection');

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
