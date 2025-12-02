# Changelog

All notable changes to the EQUA Frontend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Turso (libSQL) database provider support for globally replicated SQLite-compatible cloud database
  - New `DB_PROVIDER=turso` option alongside existing sqlite and supabase
  - `@libsql/client` dependency for HTTP-based libSQL access
  - `TursoAdapter` implementing full `DatabaseAdapter` interface
  - Environment variables: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
  - Database synchronization script: `npm run db:sync:turso`
  - Documentation: `docs/DB_TURSO_NOTES.md`
  - Tests: `__tests__/db/turso-adapter.test.ts`
- Environment variable override for program ID: `NEXT_PUBLIC_EQUA_PROGRAM_ID`
- Runtime assertion utility: `lib/assertProgramId.ts`
- Comprehensive documentation updates for database providers

### Changed
- **BREAKING**: Updated Solana program ID from `BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL` to `7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP`
  - Updated all code references: `src/config/program.ts`, `lib/constants.ts`, `src/lib/constants.ts`
  - Updated IDL files: `public/idl/equa_token.json`, `src/idl/equa_token.json`, `src/lib/equa_token.json`, `src/lib/equa_token.ts`
  - Updated UI references: `app/page.tsx`, `app/mint/page.tsx`
  - Updated documentation: `README.md`, `docs/TOKEN_METADATA_SETUP.md`
  - Added historical notes to archive documentation in `docs/archive/`
- Database adapter interface now supports three providers: sqlite, supabase, and turso
- `.env.example` updated with Turso configuration and program ID override documentation

### Fixed
- Program ID now supports environment variable override for easier testing and migrations

## Migration Notes

### Updating from Previous Version

If you have an existing deployment using the old program ID (`BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL`):

1. **Update environment variables** (if needed):
   ```bash
   # To continue using old program ID temporarily:
   NEXT_PUBLIC_EQUA_PROGRAM_ID=BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL
   ```

2. **For new deployments**, use the default new program ID or set:
   ```bash
   NEXT_PUBLIC_EQUA_PROGRAM_ID=7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP
   ```

3. **PDA Recalculation**: PDAs derived from the program ID will be different. Ensure your backend is deployed with the matching program ID.

4. **IDL Compatibility**: Verify that your deployed program's IDL matches the updated IDL files in this repository.

### Using Turso Database

To use Turso as your database provider:

1. **Create a Turso database**:
   ```bash
   turso db create equa-db
   ```

2. **Generate an auth token**:
   ```bash
   turso db tokens create equa-db
   ```

3. **Get the database URL**:
   ```bash
   turso db show equa-db --url
   ```

4. **Configure environment variables**:
   ```bash
   DB_PROVIDER=turso
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-token-here
   ```

5. **Synchronize the schema**:
   ```bash
   npm run db:sync:turso
   ```

6. **Start the application**:
   ```bash
   npm run dev
   ```

---

## [0.1.0] - 2025-12-02

### Initial Release
- Solana DApp for EQUA token minting and management
- User registration with account type selection (individual/business)
- Referral system with rate limiting
- Dynamic token pricing with elevated tiers for early users
- Time-locked rewards for first 100 users
- SQLite and Supabase database provider support
- Comprehensive testing infrastructure
- Wallet adapter integration (Phantom, Solflare, etc.)
