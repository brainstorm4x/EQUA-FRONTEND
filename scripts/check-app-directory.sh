#!/bin/bash

# CI Check: Ensure only one app directory exists
# This prevents accidental recreation of duplicate app directories

set -e

echo "🔍 Checking for duplicate app directories..."

# Check if src/app exists
if [ -d "src/app" ]; then
  echo "❌ ERROR: Duplicate src/app directory detected!"
  echo "Only the root app/ directory should exist."
  echo "See DIRECTORY-CONSOLIDATION.md for details."
  exit 1
fi

# Ensure root app directory exists
if [ ! -d "app" ]; then
  echo "❌ ERROR: Root app/ directory is missing!"
  echo "Next.js requires an app/ directory for the App Router."
  exit 1
fi

echo "✅ Directory structure is correct:"
echo "  - Root app/ directory exists"
echo "  - No duplicate src/app/ directory"
echo ""

exit 0
