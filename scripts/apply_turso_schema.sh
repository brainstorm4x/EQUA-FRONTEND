#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# EQUA Turso Schema Sync Script
# ============================================================================
# This script applies the Turso database schema.
# Works with both local development and Turso Cloud.
#
# Usage:
#   Local dev:  TURSO_DATABASE_URL=http://127.0.0.1:8080 npm run db:sync:turso
#   Production: TURSO_DATABASE_URL=libsql://your-db.turso.io TURSO_AUTH_TOKEN=xxx npm run db:sync:turso
# ============================================================================

SCHEMA_FILE="${SCHEMA_FILE:-db/schema_turso.sql}"
DB_URL="${TURSO_DATABASE_URL:-}"
AUTH_TOKEN="${TURSO_AUTH_TOKEN:-}"

# Check if TURSO_DATABASE_URL is set
if [[ -z "$DB_URL" ]]; then
  echo "❌ Error: TURSO_DATABASE_URL is not set."
  echo ""
  echo "📝 Setup Instructions:"
  echo "======================"
  echo ""
  echo "Step 1: Install Turso CLI (if not installed)"
  echo "  curl -sSfL https://get.tur.so/install.sh | bash"
  echo ""
  echo "Step 2: Start local Turso server (in a separate terminal)"
  echo "  turso dev --port 8080"
  echo ""
  echo "Step 3: Set environment variable"
  echo "  export TURSO_DATABASE_URL=http://127.0.0.1:8080"
  echo ""
  echo "  Or add to .env.local:"
  echo "  TURSO_DATABASE_URL=http://127.0.0.1:8080"
  echo ""
  echo "Step 4: Run this script again"
  echo "  npm run db:sync:turso"
  echo ""
  echo "For production (Turso Cloud):"
  echo "  1. turso auth login"
  echo "  2. turso db create equa-db"
  echo "  3. turso db show equa-db --url"
  echo "  4. turso db tokens create equa-db"
  echo "  5. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN"
  echo ""
  exit 1
fi

# Check if schema file exists
if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "❌ Error: Schema file not found: $SCHEMA_FILE"
  exit 1
fi

# Check if turso CLI is installed
if ! command -v turso &> /dev/null; then
  echo "❌ Error: Turso CLI is not installed."
  echo ""
  echo "Install with:"
  echo "  curl -sSfL https://get.tur.so/install.sh | bash"
  echo ""
  echo "Or on macOS:"
  echo "  brew install tursodatabase/tap/turso"
  echo ""
  exit 1
fi

echo "📦 Applying Turso schema..."
echo "   Database: $DB_URL"
echo "   Schema: $SCHEMA_FILE"
echo ""

# Build turso db shell command
if [[ -n "$AUTH_TOKEN" ]]; then
  # Production: use auth token
  turso db shell "$DB_URL" --auth-token "$AUTH_TOKEN" < "$SCHEMA_FILE"
else
  # Local dev: no auth token needed
  turso db shell "$DB_URL" < "$SCHEMA_FILE"
fi

echo ""
echo "✅ Schema applied successfully!"