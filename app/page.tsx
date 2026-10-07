'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/Logo';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { isUserRegistered } from '@/utils/registrationCheck';

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
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [isRegistered, setIsRegistered] = useState(false);

  // Check if user is registered (for UI state only, no redirect)
  useEffect(() => {
    async function checkRegistration() {
      if (!publicKey) {
        setIsRegistered(false); // No wallet = not registered
        return;
      }
      
      try {
        const registered = await isUserRegistered(connection, publicKey);
        setIsRegistered(registered);
      } catch (error) {
        console.error('❌ Error checking registration:', error);
        // On error, assume not registered (safe fallback)
        setIsRegistered(false);
      }
    }
    
    checkRegistration();
  }, [publicKey, connection]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
        {/* Visual layer ONLY */}
        <div className="bg-purple-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <Logo size={40} />
                <h1 className="text-2xl font-bold text-white">UNIYAA Token</h1>
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link href="/whitepaper" className="text-purple-200 hover:text-white transition-colors">
                  Whitepaper
                </Link>
                <Link href="/merchants" className="text-purple-200 hover:text-white transition-colors">
                  For Merchants
                </Link>
                <Link href="/about" className="text-purple-200 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/privacy" className="text-purple-200 hover:text-white transition-colors">
                  Privacy
                </Link>
                <WalletButton />
              </nav>

              <div className="md:hidden">
                <WalletButton />
              </div>
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
            Welcome to UNIYAA Token
          </h1>
          
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            A payment token on Solana whose value grows with everyday use.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            {/* Conditional rendering based on registration status */}
            {!isRegistered ? (
              // ✅ Show "Get Started" for UNREGISTERED users
              <GetStartedButton />
            ) : (
              // ✅ Show "Mint UNIYAA" for REGISTERED users
              <Link
                href="/mint"
                data-testid="mint-uniyaa-cta"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
              >
                Mint UNIYAA →
              </Link>
            )}
            
            <Link
              href="/whitepaper"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              Read Whitepaper
            </Link>
            <a
              href="https://explorer.solana.com/address/2iuL9YEKGJtdFbPAMkGz3i8huSJZuUih3yonjpCPNQqQ?cluster=devnet"
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
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-white mb-2">Grows With Use</h3>
              <p className="text-purple-200">
                Every person who pays with UNIYAA counts once a day toward its growth, so real use moves it, not spam.
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
                Grows once a day with the share of people who pay with UNIYAA, by at
                most 0.5% a day. Slow and steady by design.
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
                <p className="text-white text-sm font-mono">B2zocF...kDfx2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
