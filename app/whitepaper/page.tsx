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
              <h1 className="text-2xl font-bold text-white">UNIYAA Token</h1>
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
                UNIYAA: A Fair Economy Built on Transparent Rules
              </h1>
              <p className="text-purple-300 text-lg">Last Updated: June 2026</p>
            </div>

            {/* Executive Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Executive Summary</h2>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is different.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Most digital economies reward speculation. UNIYAA rewards use.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                In traditional systems, your savings lose value over time. With UNIYAA, the opposite happens: as more people use it, its value grows. Every transaction strengthens the network. Every person who holds benefits.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                And the price is <strong className="text-white">verifiable</strong>. There is no off-chain price oracle, no admin keypair that can move the number, no external feed to compromise. The displayed UNIYAA price is a pure deterministic function of the on-chain transaction counter — anyone can fetch <code className="text-purple-300">total_transactions</code> from the program and run the published tier formula to arrive at the same number the app shows them.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This isn&apos;t about trading. It&apos;s about building an economy where participation matters more than timing, where transparency replaces manipulation, and where ordinary people can see their purchasing power grow simply by being part of something real.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This whitepaper explains how UNIYAA works, why it&apos;s fair, and how you can be part of it.
              </p>
            </section>

            {/* Part I */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part I: The Problem with Traditional Systems</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Saving Money Feels Like Losing</h3>
              <p className="text-purple-200 leading-relaxed">
                You work. You save. Years pass. And somehow, your money buys less.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This isn&apos;t your fault. It&apos;s how the system works. Inflation erodes purchasing power. For people in emerging markets, it&apos;s even worse—currencies can collapse, savings can vanish, and there&apos;s nothing you can do.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">The core issue:</strong> You perform economic activities—buying, selling, working—but the system doesn&apos;t reward you for making the economy stronger. Your participation builds value for others, not for you.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">The Speculation Problem</h3>
              <p className="text-purple-200 leading-relaxed">
                Crypto was supposed to fix this. Instead, it created new problems.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                On exchanges, large holders manipulate prices. Early speculators profit massively. New users enter at unpredictable prices, with no way to know if they&apos;re being taken advantage of. Long-term believers watch their holdings crash because of speculation, even when the platform itself is improving.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">UNIYAA changes this equation entirely.</strong>
              </p>
            </section>

            {/* Part I.5 - How Value Is Truly Created */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part I.5: How Value Is Truly Created</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">You Already Know This</h3>
              <p className="text-purple-200 leading-relaxed">
                Pause for a moment. Look at the world around you.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Everything we consider valuable today was once meaningless.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Land was just empty space. Fruit grew freely on trees. Paper money was just paper.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                There was no inherent value in any of them.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Value appeared only when people began to use them. Not because someone declared it. Not because an authority stamped it. But because ordinary people—<strong className="text-white">people like you</strong>—quietly agreed that these things mattered.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This is how value has always been created. Not by governments. Not by institutions. Not by force.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">By people. By you.</strong>
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Think About What Money Really Is</h3>
              <p className="text-purple-200 leading-relaxed">
                In the beginning, money is nothing more than a symbol. A number. An idea written on paper or stored on a screen.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                It has no power on its own.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                It becomes powerful only when people start using it—to exchange, to transact, to participate in real life.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The more it is used, the more it is trusted. The more it is trusted, the more valuable it becomes.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">You have seen this happen your entire life.</strong> Every currency you&apos;ve ever held only worked because millions of people agreed to use it. That agreement—that collective act of trust—is the most powerful economic force in human history.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                And it has always come from people like you.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">This Is the Foundation of UNIYAA</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA does not try to create value artificially. It does not depend on speculation. It does not rely on people buying and selling it on exchanges.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Instead, UNIYAA follows the same path that has created value since the beginning of human civilization:
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Value is created through usage.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every transaction. Every transfer. Every real interaction between two people.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                That is what gives UNIYAA meaning. That is what gives UNIYAA strength. And over time, that is what gives UNIYAA value.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">This Changes Everything—For You</h3>
              <p className="text-purple-200 leading-relaxed">
                Because now, value is no longer controlled by a few. It is not decided by markets, exchanges, or institutions you have no access to.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">It is created by you.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every time you use UNIYAA—to pay someone, to receive payment, to transfer value to a friend—you are not just making a transaction. <strong className="text-white">You are creating value.</strong> Not for a corporation. Not for a distant shareholder. For yourself, and for every other person in the network.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This is not a theory. This is not a promise. This is how value has worked for all of human history.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The only difference is that now, for the first time, <strong className="text-white">the system is designed to recognize it.</strong>
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">You Are Not a User. You Are the Source.</h3>
              <p className="text-purple-200 leading-relaxed">
                Traditional economies extract value from your participation and deliver it to someone else. You work, you spend, you transact—and the system grows richer while you stay in the same place.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA reverses this.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                When you participate, the network grows. When the network grows, your holdings appreciate. When your holdings appreciate, your economic power increases.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">You are not waiting for value to be handed to you. You are creating it—with every transaction, every day, alongside millions of others doing the same.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This is the oldest truth in economics, and UNIYAA is built on it:
              </p>
              <p className="text-purple-200 leading-relaxed mt-4 border-l-4 border-purple-500 pl-4 italic">
                <strong className="text-white">Value was never created by the powerful. It was always created by the many. UNIYAA simply makes sure that the many finally benefit from what they create.</strong>
              </p>
            </section>

            {/* Part II */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part II: How UNIYAA Works—Real Use, Real Growth</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Core Principle: Value Grows from Activity, Not Manipulation</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA&apos;s design is simple: <strong className="text-white">token value rises when people use it</strong>. Not when people trade it. Not when influencers hype it. When real people exchange real value.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every time someone uses UNIYAA—to buy something, pay someone, transfer value—three things happen:
              </p>
              <ol className="list-decimal list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">The network becomes stronger</strong></li>
                <li><strong className="text-white">All token holders benefit</strong> through appreciation</li>
                <li><strong className="text-white">Future users see clearer price signals</strong> based on actual health, not speculation</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Transaction-Driven Appreciation</h3>
              <p className="text-purple-200 leading-relaxed">
                Transactions are the heartbeat of any economy. They represent real activity—goods changing hands, services rendered, value flowing between people.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Traditional systems never reward the people who create this activity. UNIYAA does.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                when you make a transaction using UNIYAA:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>You&apos;re contributing to the network&apos;s health</li>
                <li>Your action increases ecosystem volume</li>
                <li>This volume triggers appreciation that benefits all holders</li>
                <li>People who believed early and held benefit directly from your participation</li>
              </ul>
            </section>

            {/* Part II.5 - The Power of One Daily Action */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part II.5: The Power of One Daily Action</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">You Don&apos;t Need to Become a Trader</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is designed so ordinary people can strengthen the system without changing their lifestyle, watching charts, or learning complex trading strategies.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You don&apos;t need to buy, flip, or speculate on UNIYAA for it to matter.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                All that&apos;s required is <strong className="text-white">one simple action: accept UNIYAA once a day when someone sends it to you.</strong>
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">One Small Action, Once a Day</h3>
              <p className="text-purple-200 leading-relaxed">
                You don&apos;t need to:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Trade on exchanges</li>
                <li>Watch charts or react to price moves</li>
                <li>Stay online all the time</li>
                <li>Convince others or run campaigns</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                You only need to do this:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">When someone sends you UNIYAA, receive it</strong></li>
                <li>Let that transfer be recorded on-chain as real use between real people</li>
                <li>The protocol counts this as genuine participation, not speculation</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why This Matters So Much</h3>
              <p className="text-purple-200 leading-relaxed">
                One person accepting UNIYAA once a day is a tiny event on its own.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                But scaled even a little, the picture changes:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">1 person × 1 acceptance per day</strong> → very small</li>
                <li><strong className="text-white">10,000 people × 1 acceptance per day</strong> → system-level signal</li>
                <li><strong className="text-white">1,000,000 people × 1 acceptance per day</strong> → impossible to ignore</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every time UNIYAA moves from one person to another, the network becomes stronger. The price appreciation logic <strong className="text-white">only considers peer-to-peer transfers</strong>, not registrations, minting, or rewards. The system grows not because someone bought UNIYAA, but because someone <strong className="text-white">used</strong> it.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Pressure, No Rush</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is intentionally built to avoid urgency and hype.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You don&apos;t need to:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Accept UNIYAA multiple times a day. <strong className="text-white">Once is enough.</strong></li>
                <li>Force use cases that don&apos;t feel natural</li>
                <li>Participate when it doesn&apos;t make sense</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                Simply accept UNIYAA when it fits your normal life—paying someone back, settling a small bill, sending value to a friend.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This keeps the system simple and fair. Growth remains organic, not forced.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How Small Actions Add Up</h3>
              <p className="text-purple-200 leading-relaxed">
                Trust, reputation, and real economic networks all grow the same way: through <strong className="text-white">small, repeated actions over time</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                When many people:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Perform one small action each day</li>
                <li>Let value flow peer-to-peer</li>
                <li>Do this consistently</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                ...the value of the entire system moves forward—slowly at first, then steadily, without relying on hype cycles or a handful of large players.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA&apos;s price appreciation model is already tied directly to transaction counts across structured tiers and epochs. This daily rhythm of small actions is exactly what that model is designed to reward.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why UNIYAA Is Different</h3>
              <p className="text-purple-200 leading-relaxed">
                Most systems depend on: <strong className="text-white">A small number of users doing a lot</strong> (heavy trading, large capital, constant activity).
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA is built around the opposite idea: <strong className="text-white">Many users doing a little.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                One acceptance. Once a day. From each person.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Because price appreciation only considers genuine peer-to-peer transfers, the protocol directly aligns value growth with real usage instead of pure buying pressure. That&apos;s enough to create a durable, user-driven network where participation is simple, low-pressure, and meaningful.
              </p>
            </section>

            {/* Part III */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part III: UNIYAA as Utility—The Foundation of Fair Value</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Utility Prevents Exploitation</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is <strong className="text-white">fundamentally designed for buying and selling</strong>—for creating your own ecosystem of commerce and exchange. This isn&apos;t a side feature. It&apos;s the point.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This utility-first design makes UNIYAA extremely difficult to manipulate.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Speculative attack vectors are closed:</strong> In UNIYAA, this doesn&apos;t have the same devastating effect because:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Users need UNIYAA to transact, not to speculate</li>
                <li>Price drops create buying opportunities for actual users</li>
                <li>The token&apos;s purpose is always the same—there&apos;s no &quot;escape hatch&quot; for speculators</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Fair Economy Framework: The Technical Foundation</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA achieves this through several structural mechanisms:
              </p>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">1. Eliminated Manual Supply Control</h4>
              <p className="text-purple-200 leading-relaxed">
                Traditional tokens rely on team discretion for minting decisions. UNIYAA eliminates this entirely. No team can decide to print more tokens. No admin wallet can suddenly mint billions of units to dump on the market.
              </p>
              <p className="text-purple-200 leading-relaxed mt-2">
                <strong className="text-white">Why This Matters</strong>: You don&apos;t have to trust people; you trust code. This trust is verifiable, transparent, and immune to secret changes.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">2. User-Growth-Linked Issuance</h4>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA&apos;s minting rate naturally slows as adoption increases. This creates <strong className="text-white">organic scarcity</strong>—each new token becomes slightly more valuable as the growth phase progresses.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">3. Referral Merit System (Not Recruitment)</h4>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">Referrals are optional at every tier.</strong> UNIYAA never requires a referral to register, mint, or transact—the on-chain program will never reject a missing one. The referral system exists purely as a bonus mechanism for users who choose to participate.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA&apos;s referral system is fundamentally different: <strong className="text-white">rewards come only when real value is created.</strong> When someone you refer becomes active and contributes to the network, you earn referral credits—not as tokens handed to you, but as recognition of your contribution to bringing them into the ecosystem. Individual referrals earn +1 credit; business referrals earn +2 credits. Credits can be redeemed for bonus mint attempts (5 credits = 1 bonus mint, up to 5 bonus mints per month).
              </p>
            </section>

            {/* Part III.5 - Simple to Use, Anywhere in the World */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part III.5: Simple to Use, Anywhere in the World</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Complex Conversions. No Math. Just Scan and Send.</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is designed to work the way you already think about money—in your local currency, at current prices, without forcing you to do mental gymnastics.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Here&apos;s how simple it is:
              </p>
              
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">When you want to buy something:</h4>
                <ol className="list-decimal list-inside text-purple-200 space-y-2">
                  <li>Check the price in your local currency</li>
                  <li>Open the send modal</li>
                  <li>The system automatically converts it to UNIYAA for you</li>
                  <li>Scan the seller&apos;s QR code</li>
                  <li>Send</li>
                </ol>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">When you want to receive payment:</h4>
                <ol className="list-decimal list-inside text-purple-200 space-y-2">
                  <li>Tell someone the price in your local currency</li>
                  <li>Open the receive modal</li>
                  <li>The system shows the equivalent in UNIYAA</li>
                  <li>They scan your QR code</li>
                  <li>You receive</li>
                </ol>
              </div>

              <p className="text-purple-200 leading-relaxed mt-4">
                That&apos;s it. No spreadsheets. No calculators. No guessing.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Your Currency, Your Convenience</h3>
              <p className="text-purple-200 leading-relaxed">
                You don&apos;t need to think in UNIYAA if you don&apos;t want to. The interface does the work for you.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Whether you&apos;re in India thinking in rupees, Nigeria thinking in naira, or the Philippines thinking in pesos—<strong className="text-white">UNIYAA meets you where you are</strong>. The conversion happens instantly and transparently, using current exchange rates refreshed automatically. Local-currency display is for your convenience; UNIYAA itself is denominated in USD on the deterministic schedule described in Part IV.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You see the number that makes sense to you. The blockchain handles the rest.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why This Matters for Real People</h3>
              <p className="text-purple-200 leading-relaxed">
                In traditional crypto, using tokens for everyday purchases feels like learning a new language. You have to:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Calculate exchange rates manually</li>
                <li>Worry about slippage and fees</li>
                <li>Double-check if you&apos;re sending the right amount</li>
                <li>Hope the other person understands what they&apos;re receiving</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">UNIYAA removes all of this friction.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                When a shopkeeper wants to charge you ₹500 for groceries, you don&apos;t need to know that&apos;s 0.27 UNIYAA or 6.03 USD or any other conversion. You just see ₹500, confirm, scan, send.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                When a friend owes you ₦10,000, they don&apos;t need to stress about token prices. They see ₦10,000, confirm, scan, send.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The system handles the complexity. You handle your life.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Confidence in Every Transaction</h3>
              <p className="text-purple-200 leading-relaxed">
                Because the displayed UNIYAA price is computed deterministically from the on-chain transaction counter (and local-currency conversions use real-time FX rates), you always know you&apos;re getting fair value.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                No hidden markups. No surprise conversions. No &quot;platform fees&quot; that quietly drain your balance.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The price you see in your currency is the price you pay. The amount you request is the amount you receive. Simple. Fair. Transparent.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">QR Codes: Universal, Fast, Foolproof</h3>
              <p className="text-purple-200 leading-relaxed">
                You don&apos;t need to type long wallet addresses. You don&apos;t need to copy-paste strings of random characters. You don&apos;t risk sending funds to the wrong person.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                Just scan. The QR code contains everything needed for the transaction. The interface shows you exactly what you&apos;re sending or receiving, in your currency, before you confirm.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                One tap. One scan. Done.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">This Is What Adoption Looks Like</h3>
              <p className="text-purple-200 leading-relaxed">
                Crypto has struggled with real-world adoption because it asks people to change how they think about money. UNIYAA takes the opposite approach: <strong className="text-white">we change the interface, not the user</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You think in your currency. You transact the way you always have—scan, confirm, send. The difference is that the money you&apos;re using appreciates on a fixed, transparent schedule with every network transaction, and rewards genuine use instead of speculation.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                That&apos;s the promise: <strong className="text-white">cryptocurrency that feels like money, not like gambling</strong>.
              </p>
            </section>

            {/* Part IV - Price Appreciation Logic */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV: Price Appreciation Logic—9-Tier Compounding System</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Understanding the Compounding Phase</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA&apos;s price appreciation follows a structured, transparent mathematical model with two major periods: the <strong className="text-white">compounding phase</strong> and the <strong className="text-white">linear phase</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                During the <strong className="text-white">compounding phase</strong> (Tiers 1-8), UNIYAA&apos;s value grows exponentially based on transaction volume with a <strong className="text-white">constant 0.01% growth rate</strong>. Each epoch of transactions triggers this percentage increase that compounds on the previous value. This rewards early builders and provides steady, predictable growth during scaling.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                The compounding phase is <em>designed</em> to end. Infinite exponential growth would be unsustainable and eventually destructive. Instead, UNIYAA transitions to linear growth at a predictable point.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">The Linear Phase: When Compounding Ends</h3>
              <p className="text-purple-200 leading-relaxed">
                When UNIYAA reaches <strong className="text-white">$1,000,000</strong>, the system enters the <strong className="text-white">linear phase</strong> (Tier 9). At this point:
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
              </div>

              {/* Tier 2 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-teal-400 mb-3">Tier 2: Early Growth ($0.1 to $1)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~230,270 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (10 transactions)</p>
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
              </div>

              {/* Tier 3 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-blue-400 mb-3">Tier 3: Network Scaling ($1 to $10)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~2,302,700 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (100 transactions)</p>
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
              </div>

              {/* Tier 4 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-indigo-400 mb-3">Tier 4: Market Expansion ($10 to $100)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,000 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
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
              </div>

              {/* Tier 5 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-violet-400 mb-3">Tier 5: Early Maturity ($100 to $1k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,000 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
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
              </div>

              {/* Tier 6 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-pink-400 mb-3">Tier 6: Strong Adoption ($1k to $10k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,000 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
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
              </div>

              {/* Tier 7 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-orange-400 mb-3">Tier 7: Mass Market ($10k to $100k)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,000 transactions</p>
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
              </div>

              {/* Tier 8 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-red-400 mb-3">Tier 8: Final Compounding ($100k to $1M)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Duration:</strong> ~23,027,000 transactions</p>
                    <p><strong className="text-white">Mechanism:</strong> 0.01% per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Starting Price:</strong> ~$100,000 USD</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> ~$1,000,000 USD</p>
                    <p><strong className="text-white">Formula:</strong> Price = 100,000 × (1.0001)^epoch</p>
                    <p><strong className="text-white">Growth Type:</strong> Compounded</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Final compounding tier before transition. Reaches $1,000,000 sustainably.
                </p>
              </div>

              {/* Tier 9 */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-purple-500/20">
                <h4 className="text-lg font-bold text-purple-400 mb-3">Tier 9: Perpetual Sustainable Growth ($1M+)</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Start:</strong> After price reaches ~$1,000,000 USD</p>
                    <p><strong className="text-white">Mechanism:</strong> $250 per epoch (1,000 transactions)</p>
                    <p><strong className="text-white">Monthly Cap:</strong> $25,000 maximum increase</p>
                  </div>
                  <div>
                    <p><strong className="text-white">End Price:</strong> Forever growing</p>
                    <p><strong className="text-white">Formula:</strong> Price = 1,000,000 + (250 × epochs)</p>
                    <p><strong className="text-white">Growth Type:</strong> Linear</p>
                  </div>
                </div>
                <p className="text-purple-200 mt-4 text-sm">
                  <strong className="text-white">Why This Mechanism?</strong> Compounding stops to prevent unsustainable growth. Linear $250/epoch (0.025% of $1,000,000) provides steady appreciation. The $25,000 / 30-day cap is enforced deterministically: the on-chain <code className="text-purple-300">tier9_start_timestamp</code> is set the moment the counter crosses into Tier 9, and the displayed price computation reads it to clamp growth to at most $25,000 per rolling 30-day window. Anyone can verify the formula against on-chain state.
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
                      <td className="p-3">10</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">0.1 → 1</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">3</td>
                      <td className="p-3">100</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">1 → 10</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">4</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">10 → 100</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">5</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">0.01%</td>
                      <td className="p-3">100 → 1k</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr className="border-b border-purple-500/20">
                      <td className="p-3">6</td>
                      <td className="p-3">1,000</td>
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
                      <td className="p-3">100k → 1M</td>
                      <td className="p-3">Compound</td>
                    </tr>
                    <tr>
                      <td className="p-3">9</td>
                      <td className="p-3">1,000</td>
                      <td className="p-3">$250/epoch</td>
                      <td className="p-3">1M → ∞</td>
                      <td className="p-3">Linear</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-purple-200 text-xs mt-2 italic">
                  <strong className="text-white">Note:</strong> All prices are denominated in USD on a deterministic schedule. The displayed UNIYAA price is a pure function of the on-chain transaction counter — no off-chain oracle, no external price feeds. Anyone can verify the displayed price by fetching <code className="text-purple-300">total_transactions</code> from the program and running the tier formula above.
                </p>
              </div>
            </section>


            {/* Part IV.5 - Trust Model: Verifiable, Oracle-Free Pricing */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV.5: The Trust Model—Verifiable, Oracle-Free Pricing</h2>

              <p className="text-purple-200 leading-relaxed">
                Most crypto projects ask you to trust an oracle, an admin key, or a price feed. UNIYAA does not.
              </p>

              <p className="text-purple-200 leading-relaxed mt-4">
                The displayed UNIYAA price is a <strong className="text-white">pure deterministic function</strong> of a single on-chain number: <code className="text-purple-300">total_transactions</code>, the count of peer-to-peer transfers recorded by the smart contract. There is no admin keypair that can change the price. There is no off-chain feed. There are no hashes that need to be verified because the formula itself is the source of truth — and the formula is published in this whitepaper (Part IV).
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What You Can Verify Yourself</h3>
              <ol className="list-decimal list-inside text-purple-200 space-y-2 mt-2">
                <li>Read <code className="text-purple-300">total_transactions</code> from the on-chain GlobalState PDA (anyone can; it&apos;s public).</li>
                <li>Look up which of the 9 tiers that count falls into (Part IV).</li>
                <li>Apply the tier formula: compound growth for Tiers 1-8, linear with the $25,000 / 30-day cap for Tier 9.</li>
                <li>Compare to what the app displays. They will match — always.</li>
              </ol>
              <p className="text-purple-200 leading-relaxed mt-4">
                No proprietary algorithm. No black box. The math is in the code and the code is public.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What Cannot Be Manipulated</h3>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Price up</strong>: nobody can write a higher price on-chain. The contract has no instruction to set the price; the price is derived, not stored.</li>
                <li><strong className="text-white">Price down</strong>: same. The only way to move the price is by triggering real peer-to-peer transfers that advance the counter.</li>
                <li><strong className="text-white">Counter inflation</strong>: the only counter-bumping instruction (<code className="text-purple-300">record_transaction</code>) is admin-gated; the public path is <code className="text-purple-300">transfer_tokens</code>, which requires actual token movement between two real wallets.</li>
                <li><strong className="text-white">Tier 9 runaway</strong>: the on-chain program stamps a <code className="text-purple-300">tier9_start_timestamp</code> the moment Tier 9 begins. The displayed price reads that timestamp and clamps growth to at most $25,000 per 30-day window — not as a documentation claim, but as a math invariant anyone can check.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What This Means for You</h3>
              <p className="text-purple-200 leading-relaxed">
                You do not have to trust UNIYAA&apos;s team. You do not have to trust a third-party oracle service. You do not have to trust that the off-chain math matches what the contract enforces.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You trust the <strong className="text-white">on-chain counter</strong>, which is incremented only by genuine peer-to-peer transfers, and the <strong className="text-white">published formula</strong>, which is the same one your wallet, the merchant&apos;s phone, and any third-party explorer will arrive at independently.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4 border-l-4 border-purple-500 pl-4 italic">
                <strong className="text-white">If a price is verifiable by everyone, it cannot be manipulated by anyone.</strong>
              </p>
            </section>

            {/* Part V - Social Purpose Accounts */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V: Social Purpose Accounts—Generosity Through Restraint</h2>
              
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is designed to create value for everyone—not just token holders. Once the terminal phase is reached and price growth stabilizes, the protocol activates <strong className="text-white">five social purpose accounts</strong> that distribute UNIYAA annually to support education, healthcare, research, grants, and operations.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Critical timing:</strong> These distributions activate <em>only after</em> the compounding phase completes (approximately 117,691,000 peer-to-peer transactions, when UNIYAA reaches $1,000,000). This ensures early holders and builders are not diluted during the compounding growth phase.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Delayed Activation?</h3>
              <p className="text-purple-200 leading-relaxed">
                Many projects promise generosity from day one, then fail to deliver because they dilute their own value before it has time to grow. UNIYAA takes the opposite approach: <strong className="text-white">patience first, generosity second</strong>.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                By waiting until the terminal phase, UNIYAA ensures:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>The token has reached substantial value before any social distributions begin</li>
                <li>Early believers who took the risk are rewarded without dilution</li>
                <li>Social distributions come from a position of strength, not desperation</li>
                <li>Each UNIYAA distributed has real purchasing power to make a difference</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">The Five Social Purpose Accounts</h3>
              
              {/* Education Fund */}
              <div className="bg-white/5 rounded-xl p-6 mt-6 border border-blue-500/30">
                <h4 className="text-lg font-bold text-blue-400 mb-3">1. Education Fund</h4>
                <div className="grid md:grid-cols-2 gap-4 text-purple-200">
                  <div>
                    <p><strong className="text-white">Purpose:</strong> Support scholarships, learning materials, and educational infrastructure</p>
                    <p className="mt-2"><strong className="text-white">Annual Allocation:</strong> 100 UNIYAA</p>
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
                    <p className="mt-2"><strong className="text-white">Annual Allocation:</strong> 100 UNIYAA</p>
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
                    <p className="mt-2"><strong className="text-white">Annual Allocation:</strong> 100 UNIYAA</p>
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
                    <p className="mt-2"><strong className="text-white">Annual Allocation:</strong> 100 UNIYAA</p>
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
                    <p className="mt-2"><strong className="text-white">Annual Allocation:</strong> 10 UNIYAA</p>
                  </div>
                  <div>
                    <p><strong className="text-white">Why Constrained?</strong></p>
                    <p className="text-sm mt-1">Lean operations stay focused. Excess funding breeds bloat and inefficiency. A tight budget forces discipline and clear priorities.</p>
                  </div>
                </div>
              </div>

              <p className="text-purple-200 leading-relaxed mt-6 border-l-4 border-purple-500 pl-4 italic">
                <strong className="text-white">Total Annual Distribution: 410 UNIYAA</strong> across all five accounts. By terminal phase, each UNIYAA has substantial value, making even these constrained allocations meaningful for real-world impact.
              </p>
            </section>

            {/* Part V.6 - Annual Distribution Safety */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Annual Distribution Safety—Predictability Over Speed</h2>
              
              <p className="text-purple-200 leading-relaxed">
                Social purpose distributions occur <strong className="text-white">exactly once per calendar year, in January</strong>. Not daily. Not per transaction. Not based on volume. Once per year, on a predictable schedule.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Annual, Not More Frequent?</h3>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">1. Predictability for Recipients</h4>
              <p className="text-purple-200 leading-relaxed">
                A school planning a scholarship program or a clinic ordering medicines needs to know <em>when</em> funds arrive. Annual cadence allows organizations to plan, budget, and deliver real outcomes.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">2. Auditability for All</h4>
              <p className="text-purple-200 leading-relaxed">
                Annual distributions are easy to track, verify, and audit. Anyone can check that funds went to the right places. High-frequency distributions create noise that hides manipulation.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">3. Abuse Resistance</h4>
              <p className="text-purple-200 leading-relaxed">
                Volume-based or high-frequency distributions create incentives to game the system—fake transactions, wash trading, and extraction schemes. Annual caps eliminate these attack vectors.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What We Explicitly Reject</h3>
              <div className="bg-red-500/10 rounded-xl p-6 mt-4 border border-red-500/30">
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li><strong className="text-white">High-frequency grants</strong>: Create complexity and manipulation opportunities</li>
                  <li><strong className="text-white">Volume-based distributions</strong>: Reward noise and spam, not genuine need</li>
                  <li><strong className="text-white">Uncapped generosity</strong>: Dilutes value and undermines sustainability</li>
                  <li><strong className="text-white">Speculative extraction</strong>: UNIYAA funds are for use, not for trading schemes</li>
                </ul>
              </div>

              <p className="text-purple-200 leading-relaxed mt-6 border-l-4 border-purple-500 pl-4 italic">
                Restraint is not cruelty. It is the foundation of fairness. By limiting distributions to annual cadence and fixed amounts, UNIYAA ensures that generosity is sustainable, auditable, and immune to exploitation.
              </p>
            </section>

            {/* Part VI */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VI: How UNIYAA Protects Against Exploitation</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Immutable Fairness Through Code</h3>
              <p className="text-purple-200 leading-relaxed">
                One of UNIYAA&apos;s most powerful features is that its fairness is <strong className="text-white">not dependent on people keeping promises</strong>—it&apos;s encoded in mathematics.
              </p>
              
              <ul className="list-disc list-inside text-purple-200 space-y-3 mt-4">
                <li><strong className="text-white">No Team Minting</strong>: Every token entering circulation follows transparent rules. There&apos;s no admin wallet that can secretly print tokens.</li>
                <li><strong className="text-white">No Price Oracle to Compromise</strong>: The displayed UNIYAA price is computed deterministically from the on-chain transaction counter. There is no off-chain feed, no admin keypair in the price path, no hashes that need to be verified — see Part IV.5 for the full trust model. The only way to move the price is through real peer-to-peer transfers.</li>
                <li><strong className="text-white">Counter Inflation Closed</strong>: The only counter-bumping instruction outside of real transfers (<code className="text-purple-300">record_transaction</code>) is admin-gated. Anyone trying to advance the price tier without doing real transactions hits an authorization check and pays nothing but the rejected transaction fee.</li>
                <li><strong className="text-white">Diminishing Mint Rate</strong>: As adoption grows, the per-attempt amount each new user can mint steps down according to the published Mint Tier Schedule (Part VIII). UNIYAA does not enforce a fixed total-supply cap; instead, the combination of the tiered step-down and the on-chain mint cooldown holds issuance asymptotic — i.e. each new cohort can add less than the one before it, and no single actor can outrun the schedule.</li>
                <li><strong className="text-white">Transaction-Based Appreciation</strong>: Price appreciation isn&apos;t driven by marketing hype or speculative enthusiasm. It&apos;s directly tied to actual economic activity.</li>
              </ul>
            </section>

            {/* Part VII - Philosophy & Values */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VII: Philosophy & Values—Restraint Over Excess</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why UNIYAA Prioritizes Restraint</h3>
              <p className="text-purple-200 leading-relaxed">
                The world is full of promises of abundance: unlimited growth, endless rewards, instant riches. UNIYAA rejects this illusion.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Restraint is not limitation—it is discipline.</strong> By imposing clear boundaries on minting, distributions, and growth, UNIYAA creates a system that can last for generations, not just cycles of hype and collapse.
              </p>
              
              <h4 className="text-lg font-semibold text-white mt-6 mb-2">Restraint in Minting</h4>
              <p className="text-purple-200 leading-relaxed">
                Every new UNIYAA token must be earned through participation, not printed by a team. Algorithmic scarcity ensures that as the network grows, each token becomes more valuable—not diluted.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Restraint in Social Distributions</h4>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA waits until the terminal phase to activate social purpose accounts. This patience ensures that when generosity begins, it comes from a position of strength and each UNIYAA distributed has real purchasing power to change lives.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Restraint in Growth</h4>
              <p className="text-purple-200 leading-relaxed">
                Tier 9 caps price growth at $25,000 per 30-day window. This is not a documentation claim — it is enforced deterministically: the on-chain program stamps a <code className="text-purple-300">tier9_start_timestamp</code> the moment the transaction counter crosses into Tier 9, and the price formula clamps growth against that timestamp. Any client running the formula arrives at the same capped number. This prevents runaway speculation and keeps UNIYAA grounded in sustainable, predictable appreciation—not casino-like volatility.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Delayed Generosity Leads to Broader, Fairer Impact</h3>
              <p className="text-purple-200 leading-relaxed">
                Many projects promise to change the world from day one. They distribute tokens freely, create dependencies, and collapse when the well runs dry.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA takes the opposite path: <strong className="text-white">build value first, distribute generosity second.</strong>
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Early holders are rewarded</strong> for taking the risk during the compounding phase</li>
                <li><strong className="text-white">Social purpose accounts activate</strong> only when each UNIYAA has substantial value</li>
                <li><strong className="text-white">Annual distributions are constrained</strong> to prevent dependency and abuse</li>
                <li><strong className="text-white">The system remains sustainable</strong> for decades, not just years</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                By delaying generosity until the system is strong, UNIYAA ensures that when help arrives, it is <em>meaningful</em>. A scholarship funded by 100 UNIYAA at $1,000,000 value is worth $100 million in purchasing power—life-changing for a student, sustainable for the network.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">UNIYAA Is Not Designed for Speculation or Extraction</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">Let this be clear:</strong> UNIYAA is not a get-rich-quick scheme. It is not designed for day traders, pump-and-dump schemes, or speculative extraction.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA is designed for:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">People who use it</strong> to buy and sell goods and services</li>
                <li><strong className="text-white">People who believe in it</strong> and hold through growth phases</li>
                <li><strong className="text-white">People who build with it</strong> and contribute to the ecosystem</li>
                <li><strong className="text-white">Communities who benefit from it</strong> through education, healthcare, and grants</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                If you are looking for quick profits or trading volatility, UNIYAA is not for you. If you are looking for dignity, fairness, and long-term thinking, you are in the right place.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Economic Empowerment Through Participation</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA&apos;s true mission is to <strong className="text-white">align individual prosperity with network health</strong>. When you hold UNIYAA, you want the same thing as everyone else: for the network to grow, for transactions to increase, for adoption to expand.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                This is not a zero-sum game where one person&apos;s gain is another&apos;s loss. This is a system where <strong className="text-white">everyone wins when the network thrives</strong>.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-3">Powered by People, Not Capital</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA&apos;s narrative emerges from a simple observation: <strong className="text-white">most people never get early access to systems that create wealth.</strong> By the time an opportunity becomes widely known, most of the compounding benefit has already happened.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA changes this:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Equal Access</strong>: Anyone with a Solana wallet can join, anytime</li>
                <li><strong className="text-white">Transparent Rules</strong>: Every mechanism is auditable; there are no secret advantages</li>
                <li><strong className="text-white">Fair Participation</strong>: Your reward for believing early is meaningful, but newer participants aren&apos;t left to fight over scraps</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4 border-l-4 border-purple-500 pl-4 italic">
                UNIYAA is built on the belief that restraint, patience, and fairness create systems that last. Excess, hype, and speculation create cycles of boom and bust. We choose the long road because it leads somewhere real.
              </p>
            </section>

            {/* Part VIII - Technical Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VIII: Technical Summary</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">For the Technically Curious</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA operates on Solana with the following specifications:
              </p>
              
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Smart Contract Architecture:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Global state tracking: transaction counts, user counts, admin authority, Tier 9 start timestamp</li>
                  <li>User accounts: minting history, referral tracking, locked-token vesting</li>
                  <li>Deterministic price calculation derived purely from <code className="text-purple-300">total_transactions</code> — no on-chain price oracle, no admin-writable price field</li>
                  <li>Admin-gated maintenance instructions: counter bumps via <code className="text-purple-300">record_transaction</code> require the admin signer; ordinary peer-to-peer transfers do not</li>
                  <li>On-chain Tier 9 cap enforcement: <code className="text-purple-300">tier9_start_timestamp</code> stamped automatically when the counter first crosses into Tier 9; price formula clamps growth to $25,000 per 30-day window deterministically</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Trust Surface (what you must trust):</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li><strong className="text-white">On-chain state</strong>: the <code className="text-purple-300">total_transactions</code> counter and (for Tier 9) the <code className="text-purple-300">tier9_start_timestamp</code> field on the GlobalState PDA</li>
                  <li><strong className="text-white">Published formula</strong>: the 9-tier compound + linear curve in Part IV, identical across frontend, mobile, and any third-party explorer that runs it</li>
                  <li><strong className="text-white">Solana&apos;s settlement guarantees</strong>: standard for any Solana-native asset</li>
                </ul>
                <p className="text-purple-200 text-sm mt-3 italic">
                  Everything else — the team, the frontend operator, any third-party API — is outside the price trust path. If you trust the on-chain counter, you can re-derive the price independently and verify what every interface shows you.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Token Economics:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Variable minting rate tied to user adoption (see Mint Tier Schedule below)</li>
                  <li>Utility-first design: use UNIYAA to buy and sell goods and services</li>
                  <li>Referral rewards via credit-based system: individual referral = +1 credit, business referral = +2 credits; 5 credits = 1 bonus mint attempt (max 5/month). Referrals are optional at every tier.</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Mint Tier Schedule (per-attempt cap by user registration index):</h4>
                <p className="text-purple-300 text-sm mb-3">
                  Each user&apos;s per-attempt mint amount is determined by the order in which they registered. As more users join, the per-attempt amount steps down, so newcomers can&apos;t flood the supply faster than the early cohort. This is independent of the 9-tier <em>price</em> model in Part IV — the price tiers describe how UNIYAA <em>appreciates</em> per transaction; the mint tiers below describe how much each user can <em>create</em> per attempt.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-purple-200 border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/30">
                        <th className="text-left p-2 text-white">Mint Tier</th>
                        <th className="text-left p-2 text-white">User Index Range</th>
                        <th className="text-left p-2 text-white">UNIYAA / Attempt</th>
                        <th className="text-left p-2 text-white">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-purple-500/20"><td className="p-2">1</td><td className="p-2">#1</td><td className="p-2">100,000</td><td className="p-2">+ 100 elevated attempts</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">2</td><td className="p-2">#2 – 10</td><td className="p-2">10,000</td><td className="p-2">+ 100 elevated attempts</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">3</td><td className="p-2">#11 – 100</td><td className="p-2">1,000</td><td className="p-2">+ 100 elevated attempts</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">4</td><td className="p-2">#101 – 1,000</td><td className="p-2">100</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">5</td><td className="p-2">#1,001 – 10,000</td><td className="p-2">10</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">6</td><td className="p-2">#10,001 – 100,000</td><td className="p-2">1</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">7</td><td className="p-2">#100,001 – 1,000,000</td><td className="p-2">0.1</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">8</td><td className="p-2">#1,000,001 – 10,000,000</td><td className="p-2">0.01</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">9</td><td className="p-2">#10,000,001 – 100,000,000</td><td className="p-2">0.001</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr className="border-b border-purple-500/20"><td className="p-2">10</td><td className="p-2">#100,000,001 – 1,000,000,000</td><td className="p-2">0.0001</td><td className="p-2">flat per-attempt rate</td></tr>
                      <tr><td className="p-2">11</td><td className="p-2">#1,000,000,001+</td><td className="p-2">0.00001</td><td className="p-2">unbounded user range</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-purple-300 text-xs mt-3 italic">
                  Repeat mints are gated by an on-chain cooldown; bonus mints can be earned by redeeming referral credits (5 credits = 1 bonus mint, max 5/month). There is no hard total-supply cap — the design relies on the per-attempt step-down plus cooldowns to keep issuance asymptotic, not on a fixed maximum.
                </p>
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
                UNIYAA offers something different: <strong className="text-white">a system where individual prosperity and collective progress move together.</strong> Where appreciation isn&apos;t zero-sum. Where early believers are rewarded, and late participants aren&apos;t exploited.
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
                UNIYAA embodies these beliefs. Whether you&apos;re early or late, wealthy or building wealth, skeptical or enthusiastic—there&apos;s a role for you in this ecosystem.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4 italic">
                The economy you build tomorrow depends on the systems you choose today.
              </p>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-purple-500/30">
              <p className="text-2xl font-bold text-white mb-2">UNIYAA</p>
              <p className="text-purple-300">Powered by People, Not Capital</p>
              <p className="text-purple-300 text-sm">People Powered Value</p>
              <p className="text-purple-400 text-sm mt-4">Last Updated: May 2026</p>
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-8 text-center">
            <Link
              href="/mint"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all text-lg"
            >
              Get Started with UNIYAA →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
