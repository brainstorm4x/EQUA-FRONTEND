/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        'pino-pretty': false,
      };
    }
    return config;
  },
  // Note: Turbopack doesn't need explicit fs fallback configuration
  // It automatically handles Node.js modules in browser context
};

module.exports = nextConfig;
