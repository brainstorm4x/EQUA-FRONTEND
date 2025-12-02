#!/bin/bash
# ============================================================================
# EQUA Turso Setup Script
# ============================================================================
# This script helps set up a local or remote Turso database for development.
# It optionally installs Turso CLI and starts a local dev database.
# ============================================================================

set -e  # Exit on error

echo "🚀 EQUA Turso Setup"
echo "==================="
echo ""

# ============================================================================
# Check if Turso CLI is installed
# ============================================================================

if ! command -v turso &> /dev/null; then
    echo "⚠️  Turso CLI not found"
    echo ""
    read -p "Would you like to install Turso CLI? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Installing Turso CLI..."
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -sSfL https://get.tur.so/install.sh | bash
            echo "✅ Turso CLI installed!"
            echo ""
            echo "⚠️  Please restart your terminal or run:"
            echo "    source ~/.bashrc  # or ~/.zshrc"
        else
            echo "❌ Automatic installation not supported on this OS"
            echo "   Please install manually: https://docs.turso.tech/cli/installation"
            exit 1
        fi
    else
        echo "ℹ️  You can install Turso CLI later with:"
        echo "   curl -sSfL https://get.tur.so/install.sh | bash"
        echo ""
    fi
fi

# ============================================================================
# Setup Options
# ============================================================================

echo "📋 Setup Options"
echo "==============="
echo ""
echo "1. Local Development (sqld on localhost:8080)"
echo "2. Remote Database (Turso Cloud)"
echo "3. Skip setup (show env vars only)"
echo ""
read -p "Choose option (1-3): " -n 1 -r
echo ""
echo ""

case $REPLY in
    1)
        # Local development setup
        echo "🔧 Setting up local development database..."
        echo ""
        echo "Starting local sqld server on port 8080..."
        echo ""
        
        # Check if sqld is already running
        if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Port 8080 is already in use"
            echo "   A local database may already be running"
            echo ""
        else
            echo "To start local sqld, run in a separate terminal:"
            echo "  turso dev --port 8080"
            echo ""
        fi
        
        echo "📝 Environment Variables for .env.local:"
        echo "========================================"
        echo ""
        echo "NEXT_PUBLIC_DB_ADAPTER=turso"
        echo "NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://127.0.0.1:8080"
        echo "NEXT_PUBLIC_TURSO_AUTH_TOKEN="
        echo ""
        echo "# Or use server-side env vars (more secure):"
        echo "DB_PROVIDER=turso"
        echo "TURSO_DATABASE_URL=libsql://127.0.0.1:8080"
        echo "TURSO_AUTH_TOKEN="
        echo ""
        ;;
        
    2)
        # Remote database setup
        echo "☁️  Setting up remote Turso database..."
        echo ""
        
        if ! command -v turso &> /dev/null; then
            echo "❌ Turso CLI is required for remote setup"
            echo "   Please install it first and run this script again"
            exit 1
        fi
        
        echo "First, make sure you're logged in:"
        echo "  turso auth login"
        echo ""
        echo "Then create a database:"
        echo "  turso db create equa-dev"
        echo ""
        echo "Get your database URL:"
        echo "  turso db show equa-dev --url"
        echo ""
        echo "Create an auth token:"
        echo "  turso db tokens create equa-dev"
        echo ""
        echo "📝 Add these to your .env.local:"
        echo "================================"
        echo ""
        echo "NEXT_PUBLIC_DB_ADAPTER=turso"
        echo "NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://your-db.turso.io"
        echo "NEXT_PUBLIC_TURSO_AUTH_TOKEN=your-token-here"
        echo ""
        echo "# Or use server-side env vars (more secure):"
        echo "DB_PROVIDER=turso"
        echo "TURSO_DATABASE_URL=libsql://your-db.turso.io"
        echo "TURSO_AUTH_TOKEN=your-token-here"
        echo ""
        ;;
        
    3)
        # Skip setup
        echo "ℹ️  Skipping setup"
        echo ""
        echo "📝 Required Environment Variables:"
        echo "=================================="
        echo ""
        echo "NEXT_PUBLIC_DB_ADAPTER=turso"
        echo "NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://your-db-url"
        echo "NEXT_PUBLIC_TURSO_AUTH_TOKEN=your-token (leave empty for local)"
        echo ""
        echo "# Or use server-side env vars (more secure):"
        echo "DB_PROVIDER=turso"
        echo "TURSO_DATABASE_URL=libsql://your-db-url"
        echo "TURSO_AUTH_TOKEN=your-token (leave empty for local)"
        echo ""
        ;;
        
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# ============================================================================
# Next Steps
# ============================================================================

echo "📚 Next Steps:"
echo "=============="
echo ""
echo "1. Add environment variables to .env.local"
echo "2. Run migrations:"
echo "     npm run db:migrate"
echo "3. (Optional) Test connection:"
echo "     npm run test:turso"
echo ""
echo "✅ Setup complete!"
