'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">UNIA Token</h1>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-purple-200 hover:text-white transition-colors">
                Home
              </Link>
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
              <Link href="/mint" className="text-purple-200 hover:text-white transition-colors">
                Mint
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* About Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-purple-500/30 prose prose-invert prose-purple max-w-none">
            
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
                <Logo size={80} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                About UNIA
              </h1>
              <p className="text-purple-300 text-lg">Building a Fair Economic Layer on Solana</p>
            </div>

            {/* Mission Statement */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Our Mission</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What is UNIA?</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA is a <strong className="text-white">utility-first token</strong> built on the Solana blockchain that creates a fair economic system where value appreciation flows from real use, not speculation or manipulation. Unlike traditional tokens designed for trading, UNIA is fundamentally designed for buying and selling goods and services—creating a genuine economy where everyone benefits from participation.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why We Built UNIA</h3>
              <p className="text-purple-200 leading-relaxed">
                In traditional financial systems, people watch their savings lose purchasing power to inflation. With UNIA, the opposite happens: as the ecosystem grows through genuine transactions, token value appreciates. Every action you take—every purchase, every transfer—strengthens the system and rewards those who believe in it.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                We built UNIA to solve a fundamental problem: most people never get early access to systems that create wealth. By the time an opportunity becomes widely known, most of the compounding benefit has already happened. UNIA changes this with transparent rules and equal access for everyone.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Core Principles</h3>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Fairness</strong>: Equal access and transparent rules mean no hidden advantages or secret manipulations</li>
                <li><strong className="text-white">Transparency</strong>: Every mechanism is auditable on-chain; trust code, not people</li>
                <li><strong className="text-white">Utility-First</strong>: Designed for real economic activity—buying, selling, and exchanging value—not speculation</li>
                <li><strong className="text-white">Restraint Over Excess</strong>: Disciplined growth and controlled distributions ensure long-term sustainability</li>
              </ul>
            </section>

            {/* How It Works */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">How It Works</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Token Mechanics Overview</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA&apos;s fundamental design principle is elegant: <strong className="text-white">token value appreciation is directly linked to genuine economic activity</strong>. Every time someone uses UNIA to buy something, sell something, or transfer value, the entire network benefits through measurable price appreciation.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Minting Tiers and Referral System</h3>
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">User-Based Minting Tiers</h4>
                <p className="text-purple-200 leading-relaxed mb-3">
                  UNIA rewards early believers with elevated minting rates that decrease as adoption grows, creating organic scarcity:
                </p>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li><strong className="text-white">User #1:</strong> 100,000 UNIA per attempt × 100 attempts</li>
                  <li><strong className="text-white">Users #2-10:</strong> 10,000 UNIA per attempt × 100 attempts</li>
                  <li><strong className="text-white">Users #11-100:</strong> 1,000 UNIA per attempt × 100 attempts</li>
                  <li><strong className="text-white">Users #101-1,000:</strong> 100 UNIA per attempt</li>
                  <li><strong className="text-white">Users #1,001-10,000:</strong> 10 UNIA per attempt</li>
                  <li><strong className="text-white">Users #10,001+:</strong> Progressively decreasing rates (1 UNIA → 0.1 UNIA → 0.01 UNIA → 0.001 UNIA → 0.0005 UNIA)</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Referral Rewards (Credit-Based System)</h4>
                <p className="text-purple-200 leading-relaxed">
                  UNIA&apos;s referral system rewards network growth through a merit-based credit system. When someone you refer successfully registers and joins the ecosystem, you earn <strong className="text-white">referral credits</strong> based on their account type:
                </p>
                
                <div className="bg-purple-500/10 rounded-lg p-4 mt-3 border border-purple-500/20">
                  <ul className="space-y-2 text-purple-200">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 font-bold">✓</span>
                      <span><strong className="text-white">Individual Referral:</strong> 1 referral credit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 font-bold">✓</span>
                      <span><strong className="text-white">Business Referral:</strong> 2 referral credits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold">🎁</span>
                      <span><strong className="text-white">Redemption:</strong> Accumulate 5 credits to unlock 1 bonus minting attempt using your current tier&apos;s mint rate</span>
                    </li>
                  </ul>
                </div>
                
                <p className="text-purple-200 leading-relaxed mt-3">
                  This credit-based approach maintains token scarcity while recognizing your contribution to ecosystem growth. Credits are awarded on successful registration and can be redeemed for bonus minting opportunities.
                </p>
                
                <p className="text-purple-200 leading-relaxed mt-3">
                  <strong className="text-white">First 100 users:</strong> Referral optional<br />
                  <strong className="text-white">User 101+:</strong> Referral required for registration
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Price Appreciation Mechanism</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA uses a <strong className="text-white">9-tier compounding price model</strong> with transparent, predictable growth:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Tiers 1-8 (Compounding Phase):</strong> Constant 0.01% growth rate per epoch, compounding on the previous value. Price starts at $0.01 and grows to $500,000 based on transaction volume.</li>
                <li><strong className="text-white">Tier 9 (Linear Phase):</strong> Once UNIA reaches $500,000 in UNX terms, growth becomes linear at $250 per epoch (1,000 transactions) with a monthly cap of $25,000 to ensure sustainable, predictable growth indefinitely.</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Important:</strong> All pricing is denominated in <strong className="text-white">UNX (UNIA Index)</strong>—a diversified basket of currencies (57%), gold (35%), and oil (8%). USD values shown are for convenience only. This protects users from single-currency inflation and economic shocks.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">EQX Basket Oracle</h3>
              <p className="text-purple-200 leading-relaxed">
                The UNX oracle updates every 4 hours using Hermes/Pyth price feeds, ensuring UNIA&apos;s value stays anchored to real-world economic conditions, not just one nation&apos;s monetary policy. This provides inflation resistance and stability across global economic shocks.
              </p>
            </section>

            {/* Technology */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Technology</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Built on Solana Blockchain</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA leverages Solana&apos;s industry-leading performance and low costs to make blockchain accessible to everyone:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Sub-second finality:</strong> Transactions complete instantly</li>
                <li><strong className="text-white">Near-zero fees:</strong> Transactions cost less than $0.001</li>
                <li><strong className="text-white">Massive scalability:</strong> Millions of transactions per second capacity</li>
                <li><strong className="text-white">Global accessibility:</strong> Anyone with a browser can participate</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">SPL Token-2022 (Token Extensions)</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA uses the latest SPL Token-2022 standard, enabling advanced features like transfer hooks, permanent delegates, and custom metadata that make our utility-first design possible. This is <strong className="text-white">not the standard SPL Token</strong>—it&apos;s the next generation of token infrastructure on Solana.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Anchor Framework</h3>
              <p className="text-purple-200 leading-relaxed">
                Our smart contracts are built with Anchor, Solana&apos;s leading framework for secure and efficient program development. This ensures our code is auditable, maintainable, and follows industry best practices for security and reliability.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Devnet vs Mainnet Status</h3>
              <div className="bg-yellow-500/10 rounded-xl p-6 mt-4 border border-yellow-500/30">
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-yellow-400">Current Status: Solana Devnet</strong>
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  UNIA is currently deployed on Solana Devnet for testing and community validation. This allows us to refine the mechanics, gather feedback, and ensure everything works flawlessly before mainnet launch.
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  <strong className="text-white">Program ID (Devnet):</strong> <code className="text-purple-300 text-sm">B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2</code>
                </p>
              </div>
            </section>

            {/* Team & Vision */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Team &amp; Vision</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Project Goals</h3>
              <p className="text-purple-200 leading-relaxed">
                Our mission is to create an economic system where <strong className="text-white">individual prosperity and collective progress move together</strong>. We believe that:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Transparent rules beat hidden incentives</strong></li>
                <li><strong className="text-white">Shared prosperity outperforms predatory competition</strong></li>
                <li><strong className="text-white">Genuine use creates real value</strong></li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Community-Driven Development</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIA is built <strong className="text-white">by the community, for the community</strong>. We actively listen to feedback, iterate on improvements, and ensure that every decision serves the long-term health of the ecosystem. Your voice matters—participate in discussions, suggest features, and help shape UNIA&apos;s future.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Open Source Commitment</h3>
              <p className="text-purple-200 leading-relaxed">
                All of UNIA&apos;s code is open source and available for review, audit, and contribution. Transparency isn&apos;t just a principle—it&apos;s how we build trust.
              </p>
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">GitHub Repository:</strong><br />
                  <a 
                    href="https://github.com/brainstorm4x/EQUA" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 underline"
                  >
                    https://github.com/brainstorm4x/EQUA
                  </a>
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  <strong className="text-white">Frontend Repository:</strong><br />
                  <a 
                    href="https://github.com/brainstorm4x/EQUA-FRONTEND" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 underline"
                  >
                    https://github.com/brainstorm4x/EQUA-FRONTEND
                  </a>
                </p>
              </div>
            </section>

            {/* Get Started CTA */}
            <section className="mb-8">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-8 border border-purple-500/30 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
                <p className="text-purple-200 text-lg leading-relaxed mb-6">
                  Join the UNIA ecosystem today and be part of building a fairer economic future.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link
                    href="/mint"
                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
                  >
                    Start Minting UNIA →
                  </Link>
                  <Link
                    href="/whitepaper"
                    className="inline-block bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg backdrop-blur-sm"
                  >
                    Read Full Whitepaper
                  </Link>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-purple-500/30">
              <p className="text-2xl font-bold text-white mb-2">UNIA</p>
              <p className="text-purple-300">Equal Access. Equal Opportunity. Equal Economy.</p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
