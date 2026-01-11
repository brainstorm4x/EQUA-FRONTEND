/**
 * Transaction Diagnostics and Wallet Adapter Error Capture
 * 
 * Provides comprehensive debugging utilities for Solana transactions,
 * particularly for diagnosing wallet adapter errors that provide minimal
 * information (e.g., "Unexpected error" with no details).
 * 
 * Key features:
 * - Pre-transaction validation (structure, serialization, accounts)
 * - Wallet adapter error interception with detailed logging
 * - Transaction debugging (raw bytes, account metas, instruction data)
 * - RPC connection health checks
 */

import { 
  Transaction, 
  TransactionInstruction, 
  Connection, 
  PublicKey,
} from '@solana/web3.js';
import { PROGRAM_ID } from '@/lib/constants';

/**
 * Transaction validation result
 */
export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    accountCount: number;
    instructionCount: number;
    hasFeePayer: boolean;
    hasRecentBlockhash: boolean;
    estimatedSize: number;
    programIds: string[];
  };
}

/**
 * Wallet adapter error details (extracted from generic error)
 */
export interface WalletErrorDetails {
  errorType: 'WalletSendTransactionError' | 'WalletSignTransactionError' | 'Generic';
  message: string;
  code?: string | number;
  logs?: string[];
  signature?: string;
  rawError: any;
}

/**
 * Validate transaction structure before sending to wallet
 * Catches common issues that cause silent wallet rejections
 */
export function validateTransaction(transaction: Transaction): TransactionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check fee payer
  if (!transaction.feePayer) {
    errors.push('Transaction missing fee payer - wallet will reject');
  }
  
  // Check recent blockhash
  if (!transaction.recentBlockhash) {
    errors.push('Transaction missing recent blockhash - will fail to send');
  }
  
  // Check instructions
  if (transaction.instructions.length === 0) {
    errors.push('Transaction has no instructions');
  }
  
  // Validate each instruction
  transaction.instructions.forEach((ix, index) => {
    // Check program ID
    if (!ix.programId || ix.programId.equals(PublicKey.default)) {
      errors.push(`Instruction ${index}: Invalid program ID (default/null)`);
    }
    
    // Check accounts
    if (ix.keys.length === 0) {
      warnings.push(`Instruction ${index}: No accounts specified`);
    }
    
    // Check for duplicate accounts with conflicting flags
    const accountMap = new Map<string, { isWritable: boolean; isSigner: boolean }>();
    ix.keys.forEach((key, keyIndex) => {
      const keyStr = key.pubkey.toBase58();
      const existing = accountMap.get(keyStr);
      if (existing) {
        if (existing.isWritable !== key.isWritable || existing.isSigner !== key.isSigner) {
          warnings.push(
            `Instruction ${index}: Account ${keyStr} appears multiple times with different flags ` +
            `(writable: ${existing.isWritable}/${key.isWritable}, signer: ${existing.isSigner}/${key.isSigner})`
          );
        }
      }
      accountMap.set(keyStr, { isWritable: key.isWritable, isSigner: key.isSigner });
    });
    
    // Check data
    if (!ix.data || ix.data.length === 0) {
      warnings.push(`Instruction ${index}: Empty instruction data`);
    }
  });
  
  // Estimate serialized size (rough approximation)
  const estimatedSize = estimateTransactionSize(transaction);
  if (estimatedSize > 1232) {
    errors.push(`Transaction too large: ~${estimatedSize} bytes (max 1232) - will fail to send`);
  } else if (estimatedSize > 1000) {
    warnings.push(`Transaction size: ~${estimatedSize} bytes (approaching 1232 byte limit)`);
  }
  
  // Extract program IDs
  const programIds = Array.from(
    new Set(transaction.instructions.map(ix => ix.programId.toBase58()))
  );
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      accountCount: transaction.instructions.reduce((acc, ix) => acc + ix.keys.length, 0),
      instructionCount: transaction.instructions.length,
      hasFeePayer: !!transaction.feePayer,
      hasRecentBlockhash: !!transaction.recentBlockhash,
      estimatedSize,
      programIds,
    },
  };
}

