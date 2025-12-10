import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import * as program from '../lib/program';

interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

export class ProgramService {
  constructor(
    private connection: Connection,
    private wallet: AnchorWallet
  ) {}

  async isUserRegistered(): Promise<boolean> {
    const [userPDA] = program.getUserAccountPDA(this.wallet.publicKey);
    const account = await program.getUserAccount(this.connection, userPDA);
    return account !== null;
  }

  async getUserBalance(): Promise<number> {
    const [userPDA] = program.getUserAccountPDA(this.wallet.publicKey);
    const account = await program.getUserAccount(this.connection, userPDA);
    return account?.equaBalance.toNumber() || 0;
  }

  async registerUser(referrer?: PublicKey): Promise<string> {
    const [userPDA] = program.getUserAccountPDA(this.wallet.publicKey);
    const [globalStatePDA] = program.getGlobalStatePDA();
    const [mintPDA] = program.getMintPDA();
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPDA,
      this.wallet.publicKey,
      false,
      program.TOKEN_PROGRAM_ID
    );
    const now = Math.floor(Date.now() / 1000);

    // Derive referral account PDA if referrer provided
    const referralAccountPDA = referrer 
      ? program.getUserAccountPDA(referrer)[0]
      : PublicKey.default;

    const instruction = program.createInitializeUserInstruction(
      userPDA,
      this.wallet.publicKey,
      globalStatePDA,
      referralAccountPDA,
      userTokenAccount,
      mintPDA,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      program.TOKEN_PROGRAM_ID,
      now,
      referrer || PublicKey.default
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = this.wallet.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signed = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    
    await this.connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }

  async mintTokens(amount: number): Promise<string> {
    const [userPDA] = program.getUserAccountPDA(this.wallet.publicKey);
    const [globalStatePDA] = program.getGlobalStatePDA();

    const instruction = program.createMintEquaInstruction(
      userPDA,
      this.wallet.publicKey,
      globalStatePDA,
      new BN(amount)
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = this.wallet.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signed = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    
    await this.connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }
}
