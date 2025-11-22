# Security Notes

## Known Vulnerabilities

### Current Status

As of the latest audit, there are 7 high severity vulnerabilities in the dependency tree. These are primarily in indirect dependencies:

1. **bigint-buffer** - Buffer overflow vulnerability in `toBigIntLE()` function
   - Impact: Used by `@solana/web3.js` and `@solana/spl-token`
   - Status: Cannot be directly fixed without upgrading Solana libraries which may break compatibility
   - Mitigation: The vulnerability is in a low-level library; actual risk depends on usage patterns

2. **glob** - Command injection in CLI via `-c/--cmd` flag
   - Impact: Used by Next.js ESLint plugin
   - Status: Low risk as this is only used during development/build, not in production runtime
   - Mitigation: Do not use untrusted input with glob CLI commands

3. **@solana/web3.js** version constraint
   - Current: 1.95.8 (pinned for compatibility with Anchor 0.32.1)
   - Latest: 1.98.4
   - Status: Version is pinned to maintain compatibility with Anchor framework
   - Consideration: Upgrading may break Anchor integration

## Dependency Management

### Installation

This project requires `--legacy-peer-deps` flag due to peer dependency conflicts between:
- Solana wallet adapters requiring `@solana/web3.js@^1.98.0`
- Anchor framework requiring `@solana/web3.js@^1.69.0`

```bash
npm install --legacy-peer-deps
```

### Version Constraints

The following dependencies are version-constrained for compatibility:

- `@solana/web3.js@1.95.8` - Middle ground between Anchor and wallet adapter requirements
- `@coral-xyz/anchor@0.32.1` - Solana program framework
- `@solana/spl-token@0.4.14` - Token-2022 support
- `next@14.2.33` - Latest stable in 14.x series

## Security Best Practices

### Development

1. **Never commit secrets** - All private keys and sensitive data must be in environment variables
2. **Validate user input** - Always validate and sanitize user input before processing
3. **Use HTTPS** - Production deployments must use HTTPS
4. **Regular audits** - Run `npm audit` regularly and review findings

### Production

1. **Environment variables** - Use environment variables for sensitive configuration
2. **Content Security Policy** - Implement CSP headers in production
3. **Rate limiting** - Implement rate limiting on RPC endpoints
4. **Wallet security** - Never request seed phrases or private keys from users

## Updating Dependencies

### Safe Updates

The following can be updated without breaking changes:

```bash
npm update autoprefixer postcss typescript --legacy-peer-deps
```

### Major Updates (Requires Testing)

The following require careful testing due to potential breaking changes:

- Next.js 14 → 15/16 (major framework changes)
- React 18 → 19 (concurrent rendering changes)
- Tailwind 3 → 4 (configuration changes)
- ESLint 8 → 9 (flat config migration)

### Solana Dependencies

**Do not update** without thorough testing:
- `@solana/web3.js`
- `@coral-xyz/anchor`
- `@solana/spl-token`
- Wallet adapter packages

These are tightly coupled and version mismatches can cause runtime failures.

## Reporting Security Issues

If you discover a security vulnerability, please email the maintainers directly rather than opening a public issue.

## Mitigation Plan

1. **Short term**: Continue monitoring vulnerabilities, use defensive coding practices
2. **Medium term**: Wait for Solana ecosystem packages to resolve peer dependency conflicts
3. **Long term**: Upgrade to latest stable versions once ecosystem stabilizes

Last updated: 2025-11-22
