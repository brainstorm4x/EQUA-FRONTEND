'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/ui/WalletButton';
import { useProgram } from '@/hooks/useProgram';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Transaction, Keypair, PublicKey } from '@solana/web3.js';
import * as program from '@/lib/program-2';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

// ✅ FIX: Helper function to store/retrieve user keypair from localStorage
const STORAGE_KEY = 'equa_user_keypair';

function getUserKeypairFromStorage(): Keypair | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const secretKey = new Uint8Array(JSON.parse(stored));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Error loading keypair from storage:', error);
    return null;
  }
}

function saveUserKeypairToStorage(keypair: Keypair): void {
  if (typeof window === 'undefined') return;

  try {
    const secretKey = Array.from(keypair.secretKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(secretKey));
  } catch (error) {
    console.error('Error saving keypair to storage:', error);
  }
}

export default function MintPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { 
    wallet, 
    isReady, 
    getGlobalStatePDA, 
    getMintPDA,
    getMintAuthorityPDA,
    isUserRegistered, 
    getUserBalance, 
    getGlobalState 
  } = useProgram();

  const [userAccountKeypair, setUserAccountKeypair] = useState<Keypair | null>(null);
  const [registered, setRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [balance, setBalance] = useState(0);
  const [txSignature, setTxSignature] = useState('');
  const [error, setError] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0.01);

  // ✅ FIX: Load or generate user account keypair on mount (only once)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let keypair = getUserKeypairFromStorage();

    if (!keypair) {
      keypair = Keypair.generate();
      saveUserKeypairToStorage(keypair);
      console.log('🔑 Generated new user account:', keypair.publicKey.toBase58());
    } else {
      console.log('🔑 Loaded existing user account:', keypair.publicKey.toBase58());
    }

    setUserAccountKeypair(keypair);
  }, []); // ✅ Empty dependency array - runs only once

  // ✅ FIX: Memoize checkRegistration function
  const checkRegistration = useCallback(async () => {
    if (!publicKey || !isReady || !userAccountKeypair) {
      setIsCheckingRegistration(false);
      return;
    }

    setIsCheckingRegistration(true);

    try {
      const userPubkey = userAccountKeypair.publicKey;
      const isReg = await isUserRegistered(userPubkey);
      console.log('📋 User registered:', isReg);
      setRegistered(isReg);

      if (isReg) {
        const bal = await getUserBalance(userPubkey);
        setBalance(bal);
      }

      const [globalStatePDA] = getGlobalStatePDA();
      const globalState = await getGlobalState(globalStatePDA);
      if (globalState) {
        setTotalUsers(globalState.userCount);
      }
    } catch (err) {
      console.error('Error checking registration:', err);
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [publicKey, isReady, userAccountKeypair, isUserRegistered, getUserBalance, getGlobalStatePDA, getGlobalState]);

  // Check registration when wallet connects or user account is ready
  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // Register User
  const handleRegister = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    console.log('🔵 Register button clicked');

    if (!wallet || !publicKey || !userAccountKeypair) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      const [globalStatePDA] = getGlobalStatePDA();
      const [mintPDA] = getMintPDA();

      // ✅ CRITICAL FIX: Use TOKEN_PROGRAM_ID
      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        program.TOKEN_PROGRAM_ID,  // ✅ FIXED: Was missing this
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('📝 Creating registration transaction...');
      console.log('📝 User Account:', userAccountKeypair.publicKey.toBase58());
      console.log('📝 Global State PDA:', globalStatePDA.toBase58());
      console.log('📝 User Token Account:', userTokenAccount.toBase58());
      console.log('📝 Mint PDA:', mintPDA.toBase58());

      const now = Math.floor(Date.now() / 1000);

      // ✅ CRITICAL FIX: Pass TOKEN_PROGRAM_ID
      const instruction = program.createInitializeUserInstruction(
        userAccountKeypair.publicKey,
        publicKey,
        globalStatePDA,
        PublicKey.default,  // ✅ FIXED: Use PublicKey.default for no referral
        userTokenAccount,
        mintPDA,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        program.TOKEN_PROGRAM_ID,  // ✅ FIXED: Use Token Program
        now,
        now + (2 * 365 * 24 * 60 * 60),  // 2 years from now
        PublicKey.default  // No referrer
      );

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Sign with wallet first, then add user account signature
      const signed = await wallet.signTransaction(transaction);
      signed.partialSign(userAccountKeypair);

      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Registration successful!', signature);
      setTxSignature(signature);
      setRegistered(true);

      // Update balance and stats
      const bal = await getUserBalance(userAccountKeypair.publicKey);
      setBalance(bal);

      const globalState = await getGlobalState(globalStatePDA);
      if (globalState) {
        setTotalUsers(globalState.userCount);
      }
    } catch (err: unknown) {
      console.error('❌ Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mint EQUA
  const handleMint = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    console.log('🔵 Mint button clicked');

    if (!wallet || !publicKey || !userAccountKeypair) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      const [mintPDA] = getMintPDA();
      const [mintAuthority] = getMintAuthorityPDA();

      // ✅ CRITICAL FIX: Use TOKEN_PROGRAM_ID
      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        program.TOKEN_PROGRAM_ID,  // ✅ FIXED: Use Token Program
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('🪙 Creating mint transaction...');

      const instruction = program.createMintEquaInstruction(
        userAccountKeypair.publicKey,
        userTokenAccount,
        mintPDA,
        mintAuthority,
        publicKey,
        program.TOKEN_PROGRAM_ID,  // ✅ CRITICAL FIX: Use Token Program
        1000_000000  // 1000 EQUA (with 6 decimals)
      );

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Minting successful!', signature);
      setTxSignature(signature);

      const bal = await getUserBalance(userAccountKeypair.publicKey);
      setBalance(bal);
    } catch (err: unknown) {
      console.error('❌ Minting error:', err);
      setError(err instanceof Error ? err.message : 'Minting failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX: Use mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;  // Prevent hydration mismatch
  }

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        <header className="border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-primary-500/30">
              <div className="text-6xl mb-6">🔒</div>
              <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-primary-200 mb-8">Please connect your wallet to mint EQUA tokens</p>
              <WalletButton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!isReady) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        <header className="border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-primary-500/30">
              <div className="text-6xl mb-6">⏳</div>
              <h2 className="text-3xl font-bold text-white mb-4">Connecting to Solana blockchain</h2>
              <p className="text-primary-200">Please wait...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
      <header className="border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
            </Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Get your EQUA tokens on Solana Devnet
            </h1>
            <p className="text-xl text-primary-200">
              Total Users: {totalUsers} | Current Price: ${currentPrice.toFixed(4)}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                <p className="text-red-200 font-medium">❌ {error}</p>
              </div>
            </div>
          )}

          {/* Transaction Success */}
          {txSignature && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4">
                <p className="text-green-200 font-medium mb-2">✅ Transaction Successful!</p>
                <p className="text-green-100 text-sm">Transaction Signature: {txSignature}</p>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-100 underline text-sm"
                >
                  Click to view on Solana Explorer
                </a>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Registration Card */}
            {!registered && !isCheckingRegistration && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <div className="text-6xl mb-6 text-center">📝</div>
                <h2 className="text-3xl font-bold text-white mb-4 text-center">Register</h2>
                <p className="text-primary-200 mb-6 text-center">
                  Register your account to start minting EQUA tokens.
                </p>
                <p className="text-primary-300 text-sm mb-6 text-center">
                  This will require a small SOL transaction fee (~0.01 SOL).
                </p>
                <button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Registering...' : 'Register Now'}
                </button>
              </div>
            )}

            {/* Checking Status */}
            {isCheckingRegistration && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <div className="text-6xl mb-6 text-center">⏳</div>
                <h2 className="text-3xl font-bold text-white mb-4 text-center">Loading...</h2>
                <p className="text-primary-200 text-center">Checking registration status...</p>
              </div>
            )}

            {/* Mint Card */}
            {registered && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <div className="text-6xl mb-6 text-center">🪙</div>
                <h2 className="text-3xl font-bold text-white mb-4 text-center">Mint EQUA</h2>
                <div className="bg-primary-500/20 rounded-xl p-6 mb-6">
                  <p className="text-primary-100 text-center text-2xl font-bold">1,000 EQUA</p>
                </div>
                <p className="text-primary-200 mb-6 text-center text-sm">
                  <strong>How it works:</strong> Click the button to mint 1,000 EQUA tokens.
                </p>
                <button
                  onClick={handleMint}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Minting...' : 'Mint 1,000 EQUA'}
                </button>
              </div>
            )}

            {/* Balance Card */}
            {registered && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <h3 className="text-primary-200 text-lg mb-4 text-center">Your EQUA Balance</h3>
                <p className="text-white font-bold text-5xl text-center mb-2">
                  {balance.toLocaleString()}
                </p>
                <p className="text-primary-300 text-center">EQUA</p>
              </div>
            )}

            {/* Price Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
              <h3 className="text-primary-200 text-lg mb-4 text-center">Current Price</h3>
              <p className="text-white font-bold text-4xl text-center mb-2">
                ${currentPrice.toFixed(4)}
              </p>
              <p className="text-primary-300 text-center">per EQUA</p>
            </div>
          </div>

          {/* Program Info */}
          <div className="mt-12 text-center">
            <p className="text-primary-300 text-sm">
              Program ID: <span className="text-primary-100 font-mono">G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}