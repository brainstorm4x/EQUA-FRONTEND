import { PublicKey, Connection } from '@solana/web3.js';

// EQUA Token Program ID (Token-2022)
const PROGRAM_ID = new PublicKey('GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C');
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
  
  // EQUA requires Token-2022 only
  const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  
  if (mintInfo.owner.toBase58() === TOKEN_2022_PROGRAM_ID) {
    console.log('✅ Using Token-2022 (Token Extensions) - CORRECT');
  } else {
    console.log('❌ ERROR: Mint is not using Token-2022!');
    console.log('   EQUA requires Token-2022 program:', TOKEN_2022_PROGRAM_ID);
    console.log('   Found:', mintInfo.owner.toBase58());
  }
}

checkMint().catch(console.error);
