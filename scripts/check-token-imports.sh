#!/bin/bash
# Check for direct TOKEN_PROGRAM_ID imports from @solana/spl-token
# These should only be imported from src/lib/constants.ts

set -e

echo "🔍 Checking for direct @solana/spl-token TOKEN_PROGRAM_ID imports..."

# Find files that import TOKEN_PROGRAM_ID directly from @solana/spl-token
# Exclude src/lib/constants.ts (the only allowed place)
DIRECT_IMPORTS=$(grep -rn "from '@solana/spl-token'" --include="*.ts" --include="*.tsx" app/ src/ 2>/dev/null | \
  grep -E "(TOKEN_PROGRAM_ID|TOKEN_2022_PROGRAM_ID)" | \
  grep -v "src/lib/constants.ts" || true)

if [ -n "$DIRECT_IMPORTS" ]; then
  echo "❌ Found direct TOKEN_PROGRAM_ID imports (should import from src/lib/constants.ts):"
  echo "$DIRECT_IMPORTS"
  echo ""
  echo "Fix: Change imports to:"
  echo "  import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@/lib/program';"
  exit 1
fi

echo "✅ No direct TOKEN_PROGRAM_ID imports found - all good!"
exit 0