/**
 * Estimate transaction size (rough approximation)
 */
function estimateTransactionSize(transaction: Transaction): number {
  // Compact array header + signatures
  let size = 1 + (transaction.signatures.length * 64);
  
  // Message header (3 bytes)
  size += 3;
  
  // Account addresses (compact array + 32 bytes per account)
  const accounts = new Set<string>();
  transaction.instructions.forEach(ix => {
    accounts.add(ix.programId.toBase58());
    ix.keys.forEach(key => accounts.add(key.pubkey.toBase58()));
  });
  size += 1 + (accounts.size * 32);
  
  // Recent blockhash (32 bytes)
  size += 32;
  
  // Instructions (compact array + data per instruction)
  size += 1;
  transaction.instructions.forEach(ix => {
    // Program ID index (1 byte) + accounts compact array + data compact array
    size += 1 + 1 + ix.keys.length + 1 + ix.data.length;
  });
  
  return size;
}

/**
 * Extract detailed error information from wallet adapter errors
 * Wallet adapters often wrap errors with minimal information
 */
export function extractWalletError(error: any): WalletErrorDetails {
  // Default details
  const details: WalletErrorDetails = {
    errorType: 'Generic',
    message: error?.message || 'Unknown error',
    rawError: error,
  };
  
  // Check error name/type
  if (error?.name) {
    if (error.name.includes('WalletSendTransactionError')) {
      details.errorType = 'WalletSendTransactionError';
    } else if (error.name.includes('WalletSignTransactionError')) {
      details.errorType = 'WalletSignTransactionError';
    }
  }
  
  // Extract code
  if (error?.code !== undefined) {
    details.code = error.code;
  }
  
  // Extract logs
  if (Array.isArray(error?.logs)) {
    details.logs = error.logs;
  }
  
  // Extract signature
  if (error?.signature) {
    details.signature = error.signature;
  }
  
  // Check for nested error
  if (error?.error) {
    const nestedDetails = extractWalletError(error.error);
    // Prefer nested details if they have more information
    if (nestedDetails.logs || nestedDetails.code) {
      return {
        ...details,
        ...nestedDetails,
        message: nestedDetails.message || details.message,
      };
    }
  }
  
  return details;
}

/**
 * Log transaction details for debugging
 */
