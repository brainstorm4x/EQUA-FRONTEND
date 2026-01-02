/**
 * Example Usage: getGlobalTransactionCount
 * 
 * This example demonstrates how to use the standalone getGlobalTransactionCount
 * utility function to read authoritative transaction counts from the blockchain.
 * 
 * This is a simple script that can be run to test the function works correctly.
 */

import { Connection } from '@solana/web3.js';
import { getGlobalTransactionCount, getGlobalStatePDAPublicKey } from '../src/utils/transferTracking';

async function main() {
  console.log('🔍 Testing getGlobalTransactionCount function...\n');
  
  // Connect to Solana Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✓ Connected to Solana Devnet');
  
  // Get GlobalState PDA address
  const [globalStatePDA] = getGlobalStatePDAPublicKey();
  console.log(`✓ GlobalState PDA: ${globalStatePDA.toBase58()}\n`);
  
  // Fetch transaction count
  console.log('📊 Fetching transaction count from on-chain GlobalState...');
  const count = await getGlobalTransactionCount(connection);
  
  console.log(`\n✅ Total Transactions (registered users only): ${count.toLocaleString()}`);
  console.log('\nThis count represents peer-to-peer transfers between registered users.');
  console.log('It is Sybil-resistant because both sender and recipient must be registered.');
  console.log('Registration requires 0.1 SOL fee + referral (after first 100 users).\n');
}

main().catch(console.error);
