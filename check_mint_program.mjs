import { PublicKey, Connection } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL');
const MINT_SEED = 'equa-mint';

async function checkMint() {
  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    PROGRAM_ID
  );
  
  console.log('Mint PDA:', mintPDA.toBase58());
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mintInfo = await connection.getAccountInfo(mintPDA);
  
  if (!mintInfo) {
    console.log('❌ Mint account does not exist on devnet');
    return;
  }
  
  console.log('✅ Mint account exists');
  console.log('Owner:', mintInfo.owner.toBase58());
  console.log('Data length:', mintInfo.data.length);
  console.log('Lamports:', mintInfo.lamports);
  
  // Check if it's Token-2022 or standard Token
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  
  if (mintInfo.owner.toBase58() === TOKEN_PROGRAM_ID) {
    console.log('🔵 Using STANDARD SPL Token Program');
  } else if (mintInfo.owner.toBase58() === TOKEN_2022_PROGRAM_ID) {
    console.log('🟢 Using Token-2022 (Token Extensions)');
  } else {
    console.log('⚠️  Unknown token program owner');
  }
}

checkMint().catch(console.error);
