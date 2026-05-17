// Empty stub for browser bundles. Aliased into client-side imports of
// Node-only modules (fs) and dev-only loggers (pino-pretty) via the
// `turbopack.resolveAlias` block in next.config.js. Replaces the webpack
// `resolve.fallback = { fs: false, 'pino-pretty': false }` pattern.
module.exports = {};
