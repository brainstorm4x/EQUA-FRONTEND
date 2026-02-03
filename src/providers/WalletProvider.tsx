'use client';

import { FC, ReactNode, useState, useEffect } from 'react';
import { DesktopWalletProvider } from './DesktopWalletProvider';
import { MobileWalletProvider } from './MobileWalletProvider';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect platform on client side only
    const userAgent = window.navigator.userAgent;
    const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
    
    // Check if in wallet's in-app browser (which uses desktop adapters)
    const isInAppBrowser = !!((window as any).solana?.isPhantom || (window as any).solflare);
    
    // Use mobile provider only if on mobile device AND not in wallet's browser
    setIsMobile(mobile && !isInAppBrowser);
    
    console.log('[WalletProvider] Platform detected:', {
      mobile,
      isInAppBrowser,
      willUseMobileProvider: mobile && !isInAppBrowser,
    });
  }, []);

  // Loading state during platform detection
  if (isMobile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading wallet...</div>
      </div>
    );
  }

  // Route to appropriate provider
  const Provider = isMobile ? MobileWalletProvider : DesktopWalletProvider;
  
  return (
    <Provider>
      <ProgramIdMigration />
      {children}
    </Provider>
  );
};