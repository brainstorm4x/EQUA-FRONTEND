# Deploying EQUA Frontend to Unstoppable Domains

This guide provides step-by-step instructions for deploying the EQUA frontend application to a Web3 domain using Unstoppable Domains on Polygon, without requiring mainnet deployment.

## Overview

Unstoppable Domains allows you to host decentralized websites using blockchain-based domain names (e.g., `yourdomain.crypto`, `yourdomain.nft`). You can point these domains to your EQUA frontend, which can run on Solana devnet or testnet.

**Important**: Your app's blockchain network is controlled by environment variables (e.g., `NEXT_PUBLIC_NETWORK=devnet`), so mainnet is **not required** for the Solana program side.

## Prerequisites

- An Unstoppable Domain (purchase from [unstoppabledomains.com](https://unstoppabledomains.com))
- EQUA frontend repository cloned locally
- Node.js and npm installed

## Approach A: IPFS Static Deployment (No SSR)

This approach exports the Next.js app as a static site and hosts it on IPFS, which is then linked to your Unstoppable Domain.

### Step 1: Configure Next.js for Static Export

Update your `next.config.js` to enable static export:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        'pino-pretty': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

**Note**: Static export disables some Next.js features like:
- Server-side rendering (SSR)
- API routes
- Image optimization

### Step 2: Set Environment Variables

Create a `.env.local` file (or update your existing one) with your desired network:

```bash
NEXT_PUBLIC_NETWORK=devnet
# or NEXT_PUBLIC_NETWORK=testnet
```

### Step 3: Build and Export

Run the export command:

```bash
npm run build
```

This creates an `out/` directory with your static site.

### Step 4: Upload to IPFS

You can use any of these IPFS pinning services:

#### Option 1: Pinata
1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Upload the `out/` folder via their web interface or API
3. Copy the IPFS CID (Content Identifier)

#### Option 2: Fleek
1. Sign up at [fleek.co](https://fleek.co)
2. Connect your Git repository or upload the `out/` folder
3. Fleek will provide automatic IPFS hosting
4. Copy the IPFS CID

#### Option 3: Web3.Storage
1. Sign up at [web3.storage](https://web3.storage)
2. Use their CLI or web interface to upload `out/`
3. Copy the IPFS CID

#### Option 4: Spheron
1. Sign up at [spheron.network](https://spheron.network)
2. Upload your project and get the IPFS CID
3. Copy the IPFS CID

### Step 5: Configure Unstoppable Domain

1. Log in to your [Unstoppable Domains dashboard](https://unstoppabledomains.com/my-domains)
2. Select your domain
3. Click "Manage" → "Website"
4. Under "IPFS Hash", enter your CID from Step 4
5. Save changes

Your site will be accessible at:
- `https://yourdomain.crypto` (via UD's gateway)
- `ipfs://YOUR_CID` (via IPFS clients/gateways)

### Step 6: SPA Routing Considerations

Static exports create a single-page application (SPA). To handle client-side routing:

1. Most IPFS hosting platforms support `_redirects` or configuration for SPA routing
2. For Fleek, create a `_redirects` file in your `public/` folder before building:
   ```
   /*    /index.html   200
   ```
3. For other platforms, check their SPA configuration docs

### Limitations of Static Export
- No server-side rendering (SSR)
- No dynamic API routes
- Image optimization disabled (images served as-is)
- Wallet connections and client-side features work normally

---

## Approach B: SSR/Serverful Deployment with Testnet

If your app requires server-side rendering or API routes, deploy to a traditional hosting platform and point your Unstoppable Domain to it.

### Step 1: Deploy to Hosting Platform

Choose a hosting platform that supports Next.js SSR:

#### Option 1: Vercel
1. Push your code to GitHub/GitLab
2. Sign up at [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_NETWORK=devnet
   ```
5. Deploy
6. Copy your deployment URL (e.g., `https://equa-frontend.vercel.app`)

#### Option 2: Netlify
1. Push your code to GitHub/GitLab
2. Sign up at [netlify.com](https://netlify.com)
3. Import your repository
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables in Netlify settings
7. Deploy
8. Copy your deployment URL

### Step 2: Point Unstoppable Domain to Your Deployment

#### Method 1: DNS/CNAME (Recommended)
1. In your Unstoppable Domains dashboard, go to "Manage" → "Website"
2. Select "DNS Records"
3. Add a CNAME record pointing to your hosting platform:
   - **Vercel**: Point to your Vercel domain
   - **Netlify**: Point to your Netlify domain
4. Save changes

#### Method 2: Redirect Link
1. Use Unstoppable Domains' built-in redirect feature
2. Go to "Manage" → "Website"
3. Use the "Redirect" option to point to your hosted URL
4. Note: This uses `yourdomain.crypto.link` as a gateway

### Benefits of SSR Approach
- Full Next.js features available
- Server-side rendering for better SEO
- API routes for backend logic
- Image optimization
- Can still use devnet/testnet

---

## Network Configuration

Your EQUA app's Solana network is controlled by environment variables:

```bash
# For devnet (default)
NEXT_PUBLIC_NETWORK=devnet

# For testnet
NEXT_PUBLIC_NETWORK=testnet

# Mainnet is NOT required for this deployment
```

The app will connect to the appropriate Solana cluster based on this variable. Users can still use devnet/testnet funds, and all minting/token operations will occur on that network.

---

## Testing Your Deployment

1. **Static/IPFS**: Visit `https://yourdomain.crypto` in a Web3-enabled browser (Opera, Brave) or use UD's gateway link
2. **SSR/Hosting**: Visit your custom domain directly in any browser
3. Test wallet connection and minting functionality
4. Verify the network indicator shows "Devnet" or "Testnet"

---

## Troubleshooting

### Static Export Issues
- **Images not loading**: Ensure `images.unoptimized: true` in `next.config.js`
- **Routes not working**: Add `_redirects` file for SPA routing
- **Build errors**: Check that no SSR-only features are used

### IPFS Issues
- **Slow loading**: IPFS can be slower than traditional hosting; consider using a CDN
- **Content not updating**: IPFS content is immutable; you need to re-upload and update the CID in UD dashboard

### Unstoppable Domain Issues
- **Domain not resolving**: DNS propagation can take up to 24-48 hours
- **IPFS content not loading**: Ensure the CID is correct and pinned
- **Gateway errors**: Try different Web3 browsers or UD's gateway link

---

## Best Practices

1. **Use devnet for testing**: Keep your app on devnet until fully tested
2. **Pin IPFS content**: Ensure your IPFS content remains available by using a pinning service
3. **Update CID for changes**: Every time you update your site, you must generate a new CID and update UD dashboard
4. **Monitor performance**: IPFS hosting may be slower than traditional hosting; consider approach B for better UX
5. **Keep environment variables secure**: Don't commit sensitive keys to your repo

---

## Additional Resources

- [Unstoppable Domains Documentation](https://docs.unstoppabledomains.com/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Next.js Static Export](https://nextjs.org/docs/pages/building-your-application/deploying/static-exports)
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Netlify Next.js Deployment](https://docs.netlify.com/frameworks/next-js/)

---

## Summary

- **Approach A (IPFS)**: Best for fully static, decentralized hosting; requires static export configuration
- **Approach B (SSR)**: Best for apps needing server features; uses traditional hosting with UD domain pointing
- **Network**: Set to devnet/testnet via env variables; mainnet not required
- **Testing**: Always test on devnet before moving to production
