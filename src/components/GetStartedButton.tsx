'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { isUserRegistered, loadKeypair } from '@/lib/program';
import { db } from '@/lib/supabase/database';

interface GetStartedButtonProps {
  className?: string;
  testId?: string;
}

// Cache duration in milliseconds (5 minutes)
const REGISTRATION_CACHE_DURATION = 5 * 60 * 1000;

// Key used to trigger re-check when registration completes
const REGISTRATION_EVENT_KEY = 'equa_registration_complete';

/**
 * GetStartedButton - Smart CTA button that changes based on user registration status
 * 
 * - Unconnected wallet: Shows "Get Started →" (links to /mint)
 * - Connected but not registered: Shows "Get Started →" (links to /mint for registration)
 * - Connected and registered: Shows "Mint EQUA →" (links to /mint for minting)
 * 
 * Registration is checked in multiple layers:
 * 1. Local keypair + on-chain account (fastest)
 * 2. Database record by wallet address (persisted across device/browser)
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
      
      // First, check if there's an existing keypair in localStorage
      const existingKeypair = loadKeypair();
      
      if (existingKeypair) {
        // Check if the keypair's user account is registered on-chain
        registered = await isUserRegistered(connection, existingKeypair.publicKey);
      }
      
      // If not found via keypair, check the database by wallet address
      // This handles the case where user cleared cache/cookies but is still registered
      if (!registered) {
        try {
          registered = await db.isWalletRegistered(pubkeyStr);
          if (registered) {
            console.log('✅ User found in database (wallet previously registered)');
          }
        } catch (dbError) {
          // Database check failed, but we shouldn't block the UI
          console.warn('Database registration check failed:', dbError);
        }
      }
      
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
    
    window.addEventListener('equa_registration_complete', handleRegistrationComplete);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('equa_registration_complete', handleRegistrationComplete);
    };
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
