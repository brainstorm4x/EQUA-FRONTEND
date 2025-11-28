'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { isUserRegistered, getOrCreateKeypair } from '@/lib/program';

interface GetStartedButtonProps {
  className?: string;
  testId?: string;
}

// Cache duration in milliseconds (5 minutes)
const REGISTRATION_CACHE_DURATION = 5 * 60 * 1000;

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
  
  // Cache to prevent excessive network calls
  const cacheRef = useRef<{ pubkey: string; registered: boolean; timestamp: number } | null>(null);

  const checkRegistrationStatus = useCallback(async () => {
    if (!publicKey || !connected) {
      setIsRegistered(false);
      return;
    }

    const pubkeyStr = publicKey.toBase58();
    
    // Check cache first
    if (cacheRef.current && 
        cacheRef.current.pubkey === pubkeyStr && 
        Date.now() - cacheRef.current.timestamp < REGISTRATION_CACHE_DURATION) {
      setIsRegistered(cacheRef.current.registered);
      return;
    }

    setIsLoading(true);
    try {
      // Get the user's keypair from localStorage (same keypair used in registration)
      const userAccountKeypair = getOrCreateKeypair();
      const registered = await isUserRegistered(connection, userAccountKeypair.publicKey);
      setIsRegistered(registered);
      
      // Update cache
      cacheRef.current = {
        pubkey: pubkeyStr,
        registered,
        timestamp: Date.now()
      };
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
