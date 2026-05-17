import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

(async () => {
  const mint = new PublicKey('3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4');
  const info = await connection.getParsedAccountInfo(mint);
  const data = info.value?.data;
  if (!data || typeof data === 'string' || !('parsed' in data) || data.parsed.type !== 'mint') {
    throw new Error('Account is not a mint');
  }
  console.log('Mint decimals:', data.parsed.info.decimals);
})();
