/**
 * useNetworkDiagnostics Hook
 * 
 * Performs runtime validation of network configuration and detects mismatches
 * between frontend configuration and on-chain state. This helps identify issues
 * like wrong cluster, wrong program ID, or wrong token program.
 */

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, TOKEN_PROGRAM_ID, STANDARD_TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS } from '@/lib/constants';
import { getGlobalStatePDA, getMintPDA } from '@/lib/program';
import { getClusterInfo, isClusterAligned, ClusterInfo } from '@/utils/networkDiagnostics';

export type DiagnosticErrorCode = 
  | 'PROGRAM_ID_MISMATCH'
  | 'CLUSTER_MISMATCH'
  | 'GLOBAL_STATE_MISSING'
  | 'MINT_MISSING'
  | 'MINT_OWNER_MISMATCH'
  | 'RPC_CONNECTION_ERROR';

export interface DiagnosticError {
  code: DiagnosticErrorCode;
  message: string;
  actionableSteps: string[];
}

export interface NetworkDiagnostics {
  isHealthy: boolean;
  isLoading: boolean;
  clusterInfo: ClusterInfo | null;
  programId: string;
  tokenProgramId: string;
  idlProgramId: string | null;
  globalStateExists: boolean;
  mintExists: boolean;
  mintOwner: string | null;
  errors: DiagnosticError[];
}

/**
 * Load IDL address from public IDL file
 * Returns null on expected errors (like 404 or malformed JSON) and logs appropriately
 */
async function loadIdlProgramId(): Promise<string | null> {
  try {
    const response = await fetch('/idl/equa_token.json');
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('IDL file not found at /idl/equa_token.json - program ID validation will be skipped');
      } else {
        console.warn(`Failed to load IDL (HTTP ${response.status}) - program ID validation will be skipped`);
      }
      return null;
    }
    const idl = await response.json();
    if (!idl.address) {
      console.warn('IDL file missing "address" field - program ID validation will be skipped');
    }
    return idl.address || null;
  } catch (error) {
    // Network errors, JSON parse errors, etc.
    if (error instanceof Error) {
      console.warn('Error loading IDL for diagnostics:', error.message);
    } else {
      console.warn('Unexpected error loading IDL for diagnostics');
    }
    return null;
  }
}

/**
 * Hook to perform network diagnostics and detect configuration mismatches
 */
