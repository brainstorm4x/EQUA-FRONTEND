'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useMemo } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { PROGRAM_ID } from '@/config/program';

// Use the centralized Program ID from config
const PROGRAM_ID_STRING = PROGRAM_ID.toBase58();

// Create a minimal IDL structure that works
const MINIMAL_IDL = {
  version: "0.1.0",
  name: "equa_token",
  instructions: [
    {
      name: "initializeUser",
      accounts: [
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "globalState", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "referrer", type: "publicKey" },
        { name: "registrationTime", type: "i64" },
        { name: "lockUntil", type: "i64" }
      ]
    },
    {
      name: "mintEqua",
      accounts: [
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "globalState", isMut: true, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    }
  ],
  accounts: [
    {
      name: "UserAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "equaBalance", type: "u64" },
          { name: "lastMintTime", type: "i64" },
          { name: "totalMints", type: "u64" }
        ]
      }
    },
    {
      name: "GlobalState",
      type: {
        kind: "struct",
        fields: [
          { name: "totalUsers", type: "u64" },
          { name: "totalTransactions", type: "u64" }
        ]
      }
    }
  ]
};

export function useEquaProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;
    
    return new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    
    try {
      const programInstance = new Program(MINIMAL_IDL as any, provider);
      console.log('✅ Program initialized successfully');
      return programInstance;
    } catch (error) {
      console.error('❌ Error creating program:', error);
      return null;
    }
  }, [provider]);

  const getGlobalStatePda = () => {
    const programId = new PublicKey(PROGRAM_ID_STRING);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      programId
    );
    return pda;
  };

  const getUserAccountPda = (authority: PublicKey) => {
    const programId = new PublicKey(PROGRAM_ID_STRING);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_account'), authority.toBuffer()],
      programId
    );
    return pda;
  };

  return {
    program,
    provider,
    getGlobalStatePda,
    getUserAccountPda,
  };
}