export function logTransactionDetails(
  transaction: Transaction,
  context: string = 'Transaction'
): void {
  console.group(`🔍 ${context} Details`);
  
  console.log('Fee Payer:', transaction.feePayer?.toBase58() || 'NOT SET');
  console.log('Recent Blockhash:', transaction.recentBlockhash || 'NOT SET');
  console.log('Signature Count:', transaction.signatures.length);
  console.log('Instruction Count:', transaction.instructions.length);
  
  transaction.instructions.forEach((ix, index) => {
    console.group(`  Instruction ${index}:`);
    console.log('    Program ID:', ix.programId.toBase58());
    console.log('    Accounts:', ix.keys.length);
    ix.keys.forEach((key, keyIndex) => {
      console.log(
        `      ${keyIndex}. ${key.pubkey.toBase58()} ` +
        `[${key.isSigner ? 'S' : '-'}${key.isWritable ? 'W' : '-'}]`
      );
    });
    console.log('    Data (bytes):', ix.data.length);
    if (ix.data.length <= 32) {
      // Convert Uint8Array to hex string (browser-safe)
      const hexString = Array.from(ix.data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log('    Data (hex):', hexString);
    }
    console.groupEnd();
  });
  
  console.groupEnd();
}

/**
 * Log wallet adapter error with full details
 */
export function logWalletError(error: any, context: string = 'Wallet Error'): WalletErrorDetails {
  const details = extractWalletError(error);
  
  console.group(`❌ ${context}`);
  console.error('Error Type:', details.errorType);
  console.error('Message:', details.message);
  
  if (details.code !== undefined) {
    console.error('Code:', details.code);
  }
  
  if (details.logs && details.logs.length > 0) {
    console.group('Transaction Logs:');
    details.logs.forEach((log, index) => {
      console.error(`  ${index}. ${log}`);
    });
    console.groupEnd();
  }
  
  if (details.signature) {
    console.error('Signature:', details.signature);
    // Note: Explorer URL defaults to devnet. Adjust cluster parameter for mainnet/testnet.
    console.error(
      'Explorer:',
      `https://explorer.solana.com/tx/${details.signature}?cluster=devnet`
    );
  }
  
  // Log full error object for debugging
  console.group('Raw Error Object:');
  console.error(details.rawError);
  console.groupEnd();
  
  console.groupEnd();
  
  return details;
}

/**
 * Validate instruction against expected structure
 */
export function validateInstruction(
  instruction: TransactionInstruction,
  expectedAccountCount: number,
  expectedProgramId: PublicKey = PROGRAM_ID
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check program ID
  if (!instruction.programId.equals(expectedProgramId)) {
    errors.push(
      `Program ID mismatch: expected ${expectedProgramId.toBase58()}, ` +
      `got ${instruction.programId.toBase58()}`
    );
  }
  
  // Check account count
  if (instruction.keys.length !== expectedAccountCount) {
    errors.push(
      `Account count mismatch: expected ${expectedAccountCount}, ` +
      `got ${instruction.keys.length}`
    );
  }
  
  // Check discriminator (first 8 bytes)
  if (instruction.data.length < 8) {
    errors.push(`Instruction data too short: ${instruction.data.length} bytes (need at least 8 for discriminator)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check RPC connection health
 */
export async function checkRpcHealth(connection: Connection): Promise<{
  healthy: boolean;
  latency: number;
  blockHeight?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const blockHeight = await connection.getBlockHeight();
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
      blockHeight,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Comprehensive pre-transaction validation and logging
 * Call this before sending any transaction to the wallet
 */
export async function preTransactionValidation(
  transaction: Transaction,
  connection: Connection,
  context: string = 'Transaction'
): Promise<{ canProceed: boolean; issues: string[] }> {
  console.group(`🔍 Pre-Transaction Validation: ${context}`);
  
  const issues: string[] = [];
  
  // 1. Validate transaction structure
  console.log('1️⃣ Validating transaction structure...');
  const validation = validateTransaction(transaction);
  
  if (!validation.valid) {
    console.error('❌ Transaction validation FAILED:');
    validation.errors.forEach(error => {
      console.error(`  - ${error}`);
      issues.push(error);
    });
  } else {
    console.log('✅ Transaction structure valid');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Validation warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }
  
  console.log('Transaction details:', validation.details);
  
  // 2. Check RPC connection
  console.log('2️⃣ Checking RPC connection health...');
  const rpcHealth = await checkRpcHealth(connection);
  
  if (!rpcHealth.healthy) {
    console.error('❌ RPC connection unhealthy:', rpcHealth.error);
    issues.push(`RPC connection error: ${rpcHealth.error}`);
  } else {
    console.log(`✅ RPC healthy (latency: ${rpcHealth.latency}ms, block: ${rpcHealth.blockHeight})`);
  }
  
  // 3. Log transaction details
  console.log('3️⃣ Transaction details:');
  logTransactionDetails(transaction, context);
  
  console.groupEnd();
  
  return {
    canProceed: issues.length === 0,
    issues,
  };
}

/**
 * Serialize transaction for debugging
 * Returns base64-encoded transaction
 */
export function serializeTransactionForDebug(transaction: Transaction): {
  serialized: string;
  size: number;
  wireFormat: string;
} {
  try {
    // Serialize without signature verification for debugging purposes
    // This allows us to inspect the transaction structure even before signing
    const serialized = transaction.serialize({
      requireAllSignatures: false,  // Don't require all signatures (may not be signed yet)
      verifySignatures: false,      // Don't verify signatures (debugging pre-signed transactions)
    });
    
    return {
      serialized: serialized.toString('base64'),
      size: serialized.length,
      wireFormat: serialized.toString('hex'),
    };
  } catch (error) {
    return {
      serialized: '',
      size: 0,
      wireFormat: `Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
