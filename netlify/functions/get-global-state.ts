/**
 * Netlify API Function: Get GlobalState
 *
 * Serves the raw on-chain GlobalState account through the Netlify CDN so
 * every visitor shares one RPC read per cache window instead of each browser
 * reading (and subscribing to) the same account. The client parses the bytes
 * with the same parsers it uses for a direct RPC read.
 */

import { Handler, HandlerResponse } from '@netlify/functions';
import { Connection, PublicKey } from '@solana/web3.js';

// Seconds the CDN may serve a cached copy, and how long it may serve a
// stale copy while it refreshes in the background.
const CDN_MAX_AGE = 10;
const STALE_WHILE_REVALIDATE = 30;

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// SOLANA_RPC_URL is server-only (never sent to browsers), so it can hold an
// RPC key with no domain restriction. Otherwise the same env names, in the
// same order, as RPC_ENDPOINT and PROGRAM_ID in src/lib/constants.ts, so this
// function always reads the same cluster and program the frontend uses.
function getRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_HOST ||
    'https://api.devnet.solana.com'
  );
}

function getProgramId(): PublicKey {
  return new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
      process.env.NEXT_PUBLIC_UNIYAA_PROGRAM_ID ||
      'HFg64becVHyoFuHaLVHEVa7cpG6ejyQztDi8zMh4kLSK'
  );
}

const handler: Handler = async (): Promise<HandlerResponse> => {
  try {
    const [globalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global-state')],
      getProgramId()
    );
    const connection = new Connection(getRpcUrl(), 'confirmed');
    const { context, value } = await connection.getAccountInfoAndContext(globalStatePDA);

    if (!value) {
      return {
        statusCode: 404,
        headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          error: 'GlobalState account not found',
          address: globalStatePDA.toBase58(),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...BASE_HEADERS,
        // Browsers always revalidate; the Netlify CDN holds the shared copy.
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': `public, s-maxage=${CDN_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}, durable`,
      },
      body: JSON.stringify({
        address: globalStatePDA.toBase58(),
        slot: context.slot,
        fetchedAt: Date.now(),
        data: value.data.toString('base64'),
      }),
    };
  } catch (error) {
    console.error('Error fetching GlobalState:', error);
    return {
      statusCode: 502,
      headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
