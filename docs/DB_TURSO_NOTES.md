# Turso Database Provider - Setup and Notes

## Overview

Turso is a distributed database built on libSQL (a fork of SQLite) that provides edge replication and global distribution. This document describes how to use Turso as a database provider for the EQUA Frontend application.

## Why Turso?

- **SQLite Compatible**: Uses the same schema as our local SQLite development setup
- **Globally Distributed**: Edge replication for low-latency access worldwide
- **HTTP/WebSocket Access**: No need for persistent connections
- **Serverless-Friendly**: Works in edge runtimes and serverless environments
- **Free Tier**: Generous free tier for development and small projects

## Prerequisites

1. **Turso CLI**: Install the Turso CLI tool
   ```bash
   # macOS/Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Or with Homebrew
   brew install tursodatabase/tap/turso
   ```

2. **Turso Account**: Sign up at https://turso.tech or use the CLI
   ```bash
   turso auth signup
   ```

## Setup Instructions

### 1. Create a Turso Database

```bash
# Create a new database
turso db create equa-db

# Optionally, specify a region closer to you
turso db create equa-db --location sjc

# View available locations
turso db locations
```

### 2. Generate an Auth Token

```bash
# Create an auth token for your database
turso db tokens create equa-db

# For a read-only token (optional)
turso db tokens create equa-db --read-only
```

### 3. Get Your Database URL

```bash
# Get the database URL
turso db show equa-db --url

# Or get all info at once
turso db show equa-db
```

### 4. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Database Provider
DB_PROVIDER=turso

# Turso Configuration
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

**Important**: Never commit your auth token to version control!

### 5. Synchronize the Database Schema

Run the schema synchronization script to create tables:

```bash
npm run db:sync:turso
```

This script will:
- Connect to your Turso database
- Read the schema from `db/schema.sql`
- Create all tables, indexes, and triggers
- Verify that everything was created successfully

### 6. Test the Connection

Verify connectivity before starting development:

```bash
npm run test:turso
```

This will:
- Test the database connection
- List all tables
- Show row counts for each table
- Display database version info

### 7. Start Development

```bash
npm run dev
```

The application will now use Turso as the database provider!

## Schema Compatibility

The Turso adapter uses the **exact same schema** as the SQLite adapter (defined in `db/schema.sql`). This means:

- All table structures are identical
- Column types are compatible (libSQL is SQLite-compatible)
- Indexes and triggers work the same way
- Data can be exported from SQLite and imported to Turso

### Key Differences from SQLite

While libSQL/Turso is SQLite-compatible, there are a few operational differences:

1. **Network Latency**: Turso uses HTTP/WebSocket, so queries have network latency (usually 10-50ms)
2. **Connection Model**: No persistent connections; each query is stateless
3. **Replication**: Changes replicate globally, which can take a few seconds
4. **No File System**: Database is hosted remotely, no local file access

### Differences from Supabase

| Feature | Turso | Supabase |
|---------|-------|----------|
| Database | SQLite (libSQL) | PostgreSQL |
| Schema | Same as SQLite | Different (PostgreSQL types) |
| Access | HTTP/WebSocket | REST API + Realtime |
| Scaling | Edge replication | Vertical + read replicas |
| SQL Dialect | SQLite | PostgreSQL |

## Common Operations

### Viewing Database Contents

```bash
# Open an interactive SQL shell
turso db shell equa-db

# Run a query directly
turso db shell equa-db "SELECT COUNT(*) FROM users"

# Export database to SQLite file
turso db shell equa-db .dump > backup.sql
```

### Backup and Restore

```bash
# Create a backup
turso db shell equa-db .dump > equa-backup-$(date +%Y%m%d).sql

# Restore from backup (careful: this will replace data!)
turso db shell equa-db < equa-backup-20250101.sql
```

### Monitoring

```bash
# View database metrics
turso db inspect equa-db

# List all databases
turso db list

# View recent activity (if available)
turso db shell equa-db "SELECT * FROM sqlite_master WHERE type='table'"
```

