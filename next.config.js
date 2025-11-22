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
  // Add empty turbopack config to acknowledge Turbopack support
  // The webpack fallback for 'fs' is automatically handled by Next.js/Turbopack
  turbopack: {},
};

module.exports = nextConfig;
