import { PublicKey, SystemProgram, TransactionInstruction, Connection, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';

export const PROGRAM_ID = new PublicKey('G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si');

// ✅ Export STANDARD SPL Token Program ID (matches your backend)
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };

// PDA derivation for global state
export function getGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global-state')],
    PROGRAM_ID
  );
}

// PDA derivation for mint
export function getMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('equa-mint')],
    PROGRAM_ID
  );
}

// PDA derivation for mint authority
export function getMintAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mint-authority')],
    PROGRAM_ID
  );
}

// User accounts are regular keypairs (not PDAs)
export function generateUserAccountKeypair(): Keypair {
  return Keypair.generate();
}

// Check if user is registered
export async function isUserRegistered(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    return accountInfo !== null && accountInfo.data.length > 0;
  } catch {
    return false;
  }
}

// Get user balance
// Get user balance (returns number of EQUA tokens)
export async function getUserBalance(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo || accountInfo.data.length === 0) return 0;

    // Correct layout:
    // 8  discriminator
    // 32 authority
    // 32 referral
    // 32 token_account
    // 8  minted_amount  (starts at 104)
    const MINTED_AMOUNT_OFFSET = 104;

    const balanceRaw = new BN(
      accountInfo.data.slice(MINTED_AMOUNT_OFFSET, MINTED_AMOUNT_OFFSET + 8),
      'le'
    );

    const DECIMALS = new BN(1_000_000); // 6 decimals
    return balanceRaw.div(DECIMALS).toNumber();
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

// Get global state
export async function getGlobalState(
  connection: Connection,
  globalStatePDA: PublicKey
) {
  try {
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    if (!accountInfo) return null;
    
    const data = accountInfo.data;
    return {
      userCount: new BN(data.slice(8, 12), 'le').toNumber(),
      totalTransactions: new BN(data.slice(12, 20), 'le').toNumber(),
    };
  } catch (error) {
    console.error('Error getting global state:', error);
    return null;
  }
}

// Create initialize instruction
export function createInitializeGlobalStateInstruction(
  globalState: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });
}

// Create initialize_user instruction
export function createInitializeUserInstruction(
  userAccount: PublicKey,
  authority: PublicKey,
  globalState: PublicKey,
  referralAccount: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  associatedTokenProgram: PublicKey,
  tokenProgram: PublicKey,
  mintStart: number,
  lockedUntil: number,
  referrer: PublicKey = PublicKey.default
): TransactionInstruction {
  const discriminator = Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]);
  
  const mintStartBN = new BN(mintStart);
  const lockedUntilBN = new BN(lockedUntil);
  
  const data = Buffer.concat([
    discriminator,
    referrer.toBuffer(),
    mintStartBN.toArrayLike(Buffer, 'le', 8),
    lockedUntilBN.toArrayLike(Buffer, 'le', 8),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: associatedTokenProgram, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Add tracking mint (mint_equa) instruction
export function createMintEquaTrackingInstruction(
  userAccount: PublicKey,
  authority: PublicKey,
  amount: number
): TransactionInstruction {
  // Discriminator for mint_equa
  const discriminator = Buffer.from([151, 97, 251, 10, 45, 109, 190, 115]);
  const amountBN = new BN(amount);

  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Rename existing to tokens mint (mint_equa_tokens)
export function createMintEquaTokensInstruction(
  userAccount: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  authority: PublicKey,
  tokenProgram: PublicKey,
  amount: number
): TransactionInstruction {
  const discriminator = Buffer.from([166, 66, 221, 55, 153, 196, 139, 85]);
  const amountBN = new BN(amount);

  const data = Buffer.concat([
    discriminator,
    amountBN.toArrayLike(Buffer, 'le', 8),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// Get SPL token balance directly from token account
// Duplicate implementation removed; earlier getSPLTokenBalance is retained.
// Get SPL token balance directly from token account (production-ready)
export async function getSPLTokenBalance(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  try {
    const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);
    if (!tokenAccountInfo) {
      console.log('❌ Token account not found');
      return 0;
    }
    
    // SPL Token Account structure: amount is at bytes 64-72 (u64)
    const amount = new BN(tokenAccountInfo.data.slice(64, 72), 'le');
    console.log('🪙 Raw SPL token amount (lamports):', amount.toString());
    
    // Convert from lamports (6 decimals) to EQUA tokens
    const DECIMALS = new BN(1_000_000); // 6 decimals
    const balance = amount.div(DECIMALS);
    
    console.log('🪙 EQUA token balance:', balance.toString());
    return balance.toNumber();
  } catch (error) {
    console.error('Error getting SPL token balance:', error);
    return 0;
  }
}
