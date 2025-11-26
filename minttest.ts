import { getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

(async () => {
  const mintInfo = await getMint(connection, new PublicKey('3xhEgm7rubPZyHrmgSWF8bzJvfon9WJG2g7WzDjjvNC4'), undefined, TOKEN_2022_PROGRAM_ID);
  console.log('Mint decimals:', mintInfo.decimals);
})();