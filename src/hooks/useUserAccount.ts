/**
 * React hook for fetching and managing user account data from the blockchain
 */

import { useQuery } from '@tanstack/react-query';
import { PublicKey, Connection } from '@solana/web3.js';
import { getUserAccountData, UserAccountData } from '@/utils/onchainRegistration';
import { useConnection } from '@solana/wallet-adapter-react';

interface UseUserAccountOptions {
  /**
   * How often to refetch the account data (in milliseconds)
   * Default: 30000 (30 seconds)
   */
  refetchInterval?: number;
  
  /**
   * Whether to enable the query
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Hook to fetch and manage a user account from the blockchain
 * 
 * @param userAccountPubkey The user account public key to fetch
 * @param options Query options
 * @returns React Query result with user account data
 * 
 * @example
 * ```tsx
 * const { data: userAccount, isLoading, error, refetch } = useUserAccount(
 *   userAccountKeypair.publicKey
 * );
 * 
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error loading account</div>;
 * if (!userAccount) return <div>Account not found</div>;
 * 
 * return (
 *   <div>
 *     <p>Authority: {userAccount.authority.toBase58()}</p>
 *     <p>Minted: {userAccount.mintedAmount.toString()}</p>
 *   </div>
 * );
 * ```
 */
export function useUserAccount(
  userAccountPubkey: PublicKey | null | undefined,
  options: UseUserAccountOptions = {}
) {
  const { connection } = useConnection();
  const { refetchInterval = 30000, enabled = true } = options;
  
  return useQuery<UserAccountData | null, Error>({
    queryKey: ['userAccount', userAccountPubkey?.toBase58()],
    queryFn: async () => {
      if (!userAccountPubkey) {
        return null;
      }
      
      return await getUserAccountData(connection, userAccountPubkey);
    },
    enabled: enabled && !!userAccountPubkey,
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook to check if a user account is registered on-chain
 * 
 * @param userAccountPubkey The user account public key to check
 * @returns React Query result with boolean indicating registration status
 * 
 * @example
 * ```tsx
 * const { data: isRegistered, isLoading } = useIsUserRegistered(
 *   userAccountKeypair.publicKey
 * );
 * 
 * if (isLoading) return <div>Checking registration...</div>;
 * 
 * return (
 *   <div>
 *     {isRegistered ? 'Registered' : 'Not registered'}
 *   </div>
 * );
 * ```
 */
export function useIsUserRegistered(
  userAccountPubkey: PublicKey | null | undefined,
  options: UseUserAccountOptions = {}
) {
  const { connection } = useConnection();
  const { refetchInterval = 30000, enabled = true } = options;
  
  return useQuery<boolean, Error>({
    queryKey: ['isUserRegistered', userAccountPubkey?.toBase58()],
    queryFn: async () => {
      if (!userAccountPubkey) {
        return false;
      }
      
      try {
        const accountInfo = await connection.getAccountInfo(userAccountPubkey);
        return accountInfo !== null && accountInfo.data.length > 0;
      } catch (error) {
        console.error('Error checking registration:', error);
        return false;
      }
    },
    enabled: enabled && !!userAccountPubkey,
    refetchInterval,
    staleTime: 10000,
    retry: 2,
  });
}

/**
 * Hook to validate a referrer account on-chain
 * 
 * @param referrerPubkey The referrer's user account public key
 * @returns React Query result with boolean indicating if referrer is valid
 * 
 * @example
 * ```tsx
 * const { data: isValidReferrer, isLoading } = useValidateReferrer(referrerPubkey);
 * 
 * if (isLoading) return <div>Validating referrer...</div>;
 * 
 * return (
 *   <div>
 *     {isValidReferrer ? 'Valid referrer' : 'Invalid referrer'}
 *   </div>
 * );
 * ```
 */
export function useValidateReferrer(
  referrerPubkey: PublicKey | null | undefined,
  options: UseUserAccountOptions = {}
) {
  const { connection } = useConnection();
  const { enabled = true } = options;
  
  return useQuery<boolean, Error>({
    queryKey: ['validateReferrer', referrerPubkey?.toBase58()],
    queryFn: async () => {
      if (!referrerPubkey) {
        return false;
      }
      
      try {
        const accountInfo = await connection.getAccountInfo(referrerPubkey);
        // Check that account exists and has sufficient data to be a UserAccount
        return accountInfo !== null && accountInfo.data.length >= 144;
      } catch (error) {
        console.error('Error validating referrer:', error);
        return false;
      }
    },
    enabled: enabled && !!referrerPubkey,
    staleTime: 60000, // Referrer validity can be cached longer (1 minute)
    retry: 1,
  });
}
