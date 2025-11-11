'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('./WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

export { WalletButton };
