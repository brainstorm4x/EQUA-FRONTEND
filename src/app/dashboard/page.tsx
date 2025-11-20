'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/ui/WalletButton';
import { Header } from '@/components/Layout/Header';
import { Footer } from '@/components/Layout/Footer';
import { Card } from '@/components/ui/Card';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen flex flex-col gradient-primary">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-2xl w-full">
            <Card className="glass-card text-center">
              <div className="text-6xl mb-6">🔒</div>
              <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-primary-200 mb-8">
                Please connect your wallet to access the dashboard
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-primary">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Dashboard</h1>
            <p className="text-xl text-primary-200">
              Manage your EQUA tokens and view your activity
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Token Balance Card */}
            <Card className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-primary-200 text-sm font-medium">Total Balance</h3>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-white text-3xl font-bold mb-2">0</p>
              <p className="text-primary-300 text-sm">EQUA Tokens</p>
            </Card>

            {/* Minted Amount Card */}
            <Card className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-primary-200 text-sm font-medium">Minted</h3>
                <span className="text-2xl">🪙</span>
              </div>
              <p className="text-white text-3xl font-bold mb-2">0</p>
              <p className="text-primary-300 text-sm">EQUA Tokens</p>
            </Card>

            {/* Referrals Card */}
            <Card className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-primary-200 text-sm font-medium">Referrals</h3>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-white text-3xl font-bold mb-2">0</p>
              <p className="text-primary-300 text-sm">Users Referred</p>
            </Card>

            {/* Locked Amount Card */}
            <Card className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-primary-200 text-sm font-medium">Locked</h3>
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-white text-3xl font-bold mb-2">0</p>
              <p className="text-primary-300 text-sm">EQUA Tokens</p>
            </Card>
          </div>

          {/* Feature Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card className="glass-card">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span>📊</span>
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="text-center py-12">
                  <p className="text-primary-300 text-lg">No recent activity</p>
                  <p className="text-primary-400 text-sm mt-2">
                    Your token transactions will appear here
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span>⚡</span>
                Quick Actions
              </h2>
              <div className="space-y-4">
                <a
                  href="/mint"
                  className="block w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-center"
                >
                  🪙 Mint More EQUA
                </a>
                
                <button
                  disabled
                  className="block w-full bg-primary-900/50 text-primary-300 font-semibold py-4 px-6 rounded-xl cursor-not-allowed opacity-50"
                >
                  💸 Transfer Tokens (Coming Soon)
                </button>
                
                <button
                  disabled
                  className="block w-full bg-primary-900/50 text-primary-300 font-semibold py-4 px-6 rounded-xl cursor-not-allowed opacity-50"
                >
                  🎁 Refer Friends (Coming Soon)
                </button>
              </div>
            </Card>
          </div>

          {/* Wallet Info */}
          <div className="mt-8">
            <Card className="glass-card">
              <h3 className="text-white font-semibold mb-4">Wallet Information</h3>
              <div className="bg-primary-900/50 rounded-xl p-4">
                <p className="text-primary-200 text-sm mb-2">Connected Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {publicKey.toBase58()}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
