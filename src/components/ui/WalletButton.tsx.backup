'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 30_000; // 30 seconds

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { connected, connecting, disconnect } = useWallet();

  const [mounted, setMounted] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);

  // Track connecting state safely across renders
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;

  /**
   * Ensure this component only renders on the client.
   * This avoids hydration mismatches and mobile Safari quirks.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Connection timeout guard.
   * Protects users from being stuck indefinitely if a mobile deep-link
   * is aborted or the wallet never returns.
   */
  useEffect(() => {
    if (!connecting) {
      setConnectionTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (connectingRef.current) {
        console.warn(
          '[WalletButton] Wallet connection timed out after',
          CONNECTION_TIMEOUT_MS,
          'ms'
        );
        setConnectionTimedOut(true);
      }
    }, CONNECTION_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [connecting]);

  /**
   * Reset wallet state cleanly after timeout.
   */
  const handleTimeoutDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setConnectionTimedOut(false);
    } catch (error) {
      console.error('[WalletButton] Error during timeout disconnect:', error);
    }
  }, [disconnect]);

  /**
   * Prevent rendering anything wallet-related until mounted.
   * This avoids SSR/CSR mismatches and mobile viewport glitches.
   */
  if (!mounted) {
    return (
      <div
        className="bg-purple-600 rounded-lg px-6 py-3"
        data-testid={testId}
      >
        <span className="text-white font-semibold">Loading...</span>
      </div>
    );
  }

  /**
   * Show a clear retry path if the wallet connection got stuck.
   * This is especially important on mobile when users dismiss
   * the OS “Open with” chooser.
   */
  if (connectionTimedOut && !connected) {
    return (
      <div className="flex items-center gap-2" data-testid={testId}>
        <button
          onClick={handleTimeoutDisconnect}
          className="bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2 text-white font-semibold transition-all touch-manipulation"
        >
          Connection Failed — Retry
        </button>
      </div>
    );
  }

  /**
   * Single source of truth:
   * WalletMultiButton is used for BOTH desktop and mobile.
   * The Solana wallet adapter handles:
   * - extensions on desktop
   * - deep links on mobile
   */
  return (
    <div
      className="wallet-button-wrapper flex items-center gap-4 touch-manipulation"
      data-testid={testId}
      style={{ maxWidth: '100%' }}
    >
      <WalletMultiButton
        className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !px-6 !py-3 !text-white !font-semibold !transition-all !duration-200"
      />

      {/* Optional connection indicator (desktop-friendly, harmless on mobile) */}
      {connected && (
        <div className="hidden md:flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-purple-800 font-medium text-sm">
            Connected
          </span>
        </div>
      )}
    </div>
  );
};
