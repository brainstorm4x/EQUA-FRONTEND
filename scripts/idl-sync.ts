#!/usr/bin/env node
/**
 * IDL Synchronization Script
 * 
 * Fetches the canonical Anchor IDL from the EQUA backend repository
 * and saves it to the frontend's public/idl directory.
 * 
 * This ensures the frontend always uses the correct type definitions
 * that match the deployed Solana program.
 * 
 * Usage:
 *   npm run idl:sync
 *   node scripts/idl-sync.ts
 * 
 * Environment Variables:
 *   IDL_SOURCE_URL - Override the default backend IDL URL (optional)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Configuration
// Default IDL source: EQUA backend repository
// Override with IDL_SOURCE_URL environment variable for custom repositories
const DEFAULT_IDL_URL = 'https://raw.githubusercontent.com/brainstorm4x/EQUA/main/target/idl/equa_token.json';
const IDL_SOURCE_URL = process.env.IDL_SOURCE_URL || DEFAULT_IDL_URL;
const OUTPUT_PATH = path.join(__dirname, '../public/idl/equa_token.json');

/**
 * Fetch content from a URL using https
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Validate IDL structure comprehensively
 */
function validateIdl(idl: any): void {
  if (!idl) {
    throw new Error('IDL is null or undefined');
  }

  // Validate metadata
  if (!idl.metadata?.name) {
    console.warn('⚠️  IDL missing metadata.name - this is recommended but not required');
  }
  if (!idl.metadata?.version) {
    console.warn('⚠️  IDL missing metadata.version - this is recommended but not required');
  }

  // Validate program address
  if (!idl.address && !idl.metadata?.address) {
    throw new Error('IDL missing program address (address or metadata.address field)');
  }

  // Validate instructions
  if (!Array.isArray(idl.instructions)) {
    throw new Error('IDL missing instructions array');
  }
  if (idl.instructions.length === 0) {
    console.warn('⚠️  IDL has no instructions - this is unusual');
  }
  
  // Validate critical instruction structure
  idl.instructions.forEach((instruction: any, idx: number) => {
    if (!instruction.name) {
      throw new Error(`Instruction at index ${idx} is missing name field`);
    }
    if (!instruction.discriminator || !Array.isArray(instruction.discriminator)) {
      console.warn(`⚠️  Instruction "${instruction.name}" missing discriminator array`);
    }
  });

  // Validate accounts
  if (!Array.isArray(idl.accounts)) {
    throw new Error('IDL missing accounts array');
  }
  
  // Validate account structure
  idl.accounts.forEach((account: any, idx: number) => {
    if (!account.name) {
      throw new Error(`Account at index ${idx} is missing name field`);
    }
    if (!account.discriminator || !Array.isArray(account.discriminator)) {
      console.warn(`⚠️  Account "${account.name}" missing discriminator array`);
    }
  });

  console.log('✅ IDL structure validated');
  console.log(`   Program ID: ${idl.address || idl.metadata?.address}`);
  console.log(`   Name: ${idl.metadata?.name || 'N/A'}`);
  console.log(`   Version: ${idl.metadata?.version || 'N/A'}`);
  console.log(`   Instructions: ${idl.instructions.length}`);
  console.log(`   Accounts: ${idl.accounts.length}`);
  console.log(`   Types: ${idl.types?.length || 0}`);
  console.log(`   Errors: ${idl.errors?.length || 0}`);
}

/**
 * Main sync function
 */
async function syncIdl(): Promise<void> {
  console.log('🔄 Fetching IDL from backend...');
  console.log(`   Source: ${IDL_SOURCE_URL}`);

  try {
    // Fetch IDL from backend
    const idlContent = await fetchUrl(IDL_SOURCE_URL);
    
    // Parse and validate
    const idl = JSON.parse(idlContent);
    validateIdl(idl);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ Created directory: ${outputDir}`);
    }

    // Create backup of existing IDL if it exists
    if (fs.existsSync(OUTPUT_PATH)) {
      const backupPath = OUTPUT_PATH.replace('.json', '.backup.json');
      fs.copyFileSync(OUTPUT_PATH, backupPath);
      console.log(`✅ Backed up existing IDL to: ${backupPath}`);
    }

    // Write new IDL with pretty formatting
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(idl, null, 2), 'utf-8');
    console.log(`✅ IDL synchronized successfully!`);
    console.log(`   Output: ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('❌ IDL sync failed:', error);
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
        console.error('   Network error: Cannot reach backend repository.');
        console.error('   Make sure you have internet connection.');
      } else if (error.message.includes('404')) {
        console.error('   IDL not found at source URL.');
        console.error('   Backend may not have deployed the program yet.');
      } else if (error.message.includes('JSON')) {
        console.error('   Invalid JSON in fetched IDL.');
        console.error('   Backend IDL may be corrupted or incomplete.');
      }
    }
    process.exit(1);
  }
}

// Run sync
syncIdl().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
