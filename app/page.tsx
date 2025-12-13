'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/Logo';

// Loading placeholder components
const WalletButtonLoading = () => (
  <div className="bg-purple-600 rounded-lg px-6 py-3 animate-pulse">
    <span className="text-white font-semibold">Loading...</span>
  </div>
);

const ButtonLoading = () => (
  <div className="bg-purple-600 text-white font-bold py-4 px-8 rounded-xl animate-pulse">
    <span>Loading...</span>
  </div>
);

// Dynamically import WalletButton and PriceDisplay with no SSR
const WalletButton = dynamic(
  () => import('@/components/ui/WalletButton').then((mod) => ({ default: mod.WalletButton })),
  { 
    ssr: false,
    loading: () => <WalletButtonLoading />
  }
);

const PriceDisplay = dynamic(
  () => import('@/components/PriceDisplay').then((mod) => ({ default: mod.PriceDisplay })),
  { ssr: false }
);

const WalletDashboard = dynamic(
  () => import('@/components/WalletDashboard').then((mod) => ({ default: mod.WalletDashboard })),
  { ssr: false }
);

const GetStartedButton = dynamic(
  () => import('@/components/GetStartedButton').then((mod) => ({ default: mod.GetStartedButton })),
  { 
    ssr: false,
    loading: () => <ButtonLoading />
  }
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
              <Link href="/merchants" className="text-purple-200 hover:text-white transition-colors">
                For Merchants
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
              <Logo size={120} priority={true} />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6">
            Welcome to EQUA Token
          </h1>
          
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            A revolutionary token system on Solana blockchain with price appreciation 
            and referral bonuses.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <GetStartedButton />
            <Link
              href="/whitepaper"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              Read Whitepaper
            </Link>
            <a
              href="https://explorer.solana.com/address/7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              View on Explorer
            </a>
          </div>

          {/* Wallet Dashboard - Shows when connected */}
          <WalletDashboard className="mb-16 max-w-md mx-auto" />

          {/* Price, Users, and Transactions Display */}
          <PriceDisplay className="mb-16" showStats={true} />

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-white mb-2">Referral Rewards</h3>
              <p className="text-purple-200">
                Refer others and earn 1% for individuals, 2% for businesses (recurring on each mint)
              </p>
            </div>

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
                Five-phase pricing: 0.1% growth from $0.01 to $100, then 0.01% to $200k, then $100/epoch forever
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
                <p className="text-white text-xl font-bold">SPL Token</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-2">Program ID</p>
                <p className="text-white text-sm font-mono">7QYUb...MaFdP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
