'use client';

import { FC, useEffect, useRef } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';

interface DesktopWalletConnectProps {
  testId?: string;
}

/**
 * Desktop Wallet Connect Component
 *
 * Wraps WalletMultiButton and automatically calls connect() as soon as the user
 * selects a wallet adapter from the modal.  This removes the extra "Connect" click
 * that WalletMultiButton requires after wallet selection, giving a single natural
 * flow:
 *
 *   1. User clicks "Select Wallet" → modal opens with installed extensions
 *   2. User picks a wallet (e.g. Phantom) → adapter becomes non-null
 *   3. useEffect detects wallet transition null → adapter
 *   4. Polls until adapter readyState is Installed (up to 3 s), then calls connect()
 *   5. Wallet extension popup opens for approval
 *   6. User approves → button shows public key ✓
 *
 * autoConnect={false} is intentionally kept on the provider so the user always
 * makes an explicit choice.  This component only auto-calls connect() after the
 * explicit adapter selection, not on page load.
 */
export const DesktopWalletConnect: FC<DesktopWalletConnectProps> = ({ testId }) => {
  const { wallet, connected, connecting, connect } = useWallet();
  const prevWalletRef = useRef<typeof wallet>(null);
  // Keep a stable ref to connect() so it never re-triggers the effect.
  const connectRef = useRef(connect);
  connectRef.current = connect;

  useEffect(() => {
    const wasNull = prevWalletRef.current === null;
    const isNowSet = wallet !== null;

    // Only auto-connect when the wallet transitions from null to a selected adapter
    // (i.e. user just chose one from the modal) and we are not already connected/connecting.
    if (wasNull && isNowSet && !connected && !connecting) {
      const adapter = wallet.adapter;
      const MAX_WAIT_MS = 3000;
      const POLL_INTERVAL_MS = 100;
      let elapsed = 0;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const tryConnect = () => {
        if (adapter.readyState === WalletReadyState.Installed) {
          connectRef.current().catch((err) => {
            console.warn('[DesktopWalletConnect] connect() error:', err);
          });
          return;
        }

        elapsed += POLL_INTERVAL_MS;
        if (elapsed >= MAX_WAIT_MS) {
          console.warn(
            '[DesktopWalletConnect] Adapter readyState not Installed after',
            MAX_WAIT_MS,
            'ms — leaving WalletMultiButton in Connect state as fallback.'
          );
          return;
        }

        timeoutId = setTimeout(tryConnect, POLL_INTERVAL_MS);
      };

      tryConnect();

      return () => clearTimeout(timeoutId);
    }

    prevWalletRef.current = wallet;
  // connect is intentionally excluded — we use connectRef to avoid spurious re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, connected, connecting]);

  return <WalletMultiButton data-testid={testId} />;
};
