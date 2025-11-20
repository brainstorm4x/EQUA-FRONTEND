import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

export class EquaService {
  constructor(private program: Program) {}

  async isUserRegistered(userPda: PublicKey): Promise<boolean> {
    try {
      const account = await this.program.account.userAccount.fetch(userPda);
      return !!account;
    } catch {
      return false;
    }
  }

  async getUserAccount(userPda: PublicKey) {
    try {
      return await this.program.account.userAccount.fetch(userPda);
    } catch (error) {
      console.error('Error fetching user account:', error);
      return null;
    }
  }

  async getGlobalState(globalStatePda: PublicKey) {
    try {
      return await this.program.account.globalState.fetch(globalStatePda);
    } catch (error) {
      console.error('Error fetching global state:', error);
      return null;
    }
  }

  async initializeUser(
    userPda: PublicKey,
    authority: PublicKey,
    globalStatePda: PublicKey,
    referrer?: PublicKey
  ) {
    const now = Math.floor(Date.now() / 1000);
    const registrationTime = new BN(now);
    const lockUntil = new BN(now + 1000);

    return await this.program.methods
      .initializeUser(
        referrer || PublicKey.default,
        registrationTime,
        lockUntil
      )
      .accounts({
        userAccount: userPda,
        authority: authority,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async mintEqua(
    userPda: PublicKey,
    authority: PublicKey,
    globalStatePda: PublicKey
  ) {
    const dailyMintAmount = new BN(1000);
    
    return await this.program.methods
      .mintEqua(dailyMintAmount)
      .accounts({
        userAccount: userPda,
        authority: authority,
        globalState: globalStatePda,
      })
      .rpc();
  }

  async getCurrentPrice(globalStatePda: PublicKey): Promise<number> {
    const globalState = await this.getGlobalState(globalStatePda);
    if (!globalState) return 0.01;

    const transactions = globalState.totalTransactions?.toNumber() || 0;
    const basePrice = 0.01;
    const increment = 0.0001;
    
    return basePrice + (transactions * increment);
  }

  async getTimeUntilNextMint(userPda: PublicKey): Promise<number> {
    const userAccount = await this.getUserAccount(userPda);
    if (!userAccount) return 0;

    const lastMintTime = userAccount.lastMintTime?.toNumber() || 0;
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastMint = now - lastMintTime;
    const twentyFourHours = 24 * 60 * 60;

    if (timeSinceLastMint >= twentyFourHours) {
      return 0;
    }

    return twentyFourHours - timeSinceLastMint;
  }

  async getMintsThisMonth(userPda: PublicKey): Promise<number> {
    const userAccount = await this.getUserAccount(userPda);
    if (!userAccount) return 0;

    return userAccount.totalMints?.toNumber() || 0;
  }
}
