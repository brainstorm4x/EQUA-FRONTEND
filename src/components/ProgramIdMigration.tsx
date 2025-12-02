'use client';

import { useEffect } from 'react';
import { PROGRAM_ID } from '@/lib/constants';
import { checkAndMigrateForProgramIdChange } from '@/utils/programIdMigration';

/**
 * ProgramIdMigration Component
 * 
 * Checks if the program ID has changed and clears old localStorage data if needed.
 * This ensures users start fresh when testing with a new program deployment.
 * 
 * This component runs once on app mount and has no visible UI.
 */
export function ProgramIdMigration() {
  useEffect(() => {
    // Run migration check on client-side mount
    const programIdStr = PROGRAM_ID.toBase58();
    checkAndMigrateForProgramIdChange(programIdStr);
  }, []); // Empty dependency array - run once on mount

  // This component has no UI
  return null;
}
