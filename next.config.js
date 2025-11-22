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
      fs: false,
    },
  },
};

module.exports = nextConfig;
