'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { wallet, connected, connecting, disconnect } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);

  // Only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle connection timeout
  useEffect(() => {
    if (!connecting) {
      setConnectionTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (connecting) {
        console.warn('Wallet connection timed out after', CONNECTION_TIMEOUT_MS, 'ms');
        setConnectionTimedOut(true);
      }
    }, CONNECTION_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [connecting]);

  // Handle disconnect when connection times out
  const handleTimeoutDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setConnectionTimedOut(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, [disconnect]);

  if (!mounted) {
    return (
      <div 
        className="bg-primary-600 rounded-lg px-6 py-3"
        data-testid={testId}
      >
        <span className="text-white font-semibold">Loading...</span>
      </div>
    );
  }

  // Show timeout message if connection is stuck
  if (connectionTimedOut) {
    return (
      <div className="flex items-center gap-2" data-testid={testId}>
        <button
          onClick={handleTimeoutDisconnect}
          className="bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2 text-white font-semibold transition-all"
        >
          Connection Failed - Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4" data-testid={testId}>
      <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !px-6 !py-3 !text-white !font-semibold !transition-all !duration-200" />
      
      {connected && wallet && (
        <div className="hidden md:flex items-center gap-2 bg-primary-100 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-primary-800 font-medium text-sm">Connected</span>
        </div>
      )}
    </div>
  );
};
