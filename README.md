# EQUA Token Frontend

A modern, production-ready Web3 frontend for the EQUA Token platform built on Solana blockchain.

## 🚀 Features

- **Next.js 14** with App Router for optimal performance and SEO
- **TypeScript** for type-safe development
- **Tailwind CSS v3** with custom EQUA design system
- **Wallet Integration** supporting Phantom, Solflare, Torus, and Ledger
- **SSR/CSR Hybrid** rendering for best user experience
- **Glassmorphism UI** with modern design patterns
- **Production-Ready** folder structure and configuration

## 🎨 Design System

### Color Palette
The EQUA design system features a purple-based brand color palette:
- Primary colors: `primary-50` through `primary-950`
- Accent colors: cyan, teal, green, emerald
- Status colors: success, error, warning, info

### Typography
- **Sans-serif**: Inter (system-ui fallback)
- **Monospace**: JetBrains Mono (Consolas, Monaco fallback)

### Components
- Glassmorphism cards with backdrop blur
- Modern button variants (primary, secondary, ghost, danger)
- Responsive layout with Header and Footer
- Wallet connection components

## 📦 Project Structure

```
EQUA-FRONTEND/
├── public/
│   ├── EQUA_LOGO_SIMPLE.jpg    # Brand logo (replace with actual logo)
│   └── ...                      # Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with wallet provider
│   │   ├── page.tsx             # Landing page (SSR)
│   │   ├── globals.css          # Global styles and theme
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Dashboard page
│   │   └── mint/
│   │       └── page.tsx         # Token minting page
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.tsx       # Navigation header
│   │   │   └── Footer.tsx       # Site footer
│   │   ├── providers/
│   │   │   └── WalletProvider.tsx  # Solana wallet provider (SSR-safe)
│   │   └── ui/
│   │       ├── Button.tsx       # Button component
│   │       ├── Card.tsx         # Card component
│   │       └── WalletButton.tsx # Wallet connection button
│   ├── hooks/
│   │   ├── useProgram.ts        # Solana program interactions
│   │   └── useUserAccount.ts    # User account management
│   ├── lib/
│   │   ├── constants.ts         # App constants
│   │   ├── utils.ts             # Utility functions
│   │   ├── program.ts           # Program helpers (PDAs, instructions)
│   │   └── equa_token.ts        # Generated types from IDL
│   ├── idl/
│   │   └── equa_token.json      # Anchor IDL
│   └── types/
│       └── ...                  # TypeScript type definitions
├── .env.local.example           # Environment variables template
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Solana wallet (Phantom, Solflare, etc.)
- SOL tokens on devnet (get from [Solana Faucet](https://faucet.solana.com/))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/brainstorm4x/EQUA-FRONTEND.git
cd EQUA-FRONTEND
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm run start
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brainstorm4x/EQUA-FRONTEND)

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Docker containers

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

This project uses:
- ESLint for code linting
- TypeScript for type checking
- Tailwind CSS for styling (no CSS modules)

## 📚 Key Technologies

- **Next.js 16** - React framework with App Router
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 3** - Utility-first CSS framework
- **Solana Web3.js** - Solana blockchain interactions
- **Wallet Adapter** - Multi-wallet support
- **Anchor** - Solana program framework (IDL)

## 🔐 Security

- Never commit `.env.local` or private keys
- Always verify transactions before signing
- Use secure RPC endpoints in production
- Keep dependencies updated

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **Program ID**: `G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si`
- **Network**: Solana Devnet
- **Explorer**: [Solana Explorer](https://explorer.solana.com/address/G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si?cluster=devnet)

## 💬 Support

For questions and support:
- Open an issue on GitHub
- Join our community Discord (coming soon)
- Follow us on Twitter (coming soon)

---

Built with ❤️ by the EQUA Team | Powered by Solana

