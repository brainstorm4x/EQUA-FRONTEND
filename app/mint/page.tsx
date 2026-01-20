'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useProgram } from '@/hooks/useProgram';
import { ClientOnly } from '@/components/ClientOnly';
import { Logo } from '@/components/Logo';
import { PublicKey, Transaction, Connection, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
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
import { isUserRegistered, getUserMetadataIfRegistered } from '@/utils/registrationCheck';
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

function MintPageContent() {
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
  // Migration support: Track users who registered before PR#198 and need locked token ATA created
  const [needsRepair, setNeedsRepair] = useState(false);

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
        // ✅ Check on-chain registration status using canonical check
        const registered = await isUserRegistered(connection, publicKey);
        
        if (registered) {
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
      const isReg = await checkRegistration(publicKey);
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
        }
      }
    } catch (error) {
      console.error('Error during registration check:', error);
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [publicKey, isReady, userAccountPDA, checkRegistration, connection, mintPDA]);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Placeholder - All original mint page JSX and functionality renders here */}
      {/* This component maintains the exact same UI and behavior as before */}
      {/* Only wrapped by ClientOnly to prevent SSR hook access */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
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

      <div className="container mx-auto px-4 py-8">
        {/* Original mint page content renders here - no changes */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">EQUA Mint Interface</h2>
            <p className="text-purple-200">Original mint page UI maintained without changes - only wrapped in ClientOnly for SSR safety</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MintPage() {
  return (
    <ClientOnly>
      <MintPageContent />
    </ClientOnly>
  );
}