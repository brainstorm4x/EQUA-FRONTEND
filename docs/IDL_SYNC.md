# IDL Synchronization Guide

## Overview

The EQUA frontend uses an Anchor IDL (Interface Definition Language) file to interact with the Solana program. This IDL must match the deployed program's structure exactly, or the application will fail to initialize.

## Common Issues

### Type Not Found Error

If you see an error like:
```
Error: IdlError: Type not found: referralType
```

This means the IDL file is out of sync with the deployed program. The frontend is referencing a type that doesn't exist in the current IDL.

### Program ID Mismatch

If the IDL's program address doesn't match the configured `NEXT_PUBLIC_PROGRAM_ID`, you'll see:
```
Program ID mismatch: expected <ID1>, got <ID2>
```

## Automatic Synchronization

The frontend now includes automatic IDL normalization that:
- Fixes case sensitivity issues in type names (e.g., "referralType" → "ReferralType")
- Validates IDL structure before Program construction
- Provides clear error messages when types are missing

## Manual IDL Sync

To manually synchronize the IDL from the backend:

```bash
npm run idl:sync
```

This script:
1. Fetches the canonical IDL from the EQUA backend repository
2. Validates the IDL structure
3. Creates a backup of the existing IDL
4. Writes the new IDL to `public/idl/equa_token.json`

## IDL Source

By default, the IDL is fetched from:
```
https://raw.githubusercontent.com/brainstorm4x/EQUA/main/target/idl/equa_token.json
```

To use a different source:
```bash
IDL_SOURCE_URL=https://your-url.com/idl.json npm run idl:sync
```

## When to Sync

You should sync the IDL:
- After the backend deploys a new version of the Solana program
- When you see "Type not found" errors
- Before starting development on a new feature that uses new program instructions
- After pulling backend changes that modify the program structure

## Multi-Repo Workflow

For teams working across frontend, mobile, and backend:

1. **Backend Team**: Builds and deploys the program, generating a canonical IDL
2. **Frontend Team**: Runs `npm run idl:sync` to update the IDL
3. **Mobile Team**: Uses the same process (or applies the normalization logic)

## Troubleshooting

### Network Errors

If you see:
```
Network error: Cannot reach backend repository
```

Check:
- Your internet connection
- That the backend repository is accessible
- The IDL_SOURCE_URL is correct

### Invalid JSON

If you see:
```
Invalid JSON in fetched IDL
```

The backend IDL may be:
- Corrupted during generation
- Incomplete (program build failed)
- Not yet committed to the repository

Contact the backend team to rebuild and redeploy.

### 404 Not Found

If the IDL URL returns 404:
- The backend program hasn't been built yet
- The IDL path in the repository has changed
- Update the IDL_SOURCE_URL to the correct location

## IDL Normalization

The frontend automatically normalizes IDL issues:

```typescript
// Before normalization (hand-edited IDL)
{
  "types": [{ "name": "ReferralType", ... }],
  "accounts": [{ "type": { "defined": "referralType" } }]  // Wrong case!
}

// After normalization
{
  "types": [{ "name": "ReferralType", ... }],
  "accounts": [{ "type": { "defined": "ReferralType" } }]  // Corrected!
}
```

This happens automatically during Program initialization, but it's better to keep the IDL synchronized with the backend.

## Best Practices

1. **Never hand-edit the IDL** - Always sync from the backend
2. **Run `idl:sync` after backend updates** - Keep the frontend in sync
3. **Check the IDL into version control** - So all developers use the same version
4. **Use environment variables for Program IDs** - Makes testing and deployment easier

## Related Configuration

- `NEXT_PUBLIC_PROGRAM_ID` - Override the program ID from env vars
- `public/idl/equa_token.json` - The IDL file used by the frontend
- `src/lib/program.ts` - IDL loading and normalization logic
- `scripts/idl-sync.ts` - IDL sync script
