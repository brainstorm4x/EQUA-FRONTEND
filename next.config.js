/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip compression for better network performance
  compress: true,
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,

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
  
  // Transpile ESM-only packages
  transpilePackages: [
    '@solana/spl-token',
  ],

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
  
  // TODO(turbopack): Port the webpack hooks below to `turbopack` config.
  // Build/dev currently run with --webpack (see package.json scripts) to keep
  // this block live. When porting:
  //   - resolve.fallback {fs:false, 'pino-pretty':false} → turbopack.resolveAlias
  //   - splitChunks Solana cacheGroup → likely a no-op; Turbopack chunks vendor
  //     packages automatically. Verify bundle sizes afterwards.
  //   - .m?js fullySpecified:false rule → not needed; Turbopack handles ESM.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        'pino-pretty': false,
      };
      
      // Optimize chunk splitting for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate Solana-related code into its own chunk
            solana: {
              test: /[\\/]node_modules[\\/](@solana|@coral-xyz)[\\/]/,
              name: 'solana-vendor',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }
    
    // Handle ES module resolution issues that can cause syntax errors in compiled chunks
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  // Note: Turbopack doesn't need explicit fs fallback configuration
  // It automatically handles Node.js modules in browser context
};

module.exports = nextConfig;
