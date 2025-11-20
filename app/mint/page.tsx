'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProgram } from '@/hooks/useProgram';
import { WalletButton } from '@/components/WalletButton';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';

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

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

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
  console.log('🔄 Creating mint transaction...');
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
  console.log('  - Authority:', publicKey.toBase58());

  // ✅ CORRECTED: Use mintEquaTokens (matches backend instruction name)
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
  setError(err.message || 'Minting failed');
  } finally {
  setIsLoading(false);
  }
};



// ... existing code ...

  if (!mounted) return null;

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-purple-500/30 max-w-md text-center">
          <h1 className="text-4xl font-bold text-white mb-6">Connect Your Wallet</h1>
          <p className="text-purple-200 mb-8">Please connect your wallet to get started</p>
          <WalletButton />
        </div>
      </main>
    );
  }

  if (isCheckingRegistration) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-white text-xl">Checking registration status...</p>
        </div>
      </main>
    );
  }

  // ADD THIS NEW CHECK
  if (!program) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-white text-xl">Initializing program...</p>
          <p className="text-purple-300 text-sm mt-2">Please wait a moment</p>
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
