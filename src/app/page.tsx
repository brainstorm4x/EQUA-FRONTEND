'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/ui/WalletButton';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import Link from 'next/link';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (publicKey && connected) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
    } else {
      setBalance(null);
    }
  }, [publicKey, connected, connection]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
      {/* Header */}
      <header className="border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h2 className="text-6xl font-bold text-white mb-6">
              Welcome to EQUA
            </h2>
            <p className="text-2xl text-primary-100 mb-8">
              Next-generation token platform on Solana blockchain
            </p>
            
            {!connected ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                <p className="text-primary-100 text-lg mb-6">
                  Connect your wallet to get started
                </p>
                <div className="flex justify-center">
                  <WalletButton />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Wallet Info Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-primary-500/30">
                  <h3 className="text-2xl font-bold text-white mb-6">
                    ✅ Wallet Connected
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-primary-900/50 rounded-xl p-6">
                      <p className="text-primary-200 text-sm mb-2">Your Wallet Address</p>
                      <p className="text-white font-mono text-sm break-all">
                        {publicKey?.toBase58()}
                      </p>
                    </div>

                    {balance !== null && (
                      <div className="bg-primary-900/50 rounded-xl p-6">
                        <p className="text-primary-200 text-sm mb-2">SOL Balance</p>
                        <p className="text-white font-bold text-3xl">
                          {balance.toFixed(4)} SOL
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Cards - UPDATED WITH LINKS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mint EQUA Card */}
                  <Link href="/mint">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-primary-500/30 hover:border-primary-400 hover:bg-white/20 transition-all cursor-pointer">
                      <div className="text-4xl mb-3">🪙</div>
                      <h4 className="text-white font-bold text-lg mb-2">Mint EQUA</h4>
                      <p className="text-primary-200 text-sm">Get your EQUA tokens now</p>
                    </div>
                  </Link>

                  {/* Transfer Card */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-primary-500/30 hover:border-primary-400 hover:bg-white/20 transition-all cursor-pointer opacity-50">
                    <div className="text-4xl mb-3">💸</div>
                    <h4 className="text-white font-bold text-lg mb-2">Transfer</h4>
                    <p className="text-primary-200 text-sm">Coming soon</p>
                  </div>

                  {/* Referrals Card */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-primary-500/30 hover:border-primary-400 hover:bg-white/20 transition-all cursor-pointer opacity-50">
                    <div className="text-4xl mb-3">👥</div>
                    <h4 className="text-white font-bold text-lg mb-2">Referrals</h4>
                    <p className="text-primary-200 text-sm">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-primary-700 bg-primary-900/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-primary-300 text-sm">
            EQUA Token © 2025 - Built on Solana Devnet
          </p>
        </div>
      </footer>
    </main>
  );
}
