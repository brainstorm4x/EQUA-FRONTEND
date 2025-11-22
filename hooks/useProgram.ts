'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
createProgram,
getGlobalStatePDA,
getMintPDA,
getMintAuthorityPDA,
isUserRegistered,
getUserBalance,
getSPLTokenBalance,
getGlobalState,
getOrCreateKeypair,
} from '@/lib/program';
export function useProgram() {
const { connection } = useConnection();
const wallet = useWallet();
const { publicKey } = wallet;
const [userAccountKeypair, setUserAccountKeypair] = useState<Keypair | null>(null);
const [isReady, setIsReady] = useState(false);
const [program, setProgram] = useState<Program | null>(null);
// Initialize user account keypair (runs once on mount)
useEffect(() => {
if (typeof window !== 'undefined') {
const keypair = getOrCreateKeypair();
setUserAccountKeypair(keypair);
setIsReady(true);
}
}, []);
// Create program when wallet connects (async handled properly)
useEffect(() => {
if (!wallet.publicKey || !wallet.signTransaction) {
setProgram(null);
return;
}
let cancelled = false;

async function initProgram() {
  try {
    console.log('🔄 Creating program instance...');
    const prog = await createProgram(connection, wallet);
    
    if (!cancelled) {
      setProgram(prog);
      console.log('✅ Program initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to create program:', error);
    if (!cancelled) {
      setProgram(null);
    }
  }
}

initProgram();

return () => {
  cancelled = true;
};

}, [connection, wallet, wallet.publicKey, wallet.signTransaction]);
const globalStatePDA = useMemo(() => getGlobalStatePDA()[0], []);
const mintPDA = useMemo(() => getMintPDA()[0], []);
const mintAuthority = useMemo(() => getMintAuthorityPDA()[0], []);
const checkRegistration = useCallback(
async (userPubkey: PublicKey): Promise<boolean> => {
return await isUserRegistered(connection, userPubkey);
},
[connection]
);
const getBalance = useCallback(
async (userPubkey: PublicKey): Promise<number> => {
return await getUserBalance(connection, userPubkey);
},
[connection]
);
const getTokenBalance = useCallback(
async (tokenAccount: PublicKey): Promise<number> => {
return await getSPLTokenBalance(connection, tokenAccount);
},
[connection]
);
const fetchGlobalState = useCallback(async () => {
return await getGlobalState(connection, globalStatePDA);
}, [connection, globalStatePDA]);
return {
program,
connection,
wallet,
publicKey,
userAccountKeypair,
isReady,
globalStatePDA,
mintPDA,
mintAuthority,
checkRegistration,
getBalance,
getTokenBalance,
fetchGlobalState,
};
}
