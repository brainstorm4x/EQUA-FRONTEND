import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PROGRAM_ID,
  GLOBAL_STATE_SEED,
  MINT_SEED,
  MINT_AUTHORITY_SEED,
} from "./constants";
// PDA Helper Functions
export function getGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    PROGRAM_ID
  );
}
export function getMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(MINT_SEED)], PROGRAM_ID);
}
export function getMintAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_AUTHORITY_SEED)],
    PROGRAM_ID
  );
}

// Create Anchor Program Instance
export async function createProgram(
  connection: Connection,
  wallet: any
): Promise<Program> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });

  try {
    const response = await fetch("/idl/equa_token.json");
    if (!response.ok) {
      throw new Error("Failed to load IDL: " + response.statusText);
    }

    let idlData = await response.json();

    // ✅ DON'T DELETE - Just log that we have the IDL
    console.log(
      "✅ IDL loaded, creating program with ID:",
      PROGRAM_ID.toBase58()
    );

    // Create program with 2-parameter constructor (IDL contains the program ID)
    return new Program(idlData, provider);
  } catch (error) {
    console.error("❌ Error creating program:", error);
    throw error;
  }
}

// Check if user is registered
export async function isUserRegistered(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    return accountInfo !== null && accountInfo.data.length > 0;
  } catch (error) {
    return false;
  }
}
// Get user's minted amount from user account
export async function getUserBalance(
  connection: Connection,
  userAccountPubkey: PublicKey
): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(userAccountPubkey);
    if (!accountInfo || accountInfo.data.length === 0) return 0;
    // UserAccount structure:
    // 8 bytes: discriminator
    // 32 bytes: authority (Pubkey)
    // 32 bytes: referral (Pubkey)
    // 32 bytes: token_account (Pubkey)
    // 8 bytes: minted_amount (u64) ← at offset 104
    // ... rest of fields

    // CORRECTED OFFSET for minted_amount
    const MINTED_AMOUNT_OFFSET = 104; // 8 + 32 + 32 + 32
    const balanceRaw = new BN(
      accountInfo.data.slice(MINTED_AMOUNT_OFFSET, MINTED_AMOUNT_OFFSET + 8),
      "le"
    );

    // Convert from lamports (6 decimals) to tokens
    const DECIMALS = new BN(1_000_000);
    const balance = balanceRaw.div(DECIMALS);

    return balance.toNumber();
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
}
// Get SPL token balance directly from token account
export async function getSPLTokenBalance(
  connection: Connection,
  tokenAccountAddress: PublicKey
): Promise<number> {
  try {
    const tokenAccountInfo = await connection.getAccountInfo(
      tokenAccountAddress
    );
    if (!tokenAccountInfo) return 0;
    // SPL Token account: amount is at bytes 64-72 (u64 little-endian)
    const amount = new BN(tokenAccountInfo.data.slice(64, 72), "le");

    // Convert from lamports (6 decimals) to tokens
    const DECIMALS = new BN(1_000_000);
    const balance = amount.div(DECIMALS);

    return balance.toNumber();
  } catch (error) {
    console.error("Error getting SPL token balance:", error);
    return 0;
  }
}
// Get global state - NOT AVAILABLE due to incomplete IDL
// Use raw account data reading if needed
export async function getGlobalState(
  connection: Connection,
  globalStatePDA: PublicKey
): Promise<any | null> {
  try {
    const accountInfo = await connection.getAccountInfo(globalStatePDA);
    if (!accountInfo) return null;
    // Return basic info - full deserialization not available
    return {
      exists: true,
      dataLength: accountInfo.data.length,
      owner: accountInfo.owner.toBase58(),
    };
  } catch (error) {
    console.error("Error fetching global state:", error);
    return null;
  }
}
// Keypair storage helpers
const KEYPAIR_STORAGE_KEY = "equa_user_keypair";
export function loadKeypair(): Keypair | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(KEYPAIR_STORAGE_KEY);
    if (!stored) return null;
    const secretKey = Uint8Array.from(JSON.parse(stored));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error loading keypair:", error);
    return null;
  }
}
export function saveKeypair(keypair: Keypair): void {
  if (typeof window === "undefined") return;
  try {
    const secretKey = Array.from(keypair.secretKey);
    localStorage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(secretKey));
  } catch (error) {
    console.error("Error saving keypair:", error);
  }
}
export function getOrCreateKeypair(): Keypair {
  let keypair = loadKeypair();
  if (!keypair) {
    keypair = Keypair.generate();
    saveKeypair(keypair);
    console.log(
      "✅ Generated new user account keypair:",
      keypair.publicKey.toBase58()
    );
  } else {
    console.log(
      "✅ Loaded existing user account keypair:",
      keypair.publicKey.toBase58()
    );
  }
  return keypair;
}
export { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
