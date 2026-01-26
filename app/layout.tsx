import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "EQUA Token - Solana DApp",
  description: "A revolutionary token system on Solana blockchain with price appreciation and referral bonuses.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
  // Prevent aggressive caching to ensure users see latest code
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
        {/* Preconnect for wallet adapter resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Cache-busting meta tags to prevent stale UI */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="font-sans antialiased">
        {/* Providers component includes process shim, QueryClient, WalletProvider, and WebVitalsClient */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
