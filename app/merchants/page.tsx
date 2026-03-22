'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function MerchantsPage() {
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

      {/* Merchants Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-purple-500/30 prose prose-invert prose-purple max-w-none">
            
            {/* Title */}
            <div className="text-center mb-12">
              <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
                <span className="text-6xl">🏪</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Message for Merchants
              </h1>
              <p className="text-purple-300 text-xl">
                Why Should You Accept UNIA—Even Just Once a Day?
              </p>
            </div>

            {/* Smart Businesses Section */}
            <section className="mb-10">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
                <h2 className="text-2xl font-bold text-yellow-400 mb-3 flex items-center gap-3">
                  <span className="text-3xl">💡</span>
                  Smart Businesses Are Future-Proof Businesses
                </h2>
                <p className="text-purple-200 leading-relaxed text-lg">
                  Every new financial technology started with &quot;just one customer.&quot;
                  UNIA lets you be early, with zero risk required.
                </p>
              </div>
            </section>

            {/* Small Change Section */}
            <section className="mb-10">
              <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="text-3xl">🌐</span>
                  Small Change, Big Opportunity
                </h2>
                <p className="text-purple-200 leading-relaxed">
                  Just one UNIA payment a day connects your shop to a global, digital network—without you needing to change how you do business.
                </p>
                <p className="text-purple-200 leading-relaxed mt-4 bg-purple-500/20 p-4 rounded-lg">
                  <strong className="text-white">The first time you accept UNIA, you&apos;re not just getting paid:</strong> you&apos;re opening a gateway to new customers, new markets, and new rewards.
                </p>
              </div>
            </section>

            {/* Appreciation Section */}
            <section className="mb-10">
              <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-xl p-6 border border-green-500/30">
                <h2 className="text-2xl font-bold text-green-400 mb-3 flex items-center gap-3">
                  <span className="text-3xl">📈</span>
                  Appreciation That Works for You
                </h2>
                <p className="text-purple-200 leading-relaxed">
                  With UNIA, every transaction helps the entire system grow—including what you hold.
                </p>
                <p className="text-purple-200 leading-relaxed mt-4">
                  <strong className="text-white">Your first UNIA could be your foot in the door</strong> for potential appreciation as the network increases activity.
                </p>
                <p className="text-green-300 text-sm mt-4 italic">
                  (More real transactions = more value for everyone—including you.)
                </p>
              </div>
            </section>

            {/* Build Loyalty Section */}
            <section className="mb-10">
              <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="text-3xl">🤝</span>
                  Build Loyalty and Community
                </h2>
                <ul className="list-none space-y-3 text-purple-200">
                  <li className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Show your customers you&apos;re innovative and welcoming to new payment methods—earning their trust and standing out from competitors.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <span>Get listed on local &quot;UNIA-friendly&quot; maps and discoverability engines.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* No Pressure Section */}
            <section className="mb-10">
              <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl p-6 border border-blue-500/30">
                <h2 className="text-2xl font-bold text-blue-400 mb-3 flex items-center gap-3">
                  <span className="text-3xl">🙌</span>
                  No Pressure, No Commitment
                </h2>
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">Try it:</strong> Accept UNIA for just one sale a day (or one outgoing payment if you pay vendors)—see the results for yourself.
                </p>
                <p className="text-purple-200 leading-relaxed mt-4">
                  Convert back to fiat any time—no need to commit more than you&apos;re comfortable with.
                </p>
              </div>
            </section>

            {/* Future Potential Section */}
            <section className="mb-10">
              <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="text-3xl">🚀</span>
                  Your Everyday Activity Builds Future Potential
                </h2>
                <p className="text-purple-200 leading-relaxed mb-4">
                  <strong className="text-white">You&apos;re not taking a leap. You&apos;re sampling the future:</strong>
                </p>
                <ul className="list-none space-y-3 text-purple-200">
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl">✓</span>
                    <span>If the UNIA network grows, your daily small acceptance could bring big upside over time.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">✓</span>
                    <span>If the world passes by, you risk nothing—because you only accepted what you&apos;re comfortable with.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Zero Cost Section */}
            <section className="mb-10">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                <h2 className="text-2xl font-bold text-purple-400 mb-3 flex items-center gap-3">
                  <span className="text-3xl">💰</span>
                  Zero Cost, Zero Hassle
                </h2>
                <p className="text-purple-200 leading-relaxed mb-4">
                  Setting up UNIA payment is as easy as downloading a wallet app—no special device, no paperwork, no long-term lock-in.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-medium">
                    ✓ No bank fees
                  </span>
                  <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-medium">
                    ✓ No chargeback fraud
                  </span>
                  <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-medium">
                    ✓ No middlemen
                  </span>
                </div>
              </div>
            </section>

            {/* Simple Steps Section */}
            <section className="mb-10">
              <div className="bg-white/5 rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-3xl">📋</span>
                  Simple Steps: Try UNIA Today
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-purple-500/10 p-4 rounded-xl">
                    <span className="bg-purple-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                    <p className="text-purple-200">Download the UNIA wallet or compatible crypto wallet.</p>
                  </div>
                  <div className="flex items-start gap-4 bg-purple-500/10 p-4 rounded-xl">
                    <span className="bg-purple-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                    <p className="text-purple-200">Display your UNIA address or QR code.</p>
                  </div>
                  <div className="flex items-start gap-4 bg-purple-500/10 p-4 rounded-xl">
                    <span className="bg-purple-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                    <p className="text-purple-200">Accept or send just one UNIA transaction per day—even a tiny amount.</p>
                  </div>
                  <div className="flex items-start gap-4 bg-purple-500/10 p-4 rounded-xl">
                    <span className="bg-purple-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                    <p className="text-purple-200">Watch the network and your balance—if the network grows, so could your rewards.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Line */}
            <section className="mb-8">
              <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-xl p-8 border border-yellow-500/50 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Bottom Line</h2>
                <p className="text-purple-200 text-lg leading-relaxed">
                  You don&apos;t have to change everything—sometimes, <strong className="text-yellow-400">just one step is enough to open the door to something big.</strong>
                </p>
                <p className="text-purple-200 text-lg leading-relaxed mt-4">
                  UNIA works quietly in the background for you with every transaction.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-purple-500/30">
              <div className="flex justify-center">
                <Logo size={60} />
              </div>
              <p className="text-2xl font-bold text-white mb-2 mt-4">UNIA</p>
              <p className="text-purple-300">Powered by People, Not Capital</p>
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-8 text-center">
            <Link
              href="/mint"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
            >
              Get Started with UNIA →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
