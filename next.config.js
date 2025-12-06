/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip compression for better network performance
  compress: true,
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Enable SWC minification for faster builds and smaller bundles
  swcMinify: true,
  
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
  
  // Experimental features for performance
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      '@solana/wallet-adapter-wallets',
      '@solana/wallet-adapter-react',
      '@coral-xyz/anchor',
      '@solana/web3.js',
    ],
  },
  
  // Headers for better caching and security
  async headers() {
    return [
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
    return config;
  },
  // Note: Turbopack doesn't need explicit fs fallback configuration
  // It automatically handles Node.js modules in browser context
};

module.exports = nextConfig;
