'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { isUserRegistered, getUserAccountPDA } from '@/lib/program';
import { rememberRegistered, wasRegistered } from '@/utils/registeredWallets';
import { detectWalletEnvironment } from '@/utils/walletEnvironment';

interface GetStartedButtonProps {
  className?: string;
  testId?: string;
}

// Cache duration in milliseconds (5 minutes)
const REGISTRATION_CACHE_DURATION = 5 * 60 * 1000;

// Key used to trigger re-check when registration completes
const REGISTRATION_EVENT_KEY = 'uniyaa_registration_complete';

/**
 * GetStartedButton - Smart CTA button that changes based on user registration status
 * 
 * - Unconnected wallet: Shows "Get Started →" (links to /mint)
 * - Connected but not registered: Shows "Get Started →" (links to /mint for registration)
 * - Connected and registered: Shows "Mint UNIYAA →" (links to /mint for minting)
 * 
 * Registration is checked ON-CHAIN ONLY (no database lookup).
 * Uses local keypair + on-chain account verification.
 */
export const GetStartedButton: FC<GetStartedButtonProps> = ({ 
  className = '', 
  testId = 'get-started-cta' 
}) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobileBrowser, setIsMobileBrowser] = useState<boolean>(false);

  // Detect mobile browser once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobileBrowser(detectWalletEnvironment() === 'mobile-browser');
    }
  }, []);
  
  // Cache to prevent excessive network calls
  const cacheRef = useRef<{ pubkey: string; registered: boolean; timestamp: number } | null>(null);

  const checkRegistrationStatus = useCallback(async (forceRefresh = false) => {
    if (!publicKey || !connected) {
      setIsRegistered(false);
      return;
    }

    const pubkeyStr = publicKey.toBase58();
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh && cacheRef.current && 
        cacheRef.current.pubkey === pubkeyStr && 
        Date.now() - cacheRef.current.timestamp < REGISTRATION_CACHE_DURATION) {
      setIsRegistered(cacheRef.current.registered);
      return;
    }

    setIsLoading(true);
    try {
      let registered = false;
      
      // Derive the user account PDA from the connected wallet's public key
      const [userAccountPDA] = getUserAccountPDA(publicKey);
      
      // Check if the PDA account exists on-chain (or the wallet was already
      // seen registered on this device; see registeredWallets.ts)
      registered = wasRegistered(publicKey) || (await isUserRegistered(connection, userAccountPDA));
      if (registered) rememberRegistered(publicKey);
      console.log(`✓ On-chain check via PDA (${userAccountPDA.toBase58()}): ${registered ? 'registered' : 'not registered'}`);
      
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

  // Listen for registration completion events
  useEffect(() => {
    // Track last event time to debounce
    let lastEventTime = 0;
    const DEBOUNCE_MS = 1000; // 1 second debounce

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === REGISTRATION_EVENT_KEY) {
        const now = Date.now();
        if (now - lastEventTime < DEBOUNCE_MS) {
          return; // Debounce duplicate events
        }
        lastEventTime = now;
        
        // Clear cache and re-check registration status
        cacheRef.current = null;
        checkRegistrationStatus(true);
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for custom event within the same tab
    const handleRegistrationComplete = () => {
      const now = Date.now();
      if (now - lastEventTime < DEBOUNCE_MS) {
        return; // Debounce duplicate events
      }
      lastEventTime = now;
      
      cacheRef.current = null;
      checkRegistrationStatus(true);
    };
    
    window.addEventListener('uniyaa_registration_complete', handleRegistrationComplete);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('uniyaa_registration_complete', handleRegistrationComplete);
    };
  }, [checkRegistrationStatus]);

  // Determine button text based on connection and registration status
  const getButtonText = () => {
    if (isLoading) {
      return 'Loading...';
    }
    if (connected && isRegistered) {
      return 'Mint UNIYAA →';
    }
    return 'Get Started →';
  };

  // Handle button click - use explicit navigation to prevent page refresh
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // On mobile browser, redirect to /mobile since wallet connection isn't available
    if (isMobileBrowser) {
      router.push('/mobile');
      return;
    }
    router.push('/mint');
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg ${className}`}
      data-testid={testId}
    >
      {getButtonText()}
    </button>
  );
};
