/**
 * Wallet Button Wrapper
 * 
 * Dynamic import wrapper for the custom WalletButton component
 * Replaces the old WalletButtonWrapper with the new custom implementation
 */

'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/wallet').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

export { WalletButton };
