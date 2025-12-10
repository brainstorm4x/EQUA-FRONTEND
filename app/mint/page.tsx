'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useProgram } from '@/hooks/useProgram';
import { Logo } from '@/components/Logo';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { 
  TOKEN_PROGRAM_ID,
  createInitializeUserInstruction,
  createMintEquaInstruction,
  createMintTokensInstruction,
  getUserMetadataPDA,
  getUserAccountPDA,
  isUserRegistered,
} from '@/lib/program';
import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { formatEquaBalance, decimalToRaw } from '@/utils/tokenFormat';
import { RegistrationForm, RegistrationMetadata } from '@/components/RegistrationForm';
import { MintTierCard } from '@/components/MintTierCard';
import { 
  AccountType, 
  MIN_SOL_BALANCE,
  hasMinimumSolBalance,
  getUserMintTier,
} from '@/utils/registration';
import { safeParseUserCount, safeParseTimestamp } from '@/utils/safeAccountParsing';
import { 
  isPublicKeyRegistered, 
  recordRegisteredKey,
} from '@/utils/registrationGuard';
import { isUserAccountRegisteredOnchain } from '@/utils/onchainRegistration';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

// Constants for error handling
const ERROR_STACK_TRACE_LINES = 3;

// Default EQUA per mint for standard users (100 EQUA) - used as fallback
const DEFAULT_EQUA_PER_MINT = 100;

// Maximum reasonable user count (prevents overflow/invalid values)
const MAX_REASONABLE_USERS = 10_000_000;

// Maximum reasonable user number for sanity checks
const MAX_REASONABLE_USER_NUMBER = 1_000_000;

