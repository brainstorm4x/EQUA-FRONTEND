'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/ui/WalletButton';
import { useProgram } from '@/hooks/useProgram';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Transaction, Keypair, PublicKey } from '@solana/web3.js';
import * as program from '@/lib/program';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

// ✅ Helper function to store/retrieve user keypair from localStorage
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

// ✅ Helper to format seconds into human-readable time
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
  
  // ✅ NEW: Cooldown state
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [timeUntilNextMint, setTimeUntilNextMint] = useState<number>(0);
  const [canMint, setCanMint] = useState<boolean>(true);

  // ✅ Load or generate user account keypair on mount
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
  }, []);

  // ✅ NEW: Function to read last_mint_time from user account
  // Read last_mint_time from user account
  const getLastMintTime = useCallback(async (userPubkey: PublicKey): Promise<number> => {
    try {
      const accountInfo = await connection.getAccountInfo(userPubkey);
      if (!accountInfo || accountInfo.data.length === 0) {
        console.log('⚠️ User account not found');
        return 0;
      }
      
      // Correct offset based on IDL:
      // 8 discriminator + 32 authority + 32 referral + 32 token_account + 8 minted_amount + 8 mint_start + 8 locked_until = 128
      const LAST_MINT_TIME_OFFSET = 136;
      
      if (accountInfo.data.length < LAST_MINT_TIME_OFFSET + 8) {
        console.log('⚠️ Account data too short for last_mint_time');
        return 0;
      }
      
      const lastMintRaw = new BN(
        accountInfo.data.slice(LAST_MINT_TIME_OFFSET, LAST_MINT_TIME_OFFSET + 8),
        'le'
      );
      
      // Safe conversion with reasonable timestamp bounds
      const MAX_SAFE_TIMESTAMP = 8640000000; // ~year 2243 in seconds
      if (lastMintRaw.gt(new BN(MAX_SAFE_TIMESTAMP))) {
        console.warn('⚠️ Last mint time appears uninitialized or corrupted:', lastMintRaw.toString());
        return 0;
      }
      
      const timestamp = lastMintRaw.toNumber();
      console.log('⏰ Raw last_mint_time:', timestamp, 'Date:', new Date(timestamp * 1000).toLocaleString());
      return timestamp;
    } catch (error) {
      console.error('Error getting last mint time:', error);
      return 0;
    }
  }, [connection]);


  // ✅ Check registration and fetch last mint time
  const checkRegistration = useCallback(async () => {
    if (!publicKey || !isReady || !userAccountKeypair) {
      setIsCheckingRegistration(false);
      return;
    }

    setIsCheckingRegistration(true);
    
    try {
      const userPubkey = userAccountKeypair.publicKey;
      
      // ✅ Check if account exists first
      const accountInfo = await connection.getAccountInfo(userPubkey);
      if (accountInfo) {
        console.log('⚠️ User account already exists, checking if it\'s properly initialized...');
        
        // Try to verify if it's a valid user account by checking discriminator
        if (accountInfo.data.length >= 8) {
          const discriminator = accountInfo.data.slice(0, 8);
          console.log('Account discriminator:', Array.from(discriminator));
          
          // If account exists but has wrong data, we need a new keypair
          const isReg = await isUserRegistered(userPubkey);
          setRegistered(isReg);
          
          if (!isReg) {
            console.log('❌ Account exists but not properly registered. Generating new keypair...');
            // Clear and generate new keypair
            localStorage.removeItem(STORAGE_KEY);
            const newKeypair = Keypair.generate();
            saveUserKeypairToStorage(newKeypair);
            setUserAccountKeypair(newKeypair);
            setIsCheckingRegistration(false);
            return;
          }
        }
      } else {
        console.log('✅ User account does not exist yet, ready to register');
      }
      
      const isReg = await isUserRegistered(userPubkey);
      console.log('📋 User registered:', isReg);
      setRegistered(isReg);

      if (isReg) {
        // Get balance
        const [mintPDA] = getMintPDA();
        const userTokenAccount = getAssociatedTokenAddressSync(
          mintPDA,
          publicKey,
          false,
          program.TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const bal = await program.getSPLTokenBalance(connection, userTokenAccount);
        setBalance(bal);

        // Get last mint time
        const lastMint = await getLastMintTime(userPubkey);
        setLastMintTime(lastMint);
        console.log('⏰ Last mint time:', lastMint);
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
  }, [publicKey, isReady, userAccountKeypair, isUserRegistered, getMintPDA, getGlobalStatePDA, getGlobalState, connection, getLastMintTime]);

  // Check registration when wallet connects or user account is ready
  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // ✅ NEW: Countdown timer effect
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

    // Update immediately
    updateCooldown();

    // Update every second
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [lastMintTime]);

  // ✅ REGISTER USER
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

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        program.TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('📝 Creating registration transaction...');
      console.log('📝 User Account:', userAccountKeypair.publicKey.toBase58());
      console.log('📝 Authority (Wallet):', publicKey.toBase58());
      console.log('📝 Global State PDA:', globalStatePDA.toBase58());
      console.log('📝 User Token Account:', userTokenAccount.toBase58());
      console.log('📝 Mint PDA:', mintPDA.toBase58());

      const now = Math.floor(Date.now() / 1000);
      
      const instruction = program.createInitializeUserInstruction(
        userAccountKeypair.publicKey,
        publicKey,
        globalStatePDA,
        userAccountKeypair.publicKey,
        userTokenAccount,
        mintPDA,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        program.TOKEN_PROGRAM_ID,
        now,
        now,
        PublicKey.default
      );

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      console.log('📝 Requesting wallet signature...');
      const signed = await wallet.signTransaction(transaction);
      signed.partialSign(userAccountKeypair);  // ✅ CRITICAL for registration
      
      console.log('📝 Sending transaction...');
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('📝 Transaction sent! Signature:', signature);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      console.log('✅ Registration successful!', signature);
      setTxSignature(signature);
      setRegistered(true);
      
      // Update balance
      const bal = await program.getSPLTokenBalance(connection, userTokenAccount);
      setBalance(bal);

      // Get last mint time (should be 0 for new user)
      const lastMint = await getLastMintTime(userAccountKeypair.publicKey);
      setLastMintTime(lastMint);

      const globalState = await getGlobalState(globalStatePDA);
      if (globalState) {
        setTotalUsers(globalState.userCount);
      }
    } catch (err: unknown) {
      console.error('❌ Registration error:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
      }
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  // ✅ MINT EQUA WITH COOLDOWN CHECK
  const handleMint = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    console.log('🔵 Mint button clicked');
    
    if (!wallet || !publicKey || !userAccountKeypair) {
      setError('Wallet not connected');
      return;
    }

    if (!canMint) {
      setError(`⏰ Please wait ${formatTimeRemaining(timeUntilNextMint)} before minting again`);
      return;
    }

    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      const [mintPDA] = getMintPDA();
      const [mintAuthority] = getMintAuthorityPDA();

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        program.TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('🪙 Creating mint transaction...');
      console.log('🪙 User Account:', userAccountKeypair.publicKey.toBase58());

      const instruction = program.createMintEquaInstruction(
        userAccountKeypair.publicKey,
        userTokenAccount,
        mintPDA,
        mintAuthority,
        publicKey,
        program.TOKEN_PROGRAM_ID,
        1000_000000
      );

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      // ✅ CRITICAL: Sign with both wallet AND user account keypair
      const signed = await wallet.signTransaction(transaction);
      signed.partialSign(userAccountKeypair);
      
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('📤 Transaction sent:', signature);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      console.log('✅ Minting successful!', signature);
      setTxSignature(signature);
      
      // Wait a moment for on-chain state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update balance
      const bal = await program.getSPLTokenBalance(connection, userTokenAccount);
      setBalance(bal);
      console.log('💰 New balance:', bal);

      // ✅ Update last mint time - fetch fresh data
      const newLastMintTime = await getLastMintTime(userAccountKeypair.publicKey);
      setLastMintTime(newLastMintTime);
      console.log('⏰ Updated last mint time:', newLastMintTime, 'Date:', new Date(newLastMintTime * 1000).toLocaleString());

    } catch (err: unknown) {
      console.error('❌ Minting error:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      setError(err instanceof Error ? err.message : 'Minting failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Reset user account (development only)
  const handleResetAccount = () => {
    if (confirm('⚠️ This will delete your local user account keypair. You will need to register again. Continue?')) {
      localStorage.removeItem(STORAGE_KEY);
      setUserAccountKeypair(null);
      setRegistered(false);
      setBalance(0);
      setLastMintTime(0);
      setTxSignature('');
      setError('');
      window.location.reload();
    }
  };

  // ✅ Use mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
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
              <h2 className="text-3xl font-bold text-white mb-4 text-center">Connecting to Solana blockchain</h2>
              <p className="text-primary-200 text-center">Please wait...</p>
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
                <p className="text-green-100 text-sm mb-2">Signature: {txSignature}</p>
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

            {/* Mint Card with Cooldown */}
            {registered && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <div className="text-6xl mb-6 text-center">🪙</div>
                <h2 className="text-3xl font-bold text-white mb-4 text-center">
                  {canMint ? 'Daily EQUA Reward' : 'Cooldown Active'}
                </h2>
                
                {/* Countdown Display */}
                <div className={`rounded-xl p-6 mb-6 text-center ${
                  canMint 
                    ? 'bg-green-500/20 border-2 border-green-500' 
                    : 'bg-yellow-500/20 border-2 border-yellow-500'
                }`}>
                  {canMint ? (
                    <>
                      <p className="text-green-100 text-3xl font-bold mb-2">✅ Ready to mint!</p>
                      <p className="text-green-200 text-lg">Claim your 1,000 EQUA</p>
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

                <p className="text-primary-200 mb-6 text-center text-sm">
                  {canMint ? (
                    <>🎁 Your daily reward is ready! Claim 1,000 EQUA tokens now.</>
                  ) : (
                    <>⏰ You can claim once every 24 hours. Check back soon!</>
                  )}
                </p>

                <button
                  onClick={handleMint}
                  disabled={isLoading || !canMint}
                  className={`w-full font-bold py-4 px-8 rounded-xl transition-all duration-200 ${
                    canMint && !isLoading
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white cursor-pointer'
                      : 'bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Claiming...
                    </span>
                  ) : canMint ? (
                    'Claim Daily EQUA'
                  ) : (
                    `Cooldown: ${formatTimeRemaining(timeUntilNextMint)}`
                  )}
                </button>

                {/* Last claim info */}
                {lastMintTime > 0 && (
                  <p className="text-primary-300 text-xs text-center mt-4">
                    Last claimed: {new Date(lastMintTime * 1000).toLocaleString()}
                  </p>
                )}
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

          {/* Development: Reset Account Button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 text-center">
              <button
                onClick={handleResetAccount}
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
              >
                🔄 Reset Account (Dev Only)
              </button>
              {userAccountKeypair && (
                <p className="text-primary-400 text-xs mt-2">
                  Current User Account: {userAccountKeypair.publicKey.toBase58().slice(0, 8)}...{userAccountKeypair.publicKey.toBase58().slice(-8)}
                </p>
              )}
            </div>
          )}

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
