#!/usr/bin/env bash
# Post-deploy smoke test for the admin endpoints introduced by the security fix.
#
# Usage:
#   BASE_URL=https://your-site.netlify.app \
#   ADMIN_API_TOKEN=...                     \
#   bash scripts/smoke-test-admin-endpoints.sh
#
# Asserts:
#   1. POST without auth        -> 401  (closes the original vulnerability)
#   2. POST with wrong token    -> 401
#   3. POST with right token,
#      malformed userPublicKey  -> 400  (auth passed, validation rejected)
#   4. OPTIONS preflight        -> 204  (no admin keypair load)
#   5. GET list-business-users  -> 200  (read endpoint stays public)
#
# Exits non-zero on the first failure. Designed to run in CI after deploy.

set -u
set -o pipefail

: "${BASE_URL:?Set BASE_URL to your deployed Netlify site root}"
: "${ADMIN_API_TOKEN:?Set ADMIN_API_TOKEN to the production token}"

ADD_URL="$BASE_URL/.netlify/functions/add-business-referrer"
LIST_URL="$BASE_URL/.netlify/functions/list-business-users"

# A syntactically-valid public key that we don't actually want to register.
# It's the on-curve System Program ID — using it here means the call would
# fail program-side anyway, so we can use the *valid* token without effect.
SAFE_PUBKEY="11111111111111111111111111111112"

pass() { printf "  PASS  %s\n" "$1"; }
fail() { printf "  FAIL  %s\n     got: %s\n" "$1" "$2" >&2; exit 1; }

expect_status() {
  local name="$1" expected="$2" got="$3"
  if [ "$got" = "$expected" ]; then pass "$name (HTTP $got)"; else fail "$name (expected $expected)" "$got"; fi
}

echo "→ 1. POST without Authorization header"
status=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST -H "Content-Type: application/json" \
  -d "{\"userPublicKey\":\"$SAFE_PUBKEY\"}" "$ADD_URL")
expect_status "no auth -> 401" 401 "$status"

echo "→ 2. POST with wrong Bearer token"
status=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer not-the-real-token" \
  -d "{\"userPublicKey\":\"$SAFE_PUBKEY\"}" "$ADD_URL")
expect_status "wrong token -> 401" 401 "$status"

echo "→ 3. POST with correct token but invalid userPublicKey"
status=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -d '{"userPublicKey":"not-a-real-key"}' "$ADD_URL")
expect_status "valid token, invalid pubkey -> 400" 400 "$status"

echo "→ 4. OPTIONS preflight"
status=$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS "$ADD_URL")
expect_status "preflight -> 204" 204 "$status"

echo "→ 5. GET list-business-users (public)"
status=$(curl -sS -o /dev/null -w '%{http_code}' "$LIST_URL")
# 404 is also acceptable here if the registry isn't initialized yet.
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
  pass "list endpoint reachable (HTTP $status)"
else
  fail "list endpoint -> 200 or 404" "$status"
fi

# Rate-limit check: 31 rapid POSTs should yield at least one 429.
# Skipped by default because it intentionally exercises the limiter and pollutes
# the Blobs bucket. Run with SMOKE_TEST_RATE_LIMIT=1 if you want to verify.
if [ "${SMOKE_TEST_RATE_LIMIT:-0}" = "1" ]; then
  echo "→ 6. Rate limit kicks in on burst"
  saw_429=0
  for i in $(seq 1 35); do
    code=$(curl -sS -o /dev/null -w '%{http_code}' \
      -X POST -H "Content-Type: application/json" \
      -H "Authorization: Bearer wrong-token-on-purpose" \
      -d "{\"userPublicKey\":\"$SAFE_PUBKEY\"}" "$ADD_URL")
    if [ "$code" = "429" ]; then saw_429=1; break; fi
  done
  if [ "$saw_429" = "1" ]; then
    pass "rate limit returned 429 within the window"
  else
    fail "rate limit -> 429 within 35 reqs" "never saw 429"
  fi
fi

echo
echo "All admin-endpoint smoke tests passed."
