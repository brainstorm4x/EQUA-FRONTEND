# EQUA Token Wallet Display Setup

This document explains how to make EQUA Token show up properly in Phantom, Solflare, and other Solana wallets with the correct name, symbol, and logo.

## The Problem

By default, SPL tokens created without metadata will show as "Unknown Token" in wallets like Phantom. To fix this, we need to add token metadata using the Metaplex Token Metadata Standard.

## Solution Options

### Option 1: Metaplex Token Metadata (Recommended)

The standard way to add metadata to SPL tokens on Solana is through the Metaplex Token Metadata Program.

#### Prerequisites
- The EQUA token mint must be created
- A `token-metadata.json` file must be hosted publicly (IPFS, Arweave, or GitHub raw)

#### Metadata JSON

The metadata file (`public/token-metadata.json`) should contain:

```json
{
  "name": "EQUA Token",
  "symbol": "EQUA",
  "description": "EQUA is a utility-first token on Solana with transaction-based price appreciation.",
  "image": "https://[your-domain]/equa-logo.png",
  "attributes": [...],
  "properties": {
    "files": [...],
    "category": "fungible"
  }
}
```

#### Creating Token Metadata

Use the Metaplex CLI or SDK to create metadata:

```bash
# Install Metaplex Sugar CLI
npm install -g @metaplex-foundation/sugar

# Or use the @metaplex-foundation/js SDK
npm install @metaplex-foundation/js
```

Example using Metaplex JS SDK:

```typescript
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.fromSecretKey(...); // Your authority keypair
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet));

const mintAddress = new PublicKey("YOUR_MINT_ADDRESS");

const { nft } = await metaplex.nfts().create({
  uri: "https://raw.githubusercontent.com/brainstorm4x/EQUA-FRONTEND/main/public/token-metadata.json",
  name: "EQUA Token",
  symbol: "EQUA",
  sellerFeeBasisPoints: 0,
  mint: mintAddress,
  tokenOwner: wallet.publicKey,
  updateAuthority: wallet,
  isMutable: true,
  isCollection: false,
});
```

### Option 2: Solana Token Registry (Deprecated but still works)

You can also submit your token to the deprecated Solana Token Registry:

1. Fork: https://github.com/solana-labs/token-list
2. Add your token to `src/tokens/solana.tokenlist.json`
3. Submit a Pull Request

However, this method is deprecated and may not be maintained long-term.

### Option 3: Jupiter Verified Token List

For tokens that will be traded on Jupiter:

1. Submit to Jupiter's Verified Token List
2. Requires meeting certain liquidity and usage requirements
3. See: https://station.jup.ag/docs/token-list

## EQUA Token Metadata

Current metadata files are located at:
- `public/token-metadata.json` - JSON metadata file
- `public/equa-logo.png` - Token logo (PNG format)
- `public/equa-logo.svg` - Token logo (SVG format)

### Token Details

| Field | Value |
|-------|-------|
| Name | EQUA Token |
| Symbol | EQUA |
| Decimals | 6 |
| Network | Solana Devnet |
| Program ID | BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL |

## Logo Requirements

For optimal display across wallets:
- **PNG Format**: Recommended for primary logo
- **Size**: At least 256x256 pixels, ideally 512x512
- **Background**: Transparent or solid color
- **File Size**: Under 200KB for faster loading

## Hosting Metadata

The metadata JSON file must be hosted at a publicly accessible URL. Options include:

1. **GitHub Raw** (Current): `https://raw.githubusercontent.com/brainstorm4x/EQUA-FRONTEND/main/public/token-metadata.json`
2. **IPFS**: More decentralized, use Pinata or NFT.Storage
3. **Arweave**: Permanent storage, higher cost

## Verification Steps

After setting up metadata:

1. Wait a few minutes for wallets to cache the metadata
2. Import the token in Phantom using the mint address
3. The token should display with name, symbol, and logo
4. If not showing, try clearing wallet cache

## Troubleshooting

### Token still shows as "Unknown"
- Verify the metadata JSON is accessible at the URI
- Check that the image URL is accessible
- Wait for wallet cache to update (can take a few hours)
- Try disconnecting and reconnecting your wallet

### Logo not displaying
- Ensure image is hosted on a publicly accessible URL
- Check that CORS headers allow access
- Verify image format is supported (PNG recommended)
- Check image size is not too large

## Related Documentation

- [Metaplex Token Metadata](https://docs.metaplex.com/programs/token-metadata/)
- [Solana Token Program](https://spl.solana.com/token)
- [EQUA Price Appreciation](./PRICE_APPRECIATION.md)
