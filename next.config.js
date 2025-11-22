/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      // Prevents 'fs' module resolution in browser bundles (for Solana libraries)
      // Turbopack equivalent of webpack's resolve.fallback configuration
      fs: false,
    },
  },
};

module.exports = nextConfig;
