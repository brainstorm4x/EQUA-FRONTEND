#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   TURSO_DATABASE_URL=libsql://127.0.0.1:8080 TURSO_AUTH_TOKEN= \
#   ./apply_turso_schema.sh

SCHEMA_FILE="${SCHEMA_FILE:-schema_turso.sql}"
DB_URL="${TURSO_DATABASE_URL:-}"
AUTH_TOKEN="${TURSO_AUTH_TOKEN:-}"

if [[ -z "$DB_URL" ]]; then
  echo "Error: TURSO_DATABASE_URL is not set."
  echo "Example: TURSO_DATABASE_URL=libsql://127.0.0.1:8080"
  exit 1
fi

# Detect if using local libsql server (no token) vs Turso Cloud (token required)
AUTH_ARGS=()
if [[ -n "$AUTH_TOKEN" ]]; then
  AUTH_ARGS=(--auth-token "$AUTH_TOKEN")
fi

echo "Applying schema from $SCHEMA_FILE to $DB_URL ..."
turso db shell "$DB_URL" "${AUTH_ARGS[@]}" < "$SCHEMA_FILE"
echo "Done."