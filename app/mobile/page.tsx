'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AppDownload } from '@/components/AppDownload';
import { phantomBrowseLink, solflareBrowseLink } from '@/utils/walletBrowseLinks';

/**
 * Dedicated Mobile Browser Landing Page
 *
 * Shown when a user visits the UNIYAA site from a mobile external browser
 * (Chrome / Safari on Android / iOS).  Those browsers have no Solana wallet
 * inside the page, so sign-up cannot work there.  We offer the paths that do:
 *
 *   1. Open the site inside Phantom's or Solflare's in-app browser, where the
 *      wallet is injected (see src/utils/walletBrowseLinks.ts)
 *   2. Download the UNIYAA Android app (APK, served by /.netlify/functions/apk)
 *   3. Switch to a desktop browser with Phantom or Solflare installed
 *
 * Users are redirected here automatically from both app/page.tsx and
 * src/components/ui/WalletButton.tsx when mobile-browser is detected.
 */
export default function MobilePage() {
  // Built after mount: the links need window.location.origin.
  const [links, setLinks] = useState<{ phantom: string; solflare: string } | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const target = `${origin}/mint`;
    setLinks({
      phantom: phantomBrowseLink(target, origin),
      solflare: solflareBrowseLink(target, origin),
    });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">

        {/* Logo */}
        <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 border border-purple-500/40 backdrop-blur-sm">
          <Logo size={64} priority />
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white leading-snug">
            Sign up from your wallet app
          </h1>
          <p className="text-purple-300 text-sm leading-relaxed">
            Your phone&apos;s browser cannot reach your wallet. Open UNIYAA inside
            Phantom or Solflare and sign up there, or use the UNIYAA app.
          </p>
        </div>

        {/* Open in wallet */}
        <div className="flex flex-col gap-3 w-full">
          <a
            href={links?.phantom}
            aria-disabled={!links}
            data-testid="open-in-phantom"
            className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-xl transition-colors text-sm"
          >
            Open in Phantom
          </a>
          <a
            href={links?.solflare}
            aria-disabled={!links}
            data-testid="open-in-solflare"
            className="flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-5 rounded-xl transition-colors text-sm"
          >
            Open in Solflare
          </a>
          <p className="text-purple-400 text-xs leading-relaxed">
            No wallet yet? Install Phantom or Solflare from your app store, then
            come back and tap the button.
          </p>
        </div>

        {/* App downloads */}
        <div className="flex flex-col gap-3 w-full border-t border-purple-500/30 pt-6">
          <div
            className="flex items-center justify-center gap-3 bg-white/10 text-purple-200 font-semibold py-3 px-5 rounded-xl text-sm"
            aria-label="iPhone app coming soon"
          >
            {/* Apple logo */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 fill-current" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            iPhone app coming soon
          </div>

          <AppDownload />
        </div>

        {/* Desktop suggestion */}
        <div className="border-t border-purple-500/30 pt-6 w-full">
          <p className="text-purple-400 text-xs leading-relaxed">
            <strong className="text-purple-300">Using a desktop computer?</strong>
            <br />
            Install the{' '}
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-purple-200 transition-colors"
            >
              Phantom
            </a>{' '}
            or{' '}
            <a
              href="https://solflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-purple-200 transition-colors"
            >
              Solflare
            </a>{' '}
            browser extension, then visit this page in your desktop browser.
          </p>
        </div>

        {/* Back to browsing */}
        <Link
          href="/"
          className="text-purple-400 hover:text-purple-200 text-sm underline transition-colors"
        >
          ← Back to browsing
        </Link>

      </div>
    </main>
  );
}
