'use client';

import { FC, useState, useEffect } from 'react';
import QRCode from 'qrcode';

/**
 * MobileWalletInstructions
 *
 * Shown to users visiting EQUA from a mobile external browser (Chrome/Safari).
 * Guides them to use Phantom or Solflare's in-app browser for a seamless,
 * reliable wallet connection — the industry-standard approach.
 */
export const MobileWalletInstructions: FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://equa.live';

  // Generate QR code for current URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.origin, {
        width: 200,
        margin: 2,
        color: {
          dark: '#6B21A8', // Purple-700
          light: '#FFFFFF',
        },
      }).then(setQrCodeUrl);

      // Analytics: track when users view instructions
      console.log('📊 [Analytics] Mobile browser instructions viewed');
      if (typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'mobile_browser_instructions_viewed', {
          event_category: 'wallet',
          event_label: 'mobile_external_browser',
        });
      }
    }
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
    }
  };

  const trackDownload = (label: string) => {
    console.log(`📊 [Analytics] Wallet download clicked: ${label}`);
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'wallet_download_clicked', {
        event_category: 'wallet',
        event_label: label,
      });
    }
  };

  const phantomSteps = [
    'Download the Phantom app (iOS or Android)',
    'Open Phantom → tap the Browser tab at the bottom',
    `Navigate to ${siteUrl}`,
    'Connect your wallet and start using EQUA!',
  ];

  const solflareSteps = [
    'Download the Solflare app (iOS or Android)',
    'Open Solflare → tap Discover → Browser',
    `Navigate to ${siteUrl}`,
    'Connect your wallet and start using EQUA!',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 text-white px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">📱</div>
          <h1 className="text-3xl font-bold">Use In-App Browser</h1>
          <p className="text-purple-200 text-lg leading-relaxed">
            For the best experience, open EQUA inside your wallet app&apos;s built-in browser.
          </p>
        </div>

        {/* Why use in-app browser */}
        <div className="bg-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="font-bold text-xl">✨ Why In-App Browser?</h2>
          <ul className="space-y-2 text-purple-200">
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">✅</span>
              <span>Instant wallet connection — no redirects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">✅</span>
              <span>100% reliable — no deep linking failures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">✅</span>
              <span>Seamless transaction approval</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0">✅</span>
              <span>More secure — wallet stays in control</span>
            </li>
          </ul>
        </div>

        {/* Phantom Instructions */}
        <div className="bg-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: '#9945FF' }}
            >
              👻
            </div>
            <h2 className="font-bold text-xl">Phantom Wallet</h2>
          </div>
          <ol className="space-y-3">
            {phantomSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 bg-black/20 rounded-xl p-3">
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: '#9945FF' }}
                >
                  {i + 1}
                </span>
                <span className="text-purple-100">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-3 pt-2">
            <a
              href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload('phantom_ios')}
              className="flex-1 bg-black/30 hover:bg-black/50 transition rounded-xl py-3 text-center font-semibold text-sm"
            >
              🍎 App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=app.phantom"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload('phantom_android')}
              className="flex-1 bg-black/30 hover:bg-black/50 transition rounded-xl py-3 text-center font-semibold text-sm"
            >
              🤖 Google Play
            </a>
          </div>
        </div>

        {/* Solflare Instructions */}
        <div className="bg-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: '#FF6B00' }}
            >
              🔥
            </div>
            <h2 className="font-bold text-xl">Solflare Wallet</h2>
          </div>
          <ol className="space-y-3">
            {solflareSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 bg-black/20 rounded-xl p-3">
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: '#FF6B00' }}
                >
                  {i + 1}
                </span>
                <span className="text-purple-100">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-3 pt-2">
            <a
              href="https://apps.apple.com/app/solflare-solana-wallet/id1580902717"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload('solflare_ios')}
              className="flex-1 bg-black/30 hover:bg-black/50 transition rounded-xl py-3 text-center font-semibold text-sm"
            >
              🍎 App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.solflare.mobile"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackDownload('solflare_android')}
              className="flex-1 bg-black/30 hover:bg-black/50 transition rounded-xl py-3 text-center font-semibold text-sm"
            >
              🤖 Google Play
            </a>
          </div>
        </div>

        {/* Copy URL */}
        <div className="bg-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="font-bold text-xl">🔗 Copy This URL</h2>
          <p className="text-purple-200 text-sm">
            Paste this into your wallet app&apos;s browser:
          </p>
          <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
            <code className="flex-1 text-purple-100 font-mono text-sm break-all">{siteUrl}</code>
            <button
              onClick={handleCopyUrl}
              className="shrink-0 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 transition rounded-lg px-4 py-2 font-semibold text-sm min-w-[80px]"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="bg-white/10 rounded-2xl p-6 space-y-3 text-center">
            <h2 className="font-bold text-xl">📷 Scan from Desktop</h2>
            <p className="text-purple-200 text-sm">
              On a desktop? Scan this QR code with your phone to open the site in your wallet app.
            </p>
            <div className="inline-block bg-white rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR code to open EQUA in wallet browser"
                width={200}
                height={200}
              />
            </div>
          </div>
        )}

        {/* Support */}
        <div className="text-center text-purple-400 text-sm space-y-1 pb-4">
          <p>Need help? Visit us on desktop or contact support.</p>
          <p>
            <a
              href="https://equa.live"
              className="underline hover:text-purple-200 transition"
            >
              equa.live
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