export function useNetworkDiagnostics(): NetworkDiagnostics {
  const { connection } = useConnection();
  
  const [isLoading, setIsLoading] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [idlProgramId, setIdlProgramId] = useState<string | null>(null);
  const [globalStateExists, setGlobalStateExists] = useState(false);
  const [mintExists, setMintExists] = useState(false);
  const [mintOwner, setMintOwner] = useState<string | null>(null);
  const [errors, setErrors] = useState<DiagnosticError[]>([]);

  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    const detectedErrors: DiagnosticError[] = [];

    try {
      // 1. Get cluster info
      const cluster = getClusterInfo(connection);
      setClusterInfo(cluster);

      // 2. Check cluster alignment with env
      if (!isClusterAligned(connection)) {
        detectedErrors.push({
          code: 'CLUSTER_MISMATCH',
          message: `RPC endpoint cluster (${cluster.displayName}) may not match expected network configuration.`,
          actionableSteps: [
            'Verify NEXT_PUBLIC_NETWORK or NEXT_PUBLIC_SOLANA_NETWORK matches your RPC endpoint',
            'Check NEXT_PUBLIC_RPC_ENDPOINT or NEXT_PUBLIC_SOLANA_RPC_HOST is correct',
            `Current RPC: ${cluster.endpoint}`,
          ],
        });
      }

      // 3. Load IDL and check program ID match
      const idlAddress = await loadIdlProgramId();
      setIdlProgramId(idlAddress);
      
      if (idlAddress && idlAddress !== PROGRAM_ID.toBase58()) {
        detectedErrors.push({
          code: 'PROGRAM_ID_MISMATCH',
          message: `Program ID mismatch: env has ${PROGRAM_ID.toBase58()}, but IDL has ${idlAddress}`,
          actionableSteps: [
            'Update NEXT_PUBLIC_PROGRAM_ID to match the deployed program',
            'Ensure you have the correct IDL file in public/idl/equa_token.json',
            'Redeploy the program if needed and update both IDL and env',
          ],
        });
      }

      // 4. Check GlobalState PDA exists
      try {
        const [globalStatePDA] = getGlobalStatePDA();
        const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
        
        if (globalStateInfo) {
          setGlobalStateExists(true);
        } else {
          setGlobalStateExists(false);
          detectedErrors.push({
            code: 'GLOBAL_STATE_MISSING',
            message: `GlobalState account not found at ${globalStatePDA.toBase58()}`,
            actionableSteps: [
              'Program may not be initialized on this cluster',
              `Verify program is deployed to ${cluster.displayName}`,
              'Run program initialization if you are the deployer',
              'Switch to the correct cluster/RPC endpoint',
            ],
          });
        }
      } catch (error) {
        console.error('Error checking GlobalState:', error);
        detectedErrors.push({
          code: 'RPC_CONNECTION_ERROR',
          message: 'Failed to fetch GlobalState account from RPC',
          actionableSteps: [
            'Check RPC endpoint is accessible',
            'Verify network connectivity',
            `Try a different RPC endpoint for ${cluster.displayName}`,
          ],
        });
      }

      // 5. Check Mint PDA exists and validate owner
      try {
        const [mintPDA] = getMintPDA();
        const mintInfo = await connection.getAccountInfo(mintPDA);
        
        if (mintInfo) {
          setMintExists(true);
          const owner = mintInfo.owner.toBase58();
          setMintOwner(owner);
          
          // Check if mint owner matches configured token program (must be Token-2022)
          if (owner !== TOKEN_PROGRAM_ID.toBase58()) {
            const isToken2022 = owner === TOKEN_2022_PROGRAM_ADDRESS;
            detectedErrors.push({
              code: 'MINT_OWNER_MISMATCH',
              message: `Mint owner (${owner}) does not match configured TOKEN_PROGRAM_ID (${TOKEN_PROGRAM_ID.toBase58()})`,
              actionableSteps: [
                `Mint on-chain uses: ${isToken2022 ? 'Token-2022' : owner === STANDARD_TOKEN_PROGRAM_ADDRESS ? 'Standard SPL Token' : 'Unknown'}`,
                'EQUA requires Token-2022 only',
                isToken2022 
                  ? 'Frontend is misconfigured - TOKEN_PROGRAM_ID should be Token-2022'
                  : 'Recreate the mint with Token-2022 program',
              ],
            });
          }
        } else {
          setMintExists(false);
          detectedErrors.push({
            code: 'MINT_MISSING',
            message: `Mint account not found at ${mintPDA.toBase58()}`,
            actionableSteps: [
              'Mint may not be created on this cluster',
              `Verify program is initialized on ${cluster.displayName}`,
              'Switch to the correct cluster/RPC endpoint',
            ],
          });
        }
      } catch (error) {
        console.error('Error checking Mint:', error);
        // RPC error already reported if GlobalState check failed
        if (!detectedErrors.some(e => e.code === 'RPC_CONNECTION_ERROR')) {
          detectedErrors.push({
            code: 'RPC_CONNECTION_ERROR',
            message: 'Failed to fetch Mint account from RPC',
            actionableSteps: [
              'Check RPC endpoint is accessible',
              'Verify network connectivity',
              `Try a different RPC endpoint for ${cluster.displayName}`,
            ],
          });
        }
      }

      setErrors(detectedErrors);
    } catch (error) {
      console.error('Diagnostics error:', error);
      setErrors([{
        code: 'RPC_CONNECTION_ERROR',
        message: 'Failed to run network diagnostics',
        actionableSteps: [
          'Check network connectivity',
          'Verify RPC endpoint configuration',
          'Try refreshing the page',
        ],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [connection]);

  // Run diagnostics on mount and when connection changes
  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  return {
    isHealthy: errors.length === 0 && !isLoading,
    isLoading,
    clusterInfo,
    programId: PROGRAM_ID.toBase58(),
    tokenProgramId: TOKEN_PROGRAM_ID.toBase58(),
    idlProgramId,
    globalStateExists,
    mintExists,
    mintOwner,
    errors,
  };
}
