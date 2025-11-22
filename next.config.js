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
  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      fs: false,
    },
  },
};

module.exports = nextConfig;
