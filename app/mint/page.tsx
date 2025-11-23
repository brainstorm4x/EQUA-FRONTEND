'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProgram } from '@/hooks/useProgram';
import { WalletButton } from '@/components/WalletButton';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';

// Constants for error handling
const ERROR_STACK_TRACE_LINES = 3;

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

export default function MintPage() {
  const {
    program,
    connection,
    wallet,
    publicKey,
    userAccountKeypair,
    isReady,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkUserRegistration = useCallback(async () => {
    if (!publicKey || !isReady || !userAccountKeypair) {
      setIsCheckingRegistration(false);
      return;
    }

    setIsCheckingRegistration(true);
    try {
      const isReg = await checkRegistration(userAccountKeypair.publicKey);
      setRegistered(isReg);

      if (isReg) {
        const bal = await getBalance(userAccountKeypair.publicKey);
        setBalance(bal);
      }
    } catch (err) {
      console.error('Error checking registration:', err);
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [publicKey, isReady, userAccountKeypair, checkRegistration, getBalance]);

  useEffect(() => {
    checkUserRegistration();
  }, [checkUserRegistration]);

  const handleRegister = async () => {
    if (!wallet.connected || !publicKey || !userAccountKeypair) {
      setError('Wallet not connected');
      return;
    }

    if (!program) {
      setError('Program is loading... Please try again');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      console.log('Creating registration transaction...');
      console.log('Wallet connected:', wallet.connected);
      console.log('Public key:', publicKey.toBase58());

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
        TOKEN_2022_PROGRAM_ID,
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
            TOKEN_2022_PROGRAM_ID,
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
          throw handleAtaCreationError(ataError, 'registration');
        }
      } else {
        console.log('✅ Token account already exists');
      }

      const now = Math.floor(Date.now() / 1000);
      const lockUntil = now + (2 * 365 * 24 * 60 * 60);

      console.log('Accounts:');
      console.log('- User Account:', userAccountKeypair.publicKey.toBase58());
      console.log('- Authority:', publicKey.toBase58());
      console.log('- Global State:', globalStatePDA.toBase58());
      console.log('- Token Account:', userTokenAccount.toBase58());
      console.log('- Mint:', mintPDA.toBase58());

      const tx = await program.methods
        .initializeUser(
          PublicKey.default,
          new anchor.BN(now),
          new anchor.BN(lockUntil)
        )
        .accounts({
          userAccount: userAccountKeypair.publicKey,
          authority: publicKey,
          globalState: globalStatePDA,
          referralAccount: PublicKey.default,
          userTokenAccount,
          mint: mintPDA,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([userAccountKeypair])
        .rpc();

      console.log('✅ Registration successful!', tx);
      setTxSignature(tx);
      setRegistered(true);

      await checkUserRegistration();
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };


  const handleMint = async () => {
    if (!wallet.connected || !publicKey || !userAccountKeypair || !program) {
      setError('Wallet not connected or program not ready');
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
      
      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('📝 Accounts:');
      console.log('  - User Account:', userAccountKeypair.publicKey.toBase58());
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
            TOKEN_2022_PROGRAM_ID,
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

      // ✅ Now mint tokens
      const tx = await program.methods
        .mintEquaTokens(new anchor.BN(1_000_000_000))
        .accounts({
          userAccount: userAccountKeypair.publicKey,
          userTokenAccount,
          mint: mintPDA,
          mintAuthority,
          authority: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      console.log('✅ Minting successful!', tx);
      setTxSignature(tx);

      // Refresh balance
      await checkUserRegistration();

    } catch (err: any) {
      console.error('❌ Minting error:', err);
      
      // Check for SendTransactionError and extract detailed logs
      if (err?.logs) {
        console.error('Transaction logs:', err.logs);
      }
      
      // Show user-friendly error message
      let errorMessage = err?.message || 'Minting failed. Please try again.';
      
      // Simplify common error messages for users
      if (errorMessage.includes('blockhash')) {
        errorMessage = 'Transaction expired. Please try again.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL balance to complete transaction.';
      } else if (errorMessage.includes('simulation failed')) {
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
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
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
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
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

  // ADD THIS NEW CHECK
  if (!program) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
        <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
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

  // ... rest of your page code ...

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
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
              {registered ? 'Mint EQUA Tokens' : 'Register Your Account'}
            </h2>
            <p className="text-purple-200 text-xl">
              {registered ? 'Get your EQUA tokens on Solana Devnet' : 'One-time setup to start minting'}
            </p>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                <p className="text-red-200">{error}</p>
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
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
                <div className="text-center">
                  <div className="text-6xl mb-6">📝</div>
                  <h3 className="text-2xl font-bold text-white mb-4">Register Account</h3>
                  <p className="text-purple-200 mb-6">
                    Create your on-chain user account to start minting EQUA tokens
                  </p>
                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Registering...' : '✅ Register Now'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
                  <h3 className="text-2xl font-bold text-white mb-6">Mint EQUA</h3>
                  <div className="bg-purple-900/50 rounded-xl p-6 mb-6">
                    <p className="text-purple-200 text-center text-2xl font-bold">1,000 EQUA</p>
                  </div>
                  <button
                    onClick={handleMint}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Minting...' : '🪙 Mint 1,000 EQUA'}
                  </button>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
                  <h3 className="text-purple-200 text-lg mb-4 text-center">Your Balance</h3>
                  <p className="text-white font-bold text-5xl text-center mb-2">
                    {balance.toLocaleString()}
                  </p>
                  <p className="text-purple-300 text-center">EQUA</p>
                </div>
              </>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-purple-300 text-sm">
              Program ID:{' '}
              <span className="text-purple-100 font-mono">
                BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
