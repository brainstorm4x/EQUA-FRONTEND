/**
 * Netlify API Function: Referral rate limit (server-side)
 *
 * Replaces the prior per-browser localStorage counter. Two modes:
 *
 *   GET  /.netlify/functions/referral-rate-limit?address=<pubkey>
 *        Returns the current rate-limit status for a referrer.
 *
 *   POST /.netlify/functions/referral-rate-limit
 *        Body: { referrerAddress: string }
 *        Records a referral event for the referrer and returns updated status.
 *        NOTE: This endpoint does not yet verify on-chain that the referral
 *        actually happened. See netlify/functions/lib/referralCounter.ts for
 *        the documented limitations.
 *
 * Both responses use the same shape as the legacy client-side function so the
 * frontend can swap implementations transparently.
 */

import { Handler } from '@netlify/functions';
import { PublicKey } from '@solana/web3.js';
import { getStatus, recordReferral } from './lib/referralCounter';
import { enforceRateLimit } from './lib/rateLimit';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Tighter limit on POST than on GET — POST mutates state.
const GET_LIMIT  = { endpoint: 'referral-rate-limit-get',  windowMs: 60_000, max: 120 };
const POST_LIMIT = { endpoint: 'referral-rate-limit-post', windowMs: 60_000, max: 30  };

function bad(status: number, error: string, message: string) {
  return {
    statusCode: status,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error, message }),
  };
}

function validAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const rl = await enforceRateLimit(event.headers ?? {}, GET_LIMIT, CORS_HEADERS);
    if (rl) return rl;

    const address = event.queryStringParameters?.address;
    if (!validAddress(address)) {
      return bad(400, 'InvalidAddress', 'address query parameter must be a valid Solana public key');
    }
    const status = await getStatus(address);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, ...status }),
    };
  }

  if (event.httpMethod === 'POST') {
    const rl = await enforceRateLimit(event.headers ?? {}, POST_LIMIT, CORS_HEADERS);
    if (rl) return rl;

    let body: any;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return bad(400, 'InvalidJSON', 'Request body must be valid JSON.');
    }

    const { referrerAddress } = body;
    if (!validAddress(referrerAddress)) {
      return bad(400, 'InvalidAddress', 'referrerAddress must be a valid Solana public key');
    }

    const status = await recordReferral(referrerAddress);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, ...status }),
    };
  }

  return bad(405, 'MethodNotAllowed', 'Allowed methods: GET, POST, OPTIONS');
};
