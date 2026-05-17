/**
 * Netlify API Function: List Business Users
 * 
 * Public endpoint to query all business referrers in the registry
 * No authentication required (read-only operation)
 * 
 * Endpoint: GET /.netlify/functions/list-business-users
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "authority": "...",
 *   "businessReferrers": ["B2c9...", "5xK..."],
 *   "count": 2,
 *   "maxCapacity": 100
 * }
 * 
 * Response (Error - Registry Not Initialized):
 * {
 *   "success": false,
 *   "error": "BusinessRegistryNotFound",
 *   "message": "Business registry has not been initialized"
 * }
 */

import { Handler } from '@netlify/functions';
import { PublicKey } from '@solana/web3.js';
import {
  getConnection,
  getProgramId,
  getBusinessRegistryPDA
} from './lib/solana-admin';
import { enforceRateLimit } from './lib/rateLimit';

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Public read endpoint: looser than the admin POSTs but still bounded so a
// single IP can't drive function-invocation costs without limit.
const RATE_LIMIT = { endpoint: 'list-business-users', windowMs: 60_000, max: 120 };

/**
 * BusinessRegistry account layout:
 * - 8 bytes: discriminator
 * - 32 bytes: authority (PublicKey)
 * - 4 bytes: vector length (u32)
 * - 32 * N bytes: business_referrers (Vec<PublicKey>)
 * 
 * Max capacity: 100 business referrers
 */
const DISCRIMINATOR_SIZE = 8;
const PUBKEY_SIZE = 32;
const VEC_LENGTH_SIZE = 4;
const MAX_BUSINESS_REFERRERS = 100;

/**
 * Parse BusinessRegistry account data
 * 
 * @param data - Raw account data buffer
 * @returns Parsed registry data
 */
function parseBusinessRegistry(data: Buffer): {
  authority: PublicKey;
  businessReferrers: string[];
  count: number;
} {
  // Read authority (bytes 8-40)
  const authorityBytes = data.slice(DISCRIMINATOR_SIZE, DISCRIMINATOR_SIZE + PUBKEY_SIZE);
  const authority = new PublicKey(authorityBytes);

  // Read vector length (bytes 40-44)
  const vecLengthOffset = DISCRIMINATOR_SIZE + PUBKEY_SIZE;
  const vecLength = data.readUInt32LE(vecLengthOffset);

  // Validate vector length
  if (vecLength > MAX_BUSINESS_REFERRERS) {
    throw new Error(
      `Invalid business registry data: vector length ${vecLength} exceeds max capacity ${MAX_BUSINESS_REFERRERS}`
    );
  }

  // Read business referrers
  const businessReferrers: string[] = [];
  const firstPubkeyOffset = vecLengthOffset + VEC_LENGTH_SIZE;

  for (let i = 0; i < vecLength; i++) {
    const offset = firstPubkeyOffset + (i * PUBKEY_SIZE);
    const pubkeyBytes = data.slice(offset, offset + PUBKEY_SIZE);
    const pubkey = new PublicKey(pubkeyBytes);
    businessReferrers.push(pubkey.toBase58());
  }

  return {
    authority,
    businessReferrers,
    count: vecLength,
  };
}

/**
 * Main handler for list-business-users endpoint
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are accepted'
      }),
    };
  }

  const rateLimited = await enforceRateLimit(event.headers ?? {}, RATE_LIMIT, CORS_HEADERS);
  if (rateLimited) return rateLimited;

  try {
    console.log('Fetching business registry...');

    // Initialize Solana components
    const connection = getConnection();
    const programId = getProgramId();
    const businessRegistryPDA = getBusinessRegistryPDA(programId);

    console.log('Program ID:', programId.toBase58());
    console.log('Business Registry PDA:', businessRegistryPDA.toBase58());

    // Fetch account data
    const accountInfo = await connection.getAccountInfo(businessRegistryPDA);

    if (!accountInfo) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'BusinessRegistryNotFound',
          message: 'Business registry has not been initialized. Call initialize_business_registry first.',
        }),
      };
    }

    // Verify account is owned by the program
    if (!accountInfo.owner.equals(programId)) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'InvalidAccountOwner',
          message: `Business registry account is owned by ${accountInfo.owner.toBase58()}, expected ${programId.toBase58()}`,
        }),
      };
    }

    // Parse account data
    const { authority, businessReferrers, count } = parseBusinessRegistry(accountInfo.data);

    console.log(`Found ${count} business referrers`);

    // Return success response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        authority: authority.toBase58(),
        businessReferrers,
        count,
        maxCapacity: MAX_BUSINESS_REFERRERS,
      }),
    };

  } catch (error: any) {
    console.error('Error fetching business registry:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
    };
  }
};
