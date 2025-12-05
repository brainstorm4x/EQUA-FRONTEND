import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import ClientShim from "./client-shim";
import Script from "next/script";

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
        <link rel="preload" href="/equa-logo.svg" as="image" type="image/svg+xml" />
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
        {/* Preconnect for wallet adapter resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Client-side process shim to prevent "process is not defined" errors */}
        <ClientShim />
        {/* React Query Provider wraps WalletProvider to provide query client context */}
        <QueryClientProvider>
          <WalletProvider>{children}</WalletProvider>
        </QueryClientProvider>
        {/* Initialize Web Vitals tracking - loaded after page render */}
        <Script
          id="web-vitals"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Lightweight Web Vitals initialization
              if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
                try {
                  // Track LCP
                  new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const last = entries[entries.length - 1];
                    // Check if development mode (process should be shimmed at this point)
                    if (last && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
                      console.log('[WebVital] LCP:', last.startTime.toFixed(0), 'ms');
                    }
                  }).observe({ type: 'largest-contentful-paint', buffered: true });
                  
                  // Track CLS
                  let cls = 0;
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (!entry.hadRecentInput && entry.value) cls += entry.value;
                    }
                  }).observe({ type: 'layout-shift', buffered: true });
                } catch(e) {}
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
