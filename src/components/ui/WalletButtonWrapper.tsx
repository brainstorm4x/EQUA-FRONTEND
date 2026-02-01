/**
 * Wallet Button Wrapper
 * 
 * Dynamic import wrapper for the custom WalletButton component
 * This is the main export point for WalletButton used throughout the app
 */

'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/wallet').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

export { WalletButton };
