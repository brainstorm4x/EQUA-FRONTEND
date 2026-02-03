'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { connected, connecting, disconnect, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [mounted, setMounted] = useState(false);

  /**
   * Ensure this component only renders on the client.
   * This avoids hydration mismatches and mobile Safari quirks.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Handle button click - show wallet modal or disconnect
   */
  const handleClick = useCallback(async () => {
    if (connected) {
      await disconnect();
    } else {
      // Open modal - WalletProvider handles connection via autoConnect={true}
      setVisible(true);
    }
  }, [connected, disconnect, setVisible]);

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
   * Connecting state
   */
  if (connecting) {
    return (
      <div
        className="wallet-button-wrapper flex items-center gap-4 touch-manipulation"
        data-testid={testId}
        style={{ maxWidth: '100%' }}
      >
        <button
          disabled
          className="bg-purple-600 rounded-lg px-6 py-3 text-white font-semibold cursor-wait opacity-75"
        >
          Connecting...
        </button>
      </div>
    );
  }

  /**
   * Connected state
   */
  if (connected && publicKey) {
    return (
      <div
        className="wallet-button-wrapper flex items-center gap-4 touch-manipulation"
        data-testid={testId}
        style={{ maxWidth: '100%' }}
      >
        <button
          onClick={handleClick}
          className="bg-purple-600 hover:bg-purple-700 rounded-lg px-6 py-3 text-white font-semibold transition-all duration-200 touch-manipulation flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span>
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
        </button>

        {/* Optional connection indicator (desktop-friendly, harmless on mobile) */}
        <div className="hidden md:flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-purple-800 font-medium text-sm">
            Connected
          </span>
        </div>
      </div>
    );
  }

  /**
   * Not connected state
   */
  return (
    <div
      className="wallet-button-wrapper flex items-center gap-4 touch-manipulation"
      data-testid={testId}
      style={{ maxWidth: '100%' }}
    >
      <button
        onClick={handleClick}
        className="bg-purple-600 hover:bg-purple-700 rounded-lg px-6 py-3 text-white font-semibold transition-all duration-200 touch-manipulation"
      >
        Select Wallet
      </button>
    </div>
  );
};