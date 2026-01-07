'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-purple-200 hover:text-white transition-colors">
                Home
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

      {/* Whitepaper Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-purple-500/30 prose prose-invert prose-purple max-w-none">
            
            {/* Title */}
            <div className="text-center mb-12">
              <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
                <Logo size={80} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                EQUA: A Fair Economy Built on Transparent Rules
              </h1>
              <p className="text-purple-300 text-lg">Last Updated: January 2026</p>
            </div>

            {/* Executive Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Executive Summary</h2>
              <p className="text-purple-200 leading-relaxed">
                EQUA represents a fundamental shift in how digital economies function. Unlike traditional economic systems built on speculation, EQUA is designed as a <strong className="text-white">utility-first token</strong> where value appreciation flows naturally from real use—not manipulation. It&apos;s a system where everyone benefits from participation, not just early speculators.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                In traditional financial systems, people watch their savings lose purchasing power to inflation. With EQUA, the opposite happens: as the ecosystem grows through genuine transactions, token value appreciates. Every action you take—every purchase, every transfer—strengthens the system and rewards those who believe in it.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This whitepaper explains how EQUA creates a fair economic layer on Solana where transparent rules replace hidden incentives, where speculation cannot exploit long-term believers, and where ordinary people can experience real, measurable wealth appreciation from daily participation.
              </p>
            </section>

            {/* Part I */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part I: The Problem with Traditional Systems</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Traditional Value Preservation Struggles</h3>
              <p className="text-purple-200 leading-relaxed">
                In established economies, savers face a persistent challenge: the purchasing power of stored wealth erodes over time. This isn&apos;t a personal failure—it&apos;s a structural reality. Inflation reduces what each unit of currency can buy, regardless of how carefully you manage it.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                For individuals in emerging markets, this challenge intensifies. Wealth stored in local currencies often experiences even sharper erosion, especially during periods of economic uncertainty. The result: people are forced into risky investment strategies simply to preserve what they&apos;ve already earned.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">The Core Issue</strong>: Traditional systems separate transactions from reward mechanisms. You perform economic activities—buying, selling, exchanging value—but receive no direct benefit for the volume and health of the economic network you&apos;re building.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">The Speculation Problem</h3>
              <p className="text-purple-200 leading-relaxed">
                Modern digital assets introduced a troubling pattern: <strong className="text-white">speculation detached from utility</strong>. On centralized exchanges, large holders can manipulate price movements without any corresponding change in the underlying value generated by actual users.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This creates three interconnected problems:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Unfair Distribution</strong>: Early speculators profit disproportionately, not through building the system, but through timing and capital allocation</li>
                <li><strong className="text-white">Volatility Traps</strong>: New users enter at unpredictable prices, lacking mechanisms to understand whether they&apos;re joining at a fair valuation</li>
                <li><strong className="text-white">Expectation Mismatch</strong>: Long-term believers suffer price crashes caused by speculative cycles, despite the platform itself improving steadily</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">EQUA changes this equation entirely.</strong>
              </p>
            </section>

            {/* Part II */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part II: How EQUA Works—A System Built on Use, Not Manipulation</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Core Principle: Appreciation Flows from Real Activity</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s fundamental design principle is elegant: <strong className="text-white">token value appreciation is directly linked to genuine economic activity</strong>. Not speculation. Not manipulation. Real transactions.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every time someone uses EQUA to buy something, sell something, or transfer value, three things happen simultaneously:
              </p>
              <ol className="list-decimal list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Measurable value is created</strong> in the network</li>
                <li><strong className="text-white">Existing token holders benefit</strong> from this activity through appreciation</li>
                <li><strong className="text-white">Future users have clearer price signals</strong> based on actual ecosystem health</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Transaction-Driven Appreciation</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">Transactions are the heartbeat of any economy.</strong> They represent real economic activity—people exchanging goods and services. Traditional systems never reward the actors who create this activity. EQUA does.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                When you make a transaction using EQUA:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>You&apos;re not just trading; you&apos;re contributing to the network&apos;s health</li>
                <li>Your action increases the ecosystem&apos;s transaction volume</li>
                <li>This volume triggers the appreciation mechanism that benefits all holders</li>
                <li>Long-term believers who hold through your transaction benefit directly</li>
              </ul>
            </section>

            {/* Part III */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part III: EQUA as Utility—The Foundation of Fair Value</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Utility Prevents Exploitation</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA is <strong className="text-white">fundamentally designed for buying and selling</strong>—for creating your own ecosystem of commerce and exchange. This utility-first design serves a critical purpose: it makes the token extremely difficult to manipulate.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Speculative Attack Vector Closed</strong>: In pure speculative systems, large holders can flash-crash prices by dumping tokens. In EQUA, this doesn&apos;t have the same devastating effect because:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Users need EQUA to transact, not to speculate</li>
                <li>The utility basis means price crashes create buying opportunities for actual users</li>
                <li>There&apos;s no &quot;escape hatch&quot; for speculators—the token&apos;s purpose is always the same</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Fair Economy Framework: The Technical Foundation</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA achieves this through several structural mechanisms:
              </p>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">1. Eliminated Manual Supply Control</h4>
              <p className="text-purple-200 leading-relaxed">
                Traditional tokens rely on team discretion for minting decisions. EQUA eliminates this entirely. No team can decide to print more tokens. No admin wallet can suddenly mint billions of units to dump on the market.
              </p>
              <p className="text-purple-200 leading-relaxed mt-2">
                <strong className="text-white">Why This Matters</strong>: You don&apos;t have to trust people; you trust code. This trust is verifiable, transparent, and immune to secret changes.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">2. User-Growth-Linked Issuance</h4>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s minting rate naturally slows as adoption increases. This creates <strong className="text-white">organic scarcity</strong>—each new token becomes slightly more valuable as the growth phase progresses.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">3. Referral Merit System (Not Recruitment)</h4>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s referral system is fundamentally different: <strong className="text-white">rewards come only when real value is created.</strong> When someone you refer becomes active and contributes to the network, you receive 1% of their minted allocation—not as tokens handed to you, but as recognition of your contribution to bringing them into the ecosystem.
              </p>
            </section>

            {/* Part IV - Price Appreciation Logic */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV: Price Appreciation Logic—9-Tier Compounding System</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Understanding the Compounding Phase</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s price appreciation follows a structured, transparent mathematical model with two major periods: the <strong className="text-white">compounding phase</strong> and the <strong className="text-white">linear phase</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                During the <strong className="text-white">compounding phase</strong> (Tiers 1-8), EQUA&apos;s value grows exponentially based on transaction volume with a <strong className="text-white">constant 0.01% growth rate</strong>. Each epoch of transactions triggers this percentage increase that compounds on the previous value. This rewards early builders and provides steady, predictable growth during scaling.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The compounding phase is <em>designed</em> to end. Infinite exponential growth would be unsustainable and eventually destructive. Instead, EQUA transitions to linear growth at a predictable point.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">The Linear Phase: When Compounding Ends</h3>
              <p className="text-purple-200 leading-relaxed">
                When EQUA reaches <strong className="text-white">$500,000 in EQX terms</strong> (displayed as approximate USD), the system enters the <strong className="text-white">linear phase</strong> (Tier 9). At this point:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>Compounding stops to prevent runaway appreciation</li>
                <li>Growth becomes linear: $250 per epoch (1,000 transactions)</li>
                <li>A monthly cap of $25,000 ensures stability</li>
                <li>The system maintains sustainable, predictable growth indefinitely</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">This is the terminal price—the point where exponential growth ends and linear, capped growth begins.</strong>
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">The 9-Tier Model in Detail</h3>
              <p className="text-purple-200 leading-relaxed">
                Below is the complete journey from initial growth to perpetual sustainability. <strong className="text-white">All tiers use a constant 0.01% growth rate</strong>, providing predictable and transparent appreciation:
              </p>

              {/* Tier 1 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-green-400 mb-3">Tier 1: Foundation ($0.01 to $0.1)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1 transaction)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$0.01 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$0.1 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 0.01 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Every single transaction counts. Precise appreciation rewards the earliest believers and network builders.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 2 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-teal-400 mb-3">Tier 2: Early Growth ($0.1 to $1)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1 transaction)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$0.1 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$1 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 0.1 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Constant growth rate maintains transparency and fairness as the network gains traction.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 3 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-blue-400 mb-3">Tier 3: Network Scaling ($1 to $10)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~230,270 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (10 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$1 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$10 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 1 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Larger epochs reflect growing transaction volume. Constant growth rate ensures predictability.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 4 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-indigo-400 mb-3">Tier 4: Market Expansion ($10 to $100)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~230,270 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (10 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$10 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$100 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 10 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Network is becoming established. Compounding continues to reward all holders equally.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 5 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-violet-400 mb-3">Tier 5: Early Maturity ($100 to $1k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~2,302,700 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (100 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$100 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$1,000 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 100 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Even larger epochs reflect substantial transaction volume. Constant 0.01% rate ensures fairness.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 6 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-pink-400 mb-3">Tier 6: Strong Adoption ($1k to $10k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~2,302,700 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (100 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$1,000 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$10,000 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 1,000 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Sustained compounding rewards long-term holders. Constant rate maintains transparency.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 7 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-orange-400 mb-3">Tier 7: Mass Market ($10k to $100k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,002 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$10,000 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$100,000 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 10,000 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Large epoch sizes reflect massive transaction volume. Constant 0.01% ensures predictability at scale.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 8 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-red-400 mb-3">Tier 8: Final Compounding ($100k to $500k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~16,095,184 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$100,000 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$500,000 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 100,000 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Final compounding tier before transition. Reaches $500,000 sustainably.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Tier 9 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-purple-400 mb-3">Tier 9: Perpetual Sustainable Growth ($500k+)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Start:</strong> After price reaches ~$500,000 USD</p>
                    <p><strong className="text-white">Mechanism:</strong> 250 EQX per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Monthly Cap:</strong> 25,000 EQX maximum increase</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> Forever growing</p>
                    <p><strong className="text-white">Formula:</strong> Price = 500,000 + (250 × epochs)</p>
                    <p><strong className="text-white">Growth Type:</strong> Linear</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Compounding stops to prevent unsustainable growth. Linear 250 EQX/epoch (0.05% of 500,000 EQX) provides steady appreciation. The 25,000 EQX/month cap ensures stability while maintaining good returns.
                </p>
                <p className="text-xs text-purple-300 mt-2 italic">
                  (Actual pricing in EQX - USD shown for convenience)
                </p>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto mt-8">
                <table className="w-full text-purple-200 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-purple-500/30">
                      <th className="text-left p-3 text-white">Tier</th>
                      <th className="text-left p-3 text-white">Tx/Epoch</th>
                      <th className="text-left p-3 text-white">Growth</th>
                      <th className="text-left p-3 text-white">Price Range (USD equiv.)</th>
                      <th className="text-left p-3 text-white">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">1</td>
                      <td className="p-3">1</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">0.01 → 0.1</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">2</td>
                      <td className="p-3">1</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">0.1 → 1</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">3</td>
                      <td className="p-3">10</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">1 → 10</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">4</td>
                      <td className="p-3">10</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">10 → 100</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">5</td>
                      <td className="p-3">100</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">100 → 1k</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">6</td>
                      <td className="p-3">100</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">1k → 10k</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">7</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">10k → 100k</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">8</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">100k → 500k</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr>
                      <td className="p-3">9</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">250 EQX</td>
                      <td className="p-3">500k → ∞</td>
                      <td className="p-3">Linear</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-purple-200 text-xs mt-2 italic">
                  <strong className="text-white">Note:</strong> All prices denominated in EQX (EQUA Index). USD values shown are approximate equivalents for convenience only. Actual pricing uses EQX, which is a diversified basket of 7 components (57% currencies, 35% gold, 8% oil). The on-chain oracle updates EQX/USD exchange rates every 4 hours.
                </p>
              </div>

              {/* EQX vs USD Clarification */}
              <div className="bg-yellow-500/10 rounded-xl p-6 mt-8 border border-yellow-500/30">
                <h4 className="text-lg font-bold text-yellow-400 mb-3">⚠️ Important: EQX vs USD</h4>
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">All price appreciation is calculated in EQX (EQUA Index), not USD.</strong> EQX is a diversified basket of 7 components: 57% major currencies, 35% gold, and 8% oil. The USD values shown throughout this whitepaper are <strong className="text-white">approximate equivalents for convenience only</strong>—actual pricing on-chain is denominated in EQX.
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  This means that when the whitepaper says &quot;Tier 1: $0.01 to $0.1,&quot; it actually means <strong className="text-white">&quot;0.01 to 0.1 EQX&quot;</strong>, with USD values calculated dynamically based on the current EQX/USD exchange rate (updated every 4 hours from Hermes/Pyth price feeds).
                </p>
                <p className="text-purple-200 leading-relaxed mt-3 italic">
                  <strong className="text-white">Why this matters:</strong> EQX provides inflation resistance and stability by spreading risk across multiple global anchors. Your EQUA holdings appreciate in EQX terms—USD is just one of many components affecting EQX&apos;s value.
                </p>
              </div>
            </section>

            {/* Part V - EQX Pricing Model */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V: EQX—The True Pricing Foundation</h2>
              
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s value is not denominated in US dollars. Instead, it is measured in <strong className="text-white">EQX (EQUA Index)</strong>—a diversified basket of major currencies, gold, and essential commodities. USD is shown only as a <strong className="text-white">display convenience</strong>, not as the underlying pricing anchor.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This fundamental design choice means EQUA holders are not forced to trust the fate of any one government, central bank, or market. Your value is spread across the real world economy.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why EQX Matters</h3>
              <p className="text-purple-200 leading-relaxed">
                People don&apos;t live in abstract charts; they live in rent, groceries, school fees, and medicines. When a single currency weakens, it quietly steals from all of those things at once. If EQUA&apos;s value were tied only to USD, anyone saving in EQUA would still be exposed to the long, slow erosion of that one currency&apos;s purchasing power.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">EQX changes that</strong>: it spreads risk across multiple real-world anchors so that your effort today still means something tomorrow, even if one nation&apos;s money stumbles.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What EQX Is</h3>
              <p className="text-purple-200 leading-relaxed">
                EQX (EQUA Index) is a weighted reference basket composed of:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Widely used global currencies</strong> (USD, EUR, CNY, JPY, GBP) - 57% weight</li>
                <li><strong className="text-white">Gold (XAU/USD)</strong> - 35% weight, serving as a long-term store of value across civilizations</li>
                <li><strong className="text-white">Essential energy commodity</strong> (Oil/WTI) - 8% weight, tracking energy costs that affect all economic activity</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">7-Component Design:</strong> The basket was optimized from 10 to 7 components in January 2026 to improve oracle efficiency while maintaining robust diversification across currencies, precious metals, and commodities.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA does not require users to hold these assets directly. Instead, the system uses EQX as a <strong className="text-white">pricing lens</strong>: when the protocol calculates EQUA&apos;s fair value, it references this basket rather than any single currency.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">USD values displayed in the interface are for convenience only.</strong> They help you understand how much buying power you have in common terms, but they are <em>not</em> the actual pricing mechanism. The underlying value is always denominated in EQX.
              </p>

              {/* EQX Basket Composition */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-yellow-400 mb-4">EQX (EQUA Index) Basket Composition (7 Components)</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                    <h5 className="text-blue-300 font-semibold mb-2">Currencies (57%)</h5>
                    <ul className="text-purple-200 text-sm space-y-1">
                      <li>USD/USD: 23%</li>
                      <li>USD/EUR: 17%</li>
                      <li>USD/CNY: 9%</li>
                      <li>USD/JPY: 5%</li>
                      <li>USD/GBP: 3%</li>
                    </ul>
                    <p className="text-blue-200 text-xs mt-2">Major global currencies</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                    <h5 className="text-yellow-300 font-semibold mb-2">Gold (35%)</h5>
                    <ul className="text-purple-200 text-sm space-y-1">
                      <li>XAU/USD (Gold): 35%</li>
                    </ul>
                    <p className="text-yellow-200 text-xs mt-2">Long-term store of value across civilizations</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                    <h5 className="text-green-300 font-semibold mb-2">Commodities (8%)</h5>
                    <ul className="text-purple-200 text-sm space-y-1">
                      <li>Oil (WTI): 8%</li>
                    </ul>
                    <p className="text-green-200 text-xs mt-2">Essential energy commodity</p>
                  </div>
                </div>
                <p className="text-purple-300 text-sm mt-4 italic">
                  <strong className="text-white">Updated Jan 2026:</strong> EQX basket optimized to 7 components for oracle efficiency while maintaining diversification. Weights sum to 100% (verified on-chain).
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Stability, Inflation Resistance, and Non-Speculative Intent</h3>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Stability Across Economic Shocks</h4>
              <p className="text-purple-200 leading-relaxed">
                When USD loses value, EQX does not fall as fast because other components—gold, other currencies, and commodities—may stay stable or even rise. That means EQUA&apos;s reference value stays closer to what real people actually need to buy in their lives, instead of following the dollar down.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Inflation Resistance Built In</h4>
              <p className="text-purple-200 leading-relaxed">
                In many countries, people are hit twice: their local currency weakens, and their savings in a &quot;strong&quot; foreign currency can also be eroded by inflation in that foreign country. By anchoring EQUA&apos;s value to EQX—a blend of global value signals—the system reduces the chance that one political decision or one central bank&apos;s policy quietly eats away years of someone&apos;s work.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Designed Against Speculation</h4>
              <p className="text-purple-200 leading-relaxed">
                Because EQX includes both money (currencies) and things people ultimately care about (gold and key commodities), EQUA stays more aligned with the cost of real life—food, energy, safety—rather than just financial market noise. <strong className="text-white">EQUA is not designed for speculative trading.</strong> It is designed for people who want their daily participation to protect and grow their purchasing power.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How EQX Works with EQUA&apos;s Transaction-Based Appreciation</h3>
              <p className="text-purple-200 leading-relaxed">
                EQX does not replace EQUA&apos;s transaction-based appreciation; <strong className="text-white">it anchors it</strong>.
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>The price growth rules (driven by number of transactions and epochs) still determine how EQUA appreciates as the network is used.</li>
                <li>EQX acts as an underlying &quot;reality check&quot;: if a single currency in the basket is inflating away, the other components help keep EQUA&apos;s reference tied to a more honest picture of global value.</li>
                <li>You see USD values for convenience, but the actual appreciation happens in EQX terms.</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">For users, this means:</strong>
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>The more EQUA is used, the more it appreciates in EQX terms.</li>
                <li>The more the world changes, the more EQX helps EQUA stay connected to what actually matters—what your money can buy.</li>
                <li>USD is just one component of many, and you are never at the mercy of USD alone.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What This Means for Ordinary People</h3>
              <div className="space-y-4 mt-4">
                <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-purple-200">
                    <strong className="text-white">For a shopkeeper in a small town:</strong> &quot;If my local currency or the dollar goes crazy, EQUA is not chained to that alone. My value is spread across the global economy.&quot;
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-purple-200">
                    <strong className="text-white">For a family saving for their children:</strong> &quot;I am not betting everything on one country&apos;s promise. My effort is anchored to a mix of real-world value.&quot;
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-purple-200">
                    <strong className="text-white">For someone who has seen bank failures, devaluations, or sudden capital controls:</strong> &quot;At least one part of my life is built on transparent rules and a basket of real value, not on panic decisions made overnight.&quot;
                  </p>
                </div>
              </div>

              <p className="text-purple-200 leading-relaxed mt-6 border-l-4 border-purple-500 pl-4 italic">
                EQUA was always designed to reward real participation and protect believers from speculation. EQX extends that same protection to the world beyond crypto: it recognizes that people don&apos;t just need a fair system inside the chain—they need protection from the unfairness outside it too.
              </p>
            </section>

            {/* Part V.5 - Social Purpose Accounts */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V.5: Social Purpose Accounts—Generosity Through Restraint</h2>
              
              <p className="text-purple-200 leading-relaxed">
                EQUA is designed to create value for everyone—not just token holders. Once the terminal phase is reached and price growth stabilizes, the protocol activates <strong className="text-white">five social purpose accounts</strong> that distribute EQUA monthly to support education, healthcare, research, grants, and operations.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Critical timing:</strong> These distributions activate <em>only after</em> the compounding phase completes (76,269,935 peer-to-peer transactions, when EQUA reaches $500,000 in EQX terms). This ensures early holders and builders are not diluted during the compounding growth phase.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Delayed Activation?</h3>
              <p className="text-purple-200 leading-relaxed">
                Many projects promise generosity from day one, then fail to deliver because they dilute their own value before it has time to grow. EQUA takes the opposite approach: <strong className="text-white">patience first, generosity second</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                By waiting until the terminal phase, EQUA ensures:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>The token has reached substantial value before any social distributions begin</li>
                <li>Early believers who took the risk are rewarded without dilution</li>
                <li>Social distributions come from a position of strength, not desperation</li>
                <li>Each EQUA distributed has real purchasing power to make a difference</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">The Five Social Purpose Accounts</h3>
              
              {/* Education Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-blue-500/30">
                <h4 className="text-lg font-bold text-blue-400 mb-3">1. Education Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Support scholarships, learning materials, and educational infrastructure</p>
                    <p className="mt-2"><strong className="text-white">Monthly Allocation:</strong> 100 EQUA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">A steady, predictable stream allows schools and students to plan. Flooding the system with tokens would create dependency and chaos, not opportunity.</p>
                  </div>
                </div>
              </div>

              {/* Healthcare Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-green-500/30">
                <h4 className="text-lg font-bold text-green-400 mb-3">2. Healthcare Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Fund medical care, medicines, and health clinics in underserved communities</p>
                    <p className="mt-2"><strong className="text-white">Monthly Allocation:</strong> 100 EQUA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">Healthcare needs discipline and long-term commitment. A measured approach ensures funds reach those who need them most, not just those who ask loudest.</p>
                  </div>
                </div>
              </div>

              {/* Research & Development Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/30">
                <h4 className="text-lg font-bold text-purple-400 mb-3">3. Research & Development Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Support open research, protocol improvements, and technological innovation</p>
                    <p className="mt-2"><strong className="text-white">Monthly Allocation:</strong> 100 EQUA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">Good research takes time. Smaller allocations filter for serious projects and prevent waste on trendy experiments that won&apos;t last.</p>
                  </div>
                </div>
              </div>

              {/* General Grants Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-yellow-500/30">
                <h4 className="text-lg font-bold text-yellow-400 mb-3">4. General Grants Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Support community projects, local businesses, and public goods initiatives</p>
                    <p className="mt-2"><strong className="text-white">Monthly Allocation:</strong> 100 EQUA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">Scarcity drives quality. Limited grants mean applicants must demonstrate real value, not just good intentions.</p>
                  </div>
                </div>
              </div>

              {/* Operations Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-teal-500/30">
                <h4 className="text-lg font-bold text-teal-400 mb-3">5. Operations Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Maintain infrastructure, pay for audits, and ensure protocol sustainability</p>
                    <p className="mt-2"><strong className="text-white">Monthly Allocation:</strong> 1 EQUA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">Lean operations stay focused. Excess funding breeds bloat and inefficiency. A tight budget forces discipline and clear priorities.</p>
                  </div>
                </div>
              </div>

              <p className="text-purple-200 leading-relaxed mt-6 border-l-4 border-purple-500 pl-4 italic">
                <strong className="text-white">Total Monthly Distribution: 401 EQUA</strong> across all five accounts. By terminal phase, each EQUA has substantial value, making even these constrained allocations meaningful for real-world impact.
              </p>
            </section>

            {/* Part V.6 - Monthly Distribution Safety */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V.6: Monthly Distribution Safety—Predictability Over Speed</h2>
              
              <p className="text-purple-200 leading-relaxed">
                Social purpose distributions occur <strong className="text-white">exactly once per calendar month</strong>. Not daily. Not per transaction. Not based on volume. Once per month, on a predictable schedule.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Monthly, Not More Frequent?</h3>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">1. Predictability for Recipients</h4>
              <p className="text-purple-200 leading-relaxed">
                A school planning a scholarship program or a clinic ordering medicines needs to know <em>when</em> funds arrive. Monthly cadence allows organizations to plan, budget, and deliver real outcomes.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">2. Auditability for All</h4>
              <p className="text-purple-200 leading-relaxed">
                Monthly distributions are easy to track, verify, and audit. Anyone can check that funds went to the right places. High-frequency distributions create noise that hides manipulation.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">3. Abuse Resistance</h4>
              <p className="text-purple-200 leading-relaxed">
                Volume-based or high-frequency distributions create incentives to game the system—fake transactions, wash trading, and extraction schemes. Monthly caps eliminate these attack vectors.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What We Explicitly Reject</h3>
              <div className="bg-red-500/10 rounded-xl p-6 mt-4 border border-red-500/30">
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li><strong className="text-white">High-frequency grants</strong>: Create complexity and manipulation opportunities</li>
                  <li><strong className="text-white">Volume-based distributions</strong>: Reward noise and spam, not genuine need</li>
                  <li><strong className="text-white">Uncapped generosity</strong>: Dilutes value and undermines sustainability</li>
                  <li><strong className="text-white">Speculative extraction</strong>: EQUA funds are for use, not for trading schemes</li>
                </ul>
              </div>

              <p className="text-purple-200 leading-relaxed mt-6 border-l-4 border-purple-500 pl-4 italic">
                Restraint is not cruelty. It is the foundation of fairness. By limiting distributions to monthly cadence and fixed amounts, EQUA ensures that generosity is sustainable, auditable, and immune to exploitation.
              </p>
            </section>

            {/* Part VI */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VI: How EQUA Protects Against Exploitation</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Immutable Fairness Through Code</h3>
              <p className="text-purple-200 leading-relaxed">
                One of EQUA&apos;s most powerful features is that its fairness is <strong className="text-white">not dependent on people keeping promises</strong>—it&apos;s encoded in mathematics.
              </p>
              
              <ul className="list-disc list-inside text-purple-200 space-y-3 mt-4">
                <li><strong className="text-white">No Team Minting</strong>: Every token entering circulation follows transparent rules. There&apos;s no admin wallet that can secretly print tokens.</li>
                <li><strong className="text-white">Algorithmic Scarcity</strong>: As adoption grows, the rate at which new tokens are created decreases. This is a mathematical certainty built into the contract.</li>
                <li><strong className="text-white">Transaction-Based Appreciation</strong>: Price appreciation isn&apos;t driven by marketing hype or speculative enthusiasm. It&apos;s directly tied to actual economic activity.</li>
              </ul>
            </section>

            {/* Part VII - Philosophy & Values */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VII: Philosophy & Values—Restraint Over Excess</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why EQUA Prioritizes Restraint</h3>
              <p className="text-purple-200 leading-relaxed">
                The world is full of promises of abundance: unlimited growth, endless rewards, instant riches. EQUA rejects this illusion.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Restraint is not limitation—it is discipline.</strong> By imposing clear boundaries on minting, distributions, and growth, EQUA creates a system that can last for generations, not just cycles of hype and collapse.
              </p>
              
              <h4 className="text-lg font-semibold text-white mt-6 mb-2">Restraint in Minting</h4>
              <p className="text-purple-200 leading-relaxed">
                Every new EQUA token must be earned through participation, not printed by a team. Algorithmic scarcity ensures that as the network grows, each token becomes more valuable—not diluted.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Restraint in Social Distributions</h4>
              <p className="text-purple-200 leading-relaxed">
                EQUA waits until the terminal phase to activate social purpose accounts. This patience ensures that when generosity begins, it comes from a position of strength and each EQUA distributed has real purchasing power to change lives.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Restraint in Growth</h4>
              <p className="text-purple-200 leading-relaxed">
                Tier 9 caps price growth at $25,000 per month. This prevents runaway speculation and keeps EQUA grounded in sustainable, predictable appreciation—not casino-like volatility.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Delayed Generosity Leads to Broader, Fairer Impact</h3>
              <p className="text-purple-200 leading-relaxed">
                Many projects promise to change the world from day one. They distribute tokens freely, create dependencies, and collapse when the well runs dry.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA takes the opposite path: <strong className="text-white">build value first, distribute generosity second.</strong>
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Early holders are rewarded</strong> for taking the risk during the compounding phase</li>
                <li><strong className="text-white">Social purpose accounts activate</strong> only when each EQUA has substantial value</li>
                <li><strong className="text-white">Monthly distributions are constrained</strong> to prevent dependency and abuse</li>
                <li><strong className="text-white">The system remains sustainable</strong> for decades, not just years</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                By delaying generosity until the system is strong, EQUA ensures that when help arrives, it is <em>meaningful</em>. A scholarship funded by 100 EQUA at $500,000 value is worth $50 million in purchasing power—life-changing for a student, sustainable for the network.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">EQUA Is Not Designed for Speculation or Extraction</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">Let this be clear:</strong> EQUA is not a get-rich-quick scheme. It is not designed for day traders, pump-and-dump schemes, or speculative extraction.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA is designed for:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">People who use it</strong> to buy and sell goods and services</li>
                <li><strong className="text-white">People who believe in it</strong> and hold through growth phases</li>
                <li><strong className="text-white">People who build with it</strong> and contribute to the ecosystem</li>
                <li><strong className="text-white">Communities who benefit from it</strong> through education, healthcare, and grants</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                If you are looking for quick profits or trading volatility, EQUA is not for you. If you are looking for dignity, fairness, and long-term thinking, you are in the right place.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Economic Empowerment Through Participation</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s true mission is to <strong className="text-white">align individual prosperity with network health</strong>. When you hold EQUA, you want the same thing as everyone else: for the network to grow, for transactions to increase, for adoption to expand.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This is not a zero-sum game where one person&apos;s gain is another&apos;s loss. This is a system where <strong className="text-white">everyone wins when the network thrives</strong>.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Equal Access, Equal Opportunity, Equal Economy</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s narrative emerges from a simple observation: <strong className="text-white">most people never get early access to systems that create wealth.</strong> By the time an opportunity becomes widely known, most of the compounding benefit has already happened.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA changes this:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Equal Access</strong>: Anyone with a Solana wallet can join, anytime</li>
                <li><strong className="text-white">Transparent Rules</strong>: Every mechanism is auditable; there are no secret advantages</li>
                <li><strong className="text-white">Fair Participation</strong>: Your reward for believing early is meaningful, but newer participants aren&apos;t left to fight over scraps</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4 border-l-4 border-purple-500 pl-4 italic">
                EQUA is built on the belief that restraint, patience, and fairness create systems that last. Excess, hype, and speculation create cycles of boom and bust. We choose the long road because it leads somewhere real.
              </p>
            </section>

            {/* Part VIII - Technical Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VIII: Technical Summary</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">For the Technically Curious</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA operates on Solana with the following specifications:
              </p>
              
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Smart Contract Architecture:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Global state tracking: transaction counts, user counts, current phase</li>
                  <li>User accounts: minting history, referral tracking</li>
                  <li>Deterministic price calculation based on transaction volume and current phase</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Token Economics:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Variable minting rate tied to user adoption</li>
                  <li>Utility-first design: use EQUA to buy and sell goods and services</li>
                  <li>Referral rewards at 1% of new user allocation (merit-based)</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Solana Benefits:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Sub-second finality: transactions complete instantly</li>
                  <li>Near-zero fees: transactions cost &lt;$0.001</li>
                  <li>Scalability: millions of transactions per second capacity</li>
                  <li>Accessibility: anyone with a browser can participate</li>
                </ul>
              </div>
            </section>

            {/* Conclusion */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Conclusion: The Choice Before You</h2>
              <p className="text-purple-200 leading-relaxed">
                Traditional systems will always create wealth for some and struggle for others. They&apos;re built that way.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA offers something different: <strong className="text-white">a system where individual prosperity and collective progress move together.</strong> Where appreciation isn&apos;t zero-sum. Where early believers are rewarded, and late participants aren&apos;t exploited.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This doesn&apos;t require you to believe in cryptographic revolution or blockchain ideology. It just requires you to believe that:
              </p>
              <ol className="list-decimal list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Transparent rules beat hidden incentives</strong></li>
                <li><strong className="text-white">Shared prosperity outperforms predatory competition</strong></li>
                <li><strong className="text-white">Genuine use creates real value</strong></li>
              </ol>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA embodies these beliefs. Whether you&apos;re early or late, wealthy or building wealth, skeptical or enthusiastic—there&apos;s a role for you in this ecosystem.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4 italic">
                The economy you build tomorrow depends on the systems you choose today.
              </p>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-purple-500/30">
              <p className="text-2xl font-bold text-white mb-2">EQUA</p>
              <p className="text-purple-300">Equal Access. Equal Opportunity. Equal Economy.</p>
              <p className="text-purple-400 text-sm mt-4">Last Updated: January 2026</p>
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-8 text-center">
            <Link
              href="/mint"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
            >
              Get Started with EQUA →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
