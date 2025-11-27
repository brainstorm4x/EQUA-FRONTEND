'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/Logo';

// Dynamically import WalletButton and PriceDisplay with no SSR
const WalletButton = dynamic(
  () => import('@/components/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { ssr: false }
);

const PriceDisplay = dynamic(
  () => import('@/components/PriceDisplay').then((mod) => ({ default: mod.PriceDisplay })),
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
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/whitepaper" className="text-purple-200 hover:text-white transition-colors">
                Whitepaper
              </Link>
              <WalletButton />
            </nav>
            <div className="md:hidden">
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-block p-6 bg-white/10 rounded-full mb-6">
              <Logo size={120} />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6">
            Welcome to EQUA Token
          </h1>
          
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            A revolutionary token system on Solana blockchain with price appreciation, 
            time-locked rewards, and referral bonuses.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link
              href="/mint"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
              data-testid="get-started-cta"
            >
              Get Started →
            </Link>
            <Link
              href="/whitepaper"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              Read Whitepaper
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

          {/* Price, Users, and Transactions Display */}
          <PriceDisplay className="mb-16" showStats={true} />

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Higher-Minting-Rate</h3>
              <p className="text-purple-200">
                First 100 users get to mint at a higher rate for early adoption
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">Price Appreciation</h3>
              <p className="text-purple-200">
                Three-phase pricing: 0.1% per 100 tx, then 0.01% per 1000 tx, then $100 per 1000 tx
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-white mb-2">Referral Rewards</h3>
              <p className="text-purple-200">
                Earn 1% of referral&apos;s minted allocation when you refer new users
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
