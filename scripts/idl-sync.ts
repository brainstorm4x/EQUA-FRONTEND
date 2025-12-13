#!/usr/bin/env ts-node
/**
 * IDL Synchronization Script
 * 
 * Fetches the canonical Anchor IDL from the EQUA backend repository
 * and writes it to public/idl/equa_token.json.
 * 
 * This ensures the frontend always uses the correct, backend-generated IDL,
 * preventing type mismatches and Anchor BorshCoder failures.
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

// Default backend IDL location (GitHub raw content)
const DEFAULT_IDL_URL = 'https://raw.githubusercontent.com/brainstorm4x/EQUA/main/target/idl/equa_token.json';

// Allow override via environment variable
const IDL_SOURCE_URL = process.env.IDL_SOURCE_URL || DEFAULT_IDL_URL;

// Target location in frontend repo
const TARGET_IDL_PATH = path.join(__dirname, '..', 'public', 'idl', 'equa_token.json');

/**
 * Fetch content from URL using Node's built-in https module
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirects
        if (response.headers.location) {
          return fetchUrl(response.headers.location).then(resolve).catch(reject);
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Validate that fetched content is valid JSON IDL
 */
function validateIdl(idlJson: string): any {
  try {
    const idl = JSON.parse(idlJson);
    
    if (!idl.instructions || !Array.isArray(idl.instructions)) {
      throw new Error('IDL missing instructions array');
    }
    
    if (!idl.address && !idl.metadata?.address) {
      console.warn('⚠️  IDL missing program address field');
    }
    
    console.log(`✅ IDL validation passed:`);
    console.log(`   - Instructions: ${idl.instructions.length}`);
    console.log(`   - Types: ${idl.types?.length || 0}`);
    console.log(`   - Accounts: ${idl.accounts?.length || 0}`);
    
    return idl;
  } catch (error: any) {
    throw new Error(`IDL validation failed: ${error.message}`);
  }
}

/**
 * Backup existing IDL file
 */
function backupExistingIdl() {
  if (fs.existsSync(TARGET_IDL_PATH)) {
    const backupPath = TARGET_IDL_PATH.replace('.json', `.backup.${Date.now()}.json`);
    fs.copyFileSync(TARGET_IDL_PATH, backupPath);
    console.log(`📦 Backed up existing IDL to: ${path.basename(backupPath)}`);
  }
}

/**
 * Main sync function
 */
async function syncIdl() {
  console.log('🔄 Starting IDL synchronization...');
  console.log(`📡 Source: ${IDL_SOURCE_URL}`);
  console.log(`📁 Target: ${TARGET_IDL_PATH}\n`);

  try {
    // Fetch IDL from backend
    console.log('⬇️  Fetching IDL from backend repository...');
    const idlContent = await fetchUrl(IDL_SOURCE_URL);
    
    // Validate IDL structure
    console.log('🔍 Validating IDL structure...');
    const idl = validateIdl(idlContent);
    
    // Backup existing IDL
    backupExistingIdl();
    
    // Write new IDL with pretty formatting
    console.log('💾 Writing IDL to public/idl/equa_token.json...');
    const prettyIdl = JSON.stringify(idl, null, 2);
    
    // Ensure target directory exists
    const targetDir = path.dirname(TARGET_IDL_PATH);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    fs.writeFileSync(TARGET_IDL_PATH, prettyIdl, 'utf8');
    
    console.log('\n✅ IDL synchronization complete!');
    console.log(`📊 IDL Stats:`);
    console.log(`   - Program ID: ${idl.address || idl.metadata?.address || 'N/A'}`);
    console.log(`   - File size: ${(prettyIdl.length / 1024).toFixed(2)} KB`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review changes: git diff public/idl/equa_token.json`);
    console.log(`   2. Test the application: npm run dev`);
    console.log(`   3. Commit if changes look correct\n`);
    
  } catch (error: any) {
    console.error('\n❌ IDL synchronization failed!');
    
    if (error.message?.includes('HTTP 404')) {
      console.error(`\n💡 The backend IDL file was not found at:`);
      console.error(`   ${IDL_SOURCE_URL}`);
      console.error(`\n   Possible reasons:`);
      console.error(`   - Backend repository hasn't been built yet (run: anchor build)`);
      console.error(`   - IDL path has changed in the backend repository`);
      console.error(`   - Repository is private and requires authentication`);
      console.error(`\n   To use a different IDL source:`);
      console.error(`   IDL_SOURCE_URL=<your-url> npm run idl:sync\n`);
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      console.error(`\n💡 Network error - check your internet connection`);
    } else {
      console.error(`\n💡 Error details: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Run the sync
syncIdl();
