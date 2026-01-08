/**
 * Netlify API Function: Get Latest FX Rates
 * 
 * On-demand function to get the latest FX rates for frontend consumption
 */

import { Handler } from '@netlify/functions';
import { getLatestFxRates } from './lib/blobStorage';

// ============================================================================
// Main Handler
// ============================================================================

const handler: Handler = async (event, context) => {
  try {
    console.log('Fetching latest FX rates...');
    
    // Fetch latest FX rates from blob storage
    const fxData = await getLatestFxRates();
    
    if (!fxData) {
      // No data available yet
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'No FX rate data available',
          message: 'The FX rate update job may not have run yet. Please try again later.',
        }),
      };
    }
    
    console.log(`Returning FX rates from ${fxData.date} (${fxData.source})`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: JSON.stringify({
        timestamp: fxData.timestamp,
        date: fxData.date,
        rates: fxData.rates,
        source: fxData.source,
        next_update: fxData.next_update,
        currencyCount: Object.keys(fxData.rates).length,
      }),
    };
  } catch (error) {
    console.error('Error fetching latest FX rates:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
