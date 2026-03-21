# UNIA Token Frontend

Next.js 14 (App Router) + Solana blockchain dApp for minting UNIA tokens with time-locked rewards, referral system, and dynamic pricing.

## Features

- 🪙 **Token Minting**: Mint UNIA tokens using Token-2022 (SPL Token Extensions)
- 🔐 **Wallet Integration**: Support for Phantom, Solflare, and mobile wallets
- 📱 **Mobile-First**: Native mobile wallet support via Solana Mobile Wallet Adapter
- 🎁 **Referral System**: 10-character alphanumeric referral codes with 15-minute TTL
- 💰 **Dynamic Pricing**: Tier-based mint pricing with elevated rewards for early users
- ⏰ **Time-Locked Rewards**: Daily mint attempts with 24-hour cooldown
- 📊 **User Dashboard**: Track minting history, rewards, and referrals
- 🌐 **Devnet/Mainnet**: Configurable network support

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Blockchain**: Solana (Token-2022 program)
- **Wallet Adapters**: 
  - Desktop: Phantom, Solflare browser extensions
  - Mobile: Solana Mobile Wallet Adapter (Phantom Mobile, Solflare Mobile)
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **Deployment**: Netlify

## Installation

### Prerequisites

- Node.js 20+
- npm or yarn
- Solana wallet (Phantom, Solflare, or mobile wallet app)

### Setup

```bash
# Clone the repository
git clone https://github.com/brainstorm4x/EQUA-FRONTEND.git
cd UNIA-FRONTEND

# Install dependencies (use --legacy-peer-deps due to Solana wallet adapter peer dependencies)
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Configure environment variables
# - NEXT_PUBLIC_RPC_ENDPOINT: Solana RPC endpoint (devnet/mainnet)
# - NEXT_PUBLIC_PROGRAM_ID: UNIA program ID

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Mobile Wallet Support

UNIA supports three distinct wallet connection environments:

### Connection Environments

**1. Desktop Browser** 🖥️
- Uses browser extension adapters (Phantom, Solflare)
- Wallet connects via `window.solana` injection
- One-click connection without redirects

**2. Mobile In-App Browser** 📱
- Access UNIA directly from within your wallet app (Phantom/Solflare in-app browser)
- Uses the same extension adapters as desktop
- Wallet is pre-injected via `window.solana`
- Fastest connection method on mobile

**3. Mobile External Browser** 🔗
- Use Chrome, Safari, or any mobile browser
- Uses Mobile Wallet Adapter with deep linking
- Requires wallet app to be installed
- Automatically redirects to wallet app for signing
- Returns to browser after approval

### For Mobile Users

#### Option 1: In-App Browser (Recommended)
1. **Open wallet app** (Phantom or Solflare)
2. **Use in-app browser** to visit UNIA
3. **Connect instantly** - wallet is already available
4. **Register and mint** - no redirects needed

#### Option 2: External Browser (Chrome/Safari)
1. **Install a Solana wallet app**:
   - [Phantom Mobile](https://phantom.app/download) (iOS/Android)
   - [Solflare Mobile](https://solflare.com/download) (iOS/Android)
   - Or any Solana Mobile Stack (SMS) compatible wallet

2. **Connect on mobile**:
   - Visit UNIA in your mobile browser
   - Click **"Select Wallet"**
   - Choose your wallet from the list
   - You'll be redirected to your wallet app (deep link)
   - Approve the connection in your wallet app
   - You'll be redirected back to browser

3. **Register and mint**:
   - Each transaction opens your wallet app
   - Approve in the wallet app
   - Automatically returns to browser
   - Secure and seamless experience

### Technical Details

**Environment Detection:**
- **Desktop**: Browser extensions via `window.solana` injection
- **Mobile In-App**: Wallet injection via `window.solana` (same as desktop)
- **Mobile External**: Mobile Wallet Adapter with deep linking to installed apps

**Adapter Selection:**
```typescript
// Always provide standard adapters for all environments
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network })
];

