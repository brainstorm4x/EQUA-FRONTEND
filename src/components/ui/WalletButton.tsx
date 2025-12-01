'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Detects if the current device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Gets the Phantom deep link URL for mobile
 */
function getPhantomDeepLink(): string {
  if (typeof window === 'undefined') return '';
  
  // Encode the current URL for the redirect
  const encodedUrl = encodeURIComponent(window.location.href);
  const encodedRef = encodeURIComponent(window.location.origin);
  
  // Phantom mobile deep link format
  return `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedRef}`;
}

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { wallet, connected, connecting, disconnect, select } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  
  // Use ref to track connecting state to avoid stale closure issues
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;

  // Only render on client side and detect mobile
  useEffect(() => {
    setMounted(true);
    setIsMobile(isMobileDevice());
  }, []);

  // Handle connection timeout
  useEffect(() => {
    if (!connecting) {
      setConnectionTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Use ref to get current connecting state, avoiding stale closure
      if (connectingRef.current) {
        console.warn('Wallet connection timed out after', CONNECTION_TIMEOUT_MS, 'ms');
        setConnectionTimedOut(true);
      }
    }, CONNECTION_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [connecting]);

  // Fix for mobile touch events getting stuck
  // This handles the case where :active CSS state doesn't release properly on touch
  useEffect(() => {
    if (!mounted || !isMobile || !buttonWrapperRef.current) return;

    const wrapper = buttonWrapperRef.current;
    
    // Force blur on touchend to prevent stuck active states
    const handleTouchEnd = (e: TouchEvent) => {
      // Small delay to allow click to register
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
    };

    // Prevent default on touchmove to avoid scroll-triggered stuck states
    const handleTouchMove = (e: TouchEvent) => {
      // If we're scrolling, blur any focused button
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      wrapper.removeEventListener('touchend', handleTouchEnd);
      wrapper.removeEventListener('touchmove', handleTouchMove);
    };
  }, [mounted, isMobile]);

  // Handle disconnect when connection times out
  const handleTimeoutDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setConnectionTimedOut(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, [disconnect]);

  // Handle mobile wallet connection - opens Phantom app directly
  const handleMobileConnect = useCallback(() => {
    const deepLink = getPhantomDeepLink();
    if (deepLink) {
      // On mobile, try to open the Phantom app directly
      window.location.href = deepLink;
    }
  }, []);

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
          className="bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2 text-white font-semibold transition-all touch-manipulation"
        >
          Connection Failed - Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={buttonWrapperRef}
      className="flex items-center gap-4" 
      data-testid={testId}
    >
      {/* 
        Add touch-manipulation CSS class and custom wrapper for mobile touch handling.
        touch-manipulation disables double-tap-to-zoom which can cause delays.
      */}
      <div className="wallet-button-wrapper touch-manipulation">
        <WalletMultiButton 
          className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !px-6 !py-3 !text-white !font-semibold !transition-all !duration-200 touch-manipulation" 
        />
      </div>
      
      {connected && wallet && (
        <div className="hidden md:flex items-center gap-2 bg-primary-100 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-primary-800 font-medium text-sm">Connected</span>
        </div>
      )}
    </div>
  );
};
