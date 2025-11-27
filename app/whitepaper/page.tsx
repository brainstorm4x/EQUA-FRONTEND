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
              <p className="text-purple-300 text-lg">Last Updated: November 2025</p>
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
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV: Price Appreciation Logic—What to Expect</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Understanding EQUA&apos;s Three-Phase Model</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s price appreciation follows a structured, transparent mathematical model designed to reward early builders, provide steady growth during scaling, and maintain sustainable value increases indefinitely.
              </p>

              {/* Phase 1 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-green-400 mb-3">Phase 1: Rapid Early Growth (Building Foundation)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~921,500 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.1% per epoch (100 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> $0.01</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> $100</p>
                    <p><strong className="text-white">Formula:</strong> Price = $0.01 × (1.001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Early network builders take genuine risk; rapid appreciation rewards this commitment. Frequent small increases (every 100 transactions) mean appreciation is steady and visible.
                </p>
              </div>

              {/* Phase 2 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-blue-400 mb-3">Phase 2: Steady Growth (Network Scaling)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Start:</strong> After price reaches $100</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> $100</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> $200,000</p>
                    <p><strong className="text-white">Formula:</strong> Price = $100 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> As the network scales, 0.01% per 1,000 transactions provides steady, predictable growth. Compounding continues but at a slower rate, preventing explosive volatility.
                </p>
              </div>

              {/* Phase 3 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-purple-400 mb-3">Phase 3: Perpetual Sustainable Growth (Forever Appreciation)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Start:</strong> After price reaches $200,000</p>
                    <p><strong className="text-white">Mechanism:</strong> $100 per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Monthly Cap:</strong> $25,000 maximum increase</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> Forever growing</p>
                    <p><strong className="text-white">Formula:</strong> Price = $200,000 + ($100 × epochs)</p>
                    <p><strong className="text-white">Growth Type:</strong> Linear</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> At extreme valuations, compounding becomes mathematically unsustainable. Linear growth ($100 per 1,000 transactions) is still powerful: approximately 12% annual appreciation. The $25,000/month cap prevents runaway price increases while ensuring steady, predictable growth.
                </p>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto mt-8">
                <table className="w-full text-purple-200 border-collapse">
                  <thead>
                    <tr className="border-b border-purple-500/30">
                      <th className="text-left p-3 text-white">Aspect</th>
                      <th className="text-left p-3 text-white">Phase 1</th>
                      <th className="text-left p-3 text-white">Phase 2</th>
                      <th className="text-left p-3 text-white">Phase 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3 font-semibold">Tx per Epoch</td>
                      <td className="p-3">100</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">1,000</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3 font-semibold">Growth per Epoch</td>
                      <td className="p-3">0.1% (compound)</td>
                      <td className="p-3">0.01% (compound)</td>
                      <td className="p-3">$100 (linear)</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3 font-semibold">Price Range</td>
                      <td className="p-3">$0.01 → $100</td>
                      <td className="p-3">$100 → $200,000</td>
                      <td className="p-3">$200,000 → ∞</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Best for</td>
                      <td className="p-3">Early believers</td>
                      <td className="p-3">Growing network</td>
                      <td className="p-3">Long-term holders</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Part V */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V: How EQUA Protects Against Exploitation</h2>
              
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

            {/* Part VI */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VI: The Deeper Vision—A Fair Economy</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Economic Empowerment Through Participation</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA&apos;s true mission isn&apos;t to make certain people rich quickly. It&apos;s to <strong className="text-white">align individual prosperity with network health</strong>. When you hold EQUA, you want the same thing as everyone else: for the network to grow, for transactions to increase, for adoption to expand.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Equal Access, Equal Opportunity, Equal Economy</h3>
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
            </section>

            {/* Part VII - Technical Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VII: Technical Summary</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">For the Technically Curious</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA operates on Solana with the following specifications:
              </p>
              
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Smart Contract Architecture:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Global state tracking: transaction counts, user counts, current phase</li>
                  <li>User accounts: minting history, referral tracking, lock mechanisms</li>
                  <li>Deterministic price calculation based on transaction volume and current phase</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Token Economics:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Variable minting rate tied to user adoption</li>
                  <li>Time-based locks for early participants (anti-exploitation)</li>
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
              <p className="text-purple-400 text-sm mt-4">Last Updated: November 2025</p>
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
