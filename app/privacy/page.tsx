'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function PrivacyPage() {
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

      {/* Privacy Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-purple-500/30 prose prose-invert prose-purple max-w-none">
            
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="text-6xl mb-6">🔒</div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Privacy Policy
              </h1>
              <p className="text-purple-300 text-lg">Last Updated: January 2026</p>
            </div>

            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Introduction</h2>
              <p className="text-purple-200 leading-relaxed">
                At EQUA, we are committed to protecting your privacy while operating on a public blockchain. This Privacy Policy explains how we handle information in our decentralized ecosystem.
              </p>
              <div className="bg-blue-500/10 rounded-xl p-6 mt-4 border border-blue-500/30">
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">Blockchain Transparency:</strong> EQUA operates on the Solana blockchain, which is public and transparent by design. All transactions and wallet addresses are permanently recorded on the blockchain and are publicly viewable.
                </p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-6 mt-4 border border-green-500/30">
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">No Personal Data Collection:</strong> We do not collect, store, or process any personal information such as names, email addresses, phone numbers, or physical addresses. EQUA is entirely wallet-based.
                </p>
              </div>
            </section>

            {/* Information Collection */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Information Collection</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">On-Chain Data (Public Blockchain Data)</h3>
              <p className="text-purple-200 leading-relaxed">
                The following information is recorded on the Solana blockchain as part of normal smart contract operations:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Wallet Addresses:</strong> Your Solana wallet address is publicly visible on the blockchain</li>
                <li><strong className="text-white">Transaction History:</strong> All EQUA minting, transfers, and transactions are permanently recorded on-chain</li>
                <li><strong className="text-white">Token Balances:</strong> Your EQUA token balance is publicly queryable via Solana Explorer or RPC endpoints</li>
                <li><strong className="text-white">Referral Relationships:</strong> Referral connections between users are stored on-chain for reward distribution</li>
                <li><strong className="text-white">Minting Attempts:</strong> The number of minting attempts and cooldown periods are tracked on-chain</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4 italic">
                <strong className="text-white">Important:</strong> This data is inherent to blockchain technology and cannot be deleted or modified. Anyone can view this information using Solana block explorers or RPC queries.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Off-Chain Data (None Collected)</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">We do NOT collect:</strong>
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>Names, email addresses, or contact information</li>
                <li>Government-issued IDs or KYC documents</li>
                <li>IP addresses or device identifiers (beyond standard web server logs)</li>
                <li>Location data or geolocation tracking</li>
                <li>Social media profiles or third-party account connections</li>
                <li>Payment information (EQUA operates entirely on-chain)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Cookies and Local Storage</h3>
              <p className="text-purple-200 leading-relaxed">
                Our website uses minimal cookies and local browser storage for:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">UI Preferences:</strong> Dark mode settings, language preferences (stored locally in your browser)</li>
                <li><strong className="text-white">Wallet Connection State:</strong> Remembering your connected wallet for convenience (not sent to servers)</li>
                <li><strong className="text-white">Next.js Default Cookies:</strong> Standard session management for the web framework</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                <strong className="text-white">We do NOT use:</strong> Advertising cookies, analytics cookies, or third-party tracking pixels.
              </p>
            </section>

            {/* How We Use Information */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">How We Use Information</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Smart Contract Interactions Only</h3>
              <p className="text-purple-200 leading-relaxed">
                All on-chain data is used exclusively for smart contract functionality:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>Processing EQUA token minting and transfers</li>
                <li>Calculating and distributing referral rewards</li>
                <li>Enforcing cooldown periods and minting limits</li>
                <li>Tracking transaction volume for price appreciation calculations</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Third-Party Sharing</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">We do not share, sell, or rent any user data to third parties.</strong> There is no centralized database of user information to share. All data is on the public Solana blockchain.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Advertising or Tracking</h3>
              <p className="text-purple-200 leading-relaxed">
                EQUA does not use your data for advertising, marketing, or behavioral tracking. We do not integrate with ad networks or analytics platforms that profile users.
              </p>
            </section>

            {/* Data Storage */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Data Storage</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">On-Chain Data (Solana Blockchain)</h3>
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <p className="text-purple-200 leading-relaxed">
                  <strong className="text-white">Storage Location:</strong> All EQUA user data is stored on the Solana blockchain, which is a decentralized, distributed ledger maintained by thousands of independent validators worldwide.
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  <strong className="text-white">Data Immutability:</strong> Blockchain data is immutable and cannot be deleted, modified, or censored. This is a fundamental characteristic of blockchain technology.
                </p>
                <p className="text-purple-200 leading-relaxed mt-3">
                  <strong className="text-white">Public Accessibility:</strong> Anyone can query this data using Solana Explorer, RPC endpoints, or blockchain indexing services.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Centralized Database</h3>
              <p className="text-purple-200 leading-relaxed">
                <strong className="text-white">EQUA does not operate a centralized user database.</strong> There are no servers storing your personal information, transaction history, or account details. Everything is on-chain.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Optional Local Browser Storage</h3>
              <p className="text-purple-200 leading-relaxed">
                UI preferences (such as dark mode or language settings) may be stored in your browser&apos;s local storage. This data:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>Stays on your device only</li>
                <li>Is never sent to our servers</li>
                <li>Can be cleared at any time by clearing your browser cache</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Your Rights</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Control Your Wallet</h3>
              <p className="text-purple-200 leading-relaxed">
                You have complete control over your Solana wallet and private keys. We never have access to your private keys or the ability to move your tokens without your explicit transaction approval.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">No Account Deletion Needed</h3>
              <p className="text-purple-200 leading-relaxed">
                Because EQUA uses wallet-based authentication, there are no &quot;accounts&quot; to delete. Simply disconnect your wallet from our website to stop interacting with the protocol.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4 italic">
                <strong className="text-white">Note:</strong> On-chain data (transactions, balances) will remain on the Solana blockchain permanently, as this is a fundamental characteristic of blockchain technology.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">View Your Data on Solana Explorer</h3>
              <p className="text-purple-200 leading-relaxed">
                You can view all your on-chain EQUA data at any time using Solana Explorer:
              </p>
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <a 
                  href="https://explorer.solana.com/?cluster=devnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:text-purple-100 underline"
                >
                  https://explorer.solana.com/?cluster=devnet
                </a>
              </div>
              <p className="text-purple-200 leading-relaxed mt-4">
                Enter your wallet address to see all transactions, balances, and on-chain interactions.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Third-Party Services</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Solana RPC Endpoints</h3>
              <p className="text-purple-200 leading-relaxed">
                Our application connects to Solana RPC endpoints to interact with the blockchain. These RPC providers may log IP addresses and API request patterns for performance monitoring and abuse prevention.
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Primary RPC:</strong> Solana Devnet public endpoint</li>
                <li><strong className="text-white">Privacy Policy:</strong> <a href="https://solana.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-100 underline">Solana Foundation Privacy Policy</a></li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Wallet Providers</h3>
              <p className="text-purple-200 leading-relaxed">
                When you connect a wallet (Phantom, Solflare, etc.), you are subject to that wallet provider&apos;s privacy policy:
              </p>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li><strong className="text-white">Phantom:</strong> <a href="https://phantom.app/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-100 underline">Privacy Policy</a></li>
                <li><strong className="text-white">Solflare:</strong> <a href="https://solflare.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-100 underline">Privacy Policy</a></li>
                <li><strong className="text-white">Other Wallets:</strong> Please consult your wallet provider&apos;s privacy documentation</li>
              </ul>
              <p className="text-purple-200 leading-relaxed mt-4">
                EQUA does not control or have access to data collected by wallet providers.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Children&apos;s Privacy</h2>
              <p className="text-purple-200 leading-relaxed">
                EQUA does not knowingly collect information from users under the age of 13. Our services are not directed at children, and we do not intentionally gather personal data from anyone under 13 years of age.
              </p>
              <p className="text-purple-200 leading-relaxed mt-4">
                If you believe a child under 13 has provided information to us, please contact us via GitHub, and we will take appropriate steps.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Changes to This Privacy Policy</h2>
              <p className="text-purple-200 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
              </p>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How Updates Are Communicated</h3>
              <ul className="list-disc list-inside text-purple-200 space-y-2 mt-4">
                <li>Updated policy will be posted on this page with a new &quot;Last Updated&quot; date</li>
                <li>Material changes may be announced via our GitHub repository</li>
                <li>Check our GitHub commits for detailed change history</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Review GitHub for Changes</h3>
              <p className="text-purple-200 leading-relaxed">
                You can review the full history of changes to this Privacy Policy on GitHub:
              </p>
              <div className="bg-white/5 rounded-xl p-6 mt-4 border border-purple-500/20">
                <a 
                  href="https://github.com/brainstorm4x/EQUA-FRONTEND/commits/main/app/privacy/page.tsx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:text-purple-100 underline"
                >
                  View Privacy Policy Change History
                </a>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 border-b border-purple-500/30 pb-2">Contact Us</h2>
              <p className="text-purple-200 leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
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
                  <strong className="text-white">Issue Tracker for Privacy Questions:</strong><br />
                  <a 
                    href="https://github.com/brainstorm4x/EQUA/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 underline"
                  >
                    https://github.com/brainstorm4x/EQUA/issues
                  </a>
                </p>
              </div>
              <p className="text-purple-200 leading-relaxed mt-4 italic">
                Please do not send sensitive personal information via public GitHub issues.
              </p>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-purple-500/30">
              <p className="text-2xl font-bold text-white mb-2">EQUA</p>
              <p className="text-purple-300">Equal Access. Equal Opportunity. Equal Economy.</p>
              <p className="text-purple-400 text-sm mt-4">Last Updated: January 2026</p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
