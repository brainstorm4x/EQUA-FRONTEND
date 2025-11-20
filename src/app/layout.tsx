import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

export const metadata: Metadata = {
  title: "EQUA Token - Decentralized Token Platform",
  description: "Mint and manage EQUA tokens on Solana blockchain",
  keywords: ["EQUA", "Solana", "Web3", "Token", "Cryptocurrency", "DeFi"],
  authors: [{ name: "EQUA Team" }],
  openGraph: {
    title: "EQUA Token - Decentralized Token Platform",
    description: "Mint and manage EQUA tokens on Solana blockchain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <head>
        {/* Load fonts from CDN as fallback */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" 
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
