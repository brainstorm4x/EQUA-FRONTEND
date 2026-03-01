'use client';

import { FC, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';

interface MobileWalletConnectProps {
  /** When true, renders a compact header-friendly version */
  compact?: boolean;
}

/**
 * Mobile Wallet Connect Component
 *
 * Used on mobile external browsers (Chrome/Safari) instead of WalletMultiButton.
 *
 * WHY THIS EXISTS:
 * WalletMultiButton checks adapter.readyState before connecting. On Android Chrome,
 * PhantomWalletAdapter reports readyState = 'NotDetected' (no window.phantom),
 * so the modal navigates to phantom.app (download page) instead of connecting.
 *
 * This component calls wallet.select() + wallet.connect() DIRECTLY, which
 * bypasses readyState and triggers Phantom/Solflare's redirect-based deep link.
 * The wallet app opens via a proper redirect (not WebSocket), approves the
 * connection, and redirects back to the browser.
 *
 * autoConnect={true} on the provider handles silent reconnection on return.
 *
 * compact={true} renders a single "Select Wallet" button suitable for headers.
 * On click it expands to show Phantom + Solflare options inline.
 */
export const MobileWalletConnect: FC<MobileWalletConnectProps> = ({ compact = false }) => {
  const { select, connect, connecting, connected, publicKey, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const connectWallet = useCallback(async (walletName: WalletName) => {
    try {
      setError(null);
      setShowOptions(false);
      console.log(`📱 [MobileWalletConnect] Selecting ${walletName} and connecting...`);
      select(walletName);
      // Small delay to allow adapter selection to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      await connect();
      console.log(`✅ [MobileWalletConnect] Connected to ${walletName}`);
    } catch (err: any) {
      // WalletNotReadyError is expected on first tap — adapter triggers deep link
      // and the connection completes when user returns. autoConnect handles it.
      if (err?.name === 'WalletNotReadyError') {
        console.log(`📱 [MobileWalletConnect] WalletNotReadyError — deep link should have opened`);
        console.log('  → User should approve in wallet app and return to browser');
        // Don't show error — this is expected behavior for mobile deep linking
        return;
      }
      console.error(`❌ [MobileWalletConnect] Connection error:`, err);
      setError(err?.message || 'Failed to connect wallet');
    }
  }, [select, connect]);

  // If connected, show address + disconnect (same for both compact and full)
  if (connected && publicKey) {
    const address = publicKey.toBase58();
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <div className="bg-purple-500/30 border border-purple-500/50 text-white px-3 py-1.5 rounded-lg text-sm font-mono">
            {shortAddress}
          </div>
          <button
            onClick={disconnect}
            className="text-purple-300 text-xs underline"
          >
            Disconnect
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="bg-purple-500/30 border border-purple-500/50 text-white px-4 py-2 rounded-xl text-sm font-mono">
          {shortAddress}
        </div>
        <button
          onClick={disconnect}
          className="text-purple-300 text-sm underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // COMPACT MODE: Single button → expands to wallet options
  if (compact) {
    if (!showOptions) {
      return (
        <button
          onClick={() => setShowOptions(true)}
          disabled={connecting}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm"
        >
          {connecting ? 'Connecting...' : 'Select Wallet'}
        </button>
      );
    }

    // Show wallet options inline (compact)
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => connectWallet('Phantom' as WalletName)}
          disabled={connecting}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg transition-all text-sm"
        >
          <img
            src="https://phantom.app/img/phantom-logo.png"
            alt="Phantom"
            className="w-4 h-4 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {connecting ? '...' : 'Phantom'}
        </button>
        <button
          onClick={() => connectWallet('Solflare' as WalletName)}
          disabled={connecting}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg transition-all text-sm"
        >
          <img
            src="https://solflare.com/favicon.ico"
            alt="Solflare"
            className="w-4 h-4 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {connecting ? '...' : 'Solflare'}
        </button>
        <button
          onClick={() => setShowOptions(false)}
          className="text-purple-300 text-xs px-2"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  // FULL MODE: Side-by-side wallet buttons (for connect screen)
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <p className="text-purple-200 text-sm text-center">
        Connect your mobile wallet to continue
      </p>

      {/* Phantom */}
      <button
        onClick={() => connectWallet('Phantom' as WalletName)}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all"
      >
        <img
          src="https://phantom.app/img/phantom-logo.png"
          alt="Phantom"
          className="w-6 h-6 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {connecting ? 'Opening Phantom...' : 'Connect Phantom'}
      </button>

      {/* Solflare */}
      <button
        onClick={() => connectWallet('Solflare' as WalletName)}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all"
      >
        <img
          src="https://solflare.com/favicon.ico"
          alt="Solflare"
          className="w-6 h-6 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {connecting ? 'Opening Solflare...' : 'Connect Solflare'}
      </button>

      {error && (
        <p className="text-red-400 text-sm text-center mt-2">{error}</p>
      )}

      <p className="text-purple-400 text-xs text-center mt-2">
        You&apos;ll be redirected to your wallet app to approve the connection
      </p>
    </div>
  );
};
