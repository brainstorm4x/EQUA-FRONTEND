/**
 * Netlify Scheduled Function: Update EQX Price Oracle
 * 
 * Schedule: Hourly (0 * * * *)
 * 
 * Tasks:
 * 1. Fetch component prices from Pyth Hermes API
 * 2. Calculate weighted EQX basket price
 * 3. Update on-chain EQX Oracle PDA
 * 4. Store price snapshot in Netlify Blobs
 */

import { Handler, schedule } from '@netlify/functions';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import crypto from 'crypto';
import { fetchComponentPrices, componentPricesToArray } from './lib/pythPrices';
import { 
  getEqxOraclePda, 
  floatToFixed, 
  calculateBasketPrice,
  BASKET_COMPONENTS,
  PRECISION 
} from './lib/eqxOracle';
import { storeEqxPrice, EqxPriceSnapshot } from './lib/blobStorage';
import { EquaToken } from './lib/equa_token';
import idl from './lib/equa_token.json';

// ============================================================================
// Configuration
// ============================================================================

const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get wallet keypair from environment variable
 */
function getWalletKeypair(): Keypair {
  const privateKeyBase58 = process.env.SOLANA_WALLET_PRIVATE_KEY;
  
  if (!privateKeyBase58) {
    throw new Error('SOLANA_WALLET_PRIVATE_KEY environment variable not set');
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to decode wallet private key: ${error}`);
  }
}

/**
 * Calculate SHA-256 hash of component prices
 */
function hashComponentPrices(prices: number[]): string {
  const pricesString = prices.map(p => p.toFixed(8)).join(',');
  return crypto.createHash('sha256').update(pricesString).digest('hex');
}

/**
 * Calculate SHA-256 hash of basket weights
 */
function hashWeights(): string {
  const weightsString = BASKET_COMPONENTS.map(c => c.weight.toFixed(2)).join(',');
  return crypto.createHash('sha256').update(weightsString).digest('hex');
}

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('Starting EQX price oracle update...');
  
  try {
    // 1. Fetch component prices
    console.log('Fetching component prices from Pyth Hermes API...');
    const { prices: componentPrices, source } = await fetchComponentPrices();
    const componentPricesArray = componentPricesToArray(componentPrices);
    
    console.log('Component prices:', componentPrices);
    console.log('Source:', source);
    
    // 2. Calculate basket price
    const basketPrice = calculateBasketPrice(componentPricesArray);
    const basketPriceFixed = floatToFixed(basketPrice);
    
    console.log(`Calculated basket price: ${basketPrice} USD (${basketPriceFixed} fixed-point)`);
    
    // 3. Update on-chain oracle
    console.log('Updating on-chain EQX Oracle...');
    
    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
    const wallet = getWalletKeypair();
    
    // Create provider
    const provider = new AnchorProvider(
      connection,
      new Wallet(wallet),
      { commitment: 'confirmed' }
    );
    
    // Load program
    const program = new Program<EquaToken>(
      idl as any,
      provider
    );
    
    // Get oracle PDA
    const [oraclePda] = getEqxOraclePda(PROGRAM_ID);
    console.log('Oracle PDA:', oraclePda.toString());
    
    // Calculate hashes
    const componentPricesHash = hashComponentPrices(componentPricesArray);
    const weightsHash = hashWeights();
    
    console.log('Component prices hash:', componentPricesHash);
    console.log('Weights hash:', weightsHash);
    
    // Build update instruction
    // Note: This requires the update_eqx_oracle instruction to exist in the IDL
    // If not available, we'll skip the on-chain update and just store to blobs
    try {
      const tx = await program.methods
        .updateEqxOracle(
          basketPriceFixed,
          Buffer.from(componentPricesHash, 'hex'),
          Buffer.from(weightsHash, 'hex')
        )
        .accounts({
          eqxOracle: oraclePda,
          authority: wallet.publicKey,
        })
        .rpc();
      
      console.log('Oracle updated successfully. Transaction signature:', tx);
    } catch (error) {
      console.warn('Failed to update on-chain oracle (instruction may not exist):', error);
      console.log('Continuing with blob storage...');
    }
    
    // 4. Get current slot
    const slot = await connection.getSlot();
    
    // 5. Store price snapshot in blobs
    console.log('Storing price snapshot to Netlify Blobs...');
    
    const snapshot: EqxPriceSnapshot = {
      timestamp: Date.now(),
      price: basketPrice,
      priceFixed: basketPriceFixed.toString(),
      slot,
      components: componentPrices,
      componentPricesHash,
      weightsHash,
      source,
    };
    
    await storeEqxPrice(snapshot);
    
    console.log('EQX price oracle update completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        price: basketPrice,
        priceFixed: basketPriceFixed.toString(),
        slot,
        source,
        timestamp: snapshot.timestamp,
      }),
    };
  } catch (error) {
    console.error('Error updating EQX price oracle:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

// Export as scheduled function (runs hourly)
export { handler };
export const config = {
  schedule: '0 * * * *', // Hourly at minute 0
};
