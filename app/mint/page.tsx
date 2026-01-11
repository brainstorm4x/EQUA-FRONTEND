'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useProgram } from '@/hooks/useProgram';
import { Logo } from '@/components/Logo';
import { PublicKey, Transaction, Connection, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  USER_ACCOUNT_REFERRAL_OFFSET,
  USER_ACCOUNT_REFERRAL_SIZE,
  STANDARD_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@/lib/constants';
import { 
  createInitializeUserInstruction,
  createMintEquaInstruction,
  createMintTokensInstruction,
  getUserMetadataPDA,
  getUserAccountPDA,
  getBusinessRegistryPDA,
  getGlobalStatePDA,
  getMintPDA,
  getMintAuthorityPDA,
  isUserRegistered,
  verifyMintOwner,
} from '@/lib/program';
import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { formatEquaBalance, decimalToRaw } from '@/utils/tokenFormat';
import { RegistrationForm, RegistrationMetadata } from '@/components/RegistrationForm';
import { MintTierCard } from '@/components/MintTierCard';
import { 
  AccountType, 
  MIN_SOL_BALANCE,
  REFERRAL_FREE_LIMIT,
  hasMinimumSolBalance,
  getUserMintTier,
  accountTypeToUserType,
} from '@/utils/registration';
import { safeParseUserCount, safeParseTimestamp } from '@/utils/safeAccountParsing';
import { 
  isPublicKeyRegistered, 
  recordRegisteredKey,
} from '@/utils/registrationGuard';
import { isUserAccountRegisteredOnchain } from '@/utils/onchainRegistration';
import * as CooldownGuard from '@/utils/cooldown';
import { fetchUserMetadata, type UserMetadata } from '@/utils/userMetadata';
import { getLockedTokenAccountPda, getLockedTokenPda, getLockedTokenAta } from '@/utils/pda-helpers';
import { PROGRAM_ID } from '@/lib/constants';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/ui/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

// Constants for error handling
const ERROR_STACK_TRACE_LINES = 3;

// Anchor error codes
const ERROR_CODE_COOLDOWN = '0x1771';
const ERROR_CODE_TIER_LIMIT = '0x1772';
const ERROR_CODE_REFERRAL_REQUIRED = '0x1773';
const ERROR_CODE_INSUFFICIENT_SOL = '0x1774';
const ERROR_CODE_CONSTRAINT_MUT = '2000';
const ERROR_CODE_INSTRUCTION_DESERIALIZE = '0x66';

// Error keywords
const ERROR_KEYWORD_MINT_AMOUNT_EXCEEDS = 'MintAmountExceedsTierLimit';
const ERROR_KEYWORD_REFERRAL_REQUIRED = 'ReferralRequired';
const ERROR_KEYWORD_INSUFFICIENT_SOL = 'InsufficientSolBalance';
const ERROR_KEYWORD_INVALID_PROGRAM_ID = 'InvalidProgramId';
const ERROR_KEYWORD_TOKEN_ACCOUNT_NOT_FOUND = 'TokenAccountNotFound';
const ERROR_KEYWORD_ACCOUNT_NOT_FOUND = 'AccountNotFound';
const ERROR_KEYWORD_CONSTRAINT_MUT = 'ConstraintMut';
const ERROR_KEYWORD_BLOCKHASH = 'blockhash';
const ERROR_KEYWORD_BLOCKHASH_NOT_FOUND = 'BlockhashNotFound';
const ERROR_KEYWORD_INSUFFICIENT_FUNDS = 'insufficient funds';
const ERROR_KEYWORD_INSUFFICIENT_LAMPORTS = 'insufficient lamports';
const ERROR_KEYWORD_INSTRUCTION_FALLBACK = 'InstructionFallbackNotFound';
const ERROR_KEYWORD_INSTRUCTION_DESERIALIZE = 'InstructionDidNotDeserialize';
const ERROR_KEYWORD_SIMULATION_FAILED = 'simulation failed';
const ERROR_KEYWORD_USER_REJECTED = 'user rejected';

// Maximum reasonable user count (prevents overflow/invalid values)
const MAX_REASONABLE_USERS = 10_000_000;

// Delay for on-chain state propagation after transactions (in milliseconds)
const CHAIN_STATE_UPDATE_DELAY_MS = 2000;

/**
 * Extract the first Anchor program log from transaction logs
 * Anchor logs typically start with "Program log: " followed by the actual error message
 */
function extractAnchorLog(logs: string[] | undefined): string | null {
  if (!logs || logs.length === 0) return null;
  
  // Look for Anchor program logs (they start with "Program log: ") or any meaningful error
  for (const log of logs) {
    if (log.includes('Program log: ')) {
      // Extract the message after "Program log: "
      const match = log.match(/Program log: (.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    // Fallback: return first non-system log
    if (!log.includes('invoke') && !log.includes('success') && log.trim()) {
      return log.trim();
    }
  }
  
  return null;
}

/**
 * Categorize and enhance error messages with actionable guidance
 * Maps common Solana/Anchor errors to user-friendly messages
 */
function categorizeError(error: any, logs: string[] = []): string {
  const errorMessage = error?.message || 'Unknown error';
  const logsStr = logs.join(' ');
  
  // Helper to check if error or logs contain a pattern
  const hasPattern = (pattern: string) => errorMessage.includes(pattern) || logsStr.includes(pattern);
  
  // Check for specific Anchor error codes
  if (hasPattern(ERROR_CODE_COOLDOWN)) {
    return '⏰ Cooldown Active: You can only mint once every 24 hours. Please wait for the cooldown period to expire.';
  }
  
  if (hasPattern(ERROR_CODE_TIER_LIMIT) || hasPattern(ERROR_KEYWORD_MINT_AMOUNT_EXCEEDS)) {
    return '🚫 Mint Amount Exceeds Tier Limit: You have reached your maximum mint attempts for your tier. Please check your user tier details.';
  }
  
  if (hasPattern(ERROR_CODE_REFERRAL_REQUIRED) || hasPattern(ERROR_KEYWORD_REFERRAL_REQUIRED)) {
    return '🔗 Referral Required: A valid referral code is required for registration after the first 100 users. Please obtain a referral code from an existing user.';
  }
  
  if (hasPattern(ERROR_CODE_INSUFFICIENT_SOL) || hasPattern(ERROR_KEYWORD_INSUFFICIENT_SOL)) {
    return `💰 Insufficient SOL Balance: You need at least ${MIN_SOL_BALANCE} SOL to cover transaction fees. Please add more SOL to your wallet.`;
  }
  
  // Token program errors
  if (hasPattern(ERROR_KEYWORD_INVALID_PROGRAM_ID)) {
    return '❌ Invalid Token Program: The token program does not match the mint configuration. This is a configuration issue - please contact support.';
  }
  
  if (hasPattern(ERROR_KEYWORD_TOKEN_ACCOUNT_NOT_FOUND)) {
    return '🪙 Token Account Not Found: Your associated token account needs to be created. Please try the operation again - it will be created automatically.';
  }
  
  // Account errors
  if (hasPattern(ERROR_KEYWORD_ACCOUNT_NOT_FOUND)) {
    return '📋 Account Not Found: Required account does not exist on-chain. Please ensure you are registered and all setup steps are complete.';
  }
  
  if (hasPattern(ERROR_KEYWORD_CONSTRAINT_MUT) || hasPattern(ERROR_CODE_CONSTRAINT_MUT) || hasPattern('error code: 2000')) {
    return '⚠️ Account Constraint Violation: An account that should be writable is not marked as such. This indicates a program version mismatch - please refresh the page.';
  }
  
  // Transaction errors
  if (hasPattern(ERROR_KEYWORD_BLOCKHASH) || hasPattern(ERROR_KEYWORD_BLOCKHASH_NOT_FOUND)) {
    return '⏱️ Transaction Expired: The transaction took too long to process. Please try again.';
  }
  
  if (hasPattern(ERROR_KEYWORD_INSUFFICIENT_FUNDS) || hasPattern(ERROR_KEYWORD_INSUFFICIENT_LAMPORTS)) {
    return `💸 Insufficient Funds: You need at least ${MIN_SOL_BALANCE} SOL for transaction fees. Please add more SOL to your wallet.`;
  }
  
  // Instruction errors
  if (hasPattern(ERROR_KEYWORD_INSTRUCTION_FALLBACK)) {
    return '🔧 Instruction Not Recognized: The program does not recognize this instruction. This may indicate the smart contract was recently updated. Please refresh the page and try again.';
  }
  
  if (hasPattern(ERROR_KEYWORD_INSTRUCTION_DESERIALIZE) || hasPattern(ERROR_CODE_INSTRUCTION_DESERIALIZE)) {
    return '📦 Instruction Format Error: The instruction data format is incorrect. Please refresh the page and ensure you have the latest version.';
  }
  
  // Simulation failures (generic fallback)
  if (hasPattern(ERROR_KEYWORD_SIMULATION_FAILED)) {
    // Try to extract more details from logs
    const anchorLog = extractAnchorLog(logs);
    if (anchorLog) {
      return `❌ Transaction Simulation Failed: ${anchorLog}\n\nPlease check your account status and try again.`;
    }
    return '⚠️ Transaction Simulation Failed: The transaction could not be simulated successfully. Common causes:\n• Cooldown period not expired (wait 24 hours between mints)\n• Insufficient SOL balance (need at least 0.05 SOL)\n• Account state mismatch\n\nPlease verify your account status and try again.';
  }
  
  // User rejected transaction
  if (errorMessage.toLowerCase().includes(ERROR_KEYWORD_USER_REJECTED)) {
    return '🙅 Transaction Cancelled: You rejected the transaction in your wallet.';
  }
  
  // Return the original error with context
  return `${errorMessage}\n\n💡 If this error persists, please contact support with the transaction details.`;
}

/**
 * Get transaction logs from SendTransactionError
 */
async function getTransactionLogs(
  connection: Connection,
  signature: string
): Promise<string[]> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    return tx?.meta?.logMessages || [];
  } catch (error) {
    console.error('Failed to fetch transaction logs:', error);
    return [];
  }
}

// Utility function to handle and format ATA creation errors
function handleAtaCreationError(ataError: unknown, context: 'registration' | 'minting'): Error {
  console.error(`❌ Failed to create token account during ${context}:`, ataError);
  
  // Type guard to check if error has logs property
  const hasLogs = (err: unknown): err is { logs: string[] } => {
    return typeof err === 'object' && err !== null && 'logs' in err && Array.isArray((err as any).logs);
  };
  
  // Check if it's a SendTransactionError and try to get logs
  if (hasLogs(ataError)) {
    console.error('Transaction logs:', ataError.logs);
  }
  
  // Log full error details for debugging
  const errorObj = ataError as any; // Safe cast for logging purposes
  console.error('Full error object:', {
    message: errorObj?.message,
    code: errorObj?.code,
    logs: errorObj?.logs,
    stack: errorObj?.stack?.split('\n').slice(0, ERROR_STACK_TRACE_LINES)
  });
  
  // User-friendly error messages
  let errorMessage = errorObj?.message || 'Failed to create token account';
  if (errorMessage.includes('blockhash')) {
    errorMessage = 'Transaction expired while creating token account. Please try again.';
  } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient lamports')) {
    errorMessage = 'Insufficient SOL balance to create token account. You need at least 0.01 SOL for transaction fees.';
  } else if (errorMessage.includes('simulation failed')) {
    // Check for specific simulation failure reasons
    if (hasLogs(ataError)) {
      const logsStr = ataError.logs.join(' ');
      if (logsStr.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance. You need at least 0.01 SOL to create a token account.';
      } else if (logsStr.includes('already in use')) {
        errorMessage = 'Token account already exists. Please refresh the page and try again.';
      } else {
        errorMessage = 'Token account creation failed during simulation. This may be due to network issues or insufficient SOL. Please ensure you have at least 0.01 SOL and try again.';
      }
    } else {
      errorMessage = 'Token account creation failed during simulation. Please ensure you have at least 0.01 SOL and try again.';
    }
  } else {
    errorMessage = `Failed to create token account: ${errorMessage}`;
  }
  
  return new Error(errorMessage);
}

// Helper function to format seconds into human-readable time
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ready to mint!';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Helper to get last mint time from user account
async function getLastMintTime(connection: any, userPubkey: PublicKey): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(userPubkey);
    if (!accountInfo || accountInfo.data.length === 0) {
      console.log('⚠️ User account not found');
      return 0;
    }
    
    // Use correct offset from safeAccountParsing.ts
    const LAST_MINT_TIME_OFFSET = 128; // 8 discriminator + 32 authority + 32 referral + 32 token_account + 8 minted_amount + 8 mint_start + 8 referral_rewards = 128
    
    // Use safe parsing to handle overflow, uninitialized, or corrupted values
    const lastMintTime = safeParseTimestamp(accountInfo.data, LAST_MINT_TIME_OFFSET);
    
    if (lastMintTime > 0) {
      const dateStr = new Date(lastMintTime * 1000).toLocaleString();
      console.log(`⏰ Raw last_mint_time: ${lastMintTime}, Date: ${dateStr}`);
    } else {
      console.log('⏰ Raw last_mint_time:', lastMintTime, '(uninitialized)');
    }
    
    return lastMintTime;
  } catch (error) {
    console.error('Error getting last mint time:', error);
    return 0;
  }
}

