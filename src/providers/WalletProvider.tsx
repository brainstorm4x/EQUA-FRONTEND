'use client';

import { FC, ReactNode } from 'react';
import { DesktopWalletProvider } from './DesktopWalletProvider';
import { MobileWalletProvider } from './MobileWalletProvider';
import { ProgramIdMigration } from '@/components/ProgramIdMigration';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Jupiter-style wallet provider
 *
 * IMPORTANT:
 * - MobileWalletProvider is ALWAYS mounted
 * - DesktopWalletProvider is ALWAYS mounted
 * - Adapters decide availability internally
 * - React never remounts providers on mobile return
 */
export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  return (
    <MobileWalletProvider>
      <DesktopWalletProvider>
        <ProgramIdMigration />
        {children}
      </DesktopWalletProvider>
    </MobileWalletProvider>
  );
};
