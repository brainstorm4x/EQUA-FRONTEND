'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-y-3">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-xl md:text-2xl font-bold text-white">UNIYAA Token</h1>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:text-base md:gap-6">
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
                In traditional systems, your savings lose value over time. With UNIYAA, the opposite is the goal: as more of its people use it, its value can grow. Every day of real use strengthens the network.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                And the price is <strong className="text-white">verifiable</strong>. There is no off-chain price oracle, no admin keypair that can move the number, no external feed to compromise. The UNIYAA price is kept by the smart contract in the public <code className="text-purple-300">price_index</code> field and changes only by the published participation rule (Part IV); no instruction can set it.
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
                All that&apos;s required is <strong className="text-white">one simple action: pay with UNIYAA once a day.</strong>
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
                <li><strong className="text-white">Pay for something with UNIYAA</strong>—groceries, a bill, a friend you owe</li>
                <li>Let that payment be recorded on-chain as real use between real people</li>
                <li>The protocol counts your first payment of the day as genuine participation, not speculation</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Receiving is never limited.</strong> A shopkeeper can accept UNIYAA from every customer who walks in, all day long. Each customer&apos;s first payment of the day counts, so a busy shop helps the whole network grow.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why This Matters So Much</h3>
              <p className="text-purple-200 leading-relaxed">
                One person paying with UNIYAA once a day is a tiny event on its own.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                But scaled even a little, the picture changes:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">1 person × 1 payment per day</strong> → very small</li>
                <li><strong className="text-white">10,000 people × 1 payment per day</strong> → system-level signal</li>
                <li><strong className="text-white">1,000,000 people × 1 payment per day</strong> → impossible to ignore</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                Every time UNIYAA moves from one person to another, the network becomes stronger. The price appreciation logic <strong className="text-white">only considers peer-to-peer payments</strong>, not registrations or minting, and it counts each person at most once a day. The system grows not because someone bought UNIYAA, but because someone <strong className="text-white">used</strong> it.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Pressure, No Rush</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA is intentionally built to avoid urgency and hype.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                You don&apos;t need to:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Pay with UNIYAA many times a day just to be counted. <strong className="text-white">Once is enough.</strong> Pay as often as you need; only your first payment of the day counts.</li>
                <li>Force use cases that don&apos;t feel natural</li>
                <li>Participate when it doesn&apos;t make sense</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                Simply pay with UNIYAA when it fits your normal life—paying someone back, settling a small bill, sending value to a friend.
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
                UNIYAA&apos;s price grows with the share of its people who pay each day (Part IV). This daily rhythm of small actions is exactly what that model is designed to reward.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why UNIYAA Is Different</h3>
              <p className="text-purple-200 leading-relaxed">
                Most systems depend on: <strong className="text-white">A small number of users doing a lot</strong> (heavy trading, large capital, constant activity).
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                UNIYAA is built around the opposite idea: <strong className="text-white">Many users doing a little.</strong>
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                One payment. Once a day. From each person.
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
              <p className="text-purple-200 leading-relaxed mt-2">
                Each person can mint <strong className="text-white">once every 30 days</strong>. Minting is never counted as use, and it never moves the price.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">3. Only Real Use Counts</h4>
              <p className="text-purple-200 leading-relaxed">
                The on-chain program decides what counts, and it is strict:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li>Each person&apos;s <strong className="text-white">first payment of the day</strong> counts. Further payments that day go through normally but do not count again.</li>
                <li>Payments of zero, and payments to yourself, are rejected.</li>
                <li>Receiving is unlimited and never restricted.</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Referrals are optional</strong> and simply record who invited whom. They earn no credits, tokens, or bonus mints.
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
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV: Price Appreciation—Growth Through Participation</h2>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How the Price Grows</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA starts at <strong className="text-white">$0.01</strong>. Once a day, the price can grow a little, and how much depends on one thing: <strong className="text-white">what share of UNIYAA users paid with UNIYAA that day</strong>.
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>If every user paid that day, the price grows by <strong className="text-white">1%</strong>, the most it can grow in one day.</li>
                <li>If 30% of users paid, it grows by 0.3%. If 10% paid, 0.1%.</li>
                <li>If nobody paid, it does not grow.</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                Each person counts at most once a day, however many payments they make. The price never jumps; it climbs slowly, one day at a time.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Participation, Not Volume</h3>
              <p className="text-purple-200 leading-relaxed">
                A system that rewards the number of transactions rewards whoever can generate the most of them, and a large network would race through its targets. UNIYAA measures something harder to fake: <strong className="text-white">how many of its people actually use it</strong>. A network of a thousand people and a network of ten million grow at the same pace when the same share of their members take part.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Slowing Down Gently</h3>
              <p className="text-purple-200 leading-relaxed">
                The 1% daily maximum applies while the price is small. As the price rises, the maximum shrinks smoothly: at <strong className="text-white">$150,000</strong> it is 0.5% a day, and far above that the daily increase levels off at about <strong className="text-white">$1,500 a day ($45,000 per 30 days)</strong>, always in proportion to the share of users who pay. There is no cut-off point where growth suddenly stops; it simply slows as UNIYAA matures.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What This Means in Time</h3>
              <p className="text-purple-200 leading-relaxed">
                These are the <strong className="text-white">fastest possible</strong> times, assuming the same share of users pays every single day. Real growth will be slower, and no outcome is promised.
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-purple-200 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-purple-500/30">
                      <th className="text-left p-2 text-white">From $0.01 to</th>
                      <th className="text-left p-2 text-white">Everyone pays daily</th>
                      <th className="text-left p-2 text-white">30% pay daily</th>
                      <th className="text-left p-2 text-white">10% pay daily</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-purple-500/20"><td className="p-2">$1</td><td className="p-2">1.3 years</td><td className="p-2">4.2 years</td><td className="p-2">13 years</td></tr>
                    <tr className="border-b border-purple-500/20"><td className="p-2">$100</td><td className="p-2">2.5 years</td><td className="p-2">8.4 years</td><td className="p-2">25 years</td></tr>
                    <tr className="border-b border-purple-500/20"><td className="p-2">$10,000</td><td className="p-2">3.8 years</td><td className="p-2">13 years</td><td className="p-2">38 years</td></tr>
                    <tr><td className="p-2">$1,000,000</td><td className="p-2">6.9 years</td><td className="p-2">23 years</td><td className="p-2">69 years</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-purple-200 leading-relaxed mt-4 border-l-4 border-purple-500 pl-4 italic">
                UNIYAA is built for steady use over years, not for quick gains.
              </p>
            </section>

            {/* Part IV.5 - Trust Model: Verifiable, Oracle-Free Pricing */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part IV.5: The Trust Model—Verifiable, Oracle-Free Pricing</h2>

              <p className="text-purple-200 leading-relaxed">
                UNIYAA does not depend on an oracle or an outside price feed.
              </p>

              <p className="text-purple-200 leading-relaxed mt-4">
                The price is kept by the smart contract itself, in the public <code className="text-purple-300">price_index</code> field. The contract changes it in exactly one way: once per day, by the participation rule in Part IV. <strong className="text-white">No instruction can set the price</strong>, and no admin key can change it.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What You Can Verify Yourself</h3>
              <ol className="list-decimal list-inside text-purple-200 space-y-2 mt-2">
                <li>Read <code className="text-purple-300">price_index</code>, <code className="text-purple-300">payers_today</code> and <code className="text-purple-300">user_count</code> from the public on-chain GlobalState account.</li>
                <li>Apply the rule in Part IV to see how the price will move at the next day&apos;s first payment.</li>
                <li>Compare with what the app displays.</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What Cannot Be Manipulated</h3>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-2">
                <li><strong className="text-white">Setting the price</strong>: there is no instruction to write a price, up or down.</li>
                <li><strong className="text-white">Repeat payments</strong>: each person counts once a day; sending more payments, payments of zero, or payments to yourself adds nothing.</li>
                <li><strong className="text-white">Admin counter</strong>: the admin-only <code className="text-purple-300">record_transaction</code> instruction updates a statistics counter and does not affect the price.</li>
                <li><strong className="text-white">Runaway growth</strong>: growth is capped at 1% a day, and the cap shrinks smoothly as the price rises, to about $45,000 per 30 days at most.</li>
              </ul>
            </section>

            {/* Part V */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part V: How UNIYAA Protects Against Exploitation</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Immutable Fairness Through Code</h3>
              <p className="text-purple-200 leading-relaxed">
                One of UNIYAA&apos;s most powerful features is that its fairness is <strong className="text-white">not dependent on people keeping promises</strong>—it&apos;s encoded in mathematics.
              </p>
              
              <ul className="list-disc list-inside text-purple-200 space-y-3 mt-4">
                <li><strong className="text-white">No Team Minting</strong>: Every token entering circulation follows transparent rules. There&apos;s no admin wallet that can secretly print tokens.</li>
                <li><strong className="text-white">No Price Oracle to Compromise</strong>: The UNIYAA price is kept on-chain and changes only by the participation rule. There is no off-chain feed and no admin key in the price path — see Part IV.5 for the full trust model.</li>
                <li><strong className="text-white">Spam Does Not Count</strong>: Each person counts at most once a day. Payments of zero, payments to yourself, and extra payments on the same day add nothing.</li>
                <li><strong className="text-white">Diminishing Mint Rate</strong>: As adoption grows, the per-attempt amount each new user can mint steps down according to the published Mint Tier Schedule (Part VII). UNIYAA does not enforce a fixed total-supply cap; instead, the combination of the tiered step-down and the on-chain mint cooldown holds issuance asymptotic — i.e. each new cohort can add less than the one before it, and no single actor can outrun the schedule.</li>
                <li><strong className="text-white">Participation-Based Appreciation</strong>: Price appreciation isn&apos;t driven by marketing hype or by the size of the network. It follows the share of people who actually use UNIYAA each day.</li>
              </ul>
            </section>

            {/* Part VI - Philosophy & Values */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VI: Philosophy & Values—Restraint Over Excess</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why UNIYAA Prioritizes Restraint</h3>
              <p className="text-purple-200 leading-relaxed">
                The world is full of promises of abundance: unlimited growth, endless rewards, instant riches. UNIYAA rejects this illusion.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">Restraint is not limitation—it is discipline.</strong> By imposing clear boundaries on minting and growth, UNIYAA creates a system that can last for generations, not just cycles of hype and collapse.
              </p>
              
              <h4 className="text-lg font-semibold text-white mt-6 mb-2">Restraint in Minting</h4>
              <p className="text-purple-200 leading-relaxed">
                Every new UNIYAA token must be earned through participation, not printed by a team. Algorithmic scarcity ensures that as the network grows, each token becomes more valuable—not diluted.
              </p>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Restraint in Growth</h4>
              <p className="text-purple-200 leading-relaxed">
                The price can grow at most 1% a day, and only when people use UNIYAA. As the price rises the daily maximum shrinks smoothly, levelling off at about $45,000 per 30 days. Both limits are enforced by the smart contract. This keeps UNIYAA grounded in slow, steady appreciation—not casino-like volatility.
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

            {/* Part VII - Technical Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Part VII: Technical Summary</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">For the Technically Curious</h3>
              <p className="text-purple-200 leading-relaxed">
                UNIYAA operates on Solana with the following specifications:
              </p>
              
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Smart Contract Architecture:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Global state tracking: user count, counted payments, today&apos;s payers, and the price</li>
                  <li>User accounts: minting history, referral attribution, locked-token vesting, and the day of each user&apos;s last counted payment</li>
                  <li>Counting rule enforced on-chain by <code className="text-purple-300">transfer_tokens</code>: non-zero amount, sender ≠ recipient, token accounts owned by sender and recipient, and at most one counted payment per sender per UTC day</li>
                  <li>Price kept on-chain in <code className="text-purple-300">price_index</code> and updated once per UTC day by participation (at most 1%/day × $150,000 / ($150,000 + price), so about $1,500/day at most at high prices) — no price oracle, no instruction that writes the price</li>
                  <li>Admin-gated maintenance: <code className="text-purple-300">record_transaction</code> updates a statistics counter only and cannot move the price</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Trust Surface (what you must trust):</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li><strong className="text-white">On-chain state</strong>: the <code className="text-purple-300">price_index</code>, <code className="text-purple-300">payers_today</code> and <code className="text-purple-300">user_count</code> fields on the GlobalState PDA</li>
                  <li><strong className="text-white">Published rule</strong>: the daily participation rule in Part IV, enforced by the open-source program</li>
                  <li><strong className="text-white">Solana&apos;s settlement guarantees</strong>: standard for any Solana-native asset</li>
                </ul>
                <p className="text-purple-200 text-sm mt-3 italic">
                  Everything else — the team, the frontend operator, any third-party API — is outside the price trust path. If you trust the on-chain state, you can check the price yourself and verify what every interface shows you.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Token Economics:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Variable minting rate tied to user adoption (see Mint Tier Schedule below)</li>
                  <li>Utility-first design: use UNIYAA to buy and sell goods and services</li>
                  <li>One regular mint per user every 30 days</li>
                  <li>No referral rewards: referrals are optional and record attribution only</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Mint Tier Schedule (per-attempt cap by user registration index):</h4>
                <p className="text-purple-300 text-sm mb-3">
                  Each user&apos;s per-attempt mint amount is determined by the order in which they registered. As more users join, the per-attempt amount steps down, so newcomers can&apos;t flood the supply faster than the early cohort. This is independent of the <em>price</em> model in Part IV — the price describes how UNIYAA <em>appreciates</em>; the mint tiers below describe how much each user can <em>create</em> per mint, once every 30 days.
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
                  Repeat mints are gated by an on-chain 30-day cooldown. There is no hard total-supply cap — the design relies on the per-attempt step-down plus cooldowns to keep issuance asymptotic, not on a fixed maximum.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-white mb-3">Solana Benefits:</h4>
                <ul className="list-disc list-inside text-purple-200 space-y-2">
                  <li>Sub-second finality: transactions complete instantly</li>
                  <li>Near-zero fees: transactions cost &lt;$0.001</li>
                  <li>Scalability: thousands of transactions per second in practice</li>
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
