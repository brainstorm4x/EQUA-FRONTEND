# EQUA Token Frontend

Next.js 14 (App Router) + Solana blockchain dApp for minting EQUA tokens with time-locked rewards, referral system, and dynamic pricing.

## Features

- 🪙 **Token Minting**: Mint EQUA tokens using Token-2022 (SPL Token Extensions)
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
cd EQUA-FRONTEND

# Install dependencies (use --legacy-peer-deps due to Solana wallet adapter peer dependencies)
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Configure environment variables
# - NEXT_PUBLIC_RPC_ENDPOINT: Solana RPC endpoint (devnet/mainnet)
# - NEXT_PUBLIC_PROGRAM_ID: EQUA program ID

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Mobile Wallet Support

EQUA supports mobile wallets through the Solana Mobile Wallet Adapter protocol.

### For Mobile Users

1. **Install a Solana mobile wallet app**:
   - [Phantom Mobile](https://phantom.app/download) (iOS/Android)
   - [Solflare Mobile](https://solflare.com/download) (iOS/Android)
   - Or any Solana Mobile Stack (SMS) compatible wallet

2. **Connect on mobile**:
   - Visit EQUA on your mobile browser (Safari, Chrome, etc.)
   - Click **"Select Wallet"**
   - Choose your wallet from the list
   - You'll be redirected to your wallet app
   - Approve the connection in your wallet app
   - You'll be redirected back to EQUA browser

3. **Mint tokens**:
   - Once connected, you can mint EQUA tokens
   - Transactions are signed in your native wallet app
   - Secure and seamless experience

### Technical Details

**Mobile Detection:**
- Mobile browsers: Show ONLY Mobile Wallet Adapter
- Desktop browsers: Show Phantom + Solflare browser extensions
- Automatic detection via user agent and touch capability

**Deep Linking:**
- Mobile Wallet Adapter uses deep links (`solana-wallet://`) to open native wallet apps
- Automatically redirects back to browser after wallet interaction
- Works with all Solana Mobile Stack (SMS) compatible wallets

**App Identity:**
```typescript
{
  name: 'EQUA Token',
  uri: 'https://equa-frontend.netlify.app',
  icon: 'https://equa-frontend.netlify.app/branding/equa-logo.svg',
  cluster: 'devnet' // or 'mainnet-beta'
}
```

### Troubleshooting

**Modal dismissal breaks button:**
- Fixed in latest version with custom mobile modal
- Modal can be safely dismissed by clicking outside
- Button remains functional after dismissal
- If issue persists, refresh page

**Wallet not connecting:**
- Ensure wallet app is installed on your device
- Check wallet is on correct network (devnet/mainnet)
- Try disconnecting and reconnecting
- Check that wallet app is up to date

**Deep link not working:**
- Ensure you're using a mobile browser (not in-app browser)
- Try opening the link in Safari (iOS) or Chrome (Android)
- Check that wallet app is installed and running

**Connection timeout:**
- Slow network connection may cause timeouts
- Try again with better network connectivity
- Check that RPC endpoint is accessible

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
EQUA-FRONTEND/
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
│   │   ├── tokenFormat.ts # EQUA token formatting (6 decimals)
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
- **`src/utils/tokenFormat.ts`**: EQUA token amount formatting (6 decimals)

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
   - `NEXT_PUBLIC_PROGRAM_ID`: Your EQUA program ID

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will build and deploy automatically

### Environment Variables

**Required:**
- `NEXT_PUBLIC_RPC_ENDPOINT`: Solana RPC endpoint (e.g., `https://api.devnet.solana.com`)
- `NEXT_PUBLIC_PROGRAM_ID`: EQUA program ID (e.g., `D158AFttmzAYsbDhHZjqNbJbda8x8pUceucw5QZELDzw`)

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
2. Visit EQUA on mobile browser
3. Click "Select Wallet" button
4. You'll be redirected to your wallet app
5. Approve connection
6. Return to browser automatically

### Minting EQUA Tokens

1. **Connect wallet** (see above)
2. **Check eligibility**:
   - First 100 users: No referral required
   - User 101+: Referral code required
   - Minimum 0.05 SOL balance for transaction fees
3. **Enter referral code** (if required)
4. **Click "Mint EQUA"**
5. **Approve transaction** in wallet
6. **Wait for confirmation** (devnet: ~5-10 seconds, mainnet: ~10-20 seconds)
7. **Tokens minted!** Check your wallet or user dashboard

### Mint Tiers

Mint rewards decrease as more users join:

- **User #1**: 100,000 EQUA/attempt × 100 attempts
- **Users #2-10**: 10,000 EQUA/attempt × 100 attempts
- **Users #11-100**: 1,000 EQUA/attempt × 100 attempts
- **Users #101-1000**: 100 EQUA/attempt
- **Users #1001-10000**: 10 EQUA/attempt
- **Users #10001-100000**: 1 EQUA/attempt
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
   - Earn bonus EQUA for successful referrals
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
- **Always use `tokenFormat.ts`** for EQUA token amounts (6 decimals)
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

- **Issues**: [GitHub Issues](https://github.com/brainstorm4x/EQUA-FRONTEND/issues)
- **Discussions**: [GitHub Discussions](https://github.com/brainstorm4x/EQUA-FRONTEND/discussions)
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
