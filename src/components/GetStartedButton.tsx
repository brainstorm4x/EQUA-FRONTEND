'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { isUserRegistered, getOrCreateKeypair } from '@/lib/program';

interface GetStartedButtonProps {
  className?: string;
  testId?: string;
}

/**
 * GetStartedButton - Smart CTA button that changes based on user registration status
 * 
 * - Unconnected wallet: Shows "Get Started →" (links to /mint)
 * - Connected but not registered: Shows "Get Started →" (links to /mint for registration)
 * - Connected and registered: Shows "Mint EQUA →" (links to /mint for minting)
 */
export const GetStartedButton: FC<GetStartedButtonProps> = ({ 
  className = '', 
  testId = 'get-started-cta' 
}) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkRegistrationStatus = useCallback(async () => {
    if (!publicKey || !connected) {
      setIsRegistered(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get the user's keypair from localStorage (same keypair used in registration)
      const userAccountKeypair = getOrCreateKeypair();
      const registered = await isUserRegistered(connection, userAccountKeypair.publicKey);
      setIsRegistered(registered);
    } catch (error) {
      console.error('Error checking registration status:', error);
      setIsRegistered(false);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    checkRegistrationStatus();
  }, [checkRegistrationStatus]);

  // Determine button text based on connection and registration status
  const getButtonText = () => {
    if (isLoading) {
      return 'Loading...';
    }
    if (connected && isRegistered) {
      return 'Mint EQUA →';
    }
    return 'Get Started →';
  };

  return (
    <Link
      href="/mint"
      className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg ${className}`}
      data-testid={testId}
    >
      {getButtonText()}
    </Link>
  );
};
