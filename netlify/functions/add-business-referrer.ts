/**
 * Netlify API Function: Add Business Referrer
 * 
 * Admin-only endpoint to add a user to the BusinessRegistry
 * Requires valid admin private key and authority match
 * 
 * Endpoint: POST /.netlify/functions/add-business-referrer
 * 
 * Request Body:
 * {
 *   "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "signature": "3Zx...",
 *   "userPublicKey": "B2c9iTdDs9DLJbLqdYyXj7aN73k8B7NzxUe2za5C1TgY",
 *   "businessRegistryPDA": "...",
 *   "message": "Business referrer added successfully"
 * }
 * 
 * Response (Error):
 * {
 *   "success": false,
 *   "error": "BusinessReferrerAlreadyExists",
 *   "message": "User already in registry"
 * }
 */

import { Handler } from '@netlify/functions';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { 
  getAdminKeypair, 
  getConnection, 
  getProgramId, 
  getBusinessRegistryPDA 
} from './lib/solana-admin';
import { UniaToken } from './lib/unia_token';
import idl from './lib/unia_token.json';

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Parse Anchor error from transaction logs
 * 
 * @param error - Error object from transaction execution
 * @returns Parsed error code and message
 */
function parseAnchorError(error: any): { code: string; message: string } {
  let errorCode = 'UnknownError';
  let errorMessage = error.message || 'Unknown error occurred';
  
  // Check for error logs from Anchor
  if (error.logs && Array.isArray(error.logs)) {
    const logsStr = error.logs.join(' ');
    
    // Error 6021: BusinessReferrerAlreadyExists
    if (logsStr.includes('6021') || logsStr.includes('BusinessReferrerAlreadyExists')) {
      errorCode = 'BusinessReferrerAlreadyExists';
      errorMessage = 'User is already a business referrer';
    }
    // Error 6020: UnauthorizedBusinessRegistryAccess
    else if (logsStr.includes('6020') || logsStr.includes('UnauthorizedBusinessRegistryAccess')) {
      errorCode = 'UnauthorizedBusinessRegistryAccess';
      errorMessage = 'Admin key does not match registry authority';
    }
  }
  
  return { code: errorCode, message: errorMessage };
}

/**
 * Main handler for add-business-referrer endpoint
 */
export const handler: Handler = async (event) => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      }),
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const { userPublicKey } = body;

    if (!userPublicKey) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing userPublicKey',
          message: 'Request body must include userPublicKey field'
        }),
      };
    }

    // Validate public key format
    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(userPublicKey);
    } catch (error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid userPublicKey',
          message: 'userPublicKey must be a valid Solana public key'
        }),
      };
    }

    console.log('Adding business referrer:', userPublicKey);

    // Initialize Solana components
    const connection = getConnection();
    const adminKeypair = getAdminKeypair();
    const programId = getProgramId();
    
    console.log('Admin public key:', adminKeypair.publicKey.toBase58());
    console.log('Program ID:', programId.toBase58());

    // Create Anchor provider and program
    const provider = new AnchorProvider(
      connection,
      new Wallet(adminKeypair),
      { commitment: 'confirmed' }
    );

    const program = new Program<UniaToken>(
      idl as any,
      provider
    );

    // Derive business registry PDA
    const businessRegistryPDA = getBusinessRegistryPDA(programId);
    console.log('Business Registry PDA:', businessRegistryPDA.toBase58());

    // Build and send transaction
    const tx = await program.methods
      .addBusinessReferrer(userPubkey)
      .accounts({
        businessRegistry: businessRegistryPDA,
        authority: adminKeypair.publicKey,
      })
      .rpc();

    console.log('Transaction successful:', tx);

    // Return success response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        signature: tx,
        userPublicKey: userPublicKey,
        businessRegistryPDA: businessRegistryPDA.toBase58(),
        message: 'Business referrer added successfully',
      }),
    };

  } catch (error: any) {
    console.error('Error adding business referrer:', error);

    // Parse Anchor-specific errors
    const { code, message } = parseAnchorError(error);

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: code,
        message: message,
      }),
    };
  }
};