## Performance Considerations

### Query Optimization

Turso uses SQLite's query planner, so standard SQLite optimization practices apply:

- Use indexes for frequently queried columns
- Avoid `SELECT *` when possible
- Use prepared statements (automatic with the adapter)
- Limit result sets with `LIMIT` clauses

### Caching Strategy

The Turso adapter doesn't implement query caching by default. For read-heavy workloads:

- Consider caching results at the application level
- Use Next.js caching mechanisms (React Server Components, `revalidate`)
- Implement stale-while-revalidate patterns for non-critical data

### Edge Replication

Turso automatically replicates data to edge locations. Benefits:

- Reads are served from the nearest edge location (low latency)
- Writes go to the primary location and replicate globally
- Eventual consistency model (typically <100ms replication lag)

## Security Best Practices

1. **Auth Tokens**: 
   - Treat auth tokens like passwords
   - Rotate tokens periodically
   - Use read-only tokens when write access isn't needed

2. **Environment Variables**:
   - Never commit `.env.local` to version control
   - Use different databases for dev/staging/production
   - Use separate auth tokens per environment

3. **Network Security**:
   - All connections use TLS by default
   - Auth tokens are sent via HTTP headers
   - Consider IP restrictions for production (Turso Pro)

## Troubleshooting

### Connection Errors

**Problem**: `Failed to connect to database`

**Solutions**:
- Verify `TURSO_DATABASE_URL` is correct
- Check that `TURSO_AUTH_TOKEN` is valid (regenerate if needed)
- Ensure network connectivity (try `ping turso.io`)
- Check if your firewall blocks HTTPS traffic

### Schema Sync Issues

**Problem**: Tables not created or "already exists" errors

**Solutions**:
- Review the output of `npm run db:sync:turso` carefully
- Check for syntax errors in `db/schema.sql`
- Manually inspect the database: `turso db shell equa-db ".tables"`
- Drop and recreate the database if needed (WARNING: deletes all data)

### Performance Issues

**Problem**: Queries are slow

**Solutions**:
- Check query execution plans: `EXPLAIN QUERY PLAN SELECT ...`
- Add indexes for frequently queried columns
- Reduce data transfer by selecting only needed columns
- Consider using a closer Turso region

### Data Consistency

**Problem**: Data appears stale or inconsistent

**Solutions**:
- Remember that Turso uses eventual consistency
- For critical reads after writes, add a small delay or retry logic
- Use transactions for operations that must be atomic
- Consider using Supabase for workloads requiring strict consistency

## Cost Considerations

Turso Pricing (as of December 2025):

- **Free Tier**: 8 GB storage, 500 read/write units per day
- **Paid Plans**: Start at $29/month for higher limits

Read/write units are based on:
- Query complexity
- Data transferred
- Number of rows affected

Monitor usage with:
```bash
turso db inspect equa-db
```

## Migration from SQLite

To migrate existing SQLite data to Turso:

```bash
# Export SQLite database
sqlite3 .data/equa.sqlite .dump > export.sql

# Import to Turso
turso db shell equa-db < export.sql

# Verify row counts
npm run test:turso
```

## Migration from Supabase

Migration from Supabase to Turso requires data transformation due to schema differences:

1. Export data from Supabase (CSV or JSON)
2. Transform data to match SQLite schema
3. Import into Turso using INSERT statements
4. Verify data integrity

A migration script can be created if needed.

## Additional Resources

- [Turso Documentation](https://docs.turso.tech/)
- [libSQL Documentation](https://docs.turso.tech/libsql)
- [SQLite Documentation](https://www.sqlite.org/docs.html) (for SQL syntax)
- [Turso CLI Reference](https://docs.turso.tech/reference/turso-cli)

## Support

For Turso-specific issues:
- Turso Discord: https://discord.gg/turso
- Turso GitHub: https://github.com/tursodatabase/libsql

For EQUA Frontend issues:
- Open an issue in the GitHub repository
- Include logs from `npm run test:turso` if database-related
