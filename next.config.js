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
      // Fallback for Node.js modules in client-side code (for Solana libraries)
      // Note: Turbopack applies this to client bundles by default, similar to webpack's !isServer condition
      fs: false,
    },
  },
};

module.exports = nextConfig;