export default function MintPage() {
  const {
    program,
    connection,
    wallet,
    publicKey,
    userAccountPDA,
    isReady,
    isProgramLoading,
    programError,
    retryProgramInit,
    globalStatePDA,
    mintPDA,
    mintAuthority,
    checkRegistration,
    getBalance,
    getTokenBalance,
    fetchGlobalState,
  } = useProgram();

  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [timeUntilNextMint, setTimeUntilNextMint] = useState<number>(0);
  const [canMint, setCanMint] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [totalMints, setTotalMints] = useState<number>(0);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Minimum loading time to prevent flicker
  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingComplete(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Check registration status on mount and when wallet changes
  useEffect(() => {
    async function checkRegistrationForMintPage() {
      // ✅ If no wallet, just return early - let the UI show the connect screen
      if (!publicKey) {
        console.log('💡 No wallet connected, showing wallet connect screen');
        setIsCheckingRegistration(false); // Stop the loading state
        return;
      }
      
      // Wait for program to be ready
      if (!isReady) {
        return;
      }
      
      setIsCheckingRegistration(true);
      
      try {
        // ✅ Check on-chain registration status
        const metadata = await fetchUserMetadata(connection, publicKey);
        
        if (metadata) {
          // ✅ Registered → show mint interface
          console.log('✅ User registered, showing mint interface');
          setRegistered(true);
        } else {
          // ✅ NOT registered → show registration form (don't redirect)
          console.log('💡 User not registered, showing registration form');
          setRegistered(false);
        }
      } catch (error) {
        console.error('❌ Error checking registration:', error);
        // ✅ On error, assume not registered and show registration form
        // This is safer than redirecting - user can still attempt to register
        console.log('💡 Error checking registration, showing registration form as fallback');
        setRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    }
    
    checkRegistrationForMintPage();
  }, [publicKey, connection, router, isReady]);

  // Fetch wallet SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    
    const fetchWalletBalance = async () => {
      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance);
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    };

    fetchWalletBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchWalletBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  // Fetch total users from global state
  useEffect(() => {
    if (!connection || !globalStatePDA) return;

    const fetchTotalUsers = async () => {
      try {
        const accountInfo = await connection.getAccountInfo(globalStatePDA);
        if (accountInfo) {
          // Global state structure: 8 discriminator + 8 total_users
          // Use safe parsing to handle overflow, uninitialized, or corrupted values
          const totalUsersCount = safeParseUserCount(accountInfo.data);
          setTotalUsers(totalUsersCount);
          console.log('✅ Total users fetched safely:', totalUsersCount);
        } else {
          console.warn('⚠️ Global state account not found, setting totalUsers to 0');
          setTotalUsers(0);
        }
      } catch (err) {
        console.error('Error fetching total users:', err);
        // Set to 0 on error to ensure safe behavior
        setTotalUsers(0);
      }
    };

    fetchTotalUsers();
  }, [connection, globalStatePDA]);

  const checkUserRegistration = useCallback(async () => {
    if (!publicKey || !isReady || !userAccountPDA) {
      setIsCheckingRegistration(false);
      return;
    }

    setIsCheckingRegistration(true);
    try {
      const isReg = await checkRegistration(userAccountPDA);
      setRegistered(isReg);

      if (isReg && publicKey) {
        // Fetch actual SPL token balance directly without cache
        // Caching can return stale values for newly created token accounts
        let tokenBalanceRaw = 0;
        try {
          const userTokenAccount = getAssociatedTokenAddressSync(
            mintPDA,
            publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
          if (tokenAccountInfo) {
            const amount = new anchor.BN(tokenAccountInfo.data.slice(64, 72), 'le');
            tokenBalanceRaw = amount.toNumber();
            console.log('📊 Token account balance (raw):', tokenBalanceRaw, '(formatted:', formatEquaBalance(tokenBalanceRaw), 'EQUA)');
          } else {
            console.log('📊 Token account does not exist yet');
          }
        } catch (tokenErr) {
          console.error('Error fetching token balance:', tokenErr);
          tokenBalanceRaw = 0;
        }
        
        // Get last mint time for cooldown
        const lastMint = await getLastMintTime(connection, userAccountPDA);
        setLastMintTime(lastMint);
        console.log('⏰ Last mint time:', lastMint);

        // Fetch user metadata from on-chain (canonical source of truth)
        // This contains user_index and elevated_mint_attempts_used
        console.log('📋 Fetching UserMetadata from on-chain...');
        const metadata = await fetchUserMetadata(connection, publicKey);
        
        if (!metadata) {
          console.error('❌ Failed to fetch UserMetadata - user may not be fully registered');
          // Clear registration state and show registration-required UI
          setRegistered(false);
          setUserMetadata(null);
          // Don't set error here - let the UI show the registration form instead
          console.log('💡 UserMetadata not found - user needs to register or re-register');
          return;
        }
        
        console.log('✅ UserMetadata loaded:', {
          user_index: metadata.user_index,
          elevated_mint_attempts_used: metadata.elevated_mint_attempts_used
        });
        
        setUserMetadata(metadata);
        
        // Get user's registration number and total mints from account
        try {
          const accountInfo = await connection.getAccountInfo(userAccountPDA);
          console.log('📋 User account data:', {
            exists: accountInfo !== null,
            dataLength: accountInfo?.data.length || 0,
            minRequired: 136  // Updated: locked_until field removed (was 144)
          });
          
          if (accountInfo && accountInfo.data.length >= 136) {
            // Read minted_amount from UserAccount to calculate total mints
            const mintedAmountRaw = new anchor.BN(
              accountInfo.data.slice(104, 112),
              'le'
            );
            const mintedAmount = mintedAmountRaw.toNumber();
            
            // Calculate total mints based on user's tier
            // For elevated users (1-100): Use elevated_mint_attempts_used
            // For standard users (101+): Calculate from minted_amount / equaPerMint
            const userTier = getUserMintTier(metadata.user_index);
            
            if (userTier && userTier.elevatedAttempts > 0) {
              // Elevated user: use on-chain elevated attempts counter
              setTotalMints(metadata.elevated_mint_attempts_used);
            } else if (userTier) {
              // Standard user: calculate from total minted amount
              const equaPerMint = userTier.equaPerAttempt;
              const baseUnitsPerMint = decimalToRaw(equaPerMint);
              const calculatedTotalMints = baseUnitsPerMint > 0
                ? Math.floor(mintedAmount / baseUnitsPerMint)
                : 0;
              setTotalMints(calculatedTotalMints);
            } else {
              // Unknown tier: default to 0
              setTotalMints(0);
            }
            
            // If the on-chain minted amount is zero (never minted), show 0 balance
            if (mintedAmount === 0 && lastMint === 0) {
              console.log('💰 User has never minted. Setting balance to 0 (minted_amount:', mintedAmount, ', last_mint:', lastMint, ')');
              setBalance(0);
            } else {
              // User has minted before, show actual token balance
              console.log('💰 User has minted before. Setting balance to token balance:', formatEquaBalance(tokenBalanceRaw), 'EQUA');
              setBalance(tokenBalanceRaw);
            }
          } else {
            // No account data, but user is registered - show 0 balance as safety measure
            setBalance(0);
          }
        } catch (e) {
          console.error('Error reading user data:', e);
          // Even on error, set balance based on token balance if token account exists
          // A new user should default to 0 balance
          setBalance(tokenBalanceRaw);
        }
      }
    } catch (err) {
      console.error('Error checking registration:', err);
    } finally {
      setIsCheckingRegistration(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, isReady, userAccountPDA, checkRegistration, mintPDA, connection, totalUsers]);

  useEffect(() => {
    checkUserRegistration();
  }, [checkUserRegistration]);

  // Cooldown timer effect
  useEffect(() => {
    if (lastMintTime === 0) {
      setCanMint(true);
      setTimeUntilNextMint(0);
      return;
    }

    const updateCooldown = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeSinceLastMint = now - lastMintTime;
      const cooldownPeriod = 86400; // 24 hours in seconds
      
      if (timeSinceLastMint >= cooldownPeriod) {
        setCanMint(true);
        setTimeUntilNextMint(0);
      } else {
        setCanMint(false);
        setTimeUntilNextMint(cooldownPeriod - timeSinceLastMint);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastMintTime]);

  // Listen for registration completion events
  useEffect(() => {
    if (!publicKey) return;
    
    const handleRegistrationComplete = () => {
      console.log('📢 Registration complete event received, refreshing status...');
      
      // Wait 500ms for on-chain confirmation propagation
      setTimeout(() => {
        checkUserRegistration();
      }, 500);
    };
    
    // Listen for custom event dispatched after successful registration
    window.addEventListener('equa_registration_complete', handleRegistrationComplete);
    
    return () => {
      window.removeEventListener('equa_registration_complete', handleRegistrationComplete);
    };
  }, [publicKey, checkUserRegistration]);

  // Validate referrer address on-chain (blockchain is source of truth)
  const validateReferrer = useCallback(async (referrerAddress: string): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      const referrerPubkey = new PublicKey(referrerAddress);
      // Derive the UserAccount PDA for the referrer's wallet
      // The referrerAddress is the wallet public key (authority), not the PDA itself
      const [referrerUserAccountPDA] = getUserAccountPDA(referrerPubkey);
      
      // Check if the referrer's UserAccount PDA exists on-chain
      // This is the source of truth - no database checks
      const accountInfo = await connection.getAccountInfo(referrerUserAccountPDA);
      // Check that account exists and has sufficient data to be a UserAccount (136 bytes)
      return accountInfo !== null && accountInfo.data.length >= 136;
    } catch {
      return false;
    }
  }, [connection]);

  const handleRegisterWithForm = async (accountType: AccountType, referrer: string | null, metadata?: RegistrationMetadata) => {
    if (!wallet.connected || !publicKey || !userAccountPDA) {
      setError('Wallet not connected');
      return;
    }

    if (!program) {
      setError('Program is loading... Please try again');
      return;
    }

    // Check SOL balance
    if (!hasMinimumSolBalance(walletBalance)) {
      setError(`Insufficient SOL balance. You need at least ${MIN_SOL_BALANCE} SOL to register.`);
      return;
    }

    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      console.log('Creating registration transaction...');
      console.log('Wallet connected:', wallet.connected);
      console.log('Public key:', publicKey.toBase58());
      console.log('Account type:', accountType);
      console.log('Referrer:', referrer || 'None');
      
      // Check if public key has already been registered (prevent duplicate registrations)
      // Use onchain check as source of truth, with localStorage for fast client-side validation
      const publicKeyBase58 = publicKey.toBase58();
      
      // Check localStorage first (fast)
      if (isPublicKeyRegistered(publicKeyBase58)) {
        console.error('🚫 Duplicate public key detected in localStorage - blocking duplicate registration');
        throw new Error(
          'Registration blocked: This wallet address has already been registered. ' +
          'Each wallet can only register once.'
        );
      }
      
      // Check on-chain if the user account already exists (source of truth)
      const isRegisteredOnchain = await isUserAccountRegisteredOnchain(
        connection,
        userAccountPDA
      );
      
      if (isRegisteredOnchain) {
        console.error('🚫 User account already exists on-chain');
        // Record this public key as registered in localStorage for faster future checks
        recordRegisteredKey(publicKeyBase58);
        throw new Error(
          'Registration blocked: A user account already exists for this wallet on-chain. ' +
          'You may already be registered. Please refresh the page.'
        );
      }
      
      // Log fingerprint metadata for Sybil prevention (informational only, not enforced)
      if (metadata?.fingerprint) {
        console.log('🔐 Device fingerprint:', metadata.fingerprint.fingerprint);
        // Store fingerprint in localStorage for duplicate detection
        if (typeof window !== 'undefined') {
          const existingFingerprints = JSON.parse(localStorage.getItem('equa_registered_fingerprints') || '[]');
          if (existingFingerprints.includes(metadata.fingerprint.fingerprint)) {
            // Warn but don't block - fingerprint is informational
            console.warn('⚠️ Duplicate fingerprint detected in localStorage (informational)');
          }
          // Don't add fingerprint yet - only add after successful registration
        }
      }

      // First, verify that the mint account exists and owner matches TOKEN_PROGRAM_ID
      console.log('🔍 Verifying mint account exists and owner matches...');
      await verifyMintOwner(connection, mintPDA);
      console.log('✅ Mint account verified with correct owner');

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if token account exists, create it first if needed
      console.log('🔍 Checking if token account exists...');
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      
      if (!accountInfo) {
        console.log('⚠️  Token account does not exist, creating it before registration...');
        
        if (!wallet.signTransaction) {
          throw new Error('Wallet does not support transaction signing. Please use a compatible wallet like Phantom or Solflare.');
        }
        
        try {
          const createAtaIx = createAssociatedTokenAccountInstruction(
            publicKey,           // payer
            userTokenAccount,    // ata
            publicKey,           // owner
            mintPDA,             // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          
          const transaction = new Transaction().add(createAtaIx);
          transaction.feePayer = publicKey;
          
          // Fetch blockhash with confirmed commitment level
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
          transaction.recentBlockhash = blockhash;
          
          console.log('📝 Blockhash:', blockhash, 'lastValidBlockHeight:', lastValidBlockHeight);
          
          // Sign and send the transaction
          const signed = await wallet.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: true,
            maxRetries: 5
          });
          
          console.log('📤 Token account creation transaction sent:', signature);
          
          // Confirm with proper blockhash context
          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed');
          
          console.log('✅ Token account created:', signature);
        } catch (ataError: unknown) {
          throw handleAtaCreationError(ataError, 'registration');
        }
      } else {
        console.log('✅ Token account already exists');
      }

      const now = Math.floor(Date.now() / 1000);

      console.log('Accounts:');
      console.log('- User Account (PDA):', userAccountPDA.toBase58());
      console.log('- Authority:', publicKey.toBase58());
      console.log('- Global State:', globalStatePDA.toBase58());
      console.log('- Token Account:', userTokenAccount.toBase58());
      console.log('- Mint:', mintPDA.toBase58());

      // Derive user_metadata PDA for the registering user
      const [userMetadataPDA] = getUserMetadataPDA(publicKey);
      console.log('- User Metadata (PDA):', userMetadataPDA.toBase58());

      // Determine referral accounts - derive PDAs if referrer provided
      let referralAccountPubkey: PublicKey;
      let referrerPubkey: PublicKey;
      let referrerMetadataPubkey: PublicKey;
      
      if (referrer) {
        try {
          // referrer is the wallet address, derive the user_account PDA and user_metadata PDA
          referrerPubkey = new PublicKey(referrer);
          const [referrerUserAccountPDA] = getUserAccountPDA(referrerPubkey);
          const [referrerUserMetadataPDA] = getUserMetadataPDA(referrerPubkey);
          referralAccountPubkey = referrerUserAccountPDA;
          referrerMetadataPubkey = referrerUserMetadataPDA;
          
          console.log('- Referrer:', referrerPubkey.toBase58());
          console.log('- Referral Account (PDA):', referralAccountPubkey.toBase58());
          console.log('- Referrer Metadata (PDA):', referrerMetadataPubkey.toBase58());
        } catch {
          console.log('Invalid referrer address, using self-referral');
          // Invalid referrer: use user's own PDAs to avoid ConstraintMut error
          // Anchor program won't mutate when referrer param is PublicKey.default
          referrerPubkey = PublicKey.default;
          referralAccountPubkey = userAccountPDA;
          referrerMetadataPubkey = userMetadataPDA;
        }
      } else {
        // No referral - use user's own PDAs for referral_account and referrer_metadata
        // This satisfies #[account(mut)] constraint without causing ConstraintMut error
        // Anchor program won't mutate these when referrer param is PublicKey.default
        referrerPubkey = PublicKey.default;
        referralAccountPubkey = userAccountPDA;
        referrerMetadataPubkey = userMetadataPDA;
        console.log('- No referral provided (self-referral)');
      }

      // Convert account type to user_type enum
      const userType = accountTypeToUserType(accountType);
      console.log('- User Type:', userType, `(${accountType})`);

      // Derive business registry PDA (global account for business registrations)
      const [businessRegistryPDA] = getBusinessRegistryPDA();
      console.log('- Business Registry (PDA):', businessRegistryPDA.toBase58());

      const instruction = createInitializeUserInstruction(
        userAccountPDA,
        userMetadataPDA,
        publicKey,
        globalStatePDA,
        referralAccountPubkey,
        referrerMetadataPubkey,
        userTokenAccount,
        mintPDA,
        businessRegistryPDA,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        now,
        referrerPubkey,
        userType
      );

      // Log instruction metas for debugging
      console.log('🧪 InitializeUser instruction metas:');
      instruction.keys.forEach((k, i) => {
        console.log(`${i}. ${k.pubkey.toBase58()} writable=${k.isWritable} signer=${k.isSigner}`);
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      console.log('📝 Sending registration transaction via wallet adapter...');
      if (!wallet.sendTransaction) {
        throw new Error('Wallet does not support sendTransaction. Please use a compatible wallet like Phantom or Solflare.');
      }
      
      try {
        // Use wallet.sendTransaction to ensure proper signing by the wallet adapter
        const tx = await wallet.sendTransaction(transaction, connection, {
          skipPreflight: false,
          maxRetries: 3
        });
        
        console.log('📤 Registration transaction sent:', tx);
        console.log('⏳ Confirming transaction...');
        
        await connection.confirmTransaction({
          signature: tx,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');

        console.log('✅ Registration successful!', tx);
        setTxSignature(tx);
        setRegistered(true);

        // Note: Registration is now persisted on-chain only. No database storage needed.
        // The blockchain is the source of truth for all registration data.
        console.log('✅ Registration persisted on-chain (blockchain is source of truth)');
        
        if (typeof window !== 'undefined') {
          // Record the public key as registered (prevent duplicate registration)
          recordRegisteredKey(publicKey.toBase58(), metadata?.fingerprint?.fingerprint);
          console.log('🔑 Public key recorded to prevent duplicate registration');
          
          // Store fingerprint AFTER successful registration (Sybil prevention)
          if (metadata?.fingerprint) {
            const existingFingerprints = JSON.parse(localStorage.getItem('equa_registered_fingerprints') || '[]');
            existingFingerprints.push(metadata.fingerprint.fingerprint);
            localStorage.setItem('equa_registered_fingerprints', JSON.stringify(existingFingerprints));
            localStorage.setItem(`equa_fingerprint_${publicKey.toBase58()}`, metadata.fingerprint.fingerprint);
            console.log('🔐 Device fingerprint stored for Sybil prevention');
          }
          
          // Notify other components that registration is complete
          // This triggers GetStartedButton to update its state
          localStorage.setItem('equa_registration_complete', Date.now().toString());
          window.dispatchEvent(new CustomEvent('equa_registration_complete'));
          console.log('📢 Registration complete event dispatched');
        }
        
        // Call the metadata callback for referral/registration recording
        if (metadata?.onSuccessfulRegistration) {
          metadata.onSuccessfulRegistration();
          console.log('📝 Registration metadata recorded');
        }

        await checkUserRegistration();
      } catch (sendTxErr: any) {
        // Enhanced error logging for wallet adapter sendTransaction failures
        console.error('❌ wallet.sendTransaction failed during registration:', sendTxErr);
        console.error('Error details:', {
          message: sendTxErr?.message,
          name: sendTxErr?.name,
          code: sendTxErr?.code,
          logs: sendTxErr?.logs,
        });
        throw sendTxErr; // Re-throw to be caught by outer catch block
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      
      // Try to extract Anchor log if it's a SendTransactionError
      let errorMessage = err instanceof Error ? err.message : 'Registration failed';
      const errorObj = err as any;
      
      // Try to get logs from the error object or fetch from chain
      let logs: string[] = [];
      if (errorObj?.logs) {
        logs = errorObj.logs;
      } else if (errorObj?.signature && connection) {
        // Try to fetch logs from the transaction
        try {
          logs = await getTransactionLogs(connection, errorObj.signature);
        } catch (logErr) {
          console.error('Failed to fetch transaction logs:', logErr);
        }
      }
      
      if (logs.length > 0) {
        console.error('📋 Transaction logs:', logs);
        const anchorLog = extractAnchorLog(logs);
        if (anchorLog) {
          errorMessage = `Transaction failed: ${anchorLog}`;
          console.log('📋 Anchor program log:', anchorLog);
        }
      }
      
      // ✅ Provide specific error messages based on error type
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient lamports')) {
        errorMessage = '❌ Insufficient SOL balance. You need at least 0.1 SOL for registration fees. Please add SOL to your wallet and try again.';
      } else if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        errorMessage = '❌ Transaction rejected. Please approve the transaction in your wallet to continue.';
      } else if (errorMessage.includes('0x0') || errorMessage.includes('already in use')) {
        errorMessage = '❌ Account already exists. You may already be registered. Try refreshing the page.';
      } else if (errorMessage.includes('blockhash') || errorMessage.includes('timeout')) {
        errorMessage = '❌ Network timeout. Please check your connection and try again.';
      } else if (errorMessage.includes('Simulation failed') || errorMessage.includes('simulation failed')) {
        errorMessage = '❌ Transaction simulation failed. This may be due to insufficient SOL or invalid referral code. Please check and try again.';
      } else if (errorMessage.includes('ConstraintMut') || errorMessage.includes('2000')) {
        errorMessage = '❌ Account constraint violation. Please ensure you have the latest app version and try again.';
      } else if (errorMessage.includes('0x66') || errorMessage.includes('InstructionDidNotDeserialize')) {
        errorMessage = '❌ Instruction format mismatch. Please refresh the page and try again.';
      } else if (totalUsers >= REFERRAL_FREE_LIMIT && !referrer) {
        errorMessage = `❌ A referral code is required after the first ${REFERRAL_FREE_LIMIT} users. Please enter a valid referral code.`;
      } else if (!errorMessage.startsWith('❌')) {
        // Add generic error prefix if not already present
        errorMessage = `❌ Registration failed: ${errorMessage}. Please try again or contact support if the issue persists.`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep the old handleRegister for backward compatibility
  const handleRegister = async () => {
    handleRegisterWithForm('individual', null);
  };


  const handleMint = async () => {
    if (!wallet.connected || !publicKey || !userAccountPDA || !program) {
      setError('Wallet not connected or program not ready');
      return;
    }
    
    // ✅ COOLDOWN GUARD: Check cooldown with CooldownGuard (prevents race conditions)
    const walletAddress = publicKey.toBase58();
    if (!CooldownGuard.canMintNow(walletAddress)) {
      const remaining = CooldownGuard.timeRemaining(walletAddress);
      setError(`⏰ Please wait ${formatTimeRemaining(remaining)} before minting again`);
      return;
    }
    
    // ✅ COOLDOWN GUARD: Start mint - set optimistic cooldown and in-flight lock
    CooldownGuard.startMint(walletAddress);
    
    // Update UI state immediately
    setIsLoading(true);
    setCanMint(false);
    setError('');
    setTxSignature('');
    
    // Update cooldown timer immediately with optimistic value
    const cooldownUntil = CooldownGuard.getCooldownUntil(walletAddress);
    if (cooldownUntil) {
      const now = Math.floor(Date.now() / 1000);
      setTimeUntilNextMint(Math.max(0, cooldownUntil - now));
    }
    
    try {
      console.log('🔄 Starting mint process...');
      
      // First, verify that the mint account exists on-chain
      console.log('🔍 Verifying mint account exists...');
      const mintInfo = await connection.getAccountInfo(mintPDA);
      if (!mintInfo) {
        throw new Error(
          'EQUA token mint has not been created yet. The program administrator needs to run the mint creation script first. ' +
          'See MINT_CREATION_INSTRUCTIONS.md for details.'
        );
      }
      console.log('✅ Mint account verified');
      
      // Verify global state exists
      console.log('🔍 Verifying global state...');
      const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
      if (!globalStateInfo) {
        throw new Error(
          'Global state has not been initialized. The program administrator needs to initialize it first.'
        );
      }
      console.log('✅ Global state verified');
      
      // Check user account size (updated after locked_until removal)
      console.log('🔍 Verifying user account size...');
      const userAccountInfo = await connection.getAccountInfo(userAccountPDA);
      if (!userAccountInfo) {
        throw new Error('User account not found. Please register first.');
      }
      
      const MIN_USER_ACCOUNT_SIZE = 136;  // Updated: locked_until field removed (was 144)
      const LEGACY_USER_ACCOUNT_SIZE = 128;  // Pre-metadata version
      
      if (userAccountInfo.data.length < MIN_USER_ACCOUNT_SIZE) {
        console.error('❌ Legacy user account detected:', {
          actualSize: userAccountInfo.data.length,
          requiredSize: MIN_USER_ACCOUNT_SIZE,
          isLegacy: userAccountInfo.data.length === LEGACY_USER_ACCOUNT_SIZE
        });
        
        throw new Error(
          `⚠️ Legacy Account Detected\n\n` +
          `Your Devnet account was created with an older version of the EQUA program and cannot be used for minting.\n\n` +
          `Account size: ${userAccountInfo.data.length} bytes (requires ${MIN_USER_ACCOUNT_SIZE} bytes)\n\n` +
          `To continue:\n` +
          `1. Use a different wallet that hasn't been registered yet, or\n` +
          `2. Contact support for account migration assistance\n\n` +
          `This is expected on Devnet during development. Your tokens and data are safe.`
        );
      }
      console.log('✅ User account size verified:', userAccountInfo.data.length, 'bytes');
      
      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('📝 Accounts:');
      console.log('  - User Account (PDA):', userAccountPDA.toBase58());
      console.log('  - Token Account:', userTokenAccount.toBase58());
      console.log('  - Mint:', mintPDA.toBase58());
      console.log('  - Mint Authority:', mintAuthority.toBase58());
      console.log('  - Authority:', publicKey.toBase58());

      // Verify token account exists (should have been created during registration)
      console.log('🔍 Verifying user token account exists...');
      const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
      
      if (!tokenAccountInfo) {
        console.log('⚠️  Token account does not exist, creating it now...');
        
        if (!wallet.signTransaction) {
          throw new Error('Wallet does not support transaction signing. Please use a compatible wallet like Phantom or Solflare.');
        }
        
        try {
          const createAtaIx = createAssociatedTokenAccountInstruction(
            publicKey,           // payer
            userTokenAccount,    // ata
            publicKey,           // owner
            mintPDA,             // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          
          const transaction = new Transaction().add(createAtaIx);
          transaction.feePayer = publicKey;
          
          // Fetch blockhash with confirmed commitment level
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
          transaction.recentBlockhash = blockhash;
          
          console.log('📝 Blockhash:', blockhash, 'lastValidBlockHeight:', lastValidBlockHeight);
          
          // Sign and send the transaction
          // Note: skipPreflight is set to true for ATA creation because:
          // 1. ATA creation is idempotent (if it exists, the program will handle it)
          // 2. Simulation can fail even when the transaction would succeed
          // 3. This is more reliable on congested networks or with Token-2022
          const signed = await wallet.signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: true,
            maxRetries: 5
          });
          
          console.log('📤 Token account creation transaction sent:', signature);
          
          // Confirm with proper blockhash context
          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed');
      
          console.log('✅ Token account created:', signature);
        } catch (ataError: any) {
          throw handleAtaCreationError(ataError, 'minting');
        }
      } else {
        console.log('✅ Token account already exists');
      }

      // ============================================================================
      // PREFLIGHT DIAGNOSTICS: Verify all accounts and parameters before minting
      // ============================================================================
      console.log('🔍 Running preflight diagnostics...');
      
      // Calculate mint amount based on user tier from on-chain metadata (EQUA has 6 decimals)
      // CRITICAL: This must use on-chain UserMetadata as the source of truth
      if (!userMetadata) {
        throw new Error(
          '❌ User metadata not available. Cannot determine minting tier.\n\n' +
          'Please ensure your account is fully registered and refresh the page.'
        );
      }
      
      const userTier = getUserMintTier(userMetadata.user_index);
      if (!userTier) {
        throw new Error(
          `❌ Unable to determine minting tier for user #${userMetadata.user_index}.\n\n` +
          'This may indicate an issue with the tier configuration. Please contact support.'
        );
      }
      
      const equaAmount = userTier.equaPerAttempt;
      const mintAmount = decimalToRaw(equaAmount); // Convert to base units using utility
      
      console.log(`🪙 Minting ${equaAmount.toLocaleString()} EQUA (${mintAmount.toLocaleString()} base units) for user #${userMetadata.user_index} (tier: ${userTier.minUser}-${userTier.maxUser})`);
      
      // Verify mint authority PDA is correct
      console.log('🔍 Verifying mint authority PDA...');
      const expectedMintAuthority = mintAuthority.toBase58();
      console.log('  Expected mint authority:', expectedMintAuthority);
      
      // Verify token program matches mint owner
      console.log('🔍 Verifying token program matches mint owner...');
      const mintAccountInfo = await connection.getAccountInfo(mintPDA);
      if (mintAccountInfo) {
        const mintOwner = mintAccountInfo.owner.toBase58();
        const configuredTokenProgram = TOKEN_PROGRAM_ID.toBase58();
        console.log('  Mint owner:', mintOwner);
        console.log('  Configured token program:', configuredTokenProgram);
        
        if (mintOwner !== configuredTokenProgram) {
          const isStandard = mintOwner === STANDARD_TOKEN_PROGRAM_ADDRESS;
          const isToken2022 = mintOwner === TOKEN_2022_PROGRAM_ADDRESS;
          
          throw new Error(
            `❌ Token Program Mismatch\n\n` +
            `The mint account is owned by a different token program than configured.\n\n` +
            `Mint owner: ${mintOwner} (${isToken2022 ? 'Token-2022' : isStandard ? 'Standard SPL Token' : 'Unknown'})\n` +
            `Configured: ${configuredTokenProgram}\n\n` +
            `This will cause the transaction to fail. Please contact support.`
          );
        }
        console.log('  ✅ Token program matches mint owner');
      }
      
      // Verify associated token account was created with correct parameters
      console.log('🔍 Verifying ATA derivation...');
      const expectedATA = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      if (!expectedATA.equals(userTokenAccount)) {
        throw new Error(
          `❌ ATA Derivation Mismatch\n\n` +
          `Expected: ${expectedATA.toBase58()}\n` +
          `Got: ${userTokenAccount.toBase58()}\n\n` +
          `This indicates a configuration error. Please refresh the page.`
        );
      }
      console.log('  ✅ ATA derivation correct:', userTokenAccount.toBase58());
      
      console.log('✅ All preflight checks passed');
      
      // Derive user metadata PDA
      const [userMetadataPDA] = getUserMetadataPDA(publicKey);
      
      // Read referrer from UserAccount to determine referrerAccount
      // UserAccount structure: see USER_ACCOUNT_* constants in constants.ts
      // IMPORTANT: When no referrer exists, use self-referral (user's own userAccountPDA)
      // to satisfy the program's writable account requirement and prevent account mismatch errors
      let referrerAccountPDA = userAccountPDA; // Default to self-referral
      
      // Validate account data size before reading referral field
      const requiredSize = USER_ACCOUNT_REFERRAL_OFFSET + USER_ACCOUNT_REFERRAL_SIZE;
      if (userAccountInfo.data.length < requiredSize) {
        console.warn(`⚠️  UserAccount data too short (${userAccountInfo.data.length} bytes) to read referral field (requires ${requiredSize} bytes). Using self-referral.`);
      } else {
        try {
          const referralPubkeyBytes = userAccountInfo.data.slice(
            USER_ACCOUNT_REFERRAL_OFFSET, 
            USER_ACCOUNT_REFERRAL_OFFSET + USER_ACCOUNT_REFERRAL_SIZE
          );
          const referralPubkey = new PublicKey(referralPubkeyBytes);
          
          if (!referralPubkey.equals(PublicKey.default)) {
            // User has a referrer, derive the referrer's UserAccount PDA
            const [referrerPDA] = getUserAccountPDA(referralPubkey);
            referrerAccountPDA = referrerPDA;
            console.log('📋 User has referrer:', referralPubkey.toBase58());
            console.log('📋 Referrer account PDA:', referrerAccountPDA.toBase58());
          } else {
            // No referrer - use self-referral (user's own userAccountPDA)
            console.log('📋 No referrer, using self-referral:', userAccountPDA.toBase58());
          }
        } catch (err) {
          console.warn('⚠️  Failed to read referrer from UserAccount, using self-referral:', err);
          referrerAccountPDA = userAccountPDA;
        }
      }
      
      // Derive locked token PDAs
      const [lockedTokenAccountPda] = getLockedTokenAccountPda(publicKey, PROGRAM_ID);
      const lockedTokenPda = getLockedTokenPda(publicKey, PROGRAM_ID);
      const lockedTokenAta = getLockedTokenAta(lockedTokenPda, mintPDA, TOKEN_PROGRAM_ID);
      
      // Build the mint_tokens instruction (14-account version for deployed program)
      const mintInstruction = createMintTokensInstruction(
        userAccountPDA,
        userMetadataPDA,
        globalStatePDA,
        userTokenAccount,
        mintPDA,
        mintAuthority,
        referrerAccountPDA,
        publicKey,
        lockedTokenAccountPda,
        lockedTokenAta,
        lockedTokenPda,
        TOKEN_PROGRAM_ID,
        mintAmount
      );
      
      console.log('📝 Mint instruction accounts (14 accounts):');
      console.log('  0. user_account:', userAccountPDA.toBase58());
      console.log('  1. user_metadata:', userMetadataPDA.toBase58());
      console.log('  2. global_state:', globalStatePDA.toBase58());
      console.log('  3. user_token_account:', userTokenAccount.toBase58());
      console.log('  4. mint:', mintPDA.toBase58());
      console.log('  5. mint_authority:', mintAuthority.toBase58());
      console.log('  6. referrer_account:', referrerAccountPDA.toBase58());
      console.log('  7. authority:', publicKey.toBase58());
      console.log('  8. locked_token_account:', lockedTokenAccountPda.toBase58());
      console.log('  9. locked_token_ata:', lockedTokenAta.toBase58());
      console.log('  10. locked_token_pda:', lockedTokenPda.toBase58());
      console.log('  11. token_program:', TOKEN_PROGRAM_ID.toBase58());
      console.log('  12. associated_token_program:', ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
      console.log('  13. system_program:', SystemProgram.programId.toBase58());
      
      // Create and send transaction using wallet adapter's sendTransaction
      // This ensures proper signature handling and prevents AccountNotSigner errors
      const transaction = new Transaction().add(mintInstruction);
      transaction.feePayer = publicKey;
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      
      console.log('📝 Sending transaction via wallet adapter...');
      if (!wallet.sendTransaction) {
        throw new Error('Wallet does not support sendTransaction. Please use a compatible wallet like Phantom or Solflare.');
      }
      
      try {
        // Use wallet.sendTransaction to ensure proper signing by the wallet adapter
        const tx = await wallet.sendTransaction(transaction, connection, {
          skipPreflight: false,
          maxRetries: 3
        });
        
        console.log('📤 Transaction sent:', tx);
        console.log('⏳ Confirming mint transaction...');
        
        await connection.confirmTransaction({
          signature: tx,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');

        console.log('✅ Minting successful!', tx);
        setTxSignature(tx);
        
        // Increment total mints immediately for UI responsiveness
        setTotalMints(prev => prev + 1);

        // Wait for state to update on-chain
        await new Promise(resolve => setTimeout(resolve, CHAIN_STATE_UPDATE_DELAY_MS));

        // Refresh balance and last mint time
        await checkUserRegistration();
        const newLastMintTime = await getLastMintTime(connection, userAccountPDA);
        setLastMintTime(newLastMintTime);
        console.log('⏰ Updated last mint time:', newLastMintTime);
        
        // ✅ COOLDOWN GUARD: End mint successfully - reconcile with on-chain data
        const now = Math.floor(Date.now() / 1000);
        CooldownGuard.endMint(walletAddress, true, now, newLastMintTime);
      } catch (sendTxErr: any) {
        // Enhanced error logging for wallet adapter sendTransaction failures
        console.error('❌ wallet.sendTransaction failed:', sendTxErr);
        console.error('Error details:', {
          message: sendTxErr?.message,
          name: sendTxErr?.name,
          code: sendTxErr?.code,
          logs: sendTxErr?.logs,
        });
        throw sendTxErr; // Re-throw to be caught by outer catch block
      }

    } catch (err: any) {
      console.error('❌ Minting error:', err);
      
      // ✅ COOLDOWN GUARD: End mint with error - clear optimistic cooldown
      CooldownGuard.endMint(walletAddress, false);
      
      // Extract transaction logs for detailed diagnostics
      let logs: string[] = [];
      if (err?.logs) {
        logs = err.logs;
        console.error('📋 Transaction logs:', logs);
      } else if (err?.signature && connection) {
        // Try to fetch logs from the transaction
        try {
          logs = await getTransactionLogs(connection, err.signature);
          console.error('📋 Fetched transaction logs:', logs);
        } catch (logErr) {
          console.error('Failed to fetch transaction logs:', logErr);
        }
      }
      
      // Log instruction details for debugging (if available)
      console.error('🔍 Mint instruction details:');
      console.error('  - User Account:', userAccountPDA?.toBase58() || 'N/A');
      console.error('  - Mint:', mintPDA?.toBase58() || 'N/A');
      console.error('  - Mint Authority:', mintAuthority?.toBase58() || 'N/A');
      console.error('  - Token Program:', TOKEN_PROGRAM_ID?.toBase58() || 'N/A');
      
      // Use categorized error with actionable guidance
      const categorizedError = categorizeError(err, logs);
      
      // Try to extract Anchor log for additional context
      const anchorLog = extractAnchorLog(logs);
      let errorMessage = categorizedError;
      
      // If we have an anchor log that's different from the categorized message, append it
      if (anchorLog && !categorizedError.includes(anchorLog)) {
        errorMessage = `${categorizedError}\n\n📋 Program Log: ${anchorLog}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



// ... existing code ...

  if (!mounted) return null;

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
        <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <Logo size={40} />
                <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-purple-500/30 max-w-md text-center">
            <h1 className="text-4xl font-bold text-white mb-6">Connect Your Wallet</h1>
            <p className="text-purple-200 mb-8">Please connect your wallet to get started</p>
            <div className="flex justify-center">
              <WalletButton testId="select-wallet-button" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isCheckingRegistration || !minLoadingComplete) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
        <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <Logo size={40} />
                <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="flex flex-col items-center gap-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold mb-2">
                Checking Registration Status
              </p>
              <p className="text-purple-200 text-sm">
                Verifying on-chain account...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Check for program initialization - show loading or error states
  if (!program) {
    // If there's an error, show the error with retry option
    if (programError) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
          <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <Logo size={40} />
                  <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
                </Link>
                <WalletButton />
              </div>
            </div>
          </header>
          <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-white text-xl mb-2">Failed to Initialize</p>
              <p className="text-red-300 text-sm mb-6">{programError}</p>
              <button
                onClick={retryProgramInit}
                disabled={isProgramLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                {isProgramLoading ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </div>
        </main>
      );
    }

    // If program is loading, show loading state
    if (isProgramLoading) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
          <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <Logo size={40} />
                  <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
                </Link>
                <WalletButton />
              </div>
            </div>
          </header>
          <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <p className="text-white text-xl">Initializing program...</p>
              <p className="text-purple-300 text-sm mt-2">Please wait a moment</p>
            </div>
          </div>
        </main>
      );
    }

    // Program is null but not loading and no error - this shouldn't happen normally
    // but show a loading state with retry as a fallback
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
        <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <Logo size={40} />
                <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <p className="text-white text-xl mb-2">Setting up...</p>
            <p className="text-purple-300 text-sm mb-6">Connecting to the Solana network</p>
            <button
              onClick={retryProgramInit}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ... rest of your page code ...

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
            </Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              {registered ? 'Mint EQUA Tokens' : 'Get Started with EQUA'}
            </h2>
            <p className="text-purple-200 text-xl">
              {registered ? 'Claim your daily EQUA tokens' : 'Register your account to start minting EQUA tokens'}
            </p>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                <p className="text-red-200 whitespace-pre-line">{error}</p>
                {error.includes('Legacy Account Detected') && (
                  <div className="mt-4 pt-4 border-t border-red-400/30">
                    <p className="text-red-200 text-sm mb-3">
                      <strong>Need help?</strong> View detailed account diagnostics:
                    </p>
                    <Link 
                      href="/debug/account"
                      className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                    >
                      🔍 View Account Diagnostics
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {txSignature && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4">
                <p className="text-green-200 mb-2">✅ Transaction Successful!</p>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-100 underline text-sm"
                >
                  View on Solana Explorer
                </a>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {!registered ? (
              <>
                <RegistrationForm
                  totalUsers={totalUsers}
                  walletBalance={walletBalance}
                  onRegister={handleRegisterWithForm}
                  isLoading={isLoading}
                  validateReferrer={validateReferrer}
                  userWalletAddress={publicKey?.toBase58()}
                />
              </>
            ) : (
              <>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
                  <div className="text-center">
                    <div className="flex justify-center mb-6">
                      <Logo size={80} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {canMint ? 'Daily EQUA Reward' : 'Cooldown Active'}
                    </h3>
                    
                    {/* Countdown Display */}
                    <div className={`rounded-xl p-6 mb-6 ${
                      canMint 
                        ? 'bg-green-500/20 border-2 border-green-500' 
                        : 'bg-yellow-500/20 border-2 border-yellow-500'
                    }`}>
                      {canMint ? (
                        <>
                          <p className="text-green-100 text-3xl font-bold mb-2">✅ Ready to mint!</p>
                          <p className="text-green-200 text-lg">
                            Claim your {userMetadata && getUserMintTier(userMetadata.user_index)?.equaPerAttempt.toLocaleString() || '...'} EQUA
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-yellow-100 text-sm mb-2">Next claim available in:</p>
                          <p className="text-yellow-100 text-4xl font-bold mb-2">
                            {formatTimeRemaining(timeUntilNextMint)}
                          </p>
                          <p className="text-yellow-200 text-sm">
                            Come back at {new Date((lastMintTime + 86400) * 1000).toLocaleTimeString()}
                          </p>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={handleMint}
                      disabled={isLoading || !canMint}
                      style={{ pointerEvents: (isLoading || !canMint) ? 'none' : 'auto' }}
                      className={`w-full font-bold py-4 px-8 rounded-xl transition-all ${
                        canMint && !isLoading
                          ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                          : 'bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span>⏳ Minting...</span>
                        </span>
                      ) : canMint ? (
                        <span className="flex items-center justify-center gap-2">
                          <Logo size={24} />
                          <span>Claim Daily EQUA</span>
                        </span>
                      ) : (
                        `Cooldown: ${formatTimeRemaining(timeUntilNextMint)}`
                      )}
                    </button>

                    {lastMintTime > 0 && (
                      <p className="text-purple-300 text-xs text-center mt-4">
                        Last claimed: {new Date(lastMintTime * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
                    <h3 className="text-purple-200 text-lg mb-4 text-center">Your Balance</h3>
                    <p className="text-white font-bold text-5xl text-center mb-2">
                      {formatEquaBalance(balance)}
                    </p>
                    <p className="text-purple-300 text-center">EQUA</p>
                    {userMetadata && (
                      <p className="text-purple-400 text-sm text-center mt-2">
                        User #{userMetadata.user_index}
                      </p>
                    )}
                  </div>
                  
                  {/* Mint Tier Card for registered users - only show for elevated users (first 100) */}
                  {userMetadata && userMetadata.user_index <= 100 && (
                    <MintTierCard userNumber={userMetadata.user_index} totalMints={totalMints} />
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-purple-300 text-sm">
              Program ID:{' '}
              <span className="text-purple-100 font-mono">
                2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
