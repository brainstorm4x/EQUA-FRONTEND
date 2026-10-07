'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useProgram } from '@/hooks/useProgram';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { safeParseTimestamp } from '@/utils/safeAccountParsing';
import { getCooldownPeriod } from '@/utils/cooldown';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/ui/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

// Helper function to format seconds into human-readable time
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ready to mint!';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export default function AccountDebugPage() {
  const {
    connection,
    publicKey,
    userAccountPDA,
    isReady,
  } = useProgram();

  const [mounted, setMounted] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch account info when wallet is connected
  useEffect(() => {
    if (!publicKey || !userAccountPDA || !connection || !isReady) {
      setAccountInfo(null);
      return;
    }

    const fetchAccountInfo = async () => {
      setLoading(true);
      setError('');
      try {
        const info = await connection.getAccountInfo(userAccountPDA);
        setAccountInfo(info);

        if (info && info.data.length >= 136) {
          // Parse last_mint_time at offset 136 (i64)
          const lastMint = safeParseTimestamp(info.data, 136);
          setLastMintTime(lastMint);
        }
      } catch (err: any) {
        console.error('Error fetching account info:', err);
        setError(err?.message || 'Failed to fetch account info');
      } finally {
        setLoading(false);
      }
    };

    fetchAccountInfo();
  }, [publicKey, userAccountPDA, connection, isReady]);

  // Cooldown timer effect
  useEffect(() => {
    if (lastMintTime === 0) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const now = Math.floor(Date.now() / 1000);
      const timeSinceLastMint = now - lastMintTime;
      const cooldownPeriod = getCooldownPeriod();
      
      if (timeSinceLastMint >= cooldownPeriod) {
        setCooldownRemaining(0);
      } else {
        setCooldownRemaining(cooldownPeriod - timeSinceLastMint);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastMintTime]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (!mounted) return null;

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
        <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <Logo size={40} />
                <h1 className="text-2xl font-bold text-white">UNIYAA Token</h1>
              </Link>
              <WalletButton />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-purple-500/30 max-w-md text-center">
            <h1 className="text-4xl font-bold text-white mb-6">Connect Your Wallet</h1>
            <p className="text-purple-200 mb-8">Please connect your wallet to view account diagnostics</p>
            <div className="flex justify-center">
              <WalletButton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const MIN_ACCOUNT_SIZE = 136;
  const LEGACY_ACCOUNT_SIZE = 128;
  const isLegacy = accountInfo && accountInfo.data.length < MIN_ACCOUNT_SIZE;
  const accountExists = accountInfo !== null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">UNIYAA Token</h1>
            </Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">Account Diagnostics</h2>
            <p className="text-purple-200 text-xl">
              Debug information for your UNIYAA user account
            </p>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-1 gap-6">
            {/* Account Status Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-2xl font-bold text-white mb-6">Account Status</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-purple-200">Loading account information...</p>
                </div>
              ) : !accountExists ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">ℹ️</div>
                  <p className="text-purple-200 text-lg mb-2">Not registered yet</p>
                  <p className="text-purple-300 text-sm">
                    This wallet has not been registered on the UNIYAA program.
                  </p>
                  <Link 
                    href="/mint" 
                    className="mt-6 inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Go to Registration
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Account Size */}
                  <div className="bg-purple-900/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300">Account Size:</span>
                      <span className={`font-mono text-lg ${isLegacy ? 'text-yellow-400' : 'text-green-400'}`}>
                        {accountInfo.data.length} bytes
                      </span>
                    </div>
                    {isLegacy && (
                      <div className="mt-2 text-yellow-300 text-sm">
                        ⚠️ Legacy account detected (expected {MIN_ACCOUNT_SIZE} bytes)
                      </div>
                    )}
                  </div>

                  {/* Last Mint Time */}
                  {accountInfo.data.length >= 136 && (
                    <>
                      <div className="bg-purple-900/30 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-purple-300">Last Mint Time:</span>
                          <span className="font-mono text-white">
                            {lastMintTime > 0 
                              ? new Date(lastMintTime * 1000).toLocaleString()
                              : 'Never minted'}
                          </span>
                        </div>
                        {lastMintTime > 0 && (
                          <div className="text-sm text-purple-400">
                            Unix timestamp: {lastMintTime}
                          </div>
                        )}
                      </div>

                      {/* Cooldown Status */}
                      <div className="bg-purple-900/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-purple-300">Cooldown Status:</span>
                          <span className={`font-bold ${cooldownRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {cooldownRemaining > 0 
                              ? `${formatTimeRemaining(cooldownRemaining)} remaining`
                              : '✅ Ready to mint'}
                          </span>
                        </div>
                        {cooldownRemaining > 0 && (
                          <div className="mt-2 text-sm text-purple-400">
                            Next mint available at: {new Date((lastMintTime + getCooldownPeriod()) * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Account Owner */}
                  <div className="bg-purple-900/30 rounded-lg p-4">
                    <div className="text-purple-300 mb-2">Account Owner:</div>
                    <div className="font-mono text-sm text-white break-all">
                      {accountInfo.owner.toBase58()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PDA Information Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-2xl font-bold text-white mb-6">PDA Information</h3>
              
              <div className="space-y-4">
                {/* Wallet Address */}
                <div className="bg-purple-900/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-300">Wallet Address:</span>
                    <button
                      onClick={() => copyToClipboard(publicKey.toBase58(), 'wallet')}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-all"
                    >
                      {copied === 'wallet' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-sm text-white break-all">
                    {publicKey.toBase58()}
                  </div>
                </div>

                {/* User Account PDA */}
                <div className="bg-purple-900/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-300">User Account PDA:</span>
                    <button
                      onClick={() => userAccountPDA && copyToClipboard(userAccountPDA.toBase58(), 'user_account')}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-all"
                    >
                      {copied === 'user_account' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-sm text-white break-all">
                    {userAccountPDA?.toBase58() || 'N/A'}
                  </div>
                  <div className="text-xs text-purple-400 mt-2">
                    Seeds: [&quot;user-account&quot;, wallet_address]
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link 
                  href="/mint" 
                  className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Back to Mint Page
                </Link>
              </div>
            </div>

            {/* Legacy Account Help */}
            {isLegacy && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-yellow-100 mb-4">⚠️ Legacy Account Detected</h3>
                <p className="text-yellow-200 mb-4">
                  Your account was created with an older version of the UNIYAA program. 
                  To continue using UNIYAA with the latest features:
                </p>
                <div className="bg-yellow-900/30 rounded-lg p-4 mb-4">
                  <h4 className="text-yellow-100 font-bold mb-2">How to Fix:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-yellow-200 text-sm">
                    <li>Use a different wallet that hasn&apos;t been registered yet, or</li>
                    <li>Contact the UNIYAA team for account migration assistance</li>
                  </ol>
                </div>
                <p className="text-yellow-300 text-xs">
                  This is expected on Devnet during development. Your tokens and data are safe.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