// @solana/wallet-adapter-react (v0.15.21+) automatically:
// 1. Detects mobile environment (Android non-WebView)
// 2. Creates and adds Mobile Wallet Adapter when on mobile
// 3. Prepends MWA to adapter list for deep linking support
```

**Mobile Wallet Adapter (Auto-Added on Mobile):**
- Automatically created by `@solana/wallet-adapter-react` when mobile is detected
- Uses deep links (`solana-wallet://`) to open native wallet apps
- Automatically redirects back to browser after wallet interaction
- Works with all Solana Mobile Stack (SMS) compatible wallets
- No manual configuration needed for basic setup

**App Identity (Auto-Generated):**
```typescript
{
  uri: window.location.origin,  // Auto-detected
  // Optional: Configure custom name and icon via WalletProvider
}
```

### Troubleshooting

**Registration fails in mobile browser:**
- ✅ **Solution**: Use wallet's in-app browser for fastest experience
- **Alternative**: Install wallet app and use deep linking
  1. Install Phantom or Solflare mobile app
  2. Open UNIA in Chrome/Safari (not in-app)
  3. Wallet adapter will automatically deep link to installed app
  4. Approve transaction in wallet app
  5. Browser will automatically redirect back

**Wallet not connecting:**
- Ensure wallet app is installed on your device
- Check wallet is on correct network (devnet/mainnet)
- Try disconnecting and reconnecting
- Check that wallet app is up to date

**Deep link not working:**
- **In-app browser detected**: If you're in Phantom/Solflare's in-app browser, the wallet is already connected
- **External browser**: Ensure wallet app is installed
- Try opening the link in Safari (iOS) or Chrome (Android)
- Check that wallet app is installed and running

**Connection timeout:**
- Slow network connection may cause timeouts
- Try again with better network connectivity
- Check that RPC endpoint is accessible

**"Missing signature" error:**
- This should be automatically resolved by environment detection
- Try using wallet's in-app browser instead
- If persists, clear browser cache and reconnect wallet

## Development

### Scripts

```bash
npm run dev              # Start development server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run typecheck        # Run TypeScript type checking
npm run lint             # Run ESLint
npm test                 # Run Jest tests
npm test:watch           # Run tests in watch mode
npm test:coverage        # Generate test coverage report
```

### Project Structure

```
UNIA-FRONTEND/
├── app/                    # Next.js App Router pages
├── src/
│   ├── components/         # React components
│   │   └── ui/            # UI components (WalletButton, etc.)
│   ├── providers/         # React context providers
│   │   └── WalletProvider.tsx     # Wallet adapter configuration
│   ├── lib/               # Core blockchain logic
│   │   ├── program.ts     # Program PDAs and instructions
│   │   └── constants.ts   # Program ID, seeds, RPC endpoint
│   ├── utils/             # Utility functions
│   │   ├── tokenFormat.ts # UNIA token formatting (6 decimals)
│   │   └── registration.ts # User tiers and validation
│   └── hooks/             # React hooks
├── __tests__/             # Jest tests
├── public/                # Static assets
└── docs/                  # Documentation
```

### Key Files

- **`src/providers/WalletProvider.tsx`**: Configures wallet adapters for both desktop and mobile
- **`src/components/ui/WalletButton.tsx`**: Wallet connection button with timeout handling
- **`src/lib/program.ts`**: Solana program interaction (PDAs, instructions)
- **`src/utils/tokenFormat.ts`**: UNIA token amount formatting (6 decimals)

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- WalletButton.test.tsx

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

**Test Philosophy:**
- Focus on user journeys over exhaustive unit coverage
- Test what users see and do, not implementation details
- Coverage thresholds: 24-29% (intentional - focuses on critical paths)

### Building

```bash
# Build for production
npm run build

# The build process:
# 1. Validates directory structure (app/ not src/app/)
# 2. Compiles TypeScript
# 3. Bundles assets
# 4. Generates static pages
```

## Deployment

### Netlify Deployment

1. **Connect repository**:
   - Go to Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Select your Git provider and repository

