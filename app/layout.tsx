import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import { DM_Sans } from "next/font/google";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "UNIYAA Token - Solana DApp",
  description: "A payment token on Solana whose value grows with everyday use.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
};

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
        {/* Preconnect for wallet adapter resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Providers component includes process shim, QueryClient, WalletProvider, and WebVitalsClient */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
