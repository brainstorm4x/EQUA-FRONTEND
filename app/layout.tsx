import type { Metadata } from "next";
import "./globals.css";
import "./style-preview.css";
import { Plus_Jakarta_Sans, Manrope, DM_Sans } from "next/font/google";
import { StylePicker } from "@/components/StylePicker";
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

// STYLE PREVIEW ONLY: fonts for the three style directions
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans", display: "swap" });

// Applies the saved or ?style= choice before the first paint, so there is no flash.
const STYLE_BOOT = `try{var q=new URLSearchParams(location.search).get('style');var s=q||localStorage.getItem('uniyaa:style-preview')||'a';if(['now','a','b','c'].indexOf(s)<0)s='a';document.documentElement.dataset.style=s;if(q)localStorage.setItem('uniyaa:style-preview',s)}catch(e){document.documentElement.dataset.style='a'}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${manrope.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT }} />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
        {/* Preconnect for wallet adapter resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Providers component includes process shim, QueryClient, WalletProvider, and WebVitalsClient */}
        <Providers>{children}</Providers>
        <StylePicker />
      </body>
    </html>
  );
}
