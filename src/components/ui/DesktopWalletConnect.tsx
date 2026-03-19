'use client';

import { FC, useEffect, useRef } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

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
 *   3. useEffect detects wallet transition null → adapter → calls connect()
 *   4. Wallet extension popup opens for approval
 *   5. User clicks "Connect" in the extension → connected ✓
 *
 * autoConnect={false} is intentionally kept on the provider so the user always
 * makes an explicit choice.  This component only auto-calls connect() after the
 * explicit adapter selection, not on page load.
 */
export const DesktopWalletConnect: FC<DesktopWalletConnectProps> = ({ testId }) => {
  const { wallet, connected, connecting, connect } = useWallet();
  const prevWalletRef = useRef<typeof wallet>(null);

  useEffect(() => {
    const wasNull = prevWalletRef.current === null;
    const isNowSet = wallet !== null;

    // Only auto-connect when the wallet transitions from null to a selected adapter
    // (i.e. user just chose one from the modal) and we are not already connected/connecting.
    if (wasNull && isNowSet && !connected && !connecting) {
      connect().catch((err) => {
        // WalletNotReadyError is expected when the extension hasn't fully initialized —
        // the adapter triggers its own connection flow and the wallet adapter state
        // machine handles completion.  Other errors are logged for debugging.
        if (err?.name !== 'WalletNotReadyError') {
          console.warn('[DesktopWalletConnect] connect() error:', err);
        }
      });
    }

    prevWalletRef.current = wallet;
  }, [wallet, connected, connecting, connect]);

  return <WalletMultiButton data-testid={testId} />;
};
