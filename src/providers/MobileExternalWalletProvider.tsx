'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WALLET_CONNECTION_CONFIG, walletRpcEndpoint } from './walletEndpoint';

interface Props {
  children: ReactNode;
}

/**
 * Mobile External Wallet Provider
 *
 * For mobile external browsers (Chrome, Safari on Android/iOS).
 *
 * IMPORTANT: SolanaMobileWalletAdapter (MWA v1) CANNOT be used here.
 * MWA v1 uses a local WebSocket server that Android kills when Chrome tabs
 * go to the background during deep-link navigation. This causes the wallet
 * app to open and return without connecting.
 *
 * Instead, we rely on the Wallet Standard protocol to auto-detect wallets.
 * On mobile external browsers, the MobileWalletConnect component (not
 * WalletMultiButton) initiates connections via select() + connect() directly,
 * triggering a redirect-based deep link that survives tab backgrounding.
 *
 * NOTE: The upstream @solana/wallet-adapter-react WalletProvider automatically
 * injects SolanaMobileWalletAdapter when it detects Android mobile web. This is
 * harmless because WalletMultiButton is never shown on mobile-browser — the
 * MobileWalletConnect component is used instead (via WalletButton's environment
 * detection), so MWA never appears in the UI.
 *
 * autoConnect={true} silently reconnects when the user returns from the
 * wallet app, using the cached connection state.
 */
export const MobileExternalWalletProvider: FC<Props> = ({ children }) => {
  // Same endpoint as the rest of the app (was hard-coded public devnet).
  const endpoint = useMemo(() => walletRpcEndpoint(), []);

  console.log('📱 [MobileExternalProvider] Initializing with Wallet Standard auto-detection (autoConnect)');

  return (
    <ConnectionProvider endpoint={endpoint} config={WALLET_CONNECTION_CONFIG}>
      <SolanaWalletProvider wallets={[]} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
