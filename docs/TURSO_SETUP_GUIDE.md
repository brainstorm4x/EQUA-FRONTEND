# EQUA Frontend - Setup and Configuration Guide

## Repository Structure Question

### Should I merge the frontend (EQUA-FRONTEND) and backend (EQUA) repositories?

**Short Answer: No, keep them separate.**

**Reasoning:**

1. **Separation of Concerns**: 
   - The frontend is a Next.js web application
   - The backend is a Solana smart contract (Anchor program)
   - These are fundamentally different codebases with different deployment targets

2. **Deployment Independence**:
   - Frontend deploys to Vercel/Netlify/hosting service
   - Backend deploys to Solana blockchain
   - Separate repos allow independent CI/CD pipelines

3. **Team Workflow**:
   - Frontend developers can work without touching Solana contracts
   - Smart contract developers can iterate without affecting frontend builds
   - Easier to manage permissions and access control

4. **Versioning**:
   - Frontend and backend have independent release cycles
   - Breaking changes in contracts don't force frontend redeployment

5. **Best Practices**:
   - Industry standard for web3 projects (e.g., Uniswap, Aave, Compound)
   - Monorepos are useful for shared TypeScript types, but your IDL already serves this purpose

**Recommended Approach**:
- Keep repos separate
- Use the IDL file (`equa_token.json`) as the interface contract between them
- Document the integration points clearly in README files
- Consider a mono-repository tool like Nx or Turborepo only if you have 3+ related repos

---

## Turso Database Setup Guide

Turso is a distributed SQLite database built on libSQL. It provides SQLite compatibility with edge replication and HTTP access.

### Prerequisites

1. **Install Turso CLI**:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Verify installation**:
   ```bash
   turso --version
   ```

### Option 1: Local Development (Recommended for Testing)

1. **Start local Turso server**:
   ```bash
   turso dev --port 8080
   ```
   
   This starts a local SQLite server on `http://127.0.0.1:8080` with no authentication required.

2. **Create a database file** (optional):
   ```bash
   turso dev --db-file ./equa-local.db --port 8080
   ```

3. **Run the setup SQL script**:
   
   In a new terminal window:
   ```bash
   # If you have sqlite3 installed
   sqlite3 equa-local.db < scripts/turso/turso-setup.sql
   
   # Or use the turso CLI
   turso db shell --db-file equa-local.db < scripts/turso/turso-setup.sql
   ```

4. **Configure environment variables** in `.env.local`:
   ```bash
   # Copy example env file
   cp .env.local.example .env.local
   
   # Edit .env.local and set:
   DB_PROVIDER=turso
   TURSO_DATABASE_URL=libsql://127.0.0.1:8080
   TURSO_AUTH_TOKEN=
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Option 2: Turso Cloud (Production)

1. **Sign up and login**:
   ```bash
   turso auth signup
   # Follow the prompts to create an account
   
   turso auth login
   ```

2. **Create a database**:
   ```bash
   turso db create equa-production
   ```

3. **Get database URL**:
   ```bash
   turso db show equa-production --url
   ```
   
   This will output something like: `libsql://equa-production-yourorg.turso.io`

4. **Create an authentication token**:
   ```bash
   turso db tokens create equa-production
   ```
   
   Save this token securely - you'll need it for the environment variables.

5. **Run the setup script** on your Turso database:
   ```bash
   turso db shell equa-production < scripts/turso/turso-setup.sql
   ```

6. **Configure environment variables** in `.env.local`:
   ```bash
   DB_PROVIDER=turso
   TURSO_DATABASE_URL=libsql://equa-production-yourorg.turso.io
   TURSO_AUTH_TOKEN=your-token-from-step-4
   ```

7. **Start the development server**:
   ```bash
   npm run dev
   ```

### Verifying Turso Setup

1. **Test the connection**:
   ```bash
   npm run test:turso
   ```

2. **Check tables were created**:
   ```bash
   # For local development
   turso db shell --db-file equa-local.db "SELECT name FROM sqlite_master WHERE type='table';"
   
   # For Turso Cloud
   turso db shell equa-production "SELECT name FROM sqlite_master WHERE type='table';"
   ```

   You should see tables like:
   - users
   - transfers
   - referrals
   - referral_rate_limits
   - analytics
   - price_history
   - device_fingerprints
   - global_state
   - eqx_prices
   - registrations
   - transfer_totals

3. **Verify data insertion**:
   ```bash
   # Check default seed data
   turso db shell equa-production "SELECT * FROM registrations;"
   turso db shell equa-production "SELECT * FROM transfer_totals;"
   ```

### Turso Commands Reference

```bash
# List all databases
turso db list

# Show database info
turso db show <database-name>

# Open interactive shell
turso db shell <database-name>

# Execute a query
turso db shell <database-name> "SELECT * FROM users LIMIT 5;"

# Create a backup
turso db dump <database-name> > backup.sql

# Delete a database
turso db destroy <database-name>

# Create additional auth tokens
turso db tokens create <database-name>

# Invalidate a token
turso db tokens revoke <database-name> <token>
```

### Migration from SQLite to Turso

If you have existing SQLite data and want to migrate to Turso:

1. **Export SQLite data**:
   ```bash
   sqlite3 .data/equa.sqlite .dump > sqlite-export.sql
   ```

2. **Import to Turso**:
   ```bash
   turso db shell equa-production < sqlite-export.sql
   ```

### Troubleshooting

**Issue: "Failed to connect to database"**
- Check that `turso dev` is running for local development
- Verify the DATABASE_URL is correct
- For cloud: ensure AUTH_TOKEN is valid

**Issue: "Authentication failed"**
- Regenerate your auth token: `turso db tokens create <database-name>`
- Update the token in `.env.local`

**Issue: "Table does not exist"**
- Run the setup script: `turso db shell <database-name> < scripts/turso/turso-setup.sql`

**Issue: "Cannot write to database"**
- Check that your auth token has write permissions
- For local dev: ensure you're not running multiple instances of `turso dev`

### Turso Documentation

- Official Docs: https://docs.turso.tech/
- libSQL: https://github.com/tursodatabase/libsql
- CLI Reference: https://docs.turso.tech/cli

---

## Switching Between Database Providers

The EQUA frontend supports three database providers:

1. **SQLite** (local development, offline-first)
2. **Supabase** (PostgreSQL in the cloud)
3. **Turso** (distributed SQLite)

To switch between them, simply change the `DB_PROVIDER` environment variable in `.env.local`:

```bash
# Use SQLite
DB_PROVIDER=sqlite

# Use Supabase
DB_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Use Turso
DB_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

**⚠️ SECURITY WARNING:**
- Never commit `.env.local` or `.env` files to version control
- Add `.env*.local` to your `.gitignore` (already done in this project)
- Never share production database credentials
- Use different credentials for development and production
- Rotate credentials regularly, especially after team member changes
- Consider using a secrets manager (AWS Secrets Manager, HashiCorp Vault) for production

The application will automatically use the configured provider without code changes.
