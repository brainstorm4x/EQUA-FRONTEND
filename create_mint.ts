import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { UniaToken } from "../unia_token/target/types/unia_token";

const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UniaToken as Program<UniaToken>;

  // Derive PDAs
  const [globalState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global-state")],
    program.programId
  );

  const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("unia-mint")],
    program.programId
  );

  const [mintAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    program.programId
  );

  console.log("Creating UNIA token mint with Token-2022 program...");
  console.log("Mint PDA:", mint.toBase58());
  console.log("Mint Authority:", mintAuthority.toBase58());
  console.log("Token Program:", TOKEN_2022_PROGRAM_ID.toBase58());

  try {
    const tx = await program.methods
      .createTokenMint()
      .accounts({
        mint: mint,
        mintAuthority: mintAuthority,
        globalState: globalState,
        payer: provider.wallet.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Token mint created!");
    console.log("Transaction signature:", tx);
    console.log(`View on explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
