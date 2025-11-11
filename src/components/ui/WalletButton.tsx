'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: FC = () => {
  const { wallet, connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  // Only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-primary-600 rounded-lg px-6 py-3">
        <span className="text-white font-semibold">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
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
