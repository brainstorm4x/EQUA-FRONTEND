'use client';

import { FC, useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletButton: FC<{ 'data-testid'?: string }> = ({ 'data-testid': testId }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button 
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
        data-testid={testId}
      >
        Loading...
      </button>
    );
  }

  return (
    <WalletMultiButton 
      className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg" 
      data-testid={testId}
    />
  );
};
