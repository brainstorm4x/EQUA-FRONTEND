'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/Logo';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { fetchUserMetadata } from '@/utils/userMetadata';

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
        const metadata = await fetchUserMetadata(connection, publicKey);
        
        if (metadata) {
          // ✅ Just set state, don't redirect
          console.log('✅ User is registered');
          setIsRegistered(true);
        } else {
          console.log('💡 User not registered');
          setIsRegistered(false);
        }
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
            {/* Conditional rendering based on registration status */}
            {!isRegistered ? (
              // ✅ Show "Get Started" for UNREGISTERED users
              <GetStartedButton />
            ) : (
              // ✅ Show "Mint EQUA" for REGISTERED users
              <Link
                href="/mint"
                data-testid="mint-equa-cta"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
              >
                Mint EQUA →
              </Link>
            )}
            
            <Link
              href="/whitepaper"
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
            >
              Read Whitepaper
            </Link>
            <a
              href="https://explorer.solana.com/address/2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4?cluster=devnet"
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
            {/* Referral Credit System (Integer-Based)
                - Individual referrals: 1 credit per successful registration
                - Business referrals: 2 credits per successful registration
                - Credits are redeemable for bonus minting attempts (5 credits = 1 bonus mint)
                - Backend source: brainstorm4x/EQUA repo - programs/equa_token/src/lib.rs (lines 765-790)
                - Frontend implementation: src/utils/referralRewards.ts (getReferralCredits)
            */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-white mb-2">Referral Rewards</h3>
              <p className="text-purple-200">
                Earn referral credits: 1 credit per individual referral, 2 credits per business referral. 
                Redeem credits for bonus minting attempts.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Higher-Minting-Rate</h3>
              <p className="text-purple-200">
                First 100 users get to mint at a higher rate for early adoption
              </p>
            </div>

            {/* 9-Tier Price Appreciation Model
                - Tiers 1-8: Constant 0.01% compound growth per epoch
                - Tier 9 ($500k+): Linear growth at $250 per epoch (1000 txns)
                - Implementation: src/utils/priceCalculator.ts
                - Tests: __tests__/pricing/priceCalculator.test.ts
            */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">Price Appreciation</h3>
              <p className="text-purple-200">
                9-tier compounding system: Tiers 1-8 grow at constant 0.01% per epoch. 
                Tier 9 ($500k+) grows linearly at $250 per epoch (1000 transactions).
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
                <p className="text-white text-sm font-mono">GR1Xr...wok7C</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
