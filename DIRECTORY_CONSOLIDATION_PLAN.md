# Directory Consolidation Plan - Option A

## Overview
This document outlines the plan to consolidate the EQUA frontend directory structure by adopting **Option A**: moving all Next.js pages and components under `src/`, while maintaining clean separation between application code and utilities.

## Current Structure (Before)
```
EQUA-FRONTEND/
├── app/                    # Next.js App Router pages
│   ├── mint/
│   └── ...
├── src/
│   ├── components/         # React components
│   ├── hooks/             # React hooks
│   ├── lib/               # Core libraries (program, constants)
│   ├── utils/             # Pure utilities
│   └── services/          # API/blockchain services
├── public/
└── ...
```

## Target Structure (After - Option A)
```
EQUA-FRONTEND/
├── src/
│   ├── app/               # Next.js App Router pages (moved from root app/)
│   │   ├── mint/
│   │   └── ...
│   ├── components/        # React components (no change)
│   ├── hooks/            # React hooks (no change)
│   ├── lib/              # Core libraries (no change)
│   ├── utils/            # Pure utilities (no change)
│   └── services/         # API/blockchain services (no change)
├── public/
└── ...
```

## Migration Checklist

### Prerequisites
- [x] Token-2022 migration complete
- [x] All tests passing (447/456, 9 failures are pre-existing)
- [x] Preflight validation implemented
- [x] Import guards in place (check-token-imports.sh)

### Phase 1: Planning and Validation (Current PR)
- [x] Create this consolidation plan document
- [x] Document current structure
- [x] Define target structure
- [x] List all files to be moved
- [x] Identify import path changes needed

### Phase 2: Pre-Migration Setup (Follow-up PR)
- [ ] Run full test suite and document baseline
- [ ] Create backup branch before migration
- [ ] Update .gitignore if needed for new structure
- [ ] Document any special build configurations

### Phase 3: Directory Migration (Follow-up PR)
- [ ] Create `src/app/` directory structure
- [ ] Move files from `app/` to `src/app/`:
  - [ ] `app/page.tsx` → `src/app/page.tsx`
  - [ ] `app/layout.tsx` → `src/app/layout.tsx`
  - [ ] `app/mint/page.tsx` → `src/app/mint/page.tsx`
  - [ ] `app/debug/` → `src/app/debug/`
  - [ ] Any other app routes
- [ ] Update Next.js configuration (`next.config.js`) if needed
- [ ] Update TypeScript paths if needed

### Phase 4: Import Path Updates (Follow-up PR)
- [ ] Update all imports in moved files
  - `@/components/*` remains unchanged
  - `@/lib/*` remains unchanged
  - `@/utils/*` remains unchanged
  - Relative imports may need adjustment
- [ ] Run `check-token-imports.sh` to ensure no regressions
- [ ] Run full type check: `npm run typecheck`

### Phase 5: Build and Test Validation (Follow-up PR)
- [ ] Run `scripts/check-app-directory.sh` (may need updates)
- [ ] Run `npm run build` successfully
- [ ] Run full test suite
- [ ] Test dev server: `npm run dev`
- [ ] Manually test all major flows:
  - [ ] Homepage loads
  - [ ] Wallet connection works
  - [ ] Registration flow works
  - [ ] Minting works
  - [ ] Debug pages accessible

### Phase 6: Documentation Updates (Follow-up PR)
- [ ] Update README.md with new structure
- [ ] Update ARCHITECTURE_CLEANUP.md
- [ ] Update any developer guides referencing old paths
- [ ] Update CI/CD scripts if needed

### Phase 7: Cleanup (Follow-up PR)
- [ ] Remove old `app/` directory (verify empty)
- [ ] Update `.gitignore` to reflect new structure
- [ ] Remove any obsolete build artifacts
- [ ] Update package.json scripts if needed

## Files to Move

### Pages (app/ → src/app/)
- `app/page.tsx` (homepage)
- `app/layout.tsx` (root layout)
- `app/mint/page.tsx` (minting page)
- `app/debug/` (debug utilities)
- Any other top-level routes

### Files That Stay in Place
- `src/components/` ✅ (already in correct location)
- `src/hooks/` ✅ (already in correct location)
- `src/lib/` ✅ (already in correct location)
- `src/utils/` ✅ (already in correct location)
- `src/services/` ✅ (already in correct location)

## Import Path Changes

Most imports will remain unchanged due to TypeScript path aliases:
- `@/components/*` → No change
- `@/lib/*` → No change
- `@/utils/*` → No change
- `@/hooks/*` → No change

Potential changes:
- Relative imports between pages may need adjustment
- Some test files may need updated paths

## Build System Updates

### Next.js Configuration
Check if `next.config.js` needs updates for:
- Page directory location
- Build output paths
- Middleware configuration

### TypeScript Configuration
Verify `tsconfig.json` paths remain valid:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Build Scripts
- `scripts/check-app-directory.sh` - May need updates to check `src/app/` instead
- Other scripts should work unchanged due to path aliases

## Rollback Plan

If issues arise during migration:
1. Restore from backup branch
2. Review console errors for import path issues
3. Check Next.js logs for configuration issues
4. Verify build scripts still work

## Testing Strategy

### Unit Tests
- Run full suite: `npm test`
- Target: 447+ tests passing (baseline from current PR)

### Build Tests
- Clean build: `rm -rf .next && npm run build`
- Dev server: `npm run dev`
- Production start: `npm run start`

### Integration Tests
- Registration flow (critical path)
- Minting flow (critical path)
- Wallet connection
- Balance display
- Referral system

## Success Criteria

Migration is complete when:
- ✅ All files moved to target locations
- ✅ `npm run build` succeeds without errors
- ✅ `npm run dev` works correctly
- ✅ All tests pass (≥447)
- ✅ Manual testing confirms all features work
- ✅ No direct TOKEN_PROGRAM_ID imports (lint check passes)
- ✅ TypeScript compilation has no new errors
- ✅ Documentation updated

## Timeline

- **Current PR**: Phase 1 complete (Planning)
- **Follow-up PR**: Phases 2-7 (Migration execution)
- **Estimated effort**: 2-4 hours for careful migration

## Notes

- This consolidation is independent of the Token-2022 migration
- Both migrations should be merged separately for clean history
- The Token-2022 migration (current PR) should be validated on devnet before proceeding with directory consolidation
- Directory consolidation is primarily organizational and shouldn't affect runtime behavior

## Contact

For questions or issues during migration, refer to:
- This document
- README.md for general setup
- TROUBLESHOOTING.md for common issues
