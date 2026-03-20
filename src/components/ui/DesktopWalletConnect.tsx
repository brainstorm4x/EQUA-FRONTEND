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
 *   3. useEffect detects wallet transition null → adapter
 *   4. Defers connect() by 50 ms so the adapter's internal state settles
 *   5. Wallet extension popup opens for approval
 *   6. User approves → button shows public key ✓
 *
 * Standard Wallets (Phantom, Solflare) self-register via the Wallet Standard
 * protocol and are always in the Installed state immediately, so no polling is
 * needed.  autoConnect={false} is kept on the provider so the user always makes
 * an explicit choice; this component only auto-calls connect() after the explicit
 * adapter selection, not on page load.
 */
export const DesktopWalletConnect: FC<DesktopWalletConnectProps> = ({ testId }) => {
  const { wallet, connected, connecting, connect } = useWallet();
  const prevWalletRef = useRef<typeof wallet>(null);
  // Keep a stable ref to connect() so it never re-triggers the effect.
  const connectRef = useRef(connect);
  connectRef.current = connect;

  useEffect(() => {
    // Capture the previous wallet BEFORE updating the ref so the transition
    // check below uses the correct "before" value on every run.
    const previousWallet = prevWalletRef.current;

    // Always update the ref immediately — this must happen before any early
    // returns so subsequent effect runs see the up-to-date value.
    prevWalletRef.current = wallet;

    // Only auto-connect when the wallet transitions from null to a selected
    // adapter (i.e. user just chose one from the modal) and we are not already
    // connected/connecting.
    if (previousWallet === null && wallet !== null && !connected && !connecting) {
      // Defer by 50 ms to let the adapter's internal state settle before
      // calling connect().  Standard Wallets are immediately Installed, so
      // no polling is required.
      const timeoutId = setTimeout(() => {
        connectRef.current().catch((err) => {
          console.warn('[DesktopWalletConnect] connect() error:', err);
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  // connect is intentionally excluded — we use connectRef to avoid spurious re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, connected, connecting]);

  return <WalletMultiButton data-testid={testId} />;
};
