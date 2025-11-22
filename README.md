This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## EQUA Token - Solana DApp

A decentralized application for minting and managing EQUA tokens on the Solana blockchain.

## Installation

Due to peer dependency conflicts with Solana wallet adapters, install dependencies using:

```bash
npm install --legacy-peer-deps
```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Features

- **Solana Integration**: Built on Solana blockchain using Token-2022 standard
- **Wallet Support**: Phantom, Solflare, and other popular Solana wallets
- **Token Minting**: Mint EQUA tokens with dynamic pricing
- **Time-Locked Rewards**: First 100 users get special 2-year locked rewards
- **Referral System**: Earn bonuses for referring new users

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Blockchain**: Solana (Devnet), Anchor Framework
- **Styling**: Tailwind CSS
- **Wallet Integration**: Solana Wallet Adapter

## Project Structure

- `/app` - Next.js 14 App Router pages
- `/src/components` - React components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility libraries and program logic
- `/src/utils` - Helper utilities
- `/public` - Static assets and IDL files

## Network Configuration

- **Network**: Solana Devnet
- **Token Standard**: SPL Token-2022
- **Program ID**: `BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
