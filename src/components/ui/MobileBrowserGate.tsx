'use client';

import { FC } from 'react';

/**
 * Mobile Browser Gate
 *
 * Shown when the user visits EQUA from a mobile external browser (Chrome/Safari on
 * Android/iOS).  Deep-linking to wallet extensions is unreliable in these browsers,
 * so we guide the user toward the two supported paths instead:
 *
 *   1. Download the EQUA Flutter mobile app (available on iOS and Android)
 *   2. Switch to a desktop browser with a Phantom or Solflare extension installed
 *
 * This component intentionally does NOT expose any wallet-connection UI.
 */
export const MobileBrowserGate: FC = () => {
  return (
    <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto py-4">
      {/* Logo */}
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/30 border border-purple-500/50">
        <span className="text-3xl font-bold text-purple-300">E</span>
      </div>

      {/* Headline */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          EQUA works best on desktop or in our mobile app
        </h2>
        <p className="text-purple-300 text-sm leading-relaxed">
          For the best experience, please use a desktop browser with a Phantom or Solflare
          extension, or download the EQUA app for your phone.
        </p>
      </div>

      {/* App store buttons */}
      <div className="flex flex-col gap-3 w-full">
        <a
          href="https://apps.apple.com/app/equa"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-5 rounded-xl transition-opacity hover:opacity-90 text-sm"
        >
          {/* Apple logo */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Download on the App Store
        </a>

        <a
          href="https://play.google.com/store/apps/details?id=com.equa.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-xl transition-colors text-sm"
        >
          {/* Google Play logo */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M3.18 23.76c.37.2.8.2 1.18 0l10.85-6.26-2.36-2.36-9.67 8.62zm14.42-8.32L4.36 7.18 3.18.24C2.8.04 2.38.04 2 .24c-.38.2-.62.6-.62 1.04v21.44c0 .44.24.84.62 1.04l12.24-7.06 2.36-1.26zM21.5 10.5l-3.36-1.94-2.67 2.67 2.67 2.67 3.38-1.95c.96-.56.96-1.9-.02-2.45zM4.36 7.18l13.24 7.64-2.36-2.36L4.36 7.18z"/>
          </svg>
          Get it on Google Play
        </a>
      </div>

      {/* Desktop suggestion */}
      <div className="border-t border-purple-500/20 pt-4 w-full">
        <p className="text-purple-400 text-xs leading-relaxed">
          <strong className="text-purple-300">Using a desktop computer?</strong>
          <br />
          Install the{' '}
          <a
            href="https://phantom.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-purple-200"
          >
            Phantom
          </a>{' '}
          or{' '}
          <a
            href="https://solflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-purple-200"
          >
            Solflare
          </a>{' '}
          browser extension, then visit this page in your desktop browser.
        </p>
      </div>
    </div>
  );
};