// Delay for on-chain state propagation after transactions (in milliseconds)
const CHAIN_STATE_UPDATE_DELAY_MS = 2000;

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
    
    // Offset based on IDL: 8 discriminator + 32 authority + 32 referral + 32 token_account + 8 minted_amount + 8 mint_start = 120
    // Note: locked_until field removed per EQUA Whitepaper 2025
    const LAST_MINT_TIME_OFFSET = 136;
    
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
  const [userNumber, setUserNumber] = useState<number>(0);
  const [totalMints, setTotalMints] = useState<number>(0);

  // Use a consistent fallback so unknown users default to the first tier (100,000 EQUA)
  const effectiveUserNumber = userNumber > 0 ? userNumber : Math.max(totalUsers || 0, 1);

  useEffect(() => {
    setMounted(true);
  }, []);

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

        // Get user's registration number and total mints from account
        try {
          const accountInfo = await connection.getAccountInfo(userAccountPDA);
          console.log('📋 User account data:', {
            exists: accountInfo !== null,
            dataLength: accountInfo?.data.length || 0,
            minRequired: 136  // Updated: locked_until field removed (was 144)
          });
          if (accountInfo && accountInfo.data.length >= 136) {
            // Note: user_number might not be stored in the account structure
            // Check if there's additional data beyond the standard fields
            let currentUserNumber = 0;
            if (accountInfo.data.length >= 144) {
              // Read user_number at offset 136 if it exists (offset reduced by 8 after locked_until removal)
              const userNumRaw = new anchor.BN(
                accountInfo.data.slice(136, 144),
                'le'
              );
              const userNum = userNumRaw.toNumber();
              if (userNum > 0 && userNum < MAX_REASONABLE_USER_NUMBER) { // Sanity check
                setUserNumber(userNum);
                currentUserNumber = userNum;
              } else {
                // Fallback: use stored value or estimate from global state
                const stored = localStorage.getItem('equa_user_number');
                if (stored) {
                  const storedNum = parseInt(stored, 10);
                  setUserNumber(storedNum);
                  currentUserNumber = storedNum;
                }
              }
            } else {
              // No user_number in account, try to get from localStorage
              const stored = localStorage.getItem('equa_user_number');
              if (stored) {
                const storedNum = parseInt(stored, 10);
                setUserNumber(storedNum);
                currentUserNumber = storedNum;
              }
            }

            // If we still don't have a user number, fall back to the current total user count (includes self)
            if (currentUserNumber === 0) {
              const fallbackUserNumber = Math.max(totalUsers || 0, 1);
              setUserNumber(fallbackUserNumber);
              currentUserNumber = fallbackUserNumber;
            }
            
            // Read total_mints from minted_amount offset
            const mintedAmountRaw = new anchor.BN(
              accountInfo.data.slice(104, 112),
              'le'
            );
            // Calculate total mints based on user's tier rate
            // Get the user's tier to know how many EQUA they get per mint
            const userTier = getUserMintTier(currentUserNumber);
            const equaPerMint = userTier?.equaPerAttempt || DEFAULT_EQUA_PER_MINT;
            const baseUnitsPerMint = decimalToRaw(equaPerMint); // Use decimalToRaw utility
            const mintedAmount = mintedAmountRaw.toNumber();
            const calculatedTotalMints = baseUnitsPerMint > 0
              ? Math.floor(mintedAmount / baseUnitsPerMint)
              : 0;

            setTotalMints(calculatedTotalMints);

            // If the on-chain minted amount is zero (never minted), show 0 balance
            // Even if token account shows balance, a fresh account shouldn't show tokens
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

  // Validate referrer address on-chain (blockchain is source of truth)
  const validateReferrer = useCallback(async (referrerAddress: string): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      const referrerPubkey = new PublicKey(referrerAddress);
      // Check if the referrer has a registered user account on-chain
      // This is the source of truth - no database checks
      const accountInfo = await connection.getAccountInfo(referrerPubkey);
      // Check that account exists and has sufficient data to be a UserAccount
      // Note: Size reduced from 144 to 136 after locked_until field removal
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
      let referrerMetadataPubkey: PublicKey;
      let referrerPubkey: PublicKey;
      
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
          console.log('Invalid referrer address, using default (no referral)');
          referrerPubkey = PublicKey.default;
          referralAccountPubkey = PublicKey.default;
          referrerMetadataPubkey = PublicKey.default;
        }
      } else {
        // No referral - use PublicKey.default for all referrer accounts
        referrerPubkey = PublicKey.default;
        referralAccountPubkey = PublicKey.default;
        referrerMetadataPubkey = PublicKey.default;
        console.log('- No referral provided');
      }

      // Convert account type to user type value (0 = individual, 1 = business)
      const { accountTypeToUserType } = await import('@/utils/registration');
      const userTypeValue = accountTypeToUserType(accountType);
      console.log('- Account type:', accountType, '→ user_type:', userTypeValue);

      const instruction = createInitializeUserInstruction(
        userAccountPDA,
        userMetadataPDA,
        publicKey,
        globalStatePDA,
        referralAccountPubkey,
        referrerMetadataPubkey,
        userTokenAccount,
        mintPDA,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        now,
        referrerPubkey,
        userTypeValue
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

      console.log('📝 Requesting wallet signature...');
      const signed = await wallet.signTransaction!(transaction);
      // ✅ REMOVED: User account is now a PDA, not a keypair that can sign
      // PDAs are derived deterministically and don't have private keys
      
      console.log('📤 Sending transaction...');
      const rawTx = signed.serialize();
      const tx = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 3
      });

      console.log('⏳ Confirming transaction...');
      await connection.confirmTransaction({
        signature: tx,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      console.log('✅ Registration successful!', tx);
      setTxSignature(tx);
      setRegistered(true);

      // Store the user's registration number for future reference
      // This is totalUsers + 1 at the time of registration
      const registrationNumber = totalUsers + 1;
      setUserNumber(registrationNumber);
      console.log(`📝 Set user number to: ${registrationNumber}`);
      
      // Note: Registration is now persisted on-chain only. No database storage needed.
      // The blockchain is the source of truth for all registration data.
      console.log('✅ Registration persisted on-chain (blockchain is source of truth)');
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('equa_user_number', registrationNumber.toString());
        console.log(`📝 Saved user registration number to localStorage: ${registrationNumber}`);
        
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
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
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
    
    // Check cooldown
    if (!canMint) {
      setError(`⏰ Please wait ${formatTimeRemaining(timeUntilNextMint)} before minting again`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setTxSignature('');
    
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

      // ✅ Now mint tokens using mint_tokens instruction (7-account version)
      // Calculate mint amount based on user tier (EQUA has 6 decimals)
      const mintUserNumber = userNumber > 0 ? userNumber : Math.max(totalUsers || 0, 1);
      const userTier = getUserMintTier(mintUserNumber);
      const equaAmount = userTier?.equaPerAttempt || DEFAULT_EQUA_PER_MINT;
      const mintAmount = decimalToRaw(equaAmount); // Convert to base units using utility
      
      console.log(`🪙 Minting ${equaAmount.toLocaleString()} EQUA (${mintAmount.toLocaleString()} base units) for user #${mintUserNumber}`);
      
      // Derive user metadata PDA
      const [userMetadataPDA] = getUserMetadataPDA(publicKey);
      
      // Build the mint_tokens instruction (7-account version for deployed program)
      const mintInstruction = createMintTokensInstruction(
        userAccountPDA,
        userMetadataPDA,
        userTokenAccount,
        mintPDA,
        mintAuthority,
        publicKey,
        TOKEN_PROGRAM_ID,
        mintAmount
      );
      
      console.log('📝 Mint instruction accounts:');
      console.log('  0. user_account:', userAccountPDA.toBase58());
      console.log('  1. user_metadata:', userMetadataPDA.toBase58());
      console.log('  2. user_token_account:', userTokenAccount.toBase58());
      console.log('  3. mint:', mintPDA.toBase58());
      console.log('  4. mint_authority:', mintAuthority.toBase58());
      console.log('  5. authority:', publicKey.toBase58());
      console.log('  6. token_program:', TOKEN_PROGRAM_ID.toBase58());
      
      // Create and send transaction
      const transaction = new Transaction().add(mintInstruction);
      transaction.feePayer = publicKey;
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      
      console.log('📝 Requesting wallet signature for mint transaction...');
      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support transaction signing');
      }
      
      const signed = await wallet.signTransaction(transaction);
      
      console.log('📤 Sending mint transaction...');
      const tx = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });
      
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

    } catch (err: any) {
      console.error('❌ Minting error:', err);
      
      // Check for SendTransactionError and extract detailed logs
      if (err?.logs) {
        console.error('Transaction logs:', err.logs);
      }
      
      // Show user-friendly error message
      let errorMessage = err?.message || 'Minting failed. Please try again.';
      
      // Check for program instruction errors
      if (err?.message?.includes('InstructionFallbackNotFound') || err?.logs?.some?.((log: string) => log.includes('InstructionFallbackNotFound'))) {
        errorMessage = 'The program does not recognize the mint instruction. This may indicate the smart contract was recently updated. Please try again in a moment or contact support.';
      } else if (err?.message?.includes('custom program error: 0x65')) {
        errorMessage = 'Transaction failed due to a program error. Please ensure your account is properly initialized and try again.';
      } else if (err?.message?.includes('blockhash')) {
        errorMessage = 'Transaction expired. Please try again.';
      } else if (err?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL balance to complete transaction.';
      } else if (err?.message?.includes('simulation failed')) {
        errorMessage = 'Transaction simulation failed. Please check your account status and try again.';
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

  if (isCheckingRegistration) {
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
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-white text-xl">Checking registration status...</p>
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
                            Claim your {getUserMintTier(effectiveUserNumber)?.equaPerAttempt.toLocaleString() || '1,000'} EQUA
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
                    {userNumber > 0 && (
                      <p className="text-purple-400 text-sm text-center mt-2">
                        User #{userNumber}
                      </p>
                    )}
                  </div>
                  
                  {/* Mint Tier Card for registered users - only show for elevated users (first 100) */}
                  {userNumber > 0 && userNumber <= 100 && (
                    <MintTierCard userNumber={userNumber} totalMints={totalMints} />
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-purple-300 text-sm">
              Program ID:{' '}
              <span className="text-purple-100 font-mono">
                7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
