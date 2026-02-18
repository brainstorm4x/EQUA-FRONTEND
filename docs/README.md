# EQUA Frontend Documentation

## Quick Navigation

### Mobile Wallet Adapter Issues
- **[Testing Guide](TESTING_MWA_FIX.md)** - How to test the MWA fix on mobile devices
- **[Quick Reference](MWA_FIX_SUMMARY.md)** - TL;DR of the MWA signature verification fix
- **[Complete History](MOBILE_WALLET_ADAPTER_FIX_HISTORY.md)** - Full timeline of fix attempts (PRs #267, #276, #277)

### API & Backend
- **[API Documentation](API.md)** - Backend API endpoints and usage
- **[Business Registry API](BUSINESS_REGISTRY_API.md)** - Business account registration API

### Deployment
- **[Netlify Deployment](NETLIFY_DEPLOYMENT.md)** - How to deploy to Netlify

### Testing
- **[Manual Testing - Wallet Providers](MANUAL_TESTING_WALLET_PROVIDERS.md)** - How to test different wallet providers
- **[Testing MWA Fix](TESTING_MWA_FIX.md)** - Mobile Wallet Adapter testing procedures

### Technical Specs
- **[Transaction Counting](TRANSACTION_COUNTING.md)** - How minting attempts are counted
- **[Whitepaper](WHITEPAPER.md)** - EQUA token economics and mechanics

## Recent Updates

### 2026-02-18: Mobile Wallet Adapter Fix (PR #277)
**Issue:** "Signature verification failed. Missing signature for public key" error on mobile external browsers

**Fix:** Route Mobile Wallet Adapter through mobile registration path using `signTransaction()` instead of `sendTransaction()`

**Documents:**
- [Testing Guide](TESTING_MWA_FIX.md) - How to verify the fix
- [Quick Reference](MWA_FIX_SUMMARY.md) - Quick overview
- [Complete History](MOBILE_WALLET_ADAPTER_FIX_HISTORY.md) - Full details

### Previous Attempts
- **PR #267** (2026-02-15): Added forensic logging (didn't fix)
- **PR #276** (2026-02-18): Conditional setSigners/compileMessage skip (didn't fix)
- **PR #277** (2026-02-18): Route MWA to mobile path (FIXED ✅)

## Contributing to Docs

When adding new documentation:
1. Create markdown file in `/docs`
2. Add entry to this README under appropriate section
3. Link related docs together
4. Update "Recent Updates" if relevant

## Need Help?

- Check existing docs first
- Look in `/docs` for specific topics
- Search in code comments for inline documentation
- Review test files for usage examples

---

Last Updated: 2026-02-18
