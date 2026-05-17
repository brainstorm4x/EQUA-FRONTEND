/**
 * Shared authentication + CORS helpers for admin-only Netlify endpoints.
 *
 * SECURITY:
 * - Requests must present `Authorization: Bearer <ADMIN_API_TOKEN>`.
 * - The comparison uses crypto.timingSafeEqual to avoid timing oracles.
 * - Allowed origins are read from ADMIN_ALLOWED_ORIGINS (comma-separated).
 *   The Origin header is echoed back only if it matches the allowlist;
 *   otherwise no Access-Control-Allow-Origin is sent at all.
 */

import { timingSafeEqual } from 'crypto';

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Vary': 'Origin',
};

function parseAllowedOrigins(): string[] {
  const raw = process.env.ADMIN_ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/**
 * Build CORS-safe response headers. If the request Origin is in the allowlist,
 * echo it back; otherwise omit Access-Control-Allow-Origin entirely.
 */
export function buildCorsHeaders(
  requestOrigin: string | undefined,
  allowedMethods: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  };

  const allowed = parseAllowedOrigins();
  if (requestOrigin && allowed.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }
  return headers;
}

/**
 * Verify the Authorization: Bearer header against ADMIN_API_TOKEN.
 *
 * @returns null on success, or an HTTP response describing the failure.
 */
export function verifyAdminAuth(
  headers: Record<string, string | undefined>,
  corsHeaders: Record<string, string>,
): { statusCode: number; headers: Record<string, string>; body: string } | null {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || expected.length < 32) {
    // Misconfiguration: refuse rather than silently authorize.
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'AdminAuthNotConfigured',
        message:
          'ADMIN_API_TOKEN is not configured on the server. ' +
          'Set it in Netlify environment variables (min 32 chars).',
      }),
    };
  }

  // Headers in Netlify Functions are normalized to lowercase, but be defensive.
  const authHeader =
    headers['authorization'] ?? headers['Authorization'] ?? '';

  const match = /^Bearer\s+(.+)$/.exec(authHeader.trim());
  if (!match) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header.',
      }),
    };
  }

  const provided = match[1];
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length-mismatched buffers leak length via timingSafeEqual throwing,
  // so pad to a fixed length before comparing.
  const fixed = Math.max(a.length, b.length, 64);
  const padA = Buffer.alloc(fixed);
  const padB = Buffer.alloc(fixed);
  a.copy(padA);
  b.copy(padB);

  const equal = timingSafeEqual(padA, padB) && a.length === b.length;
  if (!equal) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid admin token.',
      }),
    };
  }

  return null;
}
