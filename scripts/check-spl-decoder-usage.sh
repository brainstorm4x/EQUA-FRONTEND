#!/bin/bash
#
# Regression-prevention CI guard for the @solana/spl-token + bigint-buffer
# vulnerability chain (GHSA-3gc7-fjrx-p6mg).
#
# History:
#   - @solana/spl-token transitively pulls @solana/buffer-layout-utils which
#     pulls bigint-buffer which has an unpatched native-binding buffer
#     overflow (GHSA-3gc7-fjrx-p6mg).
#   - The vulnerability is only reachable through spl-token's *decoder*
#     functions (unpackAccount, getAccount, getMint, etc.) — the encoder /
#     pubkey-derivation surface never touches it.
#   - Resolution: src/lib/spl-token-inline.ts inlines the six encoder / PDA
#     helpers the codebase actually uses, and @solana/spl-token was dropped
#     from package.json dependencies. The bigint-buffer package is therefore
#     not installed at all — the vulnerability is structurally absent.
#
# What this guard prevents (defense in depth):
#   1. A regression where a future contributor re-adds @solana/spl-token to
#      package.json. That would silently re-introduce bigint-buffer.
#   2. A regression where source code starts importing from '@solana/spl-token'.
#      Catches the bug even if the dep somehow re-appears.
#   3. A regression where the inline shim grows a decoder symbol. The shim's
#      header explicitly says "never add decoder helpers here." This check
#      enforces that property.
#
# Fail the build for ANY of those three regressions. The cost of running this
# check is a few hundred milliseconds; the cost of missing a regression is
# the entire vulnerability chain reappearing.

set -e

FAILED=0

# Decoder symbols that route through bigint-buffer when spl-token is installed.
# Forbidden from being added to the inline shim AND from being imported from
# the original package (in case it ever sneaks back into the dep tree).
FORBIDDEN_SYMBOLS=(
  "unpackAccount"
  "unpackMint"
  "unpackMultisig"
  "getAccount"
  "getMint"
  "getMultisig"
  "getOrCreateAssociatedTokenAccount"
  "uiAmountToAmount"
  "amountToUiAmount"
)

echo "🔍 [check-spl-decoder-usage] Defense-in-depth guard against bigint-buffer regression"

# ----------------------------------------------------------------------------
# Check 1: package.json must not re-add @solana/spl-token
# ----------------------------------------------------------------------------
if grep -E '"@solana/spl-token"\s*:' package.json > /dev/null 2>&1; then
  echo ""
  echo "❌ package.json re-added @solana/spl-token"
  echo ""
  echo "   This package transitively pulls bigint-buffer which has the unpatched"
  echo "   GHSA-3gc7-fjrx-p6mg native buffer overflow. It was removed from this"
  echo "   project deliberately. The six symbols we use are inlined in"
  echo "   src/lib/spl-token-inline.ts — import from there instead."
  echo ""
  echo "   If you genuinely need an spl-token symbol that's not in the shim,"
  echo "   either (a) add it to the inline shim if it's encoder / PDA-only, or"
  echo "   (b) talk to the maintainer first if it's a decoder symbol."
  FAILED=1
fi

# ----------------------------------------------------------------------------
# Check 2: no source file may import from '@solana/spl-token'
# ----------------------------------------------------------------------------
SPL_IMPORTS=$(grep -rnE "from ['\"]@solana/spl-token['\"]" \
  --include="*.ts" --include="*.tsx" \
  src app netlify 2>/dev/null \
  | grep -v "/__tests__/" \
  || true)

if [ -n "$SPL_IMPORTS" ]; then
  echo ""
  echo "❌ Direct import from @solana/spl-token detected:"
  echo ""
  echo "$SPL_IMPORTS"
  echo ""
  echo "   Use @/lib/spl-token-inline instead. If the symbol you need isn't in"
  echo "   the inline shim, see the guidance above."
  FAILED=1
fi

# ----------------------------------------------------------------------------
# Check 3: the inline shim must not grow a decoder symbol
# ----------------------------------------------------------------------------
PATTERN=$(IFS='|'; echo "${FORBIDDEN_SYMBOLS[*]}")

if [ -f src/lib/spl-token-inline.ts ]; then
  SHIM_DECODER=$(grep -nE "(${PATTERN})" src/lib/spl-token-inline.ts \
    | grep -vE "^[[:space:]]*[*/]" \
    || true)

  if [ -n "$SHIM_DECODER" ]; then
    echo ""
    echo "❌ Inline shim (src/lib/spl-token-inline.ts) contains a forbidden decoder symbol:"
    echo ""
    echo "$SHIM_DECODER"
    echo ""
    echo "   The shim's purpose is to avoid bigint-buffer. Adding any of these"
    echo "   decoder symbols (unpackAccount, getAccount, etc.) defeats that."
    echo "   For token-account reads, use connection.getParsedAccountInfo() or"
    echo "   a hand-rolled buffer parse."
    FAILED=1
  fi
fi

# ----------------------------------------------------------------------------
# Check 4: no source file may import a decoder symbol from the inline shim
# either (defense in depth in case Check 3 misses a comment-disguised one)
# ----------------------------------------------------------------------------
SHIM_CONSUMER=$(grep -rnE "from ['\"]@/lib/spl-token-inline['\"]" \
  --include="*.ts" --include="*.tsx" \
  src app netlify 2>/dev/null \
  | grep -E "(${PATTERN})" \
  | grep -v "/__tests__/" \
  || true)

if [ -n "$SHIM_CONSUMER" ]; then
  echo ""
  echo "❌ Code is importing a forbidden decoder symbol from the inline shim:"
  echo ""
  echo "$SHIM_CONSUMER"
  echo ""
  echo "   These symbols should never exist in the shim, and they don't — so"
  echo "   if you see this, someone added them. Check src/lib/spl-token-inline.ts."
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  exit 1
fi

echo "✅ No @solana/spl-token regression — inline shim is decoder-free."
exit 0
