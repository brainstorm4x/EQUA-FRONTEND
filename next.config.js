/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip compression for better network performance
  compress: true,
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Next 16.3 type-checks every file tsconfig.json includes, test files too.
  // The build checks app code only; `npm run typecheck` still covers tests.
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },

  // Optimize images with Next.js Image component
  images: {
    formats: ['image/avif', 'image/webp'],
    // Minimize image sizes while maintaining quality
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    // Allow external QR code API for receive modal
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  
  // Still nested under `experimental:` in Next 16 (the top-level promotion
  // didn't happen). Dropped `@solana/wallet-adapter-wallets` here — it was
  // removed from dependencies; live wallet selection happens via Wallet
  // Standard auto-detect.
  experimental: {
    optimizePackageImports: [
      '@solana/wallet-adapter-react',
      '@coral-xyz/anchor',
      '@solana/web3.js',
    ],
  },

  // Turbopack replaces the webpack `resolve.fallback` for Node-only modules
  // that the wallet-adapter / Solana stack reaches for in browser bundles.
  // Aliasing them to a local empty stub for browser targets is the Turbopack
  // equivalent of `{ fs: false, 'pino-pretty': false }`. Turbopack chunks
  // vendor packages automatically (no need for the old splitChunks
  // solana-vendor cache group) and handles ESM natively (no need for the
  // `.m?js` fullySpecified:false rule).
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/lib/empty-module.js' },
      'pino-pretty': { browser: './src/lib/empty-module.js' },
    },
  },

  // Multiple lockfiles exist on this machine ($HOME/package-lock.json etc).
  // Pin tracing root to this project so dev/build don't accidentally include
  // unrelated workspaces in the file-trace output.
  outputFileTracingRoot: __dirname,
  
  // Headers for better caching and security
  async headers() {
    // Baseline security headers applied to every response.
    // Notes on choices:
    // - frame-ancestors 'none' (via CSP) plus X-Frame-Options: DENY prevents
    //   any other site from iframing the wallet UI for clickjacking.
    // - We intentionally do NOT set a strict script-src / connect-src CSP
    //   because the Solana wallet-adapter stack connects to many wallet
    //   origins (Phantom, Solflare, WalletConnect bridges, etc.) and would
    //   require constant maintenance. Re-introduce a stricter CSP when the
    //   set of allowed wallet origins stabilises.
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        // Camera needed for QR scanning; everything else off.
        key: 'Permissions-Policy',
        value:
          'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'",
      },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
};

module.exports = nextConfig;
