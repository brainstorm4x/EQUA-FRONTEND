#!/bin/bash
# Block usage of @solana/spl-token decoder symbols.
#
# Why this exists:
#   GHSA-3gc7-fjrx-p6mg is a buffer overflow in bigint-buffer's native binding.
#   bigint-buffer reaches this codebase via @solana/spl-token → @solana/buffer-layout-utils.
#   The vulnerable function (toBigIntLE/BE) is ONLY called when decoding account
#   state from buffers. By keeping every spl-token import limited to the
#   encoder / pubkey-derivation surface, the vulnerable call graph is unreachable
#   from this codebase.
#
#   The runtime mitigation (patches/bigint-buffer+1.1.5.patch) disables the
#   native binding so even decoder calls would route through the safe pure-JS
#   path. This script is the source-level "depth in defense" complement: it
#   keeps the codebase honest so a future contributor doesn't reintroduce the
#   vulnerable call site if/when the runtime patch is removed.
#
# When to remove this:
#   - When @solana/spl-token is removed entirely (Option 3 in the security
#     review: inline the six symbols we use).
#   - OR when bigint-buffer ships a fixed release and the patch is no longer
#     needed.
#
# What is forbidden:
#   The decoder API surface of @solana/spl-token. These all touch the
#   buffer-layout-utils → bigint-buffer chain.

set -e

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

echo "🔍 Checking for forbidden @solana/spl-token decoder usage..."

# Build alternation regex from the array
PATTERN=$(IFS='|'; echo "${FORBIDDEN_SYMBOLS[*]}")

# Scan all TS/TSX in app/src/netlify but skip node_modules / .next / build outputs / tests.
# We look for any import line that mentions one of the forbidden symbols and
# pulls from @solana/spl-token.
HITS=$(grep -rnE "from ['\"]@solana/spl-token['\"]" \
  --include="*.ts" --include="*.tsx" \
  app src netlify 2>/dev/null \
  | grep -E "(${PATTERN})" \
  | grep -v "/__tests__/" \
  || true)

# Also catch named imports written on the line above the `from` (multi-line
# import braces). For each spl-token import, slurp the preceding 20 lines and
# look for forbidden names in the brace group.
MULTILINE_HITS=""
while IFS=: read -r file lineno _rest; do
  # Window: 20 lines above the "from '@solana/spl-token'" line.
  start=$((lineno > 20 ? lineno - 20 : 1))
  if sed -n "${start},${lineno}p" "$file" | grep -qE "(${PATTERN})"; then
    MULTILINE_HITS+="${file}:${lineno}: multi-line import contains forbidden symbol\n"
  fi
done < <(grep -rnE "from ['\"]@solana/spl-token['\"]" \
  --include="*.ts" --include="*.tsx" \
  app src netlify 2>/dev/null \
  | grep -v "/__tests__/")

if [ -n "$HITS" ] || [ -n "$MULTILINE_HITS" ]; then
  echo "❌ Forbidden @solana/spl-token decoder usage detected:"
  echo ""
  [ -n "$HITS" ] && echo "$HITS"
  [ -n "$MULTILINE_HITS" ] && printf "$MULTILINE_HITS"
  echo ""
  echo "These symbols call into bigint-buffer (GHSA-3gc7-fjrx-p6mg)."
  echo "Allowed @solana/spl-token surface for this codebase:"
  echo "  - TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID"
  echo "  - getAssociatedTokenAddress, getAssociatedTokenAddressSync"
  echo "  - createAssociatedTokenAccountInstruction*"
  echo ""
  echo "If you need to read a token account, use:"
  echo "  connection.getAccountInfo(ata)"
  echo "  + manual buffer decode (see netlify/functions/list-business-users.ts for a pattern)."
  exit 1
fi

echo "✅ No forbidden spl-token decoder symbols in app/src/netlify."
exit 0
