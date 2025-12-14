import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import dynamic from "next/dynamic";

// Dynamically import DiagnosticsOverlay with no SSR (dev-only component)
const DiagnosticsOverlay = dynamic(
  () => import('@/components/DiagnosticsOverlay').then((mod) => ({ default: mod.DiagnosticsOverlay })),
  { ssr: false }
);

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical assets for faster loading */}
        <link rel="preload" href="/branding/equa-logo.png" as="image" type="image/png" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
        {/* Preconnect for wallet adapter resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Providers component includes process shim, QueryClient, WalletProvider, and WebVitalsClient */}
        <Providers>{children}</Providers>
        {/* Development-only diagnostics overlay */}
        <DiagnosticsOverlay />
      </body>
    </html>
  );
}
