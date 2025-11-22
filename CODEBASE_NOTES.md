# Codebase Structure Notes

## Directory Organization

This project uses Next.js 14 with the App Router architecture.

### Active Directories

- **`/app`** - Next.js App Router pages and layouts (actively used by Next.js)
- **`/src/components`** - React components
- **`/src/hooks`** - Custom React hooks  
- **`/src/lib`** - Utility libraries and program logic
- **`/src/utils`** - Helper utilities
- **`/public`** - Static assets and IDL files

### Excluded from TypeScript Compilation

The following directories are excluded in `tsconfig.json`:

1. **`src/app/`** - Alternative/legacy app directory implementation
   - Not used by Next.js (which uses `/app` at root level)
   - Contains older implementations of pages
   - Excluded to avoid TypeScript errors from unused code

2. **`src/services/`** - Alternative service layer implementations
   - Contains alternative implementations not used in production
   - Kept for reference or future migration
   - Excluded to avoid TypeScript errors from incomplete implementations

3. **`create_mint.ts`** - Utility script for blockchain deployment
   - Standalone script not part of the web application
   - Requires external dependencies not in the project
   - Run separately outside the main application

### Import Alias

The project uses `@/*` as an alias for `./src/*` (configured in `tsconfig.json`).

Example:
```typescript
import { useProgram } from '@/hooks/useProgram';
import { WalletButton } from '@/components/WalletButton';
```

## TypeScript Configuration

- **Target**: ES2020 (required for BigInt literal support)
- **Strict Mode**: Enabled
- **Module Resolution**: bundler

## Next.js Version

- Currently using Next.js 14.2.33 (latest patch in 14.2.x series)
- Turbopack configuration added for forward compatibility with Next.js 16
  - `resolveAlias` configured with `fs: false` (Turbopack equivalent of webpack fallback)
  - Ensures seamless upgrade to Next.js 16 where Turbopack is the default bundler
- Webpack fallback configured for Solana libraries (`fs: false` for client-side)
