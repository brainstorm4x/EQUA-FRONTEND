'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import WalletButton with no SSR
const WalletButton = dynamic(
  () => import('@/components/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);


export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
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

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
              <span className="text-6xl">🪙</span>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6">
            Welcome to EQUA Token
          </h1>
          
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            A revolutionary token system on Solana blockchain with price appreciation, 
            time-locked rewards, and referral bonuses.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/mint"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
            >
              Get Started →
            </Link>
            <a
              href="https://explorer.solana.com/address/BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              View on Explorer
            </a>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Time-Locked</h3>
              <p className="text-purple-200">
                First 100 users get 2-year locked rewards for early adoption
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">Price Appreciation</h3>
              <p className="text-purple-200">
                Dynamic pricing with compounding and linear phases
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-white mb-2">Referral Rewards</h3>
              <p className="text-purple-200">
                Earn 10% bonus when you refer new users to the platform
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-purple-500/20">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <p className="text-purple-300 text-sm mb-2">Network</p>
                <p className="text-white text-xl font-bold">Solana Devnet</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-2">Token Standard</p>
                <p className="text-white text-xl font-bold">SPL Token-2022</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-2">Program ID</p>
                <p className="text-white text-sm font-mono">BgNRq...6aDtL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