2. **Configure build settings**:
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Set environment variables**:
   - `NEXT_PUBLIC_RPC_ENDPOINT`: Your Solana RPC endpoint
   - `NEXT_PUBLIC_PROGRAM_ID`: Your UNIA program ID

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will build and deploy automatically

### Environment Variables

**Required:**
- `NEXT_PUBLIC_RPC_ENDPOINT`: Solana RPC endpoint (e.g., `https://api.devnet.solana.com`)
- `NEXT_PUBLIC_PROGRAM_ID`: UNIA program ID (e.g., `B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2`)

**Optional:**
- `NODE_ENV`: `development` or `production` (auto-set by Netlify)

## User Guide

### Wallet Connection

**Desktop:**
1. Install Phantom or Solflare browser extension
2. Click "Select Wallet" button
3. Choose your wallet
4. Approve connection in wallet popup

**Mobile:**
1. Install Phantom Mobile or Solflare Mobile app
2. Visit UNIA on mobile browser
3. Click "Select Wallet" button
4. You'll be redirected to your wallet app
5. Approve connection
6. Return to browser automatically

### Minting UNIA Tokens

1. **Connect wallet** (see above)
2. **Check eligibility**:
   - First 100 users: No referral required
   - User 101+: Referral code required
   - Minimum 0.05 SOL balance for transaction fees
3. **Enter referral code** (if required)
4. **Click "Mint UNIA"**
5. **Approve transaction** in wallet
6. **Wait for confirmation** (devnet: ~5-10 seconds, mainnet: ~10-20 seconds)
7. **Tokens minted!** Check your wallet or user dashboard

### Mint Tiers

Mint rewards decrease as more users join:

- **User #1**: 100,000 UNIA/attempt × 100 attempts
- **Users #2-10**: 10,000 UNIA/attempt × 100 attempts
- **Users #11-100**: 1,000 UNIA/attempt × 100 attempts
- **Users #101-1000**: 100 UNIA/attempt
- **Users #1001-10000**: 10 UNIA/attempt
- **Users #10001-100000**: 1 UNIA/attempt
- **Users #100001+**: Continues to decrease logarithmically

### Referral System

1. **Get your referral code**:
   - Connect wallet
   - Register as user
   - Your unique referral code is displayed in dashboard

2. **Share your code**:
   - Send code to friends (10 characters, alphanumeric)
   - Code expires after 15 minutes if unused
   - New code generated for each referral

3. **Earn rewards**:
   - Earn bonus UNIA for successful referrals
   - Track referral count in dashboard

## Contributing

Contributions welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Conventions

- **Always use `npm install --legacy-peer-deps`** (Solana wallet adapter peer dependencies)
- **Never create `src/app/`** directory (Next.js App Router uses root `app/`)
- **Always use `tokenFormat.ts`** for UNIA token amounts (6 decimals)
- **Run `npm run typecheck`** before committing
- **Add tests for new features** (focus on user journeys)

## Security

- **Never commit secrets** (private keys, RPC credentials)
- **Validate all user inputs** (referral codes, mint amounts)
- **Use Token-2022** for enhanced security features
- **Audit smart contracts** before mainnet deployment
- **Report security issues** to maintainers privately

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/brainstorm4x/UNIA-FRONTEND/issues)
- **Discussions**: [GitHub Discussions](https://github.com/brainstorm4x/UNIA-FRONTEND/discussions)
- **Solana Docs**: [docs.solana.com](https://docs.solana.com)
- **Mobile Wallet Adapter**: [Solana Mobile Docs](https://docs.solanamobile.com/react-native/wallet_adapter)

## Acknowledgments

- [Solana](https://solana.com) - Blockchain platform
- [Next.js](https://nextjs.org) - React framework
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter) - Wallet integration
- [Solana Mobile](https://solanamobile.com) - Mobile wallet support
- [Phantom](https://phantom.app) - Solana wallet
- [Solflare](https://solflare.com) - Solana wallet

---

**Built with ❤️ on Solana**
