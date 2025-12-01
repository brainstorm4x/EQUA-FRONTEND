'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  testId?: string;
}

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

// Delay before blurring active element after touch (allows click to register)
const TOUCH_BLUR_DELAY_MS = 100;

/**
 * Detects if the current device is a touch device using CSS media query
 * More reliable than User-Agent detection
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // Use matchMedia to check for touch capability
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { wallet, connected, connecting, disconnect } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  
  // Use ref to track connecting state to avoid stale closure issues
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;

  // Only render on client side and detect touch device
  useEffect(() => {
    setMounted(true);
    setIsMobile(isTouchDevice());
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
    // Uses a small delay to ensure the click event registers before blur
    const handleTouchEnd = () => {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, TOUCH_BLUR_DELAY_MS);
    };

    // Blur on touchmove to avoid scroll-triggered stuck states
    const handleTouchMove = () => {
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
